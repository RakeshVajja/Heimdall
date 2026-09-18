import {
  Conversation,
  Message,
  SkillDefinition,
  MCPServerConfig,
  ToolDefinition,
  ToolResult,
  ModelInfo,
  SystemHealthStatus,
  ModelBenchmarkSummary,
  EvalRunResult,
  EvalTestCase,
  PromptVersion,
  MemorySearchResult,
  User,
} from '@heimdall/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('heimdall_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (email: string) => request<{ user: User; tokens: { accessToken: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  getProfile: () => request<User>('/auth/profile'),

  // Conversations
  listConversations: () => request<Conversation[]>('/conversations'),
  getConversation: (id: string) => request<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
  createConversation: (data: { title?: string; provider?: string; model?: string; skillId?: string }) =>
    request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateConversation: (id: string, data: Partial<Conversation>) =>
    request<Conversation>(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteConversation: (id: string) => request<{ success: boolean }>(`/conversations/${id}`, { method: 'DELETE' }),
  searchConversations: (query: string) => request<MemorySearchResult[]>(`/conversations/search?query=${encodeURIComponent(query)}`),

  // Skills
  listSkills: (category?: string) => request<SkillDefinition[]>(`/skills${category ? `?category=${category}` : ''}`),
  getSkill: (idOrSlug: string) => request<SkillDefinition>(`/skills/${idOrSlug}`),
  createSkill: (data: Partial<SkillDefinition>) => request<SkillDefinition>('/skills', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteSkill: (id: string) => request<{ success: boolean }>(`/skills/${id}`, { method: 'DELETE' }),

  // MCP
  listMcpServers: () => request<MCPServerConfig[]>('/mcp/servers'),
  createMcpServer: (data: Partial<MCPServerConfig>) => request<MCPServerConfig>('/mcp/servers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  connectMcpServer: (id: string) => request<{ success: boolean; server: MCPServerConfig }>(`/mcp/servers/${id}/connect`, { method: 'POST' }),
  disconnectMcpServer: (id: string) => request<{ success: boolean; server: MCPServerConfig }>(`/mcp/servers/${id}/disconnect`, { method: 'POST' }),
  deleteMcpServer: (id: string) => request<{ success: boolean }>(`/mcp/servers/${id}`, { method: 'DELETE' }),

  // Tools
  listTools: () => request<ToolDefinition[]>('/tools'),
  executeTool: (name: string, args: Record<string, unknown>) => request<ToolResult>('/tools/execute', {
    method: 'POST',
    body: JSON.stringify({ name, arguments: args }),
  }),

  // Memory
  queryMemory: (query: string, limit = 5) => request<MemorySearchResult[]>('/memory/query', {
    method: 'POST',
    body: JSON.stringify({ query, limit }),
  }),
  getMemoryStats: () => request<{ totalVectors: number; backend: string; dimensions: number }>('/memory/stats'),

  // Evaluations
  getTestCases: () => request<EvalTestCase[]>('/eval/test-cases'),
  runBenchmark: (providers: string[], categoryFilter?: string) => request<{ summaries: ModelBenchmarkSummary[]; detailedResults: EvalRunResult[] }>('/eval/run', {
    method: 'POST',
    body: JSON.stringify({ providers, categoryFilter }),
  }),
  getEvalResults: () => request<EvalRunResult[]>('/eval/results'),
  listPromptVersions: () => request<PromptVersion[]>('/eval/prompts'),

  // Models & System
  listModels: () => request<ModelInfo[]>('/models'),
  getHealth: () => request<SystemHealthStatus>('/system/health'),
};
