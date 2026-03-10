import { Router } from 'express';
import { OpenClawManager } from '../services/openclaw-manager';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

const router = Router();
// TODO: Use real workspace path from config
const workspacePath = path.join(os.homedir(), 'openclaw-workspace');
const backendPort = parseInt(process.env.PORT || '3000');
const manager = new OpenClawManager(workspacePath, backendPort);

router.post('/settings', async (req, res) => {
  const settings = req.body;

  // Update workspace path if provided
  if (settings.workspacePath) {
      manager.setWorkspacePath(settings.workspacePath);
  }

  // Use current workspace path from manager
  const currentWorkspacePath = manager.getWorkspacePath();

  // Check if LLM settings actually changed by comparing with current config
  let llmSettingsChanged = false;
  try {
      const configPath = path.join(currentWorkspacePath, 'openclaw.json');
      let configContent = '';
      let fileExists = true;

      try {
          configContent = await fs.readFile(configPath, 'utf-8');
      } catch (e) {
          // Config doesn't exist
          fileExists = false;
          console.log('[OpenClaw] Config file not found, will treat as new setup if LLM settings provided');
      }

      if (fileExists && configContent.trim()) {
          const config = JSON.parse(configContent);

          // Extract current LLM settings
          let currentApiKey = '';
          let currentModel = '';
          let currentBaseUrl = '';
          let currentProvider = 'openai';

          if (config.agents?.defaults?.model?.primary) {
              const primary = config.agents.defaults.model.primary;
              const [providerName, modelName] = primary.split('/');

              if (providerName && config.models?.providers?.[providerName]) {
                  currentProvider = providerName;
                  const provider = config.models.providers[providerName];
                  currentApiKey = typeof provider.apiKey === 'string' ? provider.apiKey : '';
                  currentBaseUrl = provider.baseUrl || '';
                  currentModel = modelName || '';
              }
          }

          console.log('[OpenClaw] Current LLM settings:', {
              provider: currentProvider,
              model: currentModel,
              baseUrl: currentBaseUrl,
              apiKeyLength: currentApiKey.length
          });

          console.log('[OpenClaw] New LLM settings:', {
              provider: settings.llmProvider,
              model: settings.openaiModel,
              baseUrl: settings.openaiBaseUrl,
              apiKeyLength: settings.openaiApiKey?.length || 0
          });

          // Compare LLM-related fields only - must have actual differences
          const providerChanged = settings.llmProvider && settings.llmProvider !== currentProvider;
          const apiKeyChanged = settings.openaiApiKey && settings.openaiApiKey !== currentApiKey;
          const modelChanged = settings.openaiModel && settings.openaiModel !== currentModel;
          const baseUrlChanged = settings.openaiBaseUrl && settings.openaiBaseUrl !== currentBaseUrl;

          llmSettingsChanged = providerChanged || apiKeyChanged || modelChanged || baseUrlChanged;

          if (llmSettingsChanged) {
              console.log('[OpenClaw] LLM settings changed:', {
                  providerChanged,
                  apiKeyChanged,
                  modelChanged,
                  baseUrlChanged
              });
          } else {
              console.log('[OpenClaw] LLM settings unchanged, skipping config update');
          }
      } else {
          // No config file or empty, only update if we have LLM settings to set
          llmSettingsChanged = !!(settings.openaiApiKey && settings.openaiModel);
          console.log('[OpenClaw] No existing config, llmSettingsChanged:', llmSettingsChanged);
      }
  } catch (e) {
      console.warn('[OpenClaw] Failed to check LLM settings change:', e);
      // If we can't determine, be conservative - only update if we have meaningful settings
      llmSettingsChanged = !!(settings.openaiApiKey && settings.openaiModel);
  }

  if (llmSettingsChanged) {
      // Update openclaw.json with new LLM settings
      try {
          // 1. Stop gateway first (best effort)
          try {
              await manager.stop();
          } catch (stopErr) {
              console.warn('[OpenClaw] Failed to stop gateway before config write (ignoring):', stopErr);
          }
          
          // 2. Wait for process to fully exit (prevent race condition on config write)
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Use OPENCLAW_STATE_DIR to find config
          const configPath = path.join(currentWorkspacePath, 'openclaw.json');
          
          let configContent = '{}';
          try {
              configContent = await fs.readFile(configPath, 'utf-8');
          } catch (e) {
              console.warn('[OpenClaw] Config file not found, creating new one');
          }
          
          let config = JSON.parse(configContent);
          
          if (!config.models) config.models = {};
          if (!config.models.providers) config.models.providers = {};
          if (!config.agents) config.agents = {};
          if (!config.agents.defaults) config.agents.defaults = {};
          if (!config.agents.defaults.model) config.agents.defaults.model = {};

          // Use provider from settings or fallback to 'openai'
          const providerName = settings.llmProvider || 'openai';
          
          // Determine model ID
          let modelId = settings.openaiModel || 'gpt-4-turbo';
          
          const fullModelId = `${providerName}/${modelId}`;

          // 1. DO NOT Write to "llm" top-level structure if it causes validation errors
          // Although schema says it's allowed, actual runtime or stricter schema might reject it.
          // The user report says "Unrecognized key: llm".
          // So we remove it and rely on models.providers + agents.defaults.model.primary
          if (config.llm) {
              delete config.llm;
          }

          // 2. ALSO write to "models.providers" structure for backward compatibility or specific provider config
          if (!config.models) config.models = {};
          if (!config.models.providers) config.models.providers = {};
          
          let providerConfig = config.models.providers[providerName] || {
              apiKey: settings.openaiApiKey,
              api: 'openai-completions',
              models: []
          };

          // Update provider-level settings
          providerConfig.apiKey = settings.openaiApiKey;
          if (settings.openaiBaseUrl && settings.openaiBaseUrl.trim() !== '') {
              // Strip /chat/completions suffix if present, as most providers expect base URL
              let baseUrl = settings.openaiBaseUrl.trim();
              if (baseUrl.endsWith('/chat/completions')) {
                  baseUrl = baseUrl.substring(0, baseUrl.length - '/chat/completions'.length);
              }
              // Also strip trailing slash if present
              if (baseUrl.endsWith('/')) {
                  baseUrl = baseUrl.substring(0, baseUrl.length - 1);
              }
              providerConfig.baseUrl = baseUrl;
          }

          // Ensure models array exists
          if (!Array.isArray(providerConfig.models)) {
              providerConfig.models = [];
          }

          // Check if model exists, if not add it, if yes update it
          const existingModelIndex = providerConfig.models.findIndex((m: any) => m.id === modelId);
          const newModelConfig = {
              id: modelId,
              name: modelId,
              api: 'openai-completions'
          };

          if (existingModelIndex >= 0) {
              // Update existing model (optional: merge if needed, but for now we keep existing fields)
              // We might want to ensure 'api' is set correctly if it was missing
              providerConfig.models[existingModelIndex] = {
                  ...providerConfig.models[existingModelIndex],
                  ...newModelConfig,
                  // Preserve existing detailed config like contextWindow, cost, etc.
                  ...providerConfig.models[existingModelIndex] 
              };
          } else {
              providerConfig.models.push(newModelConfig);
          }
          
          config.models.providers[providerName] = providerConfig;

          // 3. Update default agent model
          if (!config.agents) config.agents = {};
          if (!config.agents.defaults) config.agents.defaults = {};
          if (!config.agents.defaults.model) config.agents.defaults.model = {};
          
          config.agents.defaults.model.primary = fullModelId;
          
          await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
          console.log(`[OpenClaw] Updated LLM config in config path: ${configPath} (dual-write llm + models)`);
          
          // Restart gateway to apply changes
          const startResult = await manager.start();
          
          res.json({ success: startResult.success, restart: true });
          return;
      } catch (e) {
          console.error('Failed to update config and restart:', e);
          res.status(500).json({ error: 'Failed to update configuration' });
          return;
      }
  }
  
  res.json({ success: true });
});

