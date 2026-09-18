import { z } from 'zod';

export const toolSourceSchema = z.enum(['native', 'mcp', 'custom']);

export const toolCategorySchema = z.enum([
  'system',
  'web',
  'database',
  'code',
  'filesystem',
  'utility',
]);

export const executeToolSchema = z.object({
  name: z.string().min(1),
  arguments: z.record(z.unknown()),
  conversationId: z.string().optional(),
});

// Specific tool argument schemas
export const calculatorInputSchema = z.object({
  expression: z.string().min(1, 'Expression is required (e.g. "sqrt(144) + 42 * 3")'),
});

export const weatherInputSchema = z.object({
  location: z.string().min(1, 'City or location name is required (e.g. "San Francisco" or "Tokyo")'),
  units: z.enum(['metric', 'imperial']).default('metric'),
});

export const webSearchInputSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  maxResults: z.number().min(1).max(10).default(5),
});

export const filesystemInputSchema = z.object({
  operation: z.enum(['read', 'write', 'list', 'delete', 'exists']),
  path: z.string().min(1, 'Path is required'),
  content: z.string().optional(),
});

export const mongodbQueryInputSchema = z.object({
  collection: z.string().min(1),
  operation: z.enum(['find', 'findOne', 'count', 'distinct']),
  filter: z.record(z.unknown()).default({}),
  limit: z.number().min(1).max(100).default(20),
});

export const githubInputSchema = z.object({
  action: z.enum(['get_repo', 'list_issues', 'get_file', 'search_repos', 'list_commits']),
  owner: z.string().optional(),
  repo: z.string().optional(),
  path: z.string().optional(),
  query: z.string().optional(),
});

export const terminalInputSchema = z.object({
  command: z.string().min(1, 'Command is required'),
  args: z.array(z.string()).default([]),
});
