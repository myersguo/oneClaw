import fs from 'fs/promises';
import path from 'path';
import { Tool } from '../services/tool-executor';

export const WriteFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a file within the workspace. Creates directories if needed.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to write (relative to workspace root).'
      },
      content: {
        type: 'string',
        description: 'The content to write.'
      }
    },
    required: ['path', 'content']
  },
  execute: async ({ path: filePath, content }, context) => {
    const basePath = context?.workspacePath ? path.resolve(context.workspacePath) : process.cwd();
    const resolvedPath = path.isAbsolute(filePath) 
        ? path.resolve(filePath) 
        : path.resolve(basePath, filePath);
    
    // Security check: ensure path is within workspace
    if (!resolvedPath.startsWith(basePath)) {
        throw new Error('Access denied: Path is outside the allowed workspace.');
    }

    try {
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
        await fs.writeFile(resolvedPath, content, 'utf-8');
        return { success: true, path: resolvedPath };
    } catch (error: any) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
  }
};
