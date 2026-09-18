import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from './LLMProvider.js';
import {
  ChatMessage,
  CompletionOptions,
  LLMResponse,
  LLMStreamChunk,
  ModelInfo,
} from '@heimdall/shared';
import { config } from '../config/index.js';

export class GeminiProvider implements LLMProvider {
  public type = 'gemini' as const;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.providers.geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(config.providers.geminiApiKey);
    }
  }

  async isAvailable(customApiKey?: string): Promise<boolean> {
    return !!customApiKey || !!this.genAI || !!config.providers.geminiApiKey;
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash (Google)',
        provider: 'gemini',
        contextWindow: 1048576,
        description: 'Next-gen multimodal high-speed intelligence with 1M context',
        supportsStreaming: true,
        supportsTools: true,
        supportsEmbeddings: true,
        isAvailable: await this.isAvailable(),
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro (Google)',
        provider: 'gemini',
        contextWindow: 2097152,
        description: 'Ultra-deep context window flagship reasoning model',
        supportsStreaming: true,
        supportsTools: true,
        supportsEmbeddings: true,
        isAvailable: await this.isAvailable(),
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash (Google)',
        provider: 'gemini',
        contextWindow: 1048576,
        description: 'Lightweight, rapid response workhorse model',
        supportsStreaming: true,
        supportsTools: true,
        supportsEmbeddings: true,
        isAvailable: await this.isAvailable(),
      },
    ];
  }

  private getClient(customApiKey?: string): GoogleGenerativeAI {
    const key = customApiKey || config.providers.geminiApiKey;
    if (key) {
      return new GoogleGenerativeAI(key);
    }
    if (this.genAI) return this.genAI;
    throw new Error('Gemini API Key is not configured. Add your key in Settings ⚙️ or set GEMINI_API_KEY in .env.');
  }

  async generate(messages: ChatMessage[], options?: CompletionOptions): Promise<LLMResponse> {
    const ai = this.getClient(options?.apiKeys?.geminiApiKey);
    const startTime = Date.now();
    const modelName = options?.model || 'gemini-2.0-flash';

    const systemInstruction = options?.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const model = ai.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
        topP: options?.topP ?? 0.95,
      },
    });

    const conversationMessages = messages.filter(m => m.role !== 'system');
    const contents = conversationMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const result = await model.generateContent({ contents });
    const response = result.response;
    const text = response.text();
    const latencyMs = Date.now() - startTime;

    const estPromptTokens = Math.ceil(messages.map(m => m.content).join(' ').length / 4);
    const estCompletionTokens = Math.ceil(text.length / 4);

    return {
      content: text,
      provider: 'gemini',
      model: modelName,
      promptTokens: estPromptTokens,
      completionTokens: estCompletionTokens,
      totalTokens: estPromptTokens + estCompletionTokens,
      latencyMs,
      finishReason: 'stop',
    };
  }

  async stream(
    messages: ChatMessage[],
    options?: CompletionOptions,
    onChunk?: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    const ai = this.getClient(options?.apiKeys?.geminiApiKey);
    const startTime = Date.now();
    const modelName = options?.model || 'gemini-2.0-flash';

    const systemInstruction = options?.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const model = ai.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
        topP: options?.topP ?? 0.95,
      },
    });

    const conversationMessages = messages.filter(m => m.role !== 'system');
    const contents = conversationMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const resultStream = await model.generateContentStream({ contents });
    let accumulated = '';

    for await (const chunk of resultStream.stream) {
      const delta = chunk.text();
      accumulated += delta;

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
      provider: 'gemini',
      model: modelName,
      promptTokens: estPromptTokens,
      completionTokens: estCompletionTokens,
      totalTokens: estPromptTokens + estCompletionTokens,
      latencyMs,
      finishReason: 'stop',
    };

    if (onChunk) {
      onChunk({
        delta: '',
        accumulated,
        isComplete: true,
        finishReason: 'stop',
        promptTokens: estPromptTokens,
        completionTokens: estCompletionTokens,
      });
    }

    return finalResponse;
  }

  async getEmbeddings(text: string, customApiKey?: string): Promise<number[]> {
    const ai = this.getClient(customApiKey);
    const embeddingModel = ai.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  }
}
