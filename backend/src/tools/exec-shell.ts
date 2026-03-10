import { Tool } from '../services/tool-executor';
import { executeCommand } from '../utils/process-utils';

export const ExecShellTool: Tool = {
  name: 'exec_shell',
  description: 'Execute a shell command. Use with caution.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The command to execute.'
      }
    },
    required: ['command']
  },
  execute: async ({ command }, context) => {
    // TODO: Whitelist or strict validation
    const blacklist = ['rm -rf /', ':(){:|:&};:']; 
    if (blacklist.some(b => command.includes(b))) {
        throw new Error('Command blocked by security policy.');
    }
    
    // Inject workspace path as environment variable if available in context
    const env: Record<string, string> = {};
    if (context?.workspacePath) {
        env['OPENCLAW_STATE_DIR'] = context.workspacePath;
    }
    
    return await executeCommand(command, undefined, env);
  }
};
