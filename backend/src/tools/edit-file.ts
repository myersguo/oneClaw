import fs from 'fs/promises';
import path from 'path';
import { Tool } from '../services/tool-executor';

export const EditFileTool: Tool = {
  name: 'edit_file',
  description: 'Edit a file by replacing a string. Supports optional backup.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to edit (relative to workspace root).'
      },
      search: {
        type: 'string',
        description: 'The string or regex pattern to search for.'
      },
      replace: {
        type: 'string',
        description: 'The string to replace with.'
      },
      all: {
        type: 'boolean',
        description: 'Whether to replace all occurrences (default: false).'
      }
    },
    required: ['path', 'search', 'replace']
  },
  execute: async ({ path: filePath, search, replace, all }) => {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Simple string replacement for now, regex support requires careful handling of user input
        // For safety, we treat search as literal string unless it looks like a regex (TODO)
        // Here we just use string replacement
        
        let newContent;
        if (all) {
            newContent = content.split(search).join(replace);
        } else {
            newContent = content.replace(search, replace);
        }
        
        if (content === newContent) {
            return { success: false, message: 'Search string not found.' };
        }

        // Create backup
        await fs.writeFile(`${filePath}.bak`, content, 'utf-8');
        await fs.writeFile(filePath, newContent, 'utf-8');
        
        return { success: true, path: filePath, backup: `${filePath}.bak` };
    } catch (error: any) {
        throw new Error(`Failed to edit file: ${error.message}`);
    }
  }
};
