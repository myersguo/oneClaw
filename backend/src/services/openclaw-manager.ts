import { executeCommand, spawnProcess } from '../utils/process-utils';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { ChildProcess } from 'child_process';
import { InitializationDAO } from '../db/dao/initialization';

export class OpenClawManager {
  private gatewayProcess: ChildProcess | null = null;
  private workspacePath: string;
  private currentWebUrl: string | undefined;
  private readonly backendPort: number;

  constructor(workspacePath: string, backendPort: number = 3000) {
    this.workspacePath = this.resolvePath(workspacePath);
    this.backendPort = backendPort;
  }

  private resolvePath(p: string): string {
    if (p.startsWith('~/')) {
      return path.join(os.homedir(), p.slice(2));
    }
    return p;
  }

  /**
   * Convert gateway URL to proxied URL to bypass CSP restrictions
   */
  private convertToProxyUrl(gatewayUrl: string | undefined): string | undefined {
    if (!gatewayUrl) return undefined;

    try {
      const url = new URL(gatewayUrl);
      // Replace gateway host/port with our proxy endpoint
      // Preserve path and hash (especially the token in hash)
      return `http://localhost:${this.backendPort}/gateway-proxy${url.pathname}${url.search}${url.hash}`;
    } catch (e) {
      console.error('[OpenClaw] Failed to convert gateway URL to proxy URL:', e);
      return gatewayUrl; // Fallback to original URL
    }
  }

  setWorkspacePath(path: string) {
    this.workspacePath = this.resolvePath(path);
  }

  getWorkspacePath(): string {
    return this.workspacePath;
  }

  async checkInstalled(): Promise<boolean> {
    const { exitCode } = await executeCommand('which openclaw');
    return exitCode === 0;
  }

  async getVersion(): Promise<string | null> {
    const { stdout, exitCode } = await executeCommand('openclaw --version');
    if (exitCode !== 0) return null;
    return stdout.trim();
  }

  async install(onProgress?: (data: string) => void): Promise<boolean> {
    try {
        // Simulating install with npm
        // In reality, this might need sudo or permission handling depending on environment
        // For local development, we assume user has permissions
        const result = await executeCommand('npm install -g openclaw@latest');
        return result.exitCode === 0;
    } catch (e) {
        return false;
    }
  }

