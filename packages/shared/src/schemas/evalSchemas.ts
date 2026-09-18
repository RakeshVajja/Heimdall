import { z } from 'zod';

export const runBenchmarkSchema = z.object({
  providers: z.array(z.enum(['groq', 'gemini', 'ollama', 'mock'])).min(1),
  models: z.record(z.string()).optional(),
  categoryFilter: z.string().optional(),
  testCaseIds: z.array(z.string()).optional(),
  promptVersionId: z.string().optional(),
});

export const createPromptVersionSchema = z.object({
  skillId: z.string().optional(),
  name: z.string().min(2),
  systemPrompt: z.string().min(10),
  userPromptTemplate: z.string().optional(),
  description: z.string().min(2),
});
