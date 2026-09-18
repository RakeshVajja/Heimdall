import { LLMProvider } from './LLMProvider.js';
import { GroqProvider } from './GroqProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import { MockProvider } from './MockProvider.js';
import {
  LLMProviderType,
  ModelInfo,
  ChatMessage,
  CompletionOptions,
  LLMResponse,
  LLMStreamChunk,
  ClientApiKeys,
} from '@heimdall/shared';

export class LLMRouter {
  private providers: Map<LLMProviderType, LLMProvider> = new Map();
  private groq: GroqProvider;
  private gemini: GeminiProvider;
  private ollama: OllamaProvider;
  private mock: MockProvider;

  constructor() {
    this.groq = new GroqProvider();
    this.gemini = new GeminiProvider();
    this.ollama = new OllamaProvider();
    this.mock = new MockProvider();

    this.providers.set('groq', this.groq);
    this.providers.set('gemini', this.gemini);
    this.providers.set('ollama', this.ollama);
    this.providers.set('mock', this.mock);
  }

  async getProvider(type?: LLMProviderType, apiKeys?: ClientApiKeys): Promise<LLMProvider> {
    if (type === 'groq') {
      if (await this.groq.isAvailable(apiKeys?.groqApiKey)) return this.groq;
    } else if (type === 'gemini') {
      if (await this.gemini.isAvailable(apiKeys?.geminiApiKey)) return this.gemini;
    } else if (type === 'ollama') {
      if (await this.ollama.isAvailable()) return this.ollama;
    } else if (type === 'mock') {
      return this.mock;
    }

    // Dynamic resolution chain: Groq -> Gemini -> Ollama -> Mock
    if (await this.groq.isAvailable(apiKeys?.groqApiKey)) return this.groq;
    if (await this.gemini.isAvailable(apiKeys?.geminiApiKey)) return this.gemini;
    if (await this.ollama.isAvailable()) return this.ollama;

    return this.mock;
  }

  async listAllModels(): Promise<ModelInfo[]> {
    const lists = await Promise.all([
      this.groq.listModels(),
      this.gemini.listModels(),
      this.ollama.listModels(),
      this.mock.listModels(),
    ]);
    return lists.flat();
  }

  async generate(
    messages: ChatMessage[],
    options?: CompletionOptions & { provider?: LLMProviderType }
  ): Promise<LLMResponse> {
    const targetProvider = await this.getProvider(options?.provider, options?.apiKeys);

    try {
      return await targetProvider.generate(messages, options);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[LLMRouter] Provider ${targetProvider.type} failed (${errorMsg}). Attempting fallback to intelligent response engine...`);
      return await this.mock.generate(messages, options);
    }
  }

  async stream(
    messages: ChatMessage[],
    options?: CompletionOptions & { provider?: LLMProviderType },
    onChunk?: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    const targetProvider = await this.getProvider(options?.provider, options?.apiKeys);

    try {
      return await targetProvider.stream(messages, options, onChunk);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[LLMRouter] Streaming failed on ${targetProvider.type} (${errorMsg}). Falling back to intelligent response engine...`);
      return await this.mock.stream(messages, options, onChunk);
    }
  }

  async getEmbeddings(text: string, customApiKey?: string): Promise<number[]> {
    if (await this.gemini.isAvailable(customApiKey)) {
      try {
        return await this.gemini.getEmbeddings(text, customApiKey);
      } catch {}
    }
    return await this.mock.getEmbeddings(text);
  }

  getProviderInstance(type: LLMProviderType): LLMProvider {
    return this.providers.get(type) || this.mock;
  }
}

export const llmRouter = new LLMRouter();
