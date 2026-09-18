import { Router, Response } from 'express';
import { memoryEngine } from '../memory/MemoryEngine.js';
import { vectorStore } from '../memory/VectorStore.js';
import { optionalAuth, AuthenticatedRequest } from '../auth/middleware.js';

const router = Router();

// Query semantic memory
router.post('/query', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query, limit } = req.body as { query?: string; limit?: number };
  if (!query) {
    res.status(400).json({ error: 'Query string is required' });
    return;
  }

  const userId = req.user?.userId || 'default_user';
  const results = await memoryEngine.hybridSearch(query, userId, limit || 5);
  res.json(results);
});

// Get vector memory stats
router.get('/stats', async (_req, res): Promise<void> => {
  const count = await vectorStore.count();
  res.json({
    totalVectors: count,
    backend: vectorStore.isQdrantConnected ? 'qdrant_cloud' : 'in_memory_cosine',
    dimensions: 384,
  });
});

export default router;
