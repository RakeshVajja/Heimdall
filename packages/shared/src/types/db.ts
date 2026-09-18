export interface WorkspaceEntity {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  database: {
    status: 'connected' | 'in_memory_fallback' | 'disconnected';
    type: 'mongodb' | 'memory';
  };
  cache: {
    status: 'connected' | 'in_memory_fallback' | 'disconnected';
    type: 'redis' | 'memory';
  };
  vectorDb: {
    status: 'connected' | 'in_memory_fallback' | 'disconnected';
    type: 'qdrant' | 'memory';
  };
  providers: {
    groq: boolean;
    gemini: boolean;
    ollama: boolean;
  };
  timestamp: string;
}
