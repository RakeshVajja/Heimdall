import {
  MCPMessage,
  MCPInitializeResult,
  MCPToolDefinition,
  MCPCapability,
} from '@heimdall/shared';

export interface MCPTransport {
  send(message: MCPMessage): Promise<MCPMessage>;
  close(): Promise<void>;
}

export class InProcessTransport implements MCPTransport {
  constructor(
    private handler: (message: MCPMessage) => Promise<MCPMessage>
  ) {}

  async send(message: MCPMessage): Promise<MCPMessage> {
    return await this.handler(message);
  }

  async close(): Promise<void> {}
}

export class MCPClient {
  private requestId = 1;
  private isInitialized = false;
  private serverInfo: { name: string; version: string } = { name: 'unknown', version: '0.0.0' };
  private capabilities: MCPCapability = {};

  constructor(
    public readonly serverId: string,
    public readonly name: string,
    private transport: MCPTransport
  ) {}

  private getNextId(): number {
    return this.requestId++;
  }

  async initialize(): Promise<MCPInitializeResult> {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.getNextId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: false },
        },
        clientInfo: {
          name: 'heimdall-mcp-client',
          version: '1.0.0',
        },
      },
    };

    const response = await this.transport.send(message);

    if (response.error) {
      throw new Error(`MCP initialize failed: [${response.error.code}] ${response.error.message}`);
    }

    const result = response.result as MCPInitializeResult;
    this.isInitialized = true;
    this.serverInfo = result.serverInfo || { name: this.name, version: '1.0.0' };
    this.capabilities = result.capabilities || {};

    // Send initialized notification
    await this.transport.send({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });

    return result;
  }

  async ping(): Promise<boolean> {
    try {
      const message: MCPMessage = {
        jsonrpc: '2.0',
        id: this.getNextId(),
        method: 'ping',
      };
      const res = await this.transport.send(message);
      return !res.error;
    } catch {
      return false;
    }
  }

  async listTools(): Promise<MCPToolDefinition[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.getNextId(),
      method: 'tools/list',
      params: {},
    };

    const response = await this.transport.send(message);
    if (response.error) {
      throw new Error(`MCP tools/list failed: ${response.error.message}`);
    }

    const result = response.result as { tools: MCPToolDefinition[] };
    return result?.tools || [];
  }

  async callTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.getNextId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await this.transport.send(message);
    if (response.error) {
      throw new Error(`MCP tools/call for ${toolName} failed: ${response.error.message}`);
    }

    return response.result;
  }

  async disconnect(): Promise<void> {
    await this.transport.close();
    this.isInitialized = false;
  }
}
