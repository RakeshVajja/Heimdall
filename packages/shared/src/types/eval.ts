export interface EvalTestCase {
  id: string;
  category: 'coding' | 'reasoning' | 'tool_use' | 'retrieval' | 'math' | 'instruction_following';
  prompt: string;
  expectedAnswer?: string;
  evaluationCriteria: string[];
  maxTokens?: number;
  tags: string[];
}

export interface MetricScore {
  accuracy: number; // 0 - 100
  latencyMs: number;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  estimatedCostUsd: number;
  toolCallCorrectness?: number; // 0 - 100
  reasoningQuality?: number; // 0 - 100
}

export interface EvalRunResult {
  id: string;
  testCaseId: string;
  provider: string;
  model: string;
  promptVersionId?: string;
  output: string;
  metrics: MetricScore;
  passed: boolean;
  notes?: string;
  executedAt: string;
}

export interface PromptVersion {
  id: string;
  skillId?: string;
  name: string;
  version: number;
  systemPrompt: string;
  userPromptTemplate?: string;
  description: string;
  isActive: boolean;
  benchmarkScores?: {
    avgAccuracy: number;
    avgLatencyMs: number;
    totalTokens: number;
  };
  createdAt: string;
}

export interface ModelBenchmarkSummary {
  provider: string;
  model: string;
  totalTests: number;
  passedTests: number;
  passRate: number; // 0 - 100%
  avgLatencyMs: number;
  p50LatencyMs: number;
  p90LatencyMs: number;
  avgTokensPerTest: number;
  totalEstimatedCostUsd: number;
  categoryScores: Record<string, number>;
}
