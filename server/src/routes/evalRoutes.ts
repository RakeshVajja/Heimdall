import { Router, Response } from 'express';
import { evalHarness } from '../eval/EvalHarness.js';
import { BENCHMARK_TEST_CASES } from '../eval/benchmarkCases.js';
import { memoryDb } from '../db/models.js';
import { runBenchmarkSchema, createPromptVersionSchema } from '@heimdall/shared';

const router = Router();

// List benchmark test cases
router.get('/test-cases', async (_req, res): Promise<void> => {
  res.json(BENCHMARK_TEST_CASES);
});

// Run automated benchmark
router.post('/run', async (req, res): Promise<void> => {
  const parse = runBenchmarkSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid benchmark parameters' });
    return;
  }

  const { providers, categoryFilter, testCaseIds } = parse.data;
  const results = await evalHarness.runBenchmark(providers, categoryFilter, testCaseIds);
  res.json(results);
});

// Get recent eval history
router.get('/results', async (_req, res): Promise<void> => {
  const results = await evalHarness.getRecentResults(100);
  res.json(results);
});

// List prompt versions
router.get('/prompts', async (req, res): Promise<void> => {
  const skillId = req.query.skillId as string | undefined;
  const list = skillId
    ? await memoryDb.promptVersions.find({ skillId })
    : await memoryDb.promptVersions.find();
  res.json(list);
});

// Create prompt version
router.post('/prompts', async (req, res): Promise<void> => {
  const parse = createPromptVersionSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid prompt version' });
    return;
  }

  const versions = await memoryDb.promptVersions.find({ name: parse.data.name });
  const nextVersion = versions.length + 1;

  const version = await memoryDb.promptVersions.create({
    ...parse.data,
    version: nextVersion,
    isActive: true,
  });

  res.status(201).json(version);
});

export default router;
