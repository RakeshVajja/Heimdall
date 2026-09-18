import {
  LLMProviderType,
  ModelInfo,
  ChatMessage,
  CompletionOptions,
  LLMResponse,
  LLMStreamChunk,
} from '@heimdall/shared';

export interface LLMProvider {
  type: LLMProviderType;
  isAvailable(): Promise<boolean>;
  listModels(): Promise<ModelInfo[]>;
  generate(messages: ChatMessage[], options?: CompletionOptions): Promise<LLMResponse>;
  stream(
    messages: ChatMessage[],
    options?: CompletionOptions,
    onChunk?: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse>;
  getEmbeddings?(text: string): Promise<number[]>;
}
