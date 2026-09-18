import { Router, Response } from 'express';
import { getDbStatus } from '../db/connection.js';
import { cache } from '../cache/redis.js';
import { vectorStore } from '../memory/VectorStore.js';
import { llmRouter } from '../llm/LLMRouter.js';
import { SystemHealthStatus } from '@heimdall/shared';

const router = Router();
const serverStartTime = Date.now();

// System Health & Diagnostics
router.get('/health', async (_req, res): Promise<void> => {
  const dbStatus = getDbStatus();
  const groqAvail = await (await llmRouter.getProviderInstance('groq')).isAvailable();
  const geminiAvail = await (await llmRouter.getProviderInstance('gemini')).isAvailable();
  const ollamaAvail = await (await llmRouter.getProviderInstance('ollama')).isAvailable();

  const health: SystemHealthStatus = {
    status: 'healthy',
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    database: {
      status: dbStatus.connected ? 'connected' : 'in_memory_fallback',
      type: dbStatus.type,
    },
    cache: {
      status: cache.isRedisConnected ? 'connected' : 'in_memory_fallback',
      type: cache.isRedisConnected ? 'redis' : 'memory',
    },
    vectorDb: {
      status: vectorStore.isQdrantConnected ? 'connected' : 'in_memory_fallback',
      type: vectorStore.isQdrantConnected ? 'qdrant' : 'memory',
    },
    providers: {
      groq: groqAvail,
      gemini: geminiAvail,
      ollama: ollamaAvail,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(health);
});

export default router;
