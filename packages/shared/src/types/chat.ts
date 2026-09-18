import { AgentTrace } from './agent.js';
import { ClientApiKeys } from './llm.js';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCallPayload {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResultPayload {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
}

export interface MessageMetadata {
  provider?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  costUsd?: number;
  finishReason?: string;
  toolCalls?: ToolCallPayload[];
  toolResults?: ToolCallResultPayload[];
  trace?: AgentTrace;
  skillId?: string;
  skillName?: string;
  retrievedMemoryIds?: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  provider: 'groq' | 'gemini' | 'ollama';
  model: string;
  systemPrompt?: string;
  skillId?: string | null;
  isPinned?: boolean;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessagePayload {
  conversationId?: string;
  content: string;
  provider?: 'groq' | 'gemini' | 'ollama';
  model?: string;
  skillId?: string;
  enableAgentMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  apiKeys?: ClientApiKeys;
}

export interface ConversationSummary {
  id: string;
  title: string;
  provider: string;
  model: string;
  skillId?: string;
  lastMessageSnippet: string;
  messageCount: number;
  updatedAt: string;
}

export interface ChatStreamChunk {
  conversationId: string;
  messageId: string;
  delta: string;
  accumulated: string;
  isComplete: boolean;
  metadata?: MessageMetadata;
  error?: string;
}