router.get('/settings', async (req, res) => {
  try {
      const workspacePath = manager.getWorkspacePath();
      const configPath = path.join(workspacePath, 'openclaw.json');
      
      let configContent = '{}';
      try {
          configContent = await fs.readFile(configPath, 'utf-8');
      } catch (e) {
          // If not found, try global
          try {
              const globalConfigPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
              configContent = await fs.readFile(globalConfigPath, 'utf-8');
          } catch (globalErr) {
              // Ignore
          }
      }
      
      const config = JSON.parse(configContent);
      
      // Extract LLM settings
      // Prioritize "models.providers" as "llm" key is deprecated/removed
      let openaiApiKey = '';
      let openaiModel = '';
      let openaiBaseUrl = '';
      let llmProvider = 'openai'; // default
      
      // Fallback or override from agents default model if available
      // logic: find primary model in providers
      if (config.agents?.defaults?.model?.primary) {
          const primary = config.agents.defaults.model.primary; // e.g. "openai/gpt-4"
          const [providerName, modelName] = primary.split('/');
          
          if (providerName && config.models?.providers?.[providerName]) {
              llmProvider = providerName;
              const provider = config.models.providers[providerName];
              
              if (!openaiApiKey && provider.apiKey) {
                  openaiApiKey = typeof provider.apiKey === 'string' ? provider.apiKey : '';
              }
              if (!openaiBaseUrl && provider.baseUrl) {
                  openaiBaseUrl = provider.baseUrl;
              }
              if (!openaiModel && modelName) {
                  openaiModel = modelName;
              }
          }
      } else if (config.llm) {
          // Backward compatibility if llm key exists
          openaiApiKey = typeof config.llm.apiKey === 'string' ? config.llm.apiKey : '';
          openaiModel = config.llm.model || '';
          openaiBaseUrl = config.llm.baseUrl || '';
          llmProvider = config.llm.provider || 'openai';
      }
      
      res.json({
          openaiApiKey,
          openaiModel,
          openaiBaseUrl,
          llmProvider,
          workspacePath
      });
  } catch (e) {
      console.error('Failed to get settings:', e);
      res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.post('/install', async (req, res) => {
  const success = await manager.install();
  res.json({ success });
});

router.post('/init', async (req, res) => {
  const { path: targetPath, llmConfig } = req.body;
  const success = await manager.initProject(targetPath || workspacePath, llmConfig);
  res.json({ success });
});

router.post('/start', async (req, res) => {
  const result = await manager.start();
  res.json(result);
});

router.post('/stop', async (req, res) => {
  const success = await manager.stop();
  res.json({ success });
});

router.post('/restart', async (req, res) => {
  await manager.stop();
  const result = await manager.start();
  res.json({ success: result.success });
});

router.get('/status', async (req, res) => {
  const status = await manager.getStatus();
  res.json(status);
});

router.get('/project-status', async (req, res) => {
  const { path: queryPath } = req.query;
  if (queryPath && typeof queryPath === 'string') {
    manager.setWorkspacePath(queryPath);
  }
  const status = await manager.getProjectStatus();
  res.json(status);
});

export default router;
