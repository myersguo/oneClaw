import { Tool } from '../services/tool-executor';
import { executeCommand } from '../utils/process-utils';

export const GrepFileTool: Tool = {
  name: 'grep_file',
  description: 'Search for text in files using grep.',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The regex pattern to search for.'
      },
      path: {
        type: 'string',
        description: 'The file or directory path to search in.'
      }
    },
    required: ['pattern']
  },
  execute: async ({ pattern, path: searchPath }) => {
    // Basic grep implementation using system grep
    // Security risk: pattern and path need sanitization in real world
    const cmd = `grep -r "${pattern}" "${searchPath || '.'}"`;
    return await executeCommand(cmd);
  }
};
