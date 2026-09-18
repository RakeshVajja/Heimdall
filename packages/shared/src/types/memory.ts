export interface VectorRecord {
  id: string;
  vector: number[];
  payload: {
    userId: string;
    conversationId?: string;
    messageId?: string;
    type: 'message' | 'preference' | 'context' | 'document';
    text: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
  };
}

export interface MemorySearchResult {
  id: string;
  score: number;
  type: string;
  text: string;
  conversationId?: string;
  messageId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SemanticContext {
  userId: string;
  retrievedMemories: MemorySearchResult[];
  userPreferencesSummary?: string;
  projectContextSummary?: string;
}

export interface ProjectContext {
  id: string;
  userId: string;
  name: string;
  description: string;
  instructions: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
