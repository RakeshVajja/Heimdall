import { Router, Response } from 'express';
import { llmRouter } from '../llm/LLMRouter.js';

const router = Router();

// List all models across providers with status
router.get('/', async (_req, res): Promise<void> => {
  const models = await llmRouter.listAllModels();
  res.json(models);
});

export default router;
