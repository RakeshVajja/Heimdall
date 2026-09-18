import { z } from 'zod';

export const messageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);

export const toolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.unknown()),
});

export const toolCallResultSchema = z.object({
  toolCallId: z.string(),
  name: z.string(),
  result: z.unknown(),
  error: z.string().optional(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  content: z.string().min(1, 'Message content cannot be empty'),
  provider: z.enum(['groq', 'gemini', 'ollama']).optional(),
  model: z.string().optional(),
  skillId: z.string().optional(),
  enableAgentMode: z.boolean().default(false),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
});

export const createConversationSchema = z.object({
  title: z.string().min(1).default('New Conversation'),
  provider: z.enum(['groq', 'gemini', 'ollama']).default('groq'),
  model: z.string().default('llama-3.3-70b-versatile'),
  systemPrompt: z.string().optional(),
  skillId: z.string().optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
  skillId: z.string().nullable().optional(),
  systemPrompt: z.string().optional(),
});

export const searchConversationSchema = z.object({
  query: z.string().min(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  searchType: z.enum(['keyword', 'semantic', 'hybrid']).default('hybrid'),
});
