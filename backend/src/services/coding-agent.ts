import { OpenAIClient } from './openai-client';
import { ToolExecutor } from './tool-executor';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import fs from 'fs/promises';
import path from 'path';
import { MessageDAO } from '../db/dao/message';

type StreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'tool_calls'; toolCalls: any[] }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: any }
  | { type: 'tool_execution_end'; toolCallId: string; toolName: string; result: any; isError: boolean }
  | { type: 'tool_result'; toolCall: any }
  | { type: 'done'; content: string; toolCalls?: any[] }
  | { type: 'error'; message: string };

function serializeToolResult(result: any): string {
  if (result === null || result === undefined) return '';
  if (typeof result === 'string') return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function sanitizeIncomingMessages(messages: any[]): ChatCompletionMessageParam[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && typeof m === 'object' && typeof m.role === 'string')
    .map((m) => {
      // Keep only fields OpenAI expects
      if (m.role === 'user' || m.role === 'assistant' || m.role === 'system') {
        return { role: m.role, content: m.content ?? '' } as ChatCompletionMessageParam;
      }
      return { role: 'user', content: String(m.content ?? '') } as ChatCompletionMessageParam;
    });
}

export class CodingAgent {
  private openaiClient: OpenAIClient;
  private toolExecutor: ToolExecutor;
  private knowledgeBase: string = '';

  constructor(openaiClient: OpenAIClient, toolExecutor: ToolExecutor) {
    this.openaiClient = openaiClient;
    this.toolExecutor = toolExecutor;
  }

  async loadKnowledgeBase(basePath: string) {
    try {
        // Try to find knowledge base in dist or src
        let knowledgePath = basePath;
        console.log(`[CodingAgent] Attempting to load knowledge from: ${knowledgePath}`);
        
        // Check if primary path exists
        try {
            await fs.access(path.join(knowledgePath, 'openclaw/cli-reference.md'));
        } catch {
            console.warn(`[CodingAgent] Knowledge base not found at ${knowledgePath}`);
            // Fallback strategy:
            // 1. If we are in dist/routes or src/routes, look up one level (../knowledge)
            const parentKnowledge = path.resolve(basePath, '../knowledge');
            
            // 2. If we are in root of dist (bundled), look for ./knowledge (which is what passed usually)
            // 3. Try to find src/knowledge from relative path (dev mode fallback)
            const srcPath = path.resolve(basePath, '../../src/knowledge');
            
            // 4. Try CWD/knowledge (if running from root)
            const cwdPath = path.join(process.cwd(), 'knowledge');
            
            // 5. Try resources path in Electron (often in Resources/app.asar.unpacked or similar if not bundled)
            // But since we bundled, it should be relative to __dirname
            
            // Try alternatives sequentially
            const alternatives = [parentKnowledge, srcPath, cwdPath];
            let found = false;
            
            for (const alt of alternatives) {
                try {
                    await fs.access(path.join(alt, 'openclaw/cli-reference.md'));
                    console.log(`[CodingAgent] Found knowledge base at fallback: ${alt}`);
                    knowledgePath = alt;
                    found = true;
                    break;
                } catch {
                    // continue
                }
            }
            
            if (!found) {
                console.error(`[CodingAgent] CRITICAL: Knowledge base not found in any expected location.`);
                // Don't throw, just return empty to avoid crash
                return;
            }
        }

        const cliRef = await fs.readFile(path.join(knowledgePath, 'openclaw/cli-reference.md'), 'utf-8');
        const troubleshooting = await fs.readFile(path.join(knowledgePath, 'openclaw/troubleshooting.md'), 'utf-8');
        const bestPractices = await fs.readFile(path.join(knowledgePath, 'openclaw/best-practices.md'), 'utf-8');
        const configSchema = await fs.readFile(path.join(knowledgePath, 'openclaw/config-schema.json'), 'utf-8');

        this.knowledgeBase = `
## OpenClaw CLI Reference
${cliRef}

## Best Practices
${bestPractices}

## Configuration Schema
\`\`\`json
${configSchema}
\`\`\`

## Troubleshooting
${troubleshooting}
        `;
    } catch (e) {
        console.warn('Failed to load knowledge base', e);
    }
  }