  async initProject(targetPath: string, llmConfig?: any): Promise<boolean> {
    try {
      targetPath = this.resolvePath(targetPath);
      await fs.mkdir(targetPath, { recursive: true });
      
      // Copy templates
      // Assuming templates are located at ../../../templates/openclaw-project relative to this file in src
      // Adjust path resolution based on your project structure and build output
      // Note: both src/services and dist/services are 3 levels deep from backend root
      // backend/src/services -> ../../../ -> repo root
      // backend/dist/services -> ../../../ -> repo root
      const templatePath = path.resolve(__dirname, '../../../templates/openclaw-project');
      
      console.log(`[OpenClaw] Init project: Copying templates from ${templatePath} to ${targetPath}`);
      console.log(`[OpenClaw] Current __dirname: ${__dirname}`);

      // Check if template exists
      try {
          await fs.access(templatePath);
      } catch {
          console.warn('[OpenClaw] Template path not found:', templatePath);
          return false;
      }

      // Recursive copy
      await fs.cp(templatePath, targetPath, { recursive: true });
      console.log('[OpenClaw] Templates copied successfully');
      
      const targetConfigPath = path.join(targetPath, 'openclaw.json');
      const templateConfigFile = path.join(targetPath, 'openclaw.json.template');

      // Process openclaw.json
      let configContent = '{}';
      
      // 1. Try to load from global config
      try {
          const globalConfigPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
          await fs.access(globalConfigPath);
          console.log(`[OpenClaw] Found global config at ${globalConfigPath}, using as base...`);
          configContent = await fs.readFile(globalConfigPath, 'utf-8');
      } catch (e) {
          // 2. Fallback to template
          try {
              console.log('[OpenClaw] No global config found, using default template');
              await fs.access(templateConfigFile);
              configContent = await fs.readFile(templateConfigFile, 'utf-8');
          } catch {
              console.warn('[OpenClaw] No config template found, using empty object');
          }
      }

      // 3. Ensure gateway mode is local (required for OpenClaw start)
      try {
          let config = JSON.parse(configContent);
          let modified = false;

          if (!config.gateway) {
              config.gateway = {};
              modified = true;
          }
          if (!config.gateway.mode) {
              config.gateway.mode = 'local';
              modified = true;
          }

          if (modified) {
              configContent = JSON.stringify(config, null, 2);
              console.log('[OpenClaw] Set gateway.mode to local');
          }
      } catch (e) {
          console.warn('[OpenClaw] Failed to parse config to check gateway mode:', e);
      }

              // 4. Merge LLM config if provided
              if (llmConfig && Object.keys(llmConfig).length > 0) {
                  try {
                      let config = JSON.parse(configContent);
                      
                      // Use "custom" as provider name for all custom baseUrl configurations
                      const providerName = llmConfig.baseUrl ? 'custom' : 'openai';
                      
                      let modelId = llmConfig.modelName || 'default-model';
                      
                      const fullModelId = `${providerName}/${modelId}`;

                      // 1. Write to new "llm" top-level structure
                      if (!config.llm) config.llm = {};
                      
                      config.llm.provider = providerName;
                      config.llm.model = modelId;
                      config.llm.apiKey = llmConfig.apiKey;
                      
                      if (llmConfig.baseUrl && llmConfig.baseUrl.trim() !== '') {
                          config.llm.baseUrl = llmConfig.baseUrl.trim();
                      }

                      // 2. ALSO write to "models.providers" structure
                      if (!config.models) config.models = {};
                      if (!config.models.providers) config.models.providers = {};
                      
                      const providerConfig: any = {
                          apiKey: llmConfig.apiKey,
                          api: 'openai-completions',
                          models: [
                              {
                                  id: modelId,
                                  name: modelId,
                                  api: 'openai-completions'
                              }
                          ]
                      };

                      if (llmConfig.baseUrl && llmConfig.baseUrl.trim() !== '') {
                          providerConfig.baseUrl = llmConfig.baseUrl.trim();
                      }
                      
                      config.models.providers[providerName] = providerConfig;

                      // 3. Update default agent model
                      if (!config.agents) config.agents = {};
                      if (!config.agents.defaults) config.agents.defaults = {};
                      if (!config.agents.defaults.model) config.agents.defaults.model = {};
                      
                      config.agents.defaults.model.primary = fullModelId;
                      
                      configContent = JSON.stringify(config, null, 2);
                      console.log('[OpenClaw] Merged LLM config into openclaw.json (dual-write llm + models)');
                  } catch (e) {
                      console.error('[OpenClaw] Failed to merge LLM config:', e);
                  }
              }

      // Write final config
      await fs.writeFile(targetConfigPath, configContent, 'utf-8');
      
      // Cleanup template file if it exists in target (since we read it or ignored it)
      try {
          await fs.unlink(templateConfigFile);
      } catch {}

      // Make scripts executable
      const scriptsDir = path.join(targetPath, 'scripts');
      try {
          const scripts = await fs.readdir(scriptsDir);
          for (const script of scripts) {
              if (script.endsWith('.sh')) {
                  await fs.chmod(path.join(scriptsDir, script), 0o755);
              }
          }
      } catch (e) {
          // Ignore if scripts dir doesn't exist (though it should)
      }

      const success = true;
      try {
        InitializationDAO.logInitialization({
            workspace_path: targetPath,
            status: 'SUCCESS',
            template_version: '1.0.0'
        });
      } catch (logError) {
        console.error('[OpenClaw] Failed to log initialization success:', logError);
      }

      return success;
    } catch (e: any) {
      console.error('[OpenClaw] Init project failed:', e);
      try {
        InitializationDAO.logInitialization({
            workspace_path: targetPath,
            status: 'FAILED',
            template_version: '1.0.0',
            error_message: e.message || String(e)
        });
      } catch (logError) {
        console.error('[OpenClaw] Failed to log initialization failure:', logError);
      }
      return false;
    }
  }

  private async resolveExecutablePath(): Promise<string> {
    try {
        const { stdout, exitCode } = await executeCommand('which openclaw');
        if (exitCode === 0 && stdout.trim()) {
            return stdout.trim();
        }
    } catch (e) {
        // ignore
    }
    return 'openclaw';
  }

