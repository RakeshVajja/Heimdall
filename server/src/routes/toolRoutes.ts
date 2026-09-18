import { Router, Response } from 'express';
import { toolRegistry } from '../tools/ToolRegistry.js';
import { executeToolSchema } from '@heimdall/shared';

const router = Router();

// List all registered tools
router.get('/', async (_req, res): Promise<void> => {
  const tools = toolRegistry.listTools();
  res.json(tools);
});

// Test execute a tool
router.post('/execute', async (req, res): Promise<void> => {
  const parse = executeToolSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid tool execution arguments' });
    return;
  }

  const { name, arguments: args } = parse.data;
  const result = await toolRegistry.executeTool(name, args);
  res.json(result);
});

export default router;