  private async collectRuntimeContext(workspacePath: string): Promise<string> {
    let contextStr = '';

    // 1. Current Directory
    contextStr += `Current Directory (CWD): ${process.cwd()}\n`;
    contextStr += `Target Workspace: ${workspacePath}\n\n`;

    // 2. Environment Variables (Filtered)
    const relevantKeys = ['PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'NODE_ENV'];
    const envVars = Object.entries(process.env)
        .filter(([key]) => relevantKeys.includes(key) || key.startsWith('OPENCLAW_'))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    contextStr += `### Environment Variables\n${envVars}\n\n`;

    // 3. Start Script Content
    try {
        if (workspacePath) {
            const startScriptPath = path.join(workspacePath, 'scripts', 'start.sh');
            const startScriptContent = await fs.readFile(startScriptPath, 'utf-8');
            contextStr += `### Start Script (scripts/start.sh)\n\`\`\`bash\n${startScriptContent}\n\`\`\`\n\n`;
        }
    } catch (e) {
        contextStr += `### Start Script\n(Could not read scripts/start.sh: ${e})\n\n`;
    }

    return contextStr;
  }

  private async buildSystemPrompt(context: any): Promise<string> {
    const runtimeContext = await this.collectRuntimeContext(context.workspacePath);

    return `
You are OpenClaw Expert, an AI assistant specialized in configuring and managing OpenClaw.

## Capabilities
1. Understand OpenClaw configuration and CLI.
2. Diagnose and fix issues.
3. Help user with complex tasks.

## IMPORTANT: Working Directory
- You MUST perform all file operations and shell commands within the **Target Workspace** directory (${context.workspacePath}).
- DO NOT operate in the backend source directory.
- When running \`openclaw\` CLI commands, they will automatically use the correct context if you use the \`exec_shell\` tool.
- For other shell commands, ensure you are referencing files relative to the workspace root.

## IMPORTANT: Service Management
- To START the gateway, ALWAYS use the script: \`bash scripts/start.sh . 18789\` (assuming you are in workspace root).
- DO NOT run \`openclaw gateway run\` directly unless debugging. The script sets up necessary environment variables (like OPENCLAW_STATE_DIR).
- To STOP the gateway, use: \`bash scripts/stop.sh . 18789\`.
- To CHECK status, use: \`bash scripts/status.sh .\`.

## Tool Usage
- Use 'exec_shell' tool to run OpenClaw CLI commands.
- Example: To approve a pairing request, run "openclaw pairing approve feishu 123456" via 'exec_shell' tool.

## Knowledge Base
${this.knowledgeBase}

## Current Runtime Context
${runtimeContext}

## Current Status
Gateway: ${context.gatewayRunning ? 'Running' : 'Stopped'}
    `;
  }

  async chat(messages: any[], context: any) {
    const systemPrompt = await this.buildSystemPrompt(context);
    const fullMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...sanitizeIncomingMessages(messages),
    ];

    const tools = this.toolExecutor.getToolDefinitions();

    const collectedToolCalls: any[] = [];
    const maxToolRounds = 200;

    for (let round = 0; round < maxToolRounds; round++) {
      const response = await this.openaiClient.chat(fullMessages, tools);
      const choice = response.choices[0];
      const msg: any = choice.message;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Append assistant tool-call message to conversation
        fullMessages.push({
          role: 'assistant',
          content: msg.content ?? null,
          tool_calls: msg.tool_calls,
        });

        for (const toolCall of msg.tool_calls) {
          const call = toolCall as any;
          let parsedArgs: any = {};
          let toolResult: any;
          let errorText: string | undefined;

          try {
            parsedArgs = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};
          } catch (e: any) {
            errorText = `Invalid tool arguments JSON: ${e?.message || String(e)}`;
          }

          if (errorText) {
            toolResult = { status: 'error', error: errorText };
          } else {
            toolResult = await this.toolExecutor.execute(call.function.name, parsedArgs);
          }

          const content = serializeToolResult(toolResult);
          // Append tool result message so the model can continue
          fullMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            content,
          });