  async start(port: number = 18789): Promise<{ pid?: number, port: number, success: boolean, webUrl?: string }> {
    // Reset previous URL
    this.currentWebUrl = undefined;
    const logFile = '/tmp/openclaw-gateway.log';
    
    // Ensure we kill any existing process on this port first
    await this.stop();
    // Wait a bit for port to release
    await new Promise(resolve => setTimeout(resolve, 1000));

    const startScript = path.join(this.workspacePath, 'scripts', 'start.sh');
    
    // Check if script exists
    try {
        await fs.access(startScript);
    } catch {
        console.error('[OpenClaw] Start script not found at:', startScript);
        return { port, success: false };
    }

    // Ensure openclaw.json exists in workspace before starting
    try {
        const workspaceConfig = path.join(this.workspacePath, 'openclaw.json');
        
        try {
            await fs.access(workspaceConfig);
        } catch {
             // If not found, restore
             console.warn('[OpenClaw] openclaw.json not found in workspace, attempting to restore from global config...');
             const globalConfigPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
             await fs.copyFile(globalConfigPath, workspaceConfig);
             console.log('[OpenClaw] Restored openclaw.json from global config');
        }

        // Auto-fix gateway.mode if missing (run even after restore)
        try {
            const configContent = await fs.readFile(workspaceConfig, 'utf-8');
            let config = JSON.parse(configContent);
            let modified = false;

            if (!config.gateway) {
                config.gateway = {};
                modified = true;
            }
            if (!config.gateway.mode) {
                config.gateway.mode = 'local';
                modified = true;
            }
            if (modified) {
                await fs.writeFile(workspaceConfig, JSON.stringify(config, null, 2), 'utf-8');
                console.log('[OpenClaw] Auto-fixed gateway.mode=local in openclaw.json before start');
            }
        } catch (parseError) {
             console.warn('[OpenClaw] Failed to parse openclaw.json for auto-fix:', parseError);
        }

    } catch (e) {
        console.error('[OpenClaw] Failed to ensure config, startup may fail:', e);
    }

    // Execute start script with workspace path and port
    // The script runs nohup and echoes PID
    // Force use of workspace script, not the one in source
    const workspaceStartScript = path.join(this.workspacePath, 'scripts', 'start.sh');
    const cmd = `OPENCLAW_STATE_DIR="${this.workspacePath}" bash "${workspaceStartScript}" "${this.workspacePath}" ${port}`;
    
    console.log(`[OpenClaw] Starting: ${cmd}`);
    
    try {
        const { stdout, exitCode, stderr } = await executeCommand(cmd);
        
        if (exitCode !== 0) {
            console.error('[OpenClaw] Start failed with exit code', exitCode);
            console.error('[OpenClaw] Stderr:', stderr);
            return { port, success: false };
        }

        let pid = parseInt(stdout.trim());
        if (isNaN(pid)) {
             // Try to parse PID from output if it contains extra text (e.g. echo from script)
             // The script echoes "Starting..." then PID. We want the last line or find a number.
             const lines = stdout.trim().split('\n');
             const lastLine = lines[lines.length - 1].trim();
             pid = parseInt(lastLine);
             
             if (isNaN(pid)) {
                 // Fallback: try to find any number in the output that looks like a PID
                 const match = stdout.match(/\b\d+\b/g);
                 if (match && match.length > 0) {
                     pid = parseInt(match[match.length - 1]);
                 }
             }
             
             if (isNaN(pid)) {
                 console.error('[OpenClaw] Failed to parse PID from script output:', stdout);
                 return { port, success: false };
             }
        }

        console.log(`[OpenClaw] Started with PID: ${pid}`);

        // Wait for URL to appear in log file
        let attempts = 0;
        while (!this.currentWebUrl && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
                const logContent = await fs.readFile(logFile, 'utf-8');
                // Regex 1: Match standard URL with token
                let match = logContent.match(/(http:\/\/(?:127\.0\.0\.1|localhost):\d+\/#token=[\w-]+)/);
                if (match) {
                    this.currentWebUrl = match[1];
                } else {
                    // Regex 2: Match simple address (e.g. "openclaw-gateway (127.0.0.1:18789)") and construct default URL
                    // Note: This assumes no auth or token required if not printed
                    match = logContent.match(/\((127\.0\.0\.1:\d+)\)/);
                    if (match) {
                         this.currentWebUrl = `http://${match[1]}`;
                    }
                }
            } catch (e) {
                // Log file might not exist yet
            }
            attempts++;
        }
        
        // If we still don't have a URL but we know the port, construct a fallback URL
        if (!this.currentWebUrl) {
            console.warn('[OpenClaw] Web URL not found in logs, using fallback.');
            this.currentWebUrl = `http://127.0.0.1:${port}`;
        }
        
        // Update status check to return this PID
        // Convert to proxy URL to bypass CSP restrictions
        return { pid, port, success: true, webUrl: this.convertToProxyUrl(this.currentWebUrl) };

    } catch (e) {
        console.error('[OpenClaw] Start error:', e);
        return { port, success: false };
    }
  }

  async stop(): Promise<boolean> {
    this.currentWebUrl = undefined;
    
    const stopScript = path.join(this.workspacePath, 'scripts', 'stop.sh');
    
    // Check if script exists
    try {
        await fs.access(stopScript);
    } catch {
        // Fallback to old method if script missing (e.g. old project)
        console.warn('[OpenClaw] Stop script not found, falling back to pkill');
        const cmd = `lsof -nP -iTCP:18789 -sTCP:LISTEN -t | xargs -r kill -9`;
        try {
            await executeCommand(cmd);
            await executeCommand('pkill -f "openclaw gateway"');
            return true;
        } catch (e) {
            // Ignore error if process not found
            return true;
        }
    }

    // Execute stop script with port
    const cmd = `bash "${stopScript}" "${this.workspacePath}" ${18789}`; // Assuming I will fix stop.sh to take workspace first
    try {
        await executeCommand(cmd);
        return true;
    } catch (e) {
        // Log but don't fail, maybe it's already stopped
        console.warn('[OpenClaw] Stop command failed or process already stopped:', e);
        return true;
    }
  }

  async getStatus(): Promise<{ running: boolean, pid?: number, webUrl?: string }> {
    // Check if process is running using lsof or ps
    const { stdout } = await executeCommand('lsof -nP -iTCP:18789 -sTCP:LISTEN -t');
    const pid = stdout.trim() ? parseInt(stdout.trim()) : undefined;

    if (pid) {
        // If running, try to read Web URL from logs if not set
        if (!this.currentWebUrl) {
             try {
                const logContent = await fs.readFile('/tmp/openclaw-gateway.log', 'utf-8');
                let match = logContent.match(/(http:\/\/(?:127\.0\.0\.1|localhost):\d+\/#token=[\w-]+)/);
                if (match) {
                    this.currentWebUrl = match[1];
                } else {
                    match = logContent.match(/\((127\.0\.0\.1:\d+)\)/);
                    if (match) {
                         this.currentWebUrl = `http://${match[1]}`;
                    }
                }
            } catch (e) {
                // ignore
            }
        }
        
        // Fallback if URL is still missing but we assume standard port (or read from start arg if we stored it)
        // Since we don't persist port, we assume 18789 or parse from lsof if we wanted to be robust
        if (!this.currentWebUrl) {
             // Try to find port from lsof output if possible, or default
             // The command `lsof -nP -iTCP:18789` implies we know the port is 18789
             this.currentWebUrl = `http://127.0.0.1:18789`;
        }

        // Convert to proxy URL to bypass CSP restrictions
        return { running: true, pid, webUrl: this.convertToProxyUrl(this.currentWebUrl) };
    }
    
    this.currentWebUrl = undefined;
    return { running: false };
  }

  async getProjectStatus(): Promise<{
    initialized: boolean;
    workspaceExists: boolean;
    scriptsExists: boolean;
    configExists: boolean;
    isInstalled: boolean;
    version: string | null;
  }> {
    const isInstalled = await this.checkInstalled();
    const version = await this.getVersion();
    
    // Ensure we use the resolved path for checking
    const resolvedPath = this.resolvePath(this.workspacePath);
    
    let workspaceExists = false;
    let scriptsExists = false;
    let configExists = false;

    try {
        await fs.access(resolvedPath);
        workspaceExists = true;
        
        await fs.access(path.join(resolvedPath, 'scripts'));
        scriptsExists = true;

        await fs.access(path.join(resolvedPath, 'openclaw.json'));
        configExists = true;
    } catch (e) {
        // Ignore errors, defaults are false
    }

    const initialized = workspaceExists && scriptsExists && configExists;

    return {
        initialized,
        workspaceExists,
        scriptsExists,
        configExists,
        isInstalled,
        version
    };
  }
}
