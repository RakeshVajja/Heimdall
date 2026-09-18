import { Router, Response } from 'express';
import { memoryDb } from '../db/models.js';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../auth/middleware.js';
import { createConversationSchema, updateConversationSchema, searchConversationSchema } from '@heimdall/shared';
import { memoryEngine } from '../memory/MemoryEngine.js';

const router = Router();

// List conversations
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'default_user';
  const list = await memoryDb.conversations.find({ userId });
  // Sort latest updated first
  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(list);
});

// Search conversations (Hybrid vector + keyword)
router.get('/search', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = searchConversationSchema.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid search parameters' });
    return;
  }

  const userId = req.user?.userId || 'default_user';
  const { query, limit } = parse.data;

  const results = await memoryEngine.hybridSearch(query, userId, limit);
  res.json(results);
});

// Create conversation
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = createConversationSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid input' });
    return;
  }

  const userId = req.user?.userId || 'default_user';
  const conv = await memoryDb.conversations.create({
    ...parse.data,
    userId,
    messageCount: 0,
    lastMessageAt: new Date().toISOString(),
  });

  res.status(201).json(conv);
});

// Get single conversation with messages
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const conv = await memoryDb.conversations.findById(req.params.id);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const messages = await memoryDb.messages.find({ conversationId: req.params.id });
  messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  res.json({ conversation: conv, messages });
});

// Update conversation
router.patch('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = updateConversationSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid input' });
    return;
  }

  const updated = await memoryDb.conversations.findByIdAndUpdate(req.params.id, parse.data);
  if (!updated) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  res.json(updated);
});

// Delete conversation
router.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const deleted = await memoryDb.conversations.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  // Clean up associated messages
  const msgs = await memoryDb.messages.find({ conversationId: req.params.id });
  for (const m of msgs) {
    await memoryDb.messages.findByIdAndDelete(m.id);
  }

  res.json({ success: true, message: 'Conversation and messages deleted' });
});

export default router;
