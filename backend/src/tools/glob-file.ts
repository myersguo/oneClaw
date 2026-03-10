import { glob } from 'glob';
import path from 'path';
import { Tool } from '../services/tool-executor';

export const GlobFileTool: Tool = {
  name: 'glob_file',
  description: 'Find files matching a glob pattern.',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The glob pattern to match (e.g., "**/*.ts").'
      },
      cwd: {
        type: 'string',
        description: 'The working directory to search in (relative to workspace root).'
      }
    },
    required: ['pattern']
  },
  execute: async ({ pattern, cwd }, context) => {
    const workspaceRoot = context?.workspacePath ? path.resolve(context.workspacePath) : process.cwd();
    
    // Determine the search directory
    let searchDir = workspaceRoot;
    if (cwd) {
        searchDir = path.resolve(workspaceRoot, cwd);
    }

    // Security check: ensure searchDir is within workspaceRoot
    if (!searchDir.startsWith(workspaceRoot)) {
         throw new Error('Access denied: Search directory is outside the allowed workspace.');
    }

    try {
        const files = await glob(pattern, { cwd: searchDir });
        return files;
    } catch (error: any) {
        throw new Error(`Glob failed: ${error.message}`);
    }
  }
};
