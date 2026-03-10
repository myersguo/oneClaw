import { ChatCompletionTool } from 'openai/resources/chat/completions';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute(params: any, context?: any): Promise<any>;
}

function typeMatches(expected: string, value: any): boolean {
  if (expected === 'string') return typeof value === 'string';
  if (expected === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (expected === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (expected === 'boolean') return typeof value === 'boolean';
  if (expected === 'array') return Array.isArray(value);
  if (expected === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  return true; // unknown type: be permissive
}

function validateParams(schema: any, params: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!schema || typeof schema !== 'object') return { ok: true, errors };

  // Only validate object schemas for now
  const expectedType = schema.type;
  if (expectedType && !typeMatches(expectedType, params)) {
    errors.push(`Expected params type '${expectedType}'`);
    return { ok: false, errors };
  }

  const required: string[] = Array.isArray(schema.required) ? schema.required : [];
  for (const key of required) {
    if (params?.[key] === undefined) {
      errors.push(`Missing required field: ${key}`);
    }
  }

  const properties = schema.properties;
  if (properties && typeof properties === 'object' && params && typeof params === 'object') {
    for (const [key, propSchema] of Object.entries<any>(properties)) {
      if (params[key] === undefined) continue;
      if (propSchema?.type && !typeMatches(propSchema.type, params[key])) {
        errors.push(`Field '${key}' expected type '${propSchema.type}'`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export class ToolExecutor {
  private tools: Map<string, Tool> = new Map();

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async execute(toolName: string, params: any, context?: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    try {
      const validation = validateParams(tool.parameters, params);
      if (!validation.ok) {
        return {
          status: 'error',
          error: `Invalid tool arguments: ${validation.errors.join('; ')}`,
        };
      }
      return await tool.execute(params, context);
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  getToolDefinitions(): ChatCompletionTool[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
}
