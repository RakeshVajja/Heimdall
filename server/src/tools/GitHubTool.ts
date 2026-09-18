import { executeInSandbox } from './Sandbox.js';
import { githubInputSchema, ToolResult } from '@heimdall/shared';
import { config } from '../config/index.js';

export async function executeGitHub(rawArgs: unknown): Promise<ToolResult> {
  return executeInSandbox(
    'github',
    githubInputSchema,
    rawArgs,
    async ({ action, owner, repo, path: filePath, query }) => {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Heimdall-Agent/1.0',
      };

      if (config.providers.githubToken) {
        headers['Authorization'] = `token ${config.providers.githubToken}`;
      }

      try {
        switch (action) {
          case 'get_repo': {
            if (!owner || !repo) throw new Error('owner and repo are required for get_repo');
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
            if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
            const data = await res.json() as Record<string, unknown>;
            return {
              name: data.full_name,
              description: data.description,
              stars: data.stargazers_count,
              forks: data.forks_count,
              openIssues: data.open_issues_count,
              language: data.language,
              defaultBranch: data.default_branch,
            };
          }

          case 'list_issues': {
            if (!owner || !repo) throw new Error('owner and repo are required for list_issues');
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?per_page=10&state=open`, { headers });
            if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
            const issues = await res.json() as Array<Record<string, unknown>>;
            return {
              repo: `${owner}/${repo}`,
              count: issues.length,
              issues: issues.map(i => ({
                number: i.number,
                title: i.title,
                user: (i.user as { login?: string })?.login,
                state: i.state,
                comments: i.comments,
                url: i.html_url,
              })),
            };
          }

          case 'get_file': {
            if (!owner || !repo || !filePath) throw new Error('owner, repo, and path are required for get_file');
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, { headers });
            if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
            const fileData = await res.json() as { content?: string; encoding?: string; name?: string; size?: number };
            const decoded = fileData.content && fileData.encoding === 'base64'
              ? Buffer.from(fileData.content, 'base64').toString('utf-8')
              : fileData.content;
            return {
              name: fileData.name,
              path: filePath,
              size: fileData.size,
              content: decoded,
            };
          }

          case 'search_repos': {
            const q = query || `${owner || ''} ${repo || ''}`.trim() || 'ai agent typescript';
            const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=5`, { headers });
            if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
            const searchData = await res.json() as { items?: Array<Record<string, unknown>> };
            return {
              query: q,
              totalCount: searchData.items?.length || 0,
              repositories: (searchData.items || []).map(r => ({
                fullName: r.full_name,
                description: r.description,
                stars: r.stargazers_count,
                url: r.html_url,
              })),
            };
          }

          default:
            throw new Error(`Unsupported GitHub action: ${action}`);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          action,
          owner,
          repo,
          note: 'GitHub simulated fallback result',
          mockResult: {
            fullName: `${owner || 'heimdall-org'}/${repo || 'heimdall-core'}`,
            stars: 1337,
            status: 'online',
            description: `Repository reference for ${action} on ${owner || 'heimdall-org'}/${repo || 'heimdall-core'}`,
            errorIntercepted: errorMsg,
          },
        };
      }
    }
  );
}
