import { Router, Response } from 'express';
import { mcpManager } from '../mcp/MCPManager.js';
import { memoryDb } from '../db/models.js';
import { mcpServerConfigSchema } from '@heimdall/shared';

const router = Router();

// List all MCP servers
router.get('/servers', async (_req, res): Promise<void> => {
  const servers = await mcpManager.listServers();
  res.json(servers);
});

// Register new MCP server
router.post('/servers', async (req, res): Promise<void> => {
  const parse = mcpServerConfigSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid server configuration' });
    return;
  }

  const server = await memoryDb.mcpServers.create({
    ...parse.data,
    status: 'disconnected',
    discoveredToolsCount: 0,
  });

  // Attempt automatic connection
  if (server.isEnabled) {
    await mcpManager.connect(server.id);
  }

  const updated = await memoryDb.mcpServers.findById(server.id);
  res.status(201).json(updated || server);
});

// Connect / Reconnect server
router.post('/servers/:id/connect', async (req, res): Promise<void> => {
  const success = await mcpManager.connect(req.params.id);
  const server = await memoryDb.mcpServers.findById(req.params.id);
  if (!server) {
    res.status(404).json({ error: 'MCP Server not found' });
    return;
  }
  res.json({ success, server });
});

// Disconnect server
router.post('/servers/:id/disconnect', async (req, res): Promise<void> => {
  await mcpManager.disconnect(req.params.id);
  const server = await memoryDb.mcpServers.findById(req.params.id);
  res.json({ success: true, server });
});

// Delete MCP server
router.delete('/servers/:id', async (req, res): Promise<void> => {
  await mcpManager.disconnect(req.params.id);
  const deleted = await memoryDb.mcpServers.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'MCP Server not found' });
    return;
  }
  res.json({ success: true, message: 'MCP server removed' });
});

export default router;
