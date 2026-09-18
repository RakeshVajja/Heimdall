export type LLMProviderType = 'groq' | 'gemini' | 'ollama' | 'mock';

export interface ClientApiKeys {
  groqApiKey?: string;
  geminiApiKey?: string;
  ollamaBaseUrl?: string;
  tavilyApiKey?: string;
  githubToken?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProviderType;
  contextWindow: number;
  description: string;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsEmbeddings: boolean;
  costPer1kPromptTokens?: number;
  costPer1kCompletionTokens?: number;
  isAvailable: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
  apiKeys?: ClientApiKeys;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  signal?: AbortSignal;
}

export interface LLMStreamChunk {
  delta: string;
  accumulated: string;
  isComplete: boolean;
  finishReason?: string;
  promptTokens?: number;
  completionTokens?: number;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

export interface LLMResponse {
  content: string;
  provider: LLMProviderType;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  finishReason?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}
