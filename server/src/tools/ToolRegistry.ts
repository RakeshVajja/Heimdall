import {
  ToolDefinition,
  ToolResult,
} from '@heimdall/shared';
import { executeCalculator } from './CalculatorTool.js';
import { executeWeather } from './WeatherTool.js';
import { executeWebSearch } from './WebSearchTool.js';
import { executeFilesystem } from './FilesystemTool.js';
import { executeMongoQuery } from './MongoQueryTool.js';
import { executeGitHub } from './GitHubTool.js';
import { executeTerminal } from './TerminalTool.js';

export type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolResult>;

export interface RegisteredTool {
  definition: ToolDefinition;
  executor: ToolExecutor;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  constructor() {
    this.registerNativeTools();
  }

  private registerNativeTools() {
    // 1. Calculator
    this.register({
      definition: {
        id: 'calculator',
        name: 'calculator',
        description: 'Safely evaluate mathematical and arithmetic expressions (e.g. sqrt, log, trigonometrics, arithmetic formulas)',
        source: 'native',
        category: 'utility',
        isSafe: true,
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Mathematical expression to compute (e.g. "sqrt(256) * 12 + 45")' },
          },
          required: ['expression'],
        },
      },
      executor: executeCalculator,
    });

    // 2. Weather
    this.register({
      definition: {
        id: 'weather',
        name: 'weather',
        description: 'Get current weather and meteorological conditions for any city or coordinate worldwide',
        source: 'native',
        category: 'web',
        isSafe: true,
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name or geographical location (e.g. "Tokyo", "London")' },
            units: { type: 'string', enum: ['metric', 'imperial'], description: 'Units system ("metric" for Celsius, "imperial" for Fahrenheit)' },
          },
          required: ['location'],
        },
      },
      executor: executeWeather,
    });

    // 3. Web Search
    this.register({
      definition: {
        id: 'web_search',
        name: 'web_search',
        description: 'Search the live internet for recent information, documentation, news, or technical specs using Tavily / DuckDuckGo',
        source: 'native',
        category: 'web',
        isSafe: true,
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query to look up on the web' },
            maxResults: { type: 'number', description: 'Maximum number of results to return (1-10)' },
          },
          required: ['query'],
        },
      },
      executor: executeWebSearch,
    });

    // 4. Filesystem Sandbox
    this.register({
      definition: {
        id: 'filesystem',
        name: 'filesystem',
        description: 'Read, write, list, delete, or inspect files inside the isolated project sandbox directory',
        source: 'native',
        category: 'filesystem',
        isSafe: true,
        parameters: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['read', 'write', 'list', 'delete', 'exists'], description: 'Filesystem operation' },
            path: { type: 'string', description: 'Relative path within the workspace sandbox' },
            content: { type: 'string', description: 'File content when writing a file' },
          },
          required: ['operation', 'path'],
        },
      },
      executor: executeFilesystem,
    });

    // 5. MongoDB Query
    this.register({
      definition: {
        id: 'mongodb_query',
        name: 'mongodb_query',
        description: 'Query Heimdall document collections (conversations, messages, skills, mcpServers, evaluations)',
        source: 'native',
        category: 'database',
        isSafe: true,
        parameters: {
          type: 'object',
          properties: {
            collection: { type: 'string', description: 'Collection name to query' },
            operation: { type: 'string', enum: ['find', 'findOne', 'count'], description: 'Query operation' },
            filter: { type: 'object', description: 'Query filter criteria object' },
            limit: { type: 'number', description: 'Max documents to return' },
          },
          required: ['collection', 'operation'],
        },
      },
      executor: executeMongoQuery,
    });

    // 6. GitHub
    this.register({
      definition: {
        id: 'github',
        name: 'github',
        description: 'Inspect public GitHub repositories, search code, list open issues, and inspect commits',
        source: 'native',
        category: 'code',
        isSafe: true,
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['get_repo', 'list_issues', 'get_file', 'search_repos'], description: 'GitHub API action' },
            owner: { type: 'string', description: 'GitHub username or organization' },
            repo: { type: 'string', description: 'Repository name' },
            path: { type: 'string', description: 'File path within the repository' },
            query: { type: 'string', description: 'Search term when searching repositories' },
          },
          required: ['action'],
        },
      },
      executor: executeGitHub,
    });

    // 7. Terminal
    this.register({
      definition: {
        id: 'terminal',
        name: 'terminal',
        description: 'Execute allowlisted terminal utility commands inside the sandboxed workspace environment',
        source: 'native',
        category: 'system',
        isSafe: true,
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to run (e.g. "ls", "echo", "date", "find", "grep")' },
            args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' },
          },
          required: ['command'],
        },
      },
      executor: executeTerminal,
    });
  }

  register(tool: RegisteredTool): void {
    this.tools.set(tool.definition.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  unregisterByMcpServer(mcpServerId: string): void {
    for (const [name, tool] of this.tools.entries()) {
      if (tool.definition.mcpServerId === mcpServerId) {
        this.tools.delete(name);
      }
    }
  }

  getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  listTools(allowedNames?: string[]): ToolDefinition[] {
    const list = Array.from(this.tools.values()).map(t => t.definition);
    if (allowedNames && allowedNames.length > 0) {
      const set = new Set(allowedNames);
      return list.filter(t => set.has(t.name));
    }
    return list;
  }

  getToolsForLLM(allowedNames?: string[]): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
    return this.listTools(allowedNames).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters as Record<string, unknown>,
    }));
  }

  async executeTool(name: string, rawArgs: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        output: null,
        error: `Tool '${name}' is not registered in Heimdall Tool Registry. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
        executionTimeMs: 0,
      };
    }

    return await tool.executor(rawArgs);
  }
}

export const toolRegistry = new ToolRegistry();
