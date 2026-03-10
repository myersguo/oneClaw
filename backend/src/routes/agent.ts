import { Router } from 'express';
import { CodingAgent } from '../services/coding-agent';
import { OpenAIClient, LLMConfig } from '../services/openai-client';
import { ToolExecutor } from '../services/tool-executor';
import { allTools } from '../tools';
import path from 'path';
import { ConversationDAO } from '../db/dao/conversation';
import { MessageDAO } from '../db/dao/message';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Initialize shared tool executor
const toolExecutor = new ToolExecutor();
allTools.forEach(tool => toolExecutor.registerTool(tool));

router.post('/chat', async (req, res) => {
  const { messages, context, settings } = req.body;

  console.log('[Agent] Received chat request');
  console.log('[Agent] Messages count:', messages?.length);
  console.log('[Agent] Settings:', {
    hasApiKey: !!settings?.openaiApiKey,
    model: settings?.openaiModel,
    baseUrl: settings?.openaiBaseUrl,
  });

  try {
    // Validate settings
    if (!settings?.openaiApiKey) {
      throw new Error('API Key is required. Please configure it in Settings.');
    }

    // Create OpenAI client with user settings
    const llmConfig: LLMConfig = {
      apiKey: settings.openaiApiKey,
      model: settings.openaiModel || 'gpt-4-turbo',
      baseUrl: settings.openaiBaseUrl || 'https://api.openai.com/v1',
    };

    console.log('[Agent] Creating OpenAI client with config:', {
      model: llmConfig.model,
      baseUrl: llmConfig.baseUrl,
      hasApiKey: !!llmConfig.apiKey,
    });

    const openaiClient = new OpenAIClient(llmConfig);
    const agent = new CodingAgent(openaiClient, toolExecutor);

    // Ensure conversation exists
    let conversationId = req.body.conversationId;
    if (!conversationId) {
        conversationId = uuidv4();
    }
    ConversationDAO.createConversation(conversationId, messages?.[0]?.content?.substring(0, 50) || 'New Chat');
    
    // Inject conversationId into context for agent to use
    const agentContext = { ...(context || {}), conversationId };

    // Load knowledge base
    // In dev (ts-node): __dirname is src/routes, so knowledge is ../knowledge
    // In prod (bundled): __dirname is dist-backend, knowledge is ./knowledge
    // Or if bundled into single file, __dirname might be ambiguous depending on esbuild target
    // We try multiple paths
    const possiblePaths = [
        path.join(__dirname, '../knowledge'), // Dev: src/routes -> src/knowledge
        path.join(__dirname, 'knowledge'),    // Prod: dist-backend -> dist-backend/knowledge
        path.join(process.cwd(), 'knowledge') // CWD fallback
    ];
    
    await agent.loadKnowledgeBase(possiblePaths[0]); // agent.loadKnowledgeBase has its own fallback logic too

    console.log('[Agent] Calling agent.chat...');
    const result = await agent.chat(messages, agentContext);
    console.log('[Agent] Chat completed successfully');

    res.json(result);
  } catch (error: any) {
    console.error('[Agent] Error occurred:');
    console.error('[Agent] Error message:', error.message);
    console.error('[Agent] Error stack:', error.stack);
    console.error('[Agent] Full error:', error);

    const status = typeof error?.status === 'number' ? error.status : 500;
    const requestId = error?.requestID || error?.requestId || error?.headers?.get?.('x-request-id');
    const upstream = error?.error;

    res.status(status).json({
      error: error.message,
      requestId,
      code: upstream?.code || error?.code,
      type: upstream?.type || error?.type,
      details: upstream || error.toString(),
    });
  }
});

router.post('/stream', async (req, res) => {
  // SSE implementation (POST + fetch streaming on frontend)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const { messages, context, settings } = req.body || {};

  const writeEvent = (payload: any) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Send an immediate event so clients know the stream is alive.
  writeEvent({ type: 'start', ts: Date.now() });

  // Heartbeat to keep proxies/browsers from buffering forever.
  const heartbeat = setInterval(() => {
    // SSE comment line (clients ignore)
    res.write(`: ping ${Date.now()}\n\n`);
  }, 15000);

  const abortController = new AbortController();
  res.on('close', () => {
    console.log('[Route] Response closed (client disconnected), aborting...');
    abortController.abort();
  });

  try {
    if (!settings?.openaiApiKey) {
      writeEvent({ type: 'error', message: 'API Key is required. Please configure it in Settings.' });
      res.end();
      return;
    }

    const llmConfig: LLMConfig = {
      apiKey: settings.openaiApiKey,
      model: settings.openaiModel || 'gpt-4-turbo',
      baseUrl: settings.openaiBaseUrl || 'https://api.openai.com/v1',
    };

    const openaiClient = new OpenAIClient(llmConfig);
    const agent = new CodingAgent(openaiClient, toolExecutor);
    
    // Path resolution for knowledge base
    const possiblePaths = [
        path.join(__dirname, '../knowledge'), 
        path.join(__dirname, 'knowledge'),
        path.join(process.cwd(), 'knowledge')
    ];
    // Use the first one, let the agent logic handle validation/fallback if needed,
    // or we can pass the array if we update agent.ts. For now, pass a likely candidate.
    // In bundled app, __dirname is where index.js is. We copied knowledge next to it.
    // So path.join(__dirname, 'knowledge') is likely correct for prod.
    // path.join(__dirname, '../knowledge') is correct for dev (src/routes/..).
    
    // Simple heuristic: check if we are in a 'routes' directory (dev)
    const isDevStructure = __dirname.includes('routes');
    const knowledgePath = isDevStructure ? path.join(__dirname, '../knowledge') : path.join(__dirname, 'knowledge');
    
    await agent.loadKnowledgeBase(knowledgePath);

    // Ensure conversation exists
    let conversationId = req.body.conversationId;
    if (!conversationId) {
        conversationId = uuidv4();
    }
    // We don't have the first message content easily here in stream route (it's in messages array but mixed)
    // Just ensure it exists
    ConversationDAO.ensureConversation(conversationId);
    
    const agentContext = { ...(context || {}), conversationId };

    for await (const event of agent.streamChat(messages || [], agentContext, abortController.signal)) {
      if (abortController.signal.aborted) break;
      writeEvent(event);
      if (event.type === 'done' || event.type === 'error') {
        break;
      }
    }
  } catch (error: any) {
    const requestId = error?.requestID || error?.requestId || error?.headers?.get?.('x-request-id');
    writeEvent({ type: 'error', message: error?.message || String(error), requestId });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

// Keep GET endpoint for backward compatibility
router.get('/stream', async (_req, res) => {
  res.status(405).json({ error: 'Use POST /agent/stream for SSE.' });
});

router.get('/history', async (_req, res) => {
  try {
    const conversations = ConversationDAO.getAllConversations();
    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  try {
    const conversation = ConversationDAO.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const messages = MessageDAO.getMessagesByConversationId(conversationId);
    res.json({ conversation, messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
