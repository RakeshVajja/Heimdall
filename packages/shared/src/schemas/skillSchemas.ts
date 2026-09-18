import { z } from 'zod';

export const skillParameterSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'select']),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
  required: z.boolean().default(false),
});

export const createSkillSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and dashes'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.enum(['coding', 'debugging', 'testing', 'database', 'research', 'writing', 'custom']),
  systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  userPromptTemplate: z.string().optional(),
  allowedTools: z.array(z.string()).default([]),
  preferredProvider: z.enum(['groq', 'gemini', 'ollama']).optional(),
  preferredModel: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  parameters: z.array(skillParameterSchema).default([]),
  iconName: z.string().optional(),
});

export const updateSkillSchema = createSkillSchema.partial();
