import { z } from 'zod';

export const agentPhaseSchema = z.enum([
  'idle',
  'planning',
  'reasoning',
  'selecting_tool',
  'executing_tool',
  'observing',
  'synthesizing',
  'finished',
  'error',
]);

export const agentStepTypeSchema = z.enum([
  'plan',
  'thought',
  'tool_call',
  'tool_result',
  'reflection',
  'final_answer',
]);

export const agentExecutionConfigSchema = z.object({
  maxSteps: z.number().min(1).max(25).default(10),
  timeoutMs: z.number().min(5000).max(180000).default(60000),
  allowedTools: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(1.5).default(0.2),
  provider: z.enum(['groq', 'gemini', 'ollama']).default('groq'),
  model: z.string().optional(),
  skillId: z.string().optional(),
  includeMemoryRetrieval: z.boolean().default(true),
});

export const runAgentSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  conversationId: z.string().optional(),
  config: agentExecutionConfigSchema.optional(),
});
