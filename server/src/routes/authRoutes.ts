import { Router, Response } from 'express';
import { memoryDb } from '../db/models.js';
import { generateTokens, verifyRefreshToken } from '../auth/jwt.js';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware.js';
import { loginSchema, registerSchema, userProfileUpdateSchema } from '@heimdall/shared';

const router = Router();

// Register
router.post('/register', async (req, res): Promise<void> => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid input' });
    return;
  }

  const { name, email } = parse.data;
  const existing = await memoryDb.users.findOne({ email });
  if (existing) {
    res.status(409).json({ error: 'User with this email already exists' });
    return;
  }

  const user = await memoryDb.users.create({
    name,
    email,
    role: 'user',
    preferences: {
      theme: 'dark',
      defaultProvider: 'groq',
      defaultModel: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      maxTokens: 4096,
      autoSaveContext: true,
      enableAgentTrace: true,
    },
  });

  const tokens = generateTokens(user);
  res.status(201).json({ user, tokens });
});

// Login
router.post('/login', async (req, res): Promise<void> => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid input' });
    return;
  }

  const { email } = parse.data;
  let user = await memoryDb.users.findOne({ email });

  // Auto-provision demo user if not yet registered for zero-friction access
  if (!user) {
    user = await memoryDb.users.create({
      name: email.split('@')[0] || 'Heimdall Explorer',
      email,
      role: 'user',
      preferences: {
        theme: 'dark',
        defaultProvider: 'groq',
        defaultModel: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        maxTokens: 4096,
        autoSaveContext: true,
        enableAgentTrace: true,
      },
    });
  }

  const tokens = generateTokens(user);
  res.json({ user, tokens });
});

// Refresh token
router.post('/refresh', async (req, res): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const user = await memoryDb.users.findById(payload.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const tokens = generateTokens(user);
  res.json({ user, tokens });
});

// Get profile
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await memoryDb.users.findById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

// Update profile
router.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parse = userProfileUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid input' });
    return;
  }

  const user = await memoryDb.users.findById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updatedPreferences = parse.data.preferences
    ? { ...user.preferences, ...parse.data.preferences }
    : user.preferences;

  const updated = await memoryDb.users.findByIdAndUpdate(req.user.userId, {
    ...(parse.data.name ? { name: parse.data.name } : {}),
    ...(parse.data.avatarUrl ? { avatarUrl: parse.data.avatarUrl } : {}),
    preferences: updatedPreferences,
  });

  res.json(updated);
});

export default router;
