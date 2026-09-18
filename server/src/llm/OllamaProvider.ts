import { LLMProvider } from './LLMProvider.js';
import {
  ChatMessage,
  CompletionOptions,
  LLMResponse,
  LLMStreamChunk,
  ModelInfo,
} from '@heimdall/shared';
import { config } from '../config/index.js';

export class OllamaProvider implements LLMProvider {
  public type = 'ollama' as const;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.providers.ollamaBaseUrl;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(1500),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const isAvail = await this.isAvailable();
    const defaultModels: ModelInfo[] = [
      {
        id: 'llama3.2:latest',
        name: 'Llama 3.2 (Ollama Local)',
        provider: 'ollama',
        contextWindow: 128000,
        description: 'Local lightweight, high-performance open model',
        supportsStreaming: true,
        supportsTools: true,
        supportsEmbeddings: true,
        isAvailable: isAvail,
      },
      {
        id: 'qwen2.5-coder:latest',
        name: 'Qwen 2.5 Coder (Ollama Local)',
        provider: 'ollama',
        contextWindow: 32768,
        description: 'Local coding and agent specialized model',
        supportsStreaming: true,
        supportsTools: true,
        supportsEmbeddings: true,
        isAvailable: isAvail,
      },
      {
        id: 'mistral:latest',
        name: 'Mistral (Ollama Local)',
        provider: 'ollama',
        contextWindow: 32768,
        description: 'Local general-purpose reasoning model',
        supportsStreaming: true,
        supportsTools: true,
        supportsEmbeddings: true,
        isAvailable: isAvail,
      },
    ];

    if (!isAvail) return defaultModels;

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (res.ok) {
        const data = await res.json() as { models?: Array<{ name: string; size: number }> };
        if (data.models && data.models.length > 0) {
          return data.models.map(m => ({
            id: m.name,
            name: `${m.name} (Local)`,
            provider: 'ollama',
            contextWindow: 32768,
            description: `Local Ollama model (${Math.round(m.size / (1024 * 1024 * 1024) * 10) / 10} GB)`,
            supportsStreaming: true,
            supportsTools: true,
            supportsEmbeddings: true,
            isAvailable: true,
          }));
        }
      }
    } catch {}

    return defaultModels;
  }

  async generate(messages: ChatMessage[], options?: CompletionOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = options?.model || 'llama3.2:latest';

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    if (options?.systemPrompt && !formattedMessages.some(m => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 4096,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama generation failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as {
      message?: { content: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const latencyMs = Date.now() - startTime;
    const content = data.message?.content || '';

    return {
      content,
      provider: 'ollama',
      model,
      promptTokens: data.prompt_eval_count || Math.ceil(messages.map(m => m.content).join(' ').length / 4),
      completionTokens: data.eval_count || Math.ceil(content.length / 4),
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      latencyMs,
      finishReason: 'stop',
    };
  }

  async stream(
    messages: ChatMessage[],
    options?: CompletionOptions,
    onChunk?: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = options?.model || 'llama3.2:latest';

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    if (options?.systemPrompt && !formattedMessages.some(m => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 4096,
        },
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama streaming failed: ${res.status} ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let promptTokens = 0;
    let completionTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      const lines = chunkText.split('\n').filter(l => l.trim().length > 0);

      for (const line of lines) {
        try {
          const json = JSON.parse(line) as {
            message?: { content: string };
            done?: boolean;
            prompt_eval_count?: number;
            eval_count?: number;
          };

          const delta = json.message?.content || '';
          accumulated += delta;
          if (json.prompt_eval_count) promptTokens = json.prompt_eval_count;
          if (json.eval_count) completionTokens = json.eval_count;

          if (onChunk && delta) {
            onChunk({
              delta,
              accumulated,
              isComplete: false,
            });
          }
        } catch {}
      }
    }

    const latencyMs = Date.now() - startTime;
    const finalResponse: LLMResponse = {
      content: accumulated,
      provider: 'ollama',
      model,
      promptTokens: promptTokens || Math.ceil(messages.map(m => m.content).join(' ').length / 4),
      completionTokens: completionTokens || Math.ceil(accumulated.length / 4),
      totalTokens: (promptTokens || 0) + (completionTokens || 0),
      latencyMs,
      finishReason: 'stop',
    };

    if (onChunk) {
      onChunk({
        delta: '',
        accumulated,
        isComplete: true,
        finishReason: 'stop',
        promptTokens: finalResponse.promptTokens,
        completionTokens: finalResponse.completionTokens,
      });
    }

    return finalResponse;
  }
}
