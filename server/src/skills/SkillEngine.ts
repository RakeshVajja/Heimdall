import { SkillDefinition } from '@heimdall/shared';
import { memoryDb } from '../db/models.js';

export class SkillEngine {
  async initialize(): Promise<void> {
    const existing = await memoryDb.skills.find();
    if (existing.length === 0) {
      await this.seedBuiltinSkills();
    }
  }

  private async seedBuiltinSkills(): Promise<void> {
    const builtinSkills: Omit<SkillDefinition, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Code Review Expert',
        slug: 'code-review-expert',
        description: 'Deep architectural and security code review, detecting vulnerabilities, edge conditions, and design anti-patterns',
        category: 'coding',
        systemPrompt: `You are an elite Staff Software Engineer and Security Auditor. When reviewing code:
1. Identify architectural anti-patterns and performance bottlenecks.
2. Flag security vulnerabilities (injection, auth bypass, race conditions).
3. Validate strict type safety, modularity, and maintainability.
4. Provide concrete, drop-in refactored code snippets with explanations.`,
        userPromptTemplate: 'Please review the following code snippet or repository context:\n\n```\n{{code}}\n```\n\nFocus Areas: {{focus_areas}}',
        allowedTools: ['filesystem', 'github', 'mcp_read_file', 'mcp_list_directory'],
        preferredProvider: 'groq',
        preferredModel: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        isBuiltIn: true,
        iconName: 'ShieldCheck',
        parameters: [
          { name: 'focus_areas', label: 'Focus Areas', type: 'string', defaultValue: 'Security, Performance, Types', required: false },
        ],
      },
      {
        name: 'Debugging Specialist',
        slug: 'debugging-specialist',
        description: 'Diagnoses complex bugs, race conditions, memory leaks, and stack traces with step-by-step root-cause analysis',
        category: 'debugging',
        systemPrompt: `You are a Principal Systems Debugger. Your objective is:
1. Reconstruct the failure timeline from error logs and stack traces.
2. Isolate the exact root cause in the call stack or asynchronous event loop.
3. Formulate a minimal reproduction scenario.
4. Deliver an authoritative patch that prevents regressions.`,
        allowedTools: ['filesystem', 'terminal', 'calculator', 'mcp_read_file'],
        preferredProvider: 'gemini',
        preferredModel: 'gemini-2.0-flash',
        temperature: 0.1,
        isBuiltIn: true,
        iconName: 'Bug',
        parameters: [],
      },

      {
        name: 'SQL Architect',
        slug: 'sql-architect',
        description: 'Designs relational schemas, complex analytical queries, index optimization, and migration strategies',
        category: 'database',
        systemPrompt: `You are a Principal Database Administrator and SQL Architect.
1. Formulate normalized schemas with strict foreign keys and index strategies.
2. Optimize slow queries, analyze execution plans (EXPLAIN), and eliminate table scans.
3. Write clean, idempotent migrations with rollbacks.`,
        allowedTools: ['mongodb_query', 'calculator', 'filesystem'],
        preferredProvider: 'groq',
        preferredModel: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        isBuiltIn: true,
        iconName: 'Database',
        parameters: [],
      },
      {
        name: 'Research Assistant',
        slug: 'research-assistant',
        description: 'Conducts deep internet and repository research, synthesizing factual summaries with verified citations',
        category: 'research',
        systemPrompt: `You are an Autonomous Research Scientist and Technical Synthesizer.
1. Deconstruct complex research questions into atomic search queries.
2. Use web search and GitHub tools to gather evidence.
3. Cross-reference facts, discard unreliable sources, and synthesize an executive summary.
4. Provide verified citations for every non-trivial claim.`,
        allowedTools: ['web_search', 'github', 'mcp_web_search_query', 'mcp_github_search_repos'],
        preferredProvider: 'gemini',
        preferredModel: 'gemini-2.0-flash',
        temperature: 0.3,
        isBuiltIn: true,
        iconName: 'Compass',
        parameters: [],
      },
    ];

    for (const skill of builtinSkills) {
      await memoryDb.skills.create(skill);
    }
    console.log(`[Skills] Seeded ${builtinSkills.length} built-in skills.`);
  }

  async getSkill(idOrSlug: string): Promise<SkillDefinition | null> {
    const byId = await memoryDb.skills.findById(idOrSlug);
    if (byId) return byId;
    return await memoryDb.skills.findOne({ slug: idOrSlug });
  }

  async listSkills(category?: string): Promise<SkillDefinition[]> {
    if (category) {
      return await memoryDb.skills.find({ category: category as any });
    }
    return await memoryDb.skills.find();
  }

  buildSkillPrompt(skill: SkillDefinition, userInput: string, params: Record<string, unknown> = {}): { systemPrompt: string; userPrompt: string } {
    let systemPrompt = skill.systemPrompt;
    let userPrompt = userInput;

    if (skill.userPromptTemplate) {
      userPrompt = skill.userPromptTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        if (key === 'code' || key === 'input') return userInput;
        return String(params[key] ?? '');
      });
    }

    return { systemPrompt, userPrompt };
  }
}

export const skillEngine = new SkillEngine();
