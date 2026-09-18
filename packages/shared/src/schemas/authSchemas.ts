import { z } from 'zod';

export const userPreferencesSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).default('dark'),
  defaultProvider: z.enum(['groq', 'gemini', 'ollama']).default('groq'),
  defaultModel: z.string().default('llama-3.3-70b-versatile'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(64).max(32768).default(4096),
  autoSaveContext: z.boolean().default(true),
  enableAgentTrace: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const userProfileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
  preferences: userPreferencesSchema.partial().optional(),
});
