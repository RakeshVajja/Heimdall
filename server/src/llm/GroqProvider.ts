import Groq from 'groq-sdk';
import { LLMProvider } from './LLMProvider.js';
import {
  ChatMessage,
  CompletionOptions,
  LLMResponse,
  LLMStreamChunk,
  ModelInfo,
} from '@heimdall/shared';
import { config } from '../config/index.js';

export class GroqProvider implements LLMProvider {
  public type = 'groq' as const;
  private client: Groq | null = null;

  constructor() {
    if (config.providers.groqApiKey) {
      this.client = new Groq({ apiKey: config.providers.groqApiKey });
    }
  }

  async isAvailable(customApiKey?: string): Promise<boolean> {
    return !!customApiKey || !!this.client || !!config.providers.groqApiKey;
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile (Groq)',
        provider: 'groq',
        contextWindow: 128000,
        description: 'Ultra-fast high-reasoning flagship model hosted on Groq LPU',
        supportsStreaming: true,
        supportsTools: true,
        supportsEmbeddings: false,
        isAvailable: await this.isAvailable(),
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant (Groq)',
        provider: 'groq',
        contextWindow: 128000,
        description: 'Sub-100ms response speed instant model for fast tasks',
        supportsStreaming: true,
        supportsTools: true,
        supportsEmbeddings: false,
        isAvailable: await this.isAvailable(),
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B (Groq)',
        provider: 'groq',
        contextWindow: 32768,
        description: 'High-throughput mixture of experts model',
        supportsStreaming: true,
        supportsTools: true,
        supportsEmbeddings: false,
        isAvailable: await this.isAvailable(),
      },
    ];
  }

  private getClient(customApiKey?: string): Groq {
    const key = customApiKey || config.providers.groqApiKey;
    if (key) {
      return new Groq({ apiKey: key });
    }
    if (this.client) return this.client;
    throw new Error('Groq API Key is not configured. Add your key in Settings ⚙️ or set GROQ_API_KEY in .env.');
  }

  async generate(messages: ChatMessage[], options?: CompletionOptions): Promise<LLMResponse> {
    const client = this.getClient(options?.apiKeys?.groqApiKey);
    const startTime = Date.now();
    const model = options?.model || 'llama-3.3-70b-versatile';

    const formattedMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    if (options?.systemPrompt && !formattedMessages.some(m => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const response = await client.chat.completions.create({
      model,
      messages: formattedMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP ?? 1,
    });

    const choice = response.choices[0];
    const latencyMs = Date.now() - startTime;

    return {
      content: choice?.message?.content || '',
      provider: 'groq',
      model,
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      latencyMs,
      finishReason: choice?.finish_reason,
    };
  }

  async stream(
    messages: ChatMessage[],
    options?: CompletionOptions,
    onChunk?: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    const client = this.getClient(options?.apiKeys?.groqApiKey);
    const startTime = Date.now();
    const model = options?.model || 'llama-3.3-70b-versatile';

    const formattedMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    if (options?.systemPrompt && !formattedMessages.some(m => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const stream = await client.chat.completions.create({
      model,
      messages: formattedMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP ?? 1,
      stream: true,
    });

    let accumulated = '';
    let finishReason = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      accumulated += delta;
      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }

      if (onChunk && delta) {
        onChunk({
          delta,
          accumulated,
          isComplete: false,
        });
      }
    }

    const latencyMs = Date.now() - startTime;
    const estPromptTokens = Math.ceil(messages.map(m => m.content).join(' ').length / 4);
    const estCompletionTokens = Math.ceil(accumulated.length / 4);

    const finalResponse: LLMResponse = {
      content: accumulated,
      provider: 'groq',
      model,
      promptTokens: estPromptTokens,
      completionTokens: estCompletionTokens,
      totalTokens: estPromptTokens + estCompletionTokens,
      latencyMs,
      finishReason: finishReason || 'stop',
    };

    if (onChunk) {
      onChunk({
        delta: '',
        accumulated,
        isComplete: true,
        finishReason,
        promptTokens: estPromptTokens,
        completionTokens: estCompletionTokens,
      });
    }

    return finalResponse;
  }
}
