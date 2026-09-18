export type AgentPhase =
  | 'idle'
  | 'planning'
  | 'reasoning'
  | 'selecting_tool'
  | 'executing_tool'
  | 'observing'
  | 'synthesizing'
  | 'finished'
  | 'error';

export type AgentStepType =
  | 'plan'
  | 'thought'
  | 'tool_call'
  | 'tool_result'
  | 'reflection'
  | 'final_answer';

export interface AgentStep {
  id: string;
  stepNumber: number;
  type: AgentStepType;
  phase: AgentPhase;
  title: string;
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
  latencyMs?: number;
  status: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
  timestamp: string;
}

export interface AgentTrace {
  id: string;
  conversationId: string;
  userPrompt: string;
  steps: AgentStep[];
  totalSteps: number;
  totalLatencyMs: number;
  totalTokensUsed?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  startTime: string;
  endTime?: string;
}

export interface AgentExecutionConfig {
  maxSteps?: number;
  timeoutMs?: number;
  allowedTools?: string[];
  temperature?: number;
  provider?: 'groq' | 'gemini' | 'ollama';
  model?: string;
  skillId?: string;
  includeMemoryRetrieval?: boolean;
}

export interface AgentResult {
  answer: string;
  trace: AgentTrace;
  tokensUsed?: number;
  latencyMs: number;
}
