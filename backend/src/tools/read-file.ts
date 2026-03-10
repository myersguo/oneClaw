import fs from 'fs/promises';
import path from 'path';
import { Tool } from '../services/tool-executor';

export const ReadFileTool: Tool = {
  name: 'read_file',
  description: 'Read the content of a file within the workspace.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to read (relative to workspace root).'
      },
      lines: {
        type: 'object',
        properties: {
            start: { type: 'number' },
            end: { type: 'number' }
        },
        description: 'Optional range of lines to read (1-based).'
      }
    },
    required: ['path']
  },
  execute: async ({ path: filePath, lines }, context) => {
    const basePath = context?.workspacePath ? path.resolve(context.workspacePath) : process.cwd();
    const resolvedPath = path.isAbsolute(filePath) 
        ? path.resolve(filePath) 
        : path.resolve(basePath, filePath);
    
    // Security check: ensure path is within workspace
    if (!resolvedPath.startsWith(basePath)) {
        throw new Error('Access denied: Path is outside the allowed workspace.');
    }

    try {
        const content = await fs.readFile(resolvedPath, 'utf-8');
        if (lines) {
            const allLines = content.split('\n');
            const start = Math.max(0, lines.start - 1);
            const end = Math.min(allLines.length, lines.end);
            return allLines.slice(start, end).join('\n');
        }
        return content;
    } catch (error: any) {
        throw new Error(`Failed to read file: ${error.message}`);
    }
  }
};