          collectedToolCalls.push({
            ...toolCall,
            result: content,
          });
        }

        // Continue loop: model should now respond with next step or final answer
        continue;
      }

      // Final assistant response (no tool calls)
      return {
        content: msg.content ?? '',
        toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
      };
    }

    // Safety fallback: tool loop exceeded
    return {
      content: '工具调用轮次过多，已中止。请重试或缩小问题范围。',
      toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
    };
  }

  async *streamChat(messages: any[], context: any, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    const conversationId = context.conversationId;
    if (conversationId && messages.length > 0) {
        // Log the last user message
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg.role === 'user') {
            MessageDAO.addMessage({
                conversation_id: conversationId,
                role: 'user',
                content: lastUserMsg.content
            });
        }
    }

    const systemPrompt = await this.buildSystemPrompt(context);
    const fullMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...sanitizeIncomingMessages(messages),
    ];

    const tools = this.toolExecutor.getToolDefinitions();
    const collectedToolCalls: any[] = [];
    const maxToolRounds = 6;
    let finalContent = '';

    for (let round = 0; round < maxToolRounds; round++) {
      if (signal?.aborted) {
        yield { type: 'error', message: 'aborted' };
        return;
      }
      const toolCallsByIndex = new Map<number, any>();
      let assistantContentThisRound = '';
      let finishReason: string | null = null;

      try {
        for await (const chunk of this.openaiClient.streamChat(fullMessages as ChatCompletionMessageParam[], tools, { signal })) {
          if (signal?.aborted) {
            yield { type: 'error', message: 'aborted' };
            return;
          }
          const choice: any = chunk.choices?.[0];
          const delta: any = choice?.delta;
          finishReason = choice?.finish_reason ?? finishReason;

          if (typeof delta?.content === 'string') {
            assistantContentThisRound += delta.content;
            finalContent += delta.content;
            yield { type: 'delta', content: delta.content };
          }

          if (Array.isArray(delta?.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              const existing = toolCallsByIndex.get(idx) || {
                id: tc.id,
                type: tc.type || 'function',
                function: { name: '', arguments: '' },
              };
              if (tc.id) existing.id = tc.id;
              if (tc.type) existing.type = tc.type;
              if (tc.function?.name) existing.function.name = tc.function.name;
              if (tc.function?.arguments) {
                existing.function.arguments = (existing.function.arguments || '') + tc.function.arguments;
              }
              toolCallsByIndex.set(idx, existing);
            }
          }
        }
      } catch (e: any) {
        yield { type: 'error', message: e?.message || String(e) };
        return;
      }

      const toolCalls = Array.from(toolCallsByIndex.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => v);

      if (toolCalls.length > 0 || finishReason === 'tool_calls') {
        // Log assistant tool calls
        if (conversationId) {
            MessageDAO.addMessage({
                conversation_id: conversationId,
                role: 'assistant',
                content: assistantContentThisRound || undefined,
                tool_calls: toolCalls
            });
        }

        // Append assistant message with tool calls to conversation
        fullMessages.push({
          role: 'assistant',
          content: assistantContentThisRound || null,
          tool_calls: toolCalls,
        });

        // Emit tool calls summary
        yield { type: 'tool_calls', toolCalls };

        for (const toolCall of toolCalls) {
          const call: any = toolCall;
          let parsedArgs: any = {};
          let toolResult: any;
          let errorText: string | undefined;

          try {
            parsedArgs = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};
          } catch (err: any) {
            errorText = `Invalid tool arguments JSON: ${err?.message || String(err)}`;
          }

          const argsForEvent = errorText ? call?.function?.arguments : parsedArgs;
          yield { type: 'tool_execution_start', toolCallId: call.id, toolName: call.function.name, args: argsForEvent };

          if (errorText) {
            toolResult = { status: 'error', error: errorText };
          } else {
            toolResult = await this.toolExecutor.execute(call.function.name, parsedArgs);
          }

          const isError = toolResult?.status === 'error' || !!toolResult?.error;
          yield { type: 'tool_execution_end', toolCallId: call.id, toolName: call.function.name, result: toolResult, isError };

          const content = serializeToolResult(toolResult);
          
          // Log tool result
          if (conversationId) {
            MessageDAO.addMessage({
                conversation_id: conversationId,
                role: 'tool',
                content: content,
                tool_call_id: call.id
            });
          }

          const toolMsg = { role: 'tool', tool_call_id: call.id, content };
          fullMessages.push(toolMsg);

          const toolCallWithResult = { ...toolCall, result: content };
          collectedToolCalls.push(toolCallWithResult);
          yield { type: 'tool_result', toolCall: toolCallWithResult };
        }

        // Continue to next round; the model will now respond based on tool outputs
        continue;
      }

      // No tool calls => final answer
      // Log final assistant answer
      if (conversationId) {
        MessageDAO.addMessage({
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantContentThisRound
        });
      }

      yield {
        type: 'done',
        content: finalContent,
        toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
      };
      return;
    }

    yield {
      type: 'done',
      content: '工具调用轮次过多，已中止。请重试或缩小问题范围。',
      toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
    };
  }
}
