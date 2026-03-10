import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionChunk } from 'openai/resources/chat/completions';

export interface LLMConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

function normalizeBaseURL(input: string): string {
  let url = (input || '').trim();
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // If user pasted full endpoint, strip it to OpenAI SDK baseURL
  // e.g. https://host/api/v3/chat/completions  -> https://host/api/v3
  // e.g. https://host/v1/chat/completions      -> https://host/v1
  url = url.replace(/\/chat\/completions$/, '');

  // In case it becomes empty after replacement
  return url || 'https://api.openai.com/v1';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(headers: any): number | null {
  try {
    const raw = headers?.get?.('retry-after') ?? headers?.['retry-after'];
    if (!raw) return null;
    const sec = Number(raw);
    if (Number.isFinite(sec) && sec > 0) return Math.min(sec * 1000, 10_000);
    return null;
  } catch {
    return null;
  }
}

function shouldRetry(error: any): boolean {
  const status = error?.status;
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500 && status <= 599) return true;
  // Network / timeout style errors
  const code = error?.code;
  if (code && ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED'].includes(code)) return true;
  return false;
}

export class OpenAIClient {
  private client: OpenAI;
  private model: string;

  constructor(config?: LLMConfig) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || 'dummy-key';
    const baseUrlRaw = config?.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const baseUrl = normalizeBaseURL(baseUrlRaw);

    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
    this.model = config?.model || process.env.OPENAI_MODEL || 'gpt-4-turbo';
  }

  async chat(
    messages: ChatCompletionMessageParam[],
    tools?: any[],
    options?: { signal?: AbortSignal }
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const maxRetries = 2;
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await this.client.chat.completions.create(
          {
            model: this.model,
            messages,
            tools: tools as any,
            tool_choice: tools ? 'auto' : undefined,
          },
          // OpenAI SDK supports AbortSignal via RequestOptions
          options?.signal ? ({ signal: options.signal } as any) : undefined
        );
      } catch (error: any) {
        attempt += 1;
        if (attempt > maxRetries || !shouldRetry(error)) {
          throw error;
        }

        const retryAfter = getRetryAfterMs(error?.headers);
        const backoff = Math.min(300 * Math.pow(2, attempt - 1), 2000);
        const jitter = Math.floor(Math.random() * 200);
        await sleep(retryAfter ?? backoff + jitter);
      }
    }
  }

  async *streamChat(
    messages: ChatCompletionMessageParam[],
    tools?: any[],
    options?: { signal?: AbortSignal }
  ): AsyncGenerator<ChatCompletionChunk> {
    // Only retry before stream starts; mid-stream failures are not retried here.
    const maxRetries = 2;
    let attempt = 0;
    let stream: any;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        stream = await this.client.chat.completions.create(
          {
            model: this.model,
            messages,
            tools: tools as any,
            tool_choice: tools ? 'auto' : undefined,
            stream: true,
          },
          // OpenAI SDK supports AbortSignal via RequestOptions
          options?.signal ? ({ signal: options.signal } as any) : undefined
        );
        break;
      } catch (error: any) {
        attempt += 1;
        if (attempt > maxRetries || !shouldRetry(error)) {
          throw error;
        }
        const retryAfter = getRetryAfterMs(error?.headers);
        const backoff = Math.min(300 * Math.pow(2, attempt - 1), 2000);
        const jitter = Math.floor(Math.random() * 200);
        await sleep(retryAfter ?? backoff + jitter);
      }
    }

    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
