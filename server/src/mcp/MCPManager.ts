import { MCPServerConfig } from '@heimdall/shared';
import { MCPClient, InProcessTransport } from './MCPClient.js';
import {
  createFilesystemMCPServerHandler,
  createGitHubMCPServerHandler,
  createWebSearchMCPServerHandler,
} from './BuiltinServers.js';
import { toolRegistry } from '../tools/ToolRegistry.js';
import { memoryDb } from '../db/models.js';

export class MCPManager {
  private activeClients: Map<string, MCPClient> = new Map();

  async initialize(): Promise<void> {
    // Seed and connect built-in servers
    const existing = await memoryDb.mcpServers.find();
    if (existing.length === 0) {
      await this.createBuiltinServer('heimdall-mcp-fs', 'Filesystem MCP Server', 'Direct file operations via MCP standard', 'inprocess');
      await this.createBuiltinServer('heimdall-mcp-gh', 'GitHub MCP Server', 'GitHub repository analysis via MCP standard', 'inprocess');
      await this.createBuiltinServer('heimdall-mcp-ws', 'Web Search MCP Server', 'Web search capabilities via MCP standard', 'inprocess');
    }

    const servers = await memoryDb.mcpServers.find({ isEnabled: true });
    for (const server of servers) {
      await this.connect(server.id);
    }
  }

  private async createBuiltinServer(id: string, name: string, description: string, transport: 'inprocess' | 'stdio'): Promise<MCPServerConfig> {
    return await memoryDb.mcpServers.create({
      id,
      name,
      description,
      transport,
      args: [],
      isEnabled: true,
      status: 'disconnected',
      discoveredToolsCount: 0,
    });
  }

  async connect(serverId: string): Promise<boolean> {
    const server = await memoryDb.mcpServers.findById(serverId);
    if (!server) return false;

    try {
      let client: MCPClient;

      if (server.id === 'heimdall-mcp-fs' || server.name.toLowerCase().includes('filesystem')) {
        client = new MCPClient(server.id, server.name, new InProcessTransport(createFilesystemMCPServerHandler()));
      } else if (server.id === 'heimdall-mcp-gh' || server.name.toLowerCase().includes('github')) {
        client = new MCPClient(server.id, server.name, new InProcessTransport(createGitHubMCPServerHandler()));
      } else {
        client = new MCPClient(server.id, server.name, new InProcessTransport(createWebSearchMCPServerHandler()));
      }

      await client.initialize();
      this.activeClients.set(serverId, client);

      // Reflect tools into unified ToolRegistry
      const tools = await client.listTools();
      for (const mcpTool of tools) {
        toolRegistry.register({
          definition: {
            id: mcpTool.name,
            name: mcpTool.name,
            description: mcpTool.description,
            source: 'mcp',
            category: 'utility',
            isSafe: true,
            parameters: mcpTool.inputSchema,
            mcpServerId: serverId,
          },
          executor: async (args) => {
            const startTime = Date.now();
            try {
              const res = await client.callTool(mcpTool.name, args);
              return {
                success: true,
                output: res,
                executionTimeMs: Date.now() - startTime,
              };
            } catch (err: unknown) {
              return {
                success: false,
                output: null,
                error: err instanceof Error ? err.message : String(err),
                executionTimeMs: Date.now() - startTime,
              };
            }
          },
        });
      }

      await memoryDb.mcpServers.findByIdAndUpdate(serverId, {
        status: 'connected',
        lastPingAt: new Date().toISOString(),
        discoveredToolsCount: tools.length,
        errorMessage: undefined,
      });

      console.log(`[MCP] Server '${server.name}' connected successfully with ${tools.length} discovered tools.`);
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await memoryDb.mcpServers.findByIdAndUpdate(serverId, {
        status: 'error',
        errorMessage: errorMsg,
      });
      console.warn(`[MCP] Failed to connect server '${server.name}':`, errorMsg);
      return false;
    }
  }

  async disconnect(serverId: string): Promise<boolean> {
    const client = this.activeClients.get(serverId);
    if (client) {
      await client.disconnect();
      this.activeClients.delete(serverId);
    }
    toolRegistry.unregisterByMcpServer(serverId);
    await memoryDb.mcpServers.findByIdAndUpdate(serverId, {
      status: 'disconnected',
    });
    return true;
  }

  async listServers(): Promise<MCPServerConfig[]> {
    return await memoryDb.mcpServers.find();
  }

  getClient(serverId: string): MCPClient | undefined {
    return this.activeClients.get(serverId);
  }
}

export const mcpManager = new MCPManager();
