import { Router, Response } from 'express';
import { skillEngine } from '../skills/SkillEngine.js';
import { memoryDb } from '../db/models.js';
import { createSkillSchema, updateSkillSchema } from '@heimdall/shared';
import { optionalAuth, AuthenticatedRequest } from '../auth/middleware.js';

const router = Router();

// List skills
router.get('/', async (req, res): Promise<void> => {
  const category = req.query.category as string | undefined;
  const skills = await skillEngine.listSkills(category);
  res.json(skills);
});

// Get skill by ID or Slug
router.get('/:idOrSlug', async (req, res): Promise<void> => {
  const skill = await skillEngine.getSkill(req.params.idOrSlug);
  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }
  res.json(skill);
});

// Create custom skill
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = createSkillSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid skill data' });
    return;
  }

  const existing = await memoryDb.skills.findOne({ slug: parse.data.slug });
  if (existing) {
    res.status(409).json({ error: 'A skill with this slug already exists' });
    return;
  }

  const skill = await memoryDb.skills.create({
    ...parse.data,
    isBuiltIn: false,
    authorId: req.user?.userId || 'default_user',
  });

  res.status(201).json(skill);
});

// Update skill
router.patch('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parse = updateSkillSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid skill data' });
    return;
  }

  const updated = await memoryDb.skills.findByIdAndUpdate(req.params.id, parse.data);
  if (!updated) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }

  res.json(updated);
});

// Delete skill
router.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const skill = await memoryDb.skills.findById(req.params.id);
  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }

  if (skill.isBuiltIn) {
    res.status(403).json({ error: 'Built-in core skills cannot be deleted' });
    return;
  }

  await memoryDb.skills.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Skill deleted' });
});

export default router;
