export type ToolSource = 'native' | 'mcp' | 'custom';

export interface ToolParameterSchema {
  type: string;
  description?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  source: ToolSource;
  parameters: ToolParameterSchema;
  category: 'system' | 'web' | 'database' | 'code' | 'filesystem' | 'utility';
  isSafe: boolean;
  mcpServerId?: string;
}

export interface ToolContext {
  userId: string;
  conversationId?: string;
  workspaceDir?: string;
  environment?: Record<string, string>;
}

export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
  executionTimeMs: number;
  metadata?: Record<string, unknown>;
}

export interface ToolExecutionSandboxConfig {
  timeoutMs: number;
  maxOutputLengthBytes: number;
  allowNetwork: boolean;
  allowFilesystemWrite: boolean;
}
