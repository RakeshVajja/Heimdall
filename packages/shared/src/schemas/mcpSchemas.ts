import { z } from 'zod';

export const mcpServerConfigSchema = z.object({
  name: z.string().min(1, 'Server name is required'),
  description: z.string().optional(),
  transport: z.enum(['stdio', 'sse', 'inprocess']).default('stdio'),
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
  url: z.string().url().optional(),
  isEnabled: z.boolean().default(true),
});

export const mcpExecuteToolSchema = z.object({
  serverId: z.string().min(1),
  toolName: z.string().min(1),
  arguments: z.record(z.unknown()).default({}),
});
