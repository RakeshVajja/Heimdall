import { MCPMessage, MCPToolDefinition } from '@heimdall/shared';
import { executeFilesystem } from '../tools/FilesystemTool.js';
import { executeGitHub } from '../tools/GitHubTool.js';
import { executeWebSearch } from '../tools/WebSearchTool.js';

export function createFilesystemMCPServerHandler(): (message: MCPMessage) => Promise<MCPMessage> {
  return async (msg: MCPMessage): Promise<MCPMessage> => {
    const { id, method, params } = msg;

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'heimdall-mcp-filesystem', version: '1.0.0' },
        },
      };
    }

    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    if (method === 'tools/list') {
      const tools: MCPToolDefinition[] = [
        {
          name: 'mcp_read_file',
          description: 'Read file contents from workspace sandbox via MCP protocol',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path of file' },
            },
            required: ['path'],
          },
        },
        {
          name: 'mcp_write_file',
          description: 'Write file contents to workspace sandbox via MCP protocol',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path of file' },
              content: { type: 'string', description: 'File content' },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'mcp_list_directory',
          description: 'List contents of directory via MCP protocol',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path of directory' },
            },
            required: ['path'],
          },
        },
      ];
      return { jsonrpc: '2.0', id, result: { tools } };
    }

    if (method === 'tools/call') {
      const toolName = params?.name as string;
      const args = (params?.arguments || {}) as Record<string, unknown>;

      if (toolName === 'mcp_read_file') {
        const res = await executeFilesystem({ operation: 'read', path: args.path });
        return { jsonrpc: '2.0', id, result: res.output, error: res.error ? { code: -32000, message: res.error } : undefined };
      }
      if (toolName === 'mcp_write_file') {
        const res = await executeFilesystem({ operation: 'write', path: args.path, content: args.content });
        return { jsonrpc: '2.0', id, result: res.output, error: res.error ? { code: -32000, message: res.error } : undefined };
      }
      if (toolName === 'mcp_list_directory') {
        const res = await executeFilesystem({ operation: 'list', path: args.path || '.' });
        return { jsonrpc: '2.0', id, result: res.output, error: res.error ? { code: -32000, message: res.error } : undefined };
      }

      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${toolName}` } };
    }

    return { jsonrpc: '2.0', id, result: {} };
  };
}

export function createGitHubMCPServerHandler(): (message: MCPMessage) => Promise<MCPMessage> {
  return async (msg: MCPMessage): Promise<MCPMessage> => {
    const { id, method, params } = msg;

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'heimdall-mcp-github', version: '1.0.0' },
        },
      };
    }

    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    if (method === 'tools/list') {
      const tools: MCPToolDefinition[] = [
        {
          name: 'mcp_github_repo_info',
          description: 'Fetch metadata and metrics for a GitHub repository via MCP',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'mcp_github_search_repos',
          description: 'Search open-source repositories on GitHub via MCP',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search keywords' },
            },
            required: ['query'],
          },
        },
      ];
      return { jsonrpc: '2.0', id, result: { tools } };
    }

    if (method === 'tools/call') {
      const toolName = params?.name as string;
      const args = (params?.arguments || {}) as Record<string, unknown>;

      if (toolName === 'mcp_github_repo_info') {
        const res = await executeGitHub({ action: 'get_repo', owner: args.owner as string, repo: args.repo as string });
        return { jsonrpc: '2.0', id, result: res.output, error: res.error ? { code: -32000, message: res.error } : undefined };
      }
      if (toolName === 'mcp_github_search_repos') {
        const res = await executeGitHub({ action: 'search_repos', query: args.query as string });
        return { jsonrpc: '2.0', id, result: res.output, error: res.error ? { code: -32000, message: res.error } : undefined };
      }

      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Tool not found: ${toolName}` } };
    }

    return { jsonrpc: '2.0', id, result: {} };
  };
}

export function createWebSearchMCPServerHandler(): (message: MCPMessage) => Promise<MCPMessage> {
  return async (msg: MCPMessage): Promise<MCPMessage> => {
    const { id, method, params } = msg;

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'heimdall-mcp-websearch', version: '1.0.0' },
        },
      };
    }

    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    if (method === 'tools/list') {
      const tools: MCPToolDefinition[] = [
        {
          name: 'mcp_web_search_query',
          description: 'Execute live search query on the open web via MCP protocol',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search keywords' },
            },
            required: ['query'],
          },
        },
      ];
      return { jsonrpc: '2.0', id, result: { tools } };
    }

    if (method === 'tools/call') {
      const toolName = params?.name as string;
      const args = (params?.arguments || {}) as Record<string, unknown>;

      if (toolName === 'mcp_web_search_query') {
        const res = await executeWebSearch({ query: args.query as string, maxResults: 5 });
        return { jsonrpc: '2.0', id, result: res.output, error: res.error ? { code: -32000, message: res.error } : undefined };
      }

      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Tool not found: ${toolName}` } };
    }

    return { jsonrpc: '2.0', id, result: {} };
  };
}
