import mongoose, { Schema } from 'mongoose';
import {
  User as IUser,
  Conversation as IConversation,
  Message as IMessage,
  SkillDefinition as ISkill,
  MCPServerConfig as IMcpServer,
  PromptVersion as IPromptVersion,
  EvalRunResult as IEvalRunResult,
} from '@heimdall/shared';

// ==========================================
// 1. Mongoose Schemas & Models
// ==========================================

// User
const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    preferences: {
      theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
      defaultProvider: { type: String, enum: ['groq', 'gemini', 'ollama'], default: 'groq' },
      defaultModel: { type: String, default: 'llama-3.3-70b-versatile' },
      temperature: { type: Number, default: 0.7 },
      maxTokens: { type: Number, default: 4096 },
      autoSaveContext: { type: Boolean, default: true },
      enableAgentTrace: { type: Boolean, default: true },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Conversation
const ConversationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: 'New Conversation' },
    provider: { type: String, enum: ['groq', 'gemini', 'ollama'], default: 'groq' },
    model: { type: String, default: 'llama-3.3-70b-versatile' },
    systemPrompt: { type: String },
    skillId: { type: String },
    isPinned: { type: Boolean, default: false },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
ConversationSchema.index({ title: 'text' });

// Message
const MessageSchema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
    content: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
MessageSchema.index({ content: 'text' });

// Skill
const SkillSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    systemPrompt: { type: String, required: true },
    userPromptTemplate: { type: String },
    allowedTools: [{ type: String }],
    preferredProvider: { type: String, enum: ['groq', 'gemini', 'ollama'] },
    preferredModel: { type: String },
    temperature: { type: Number },
    parameters: [{ type: Schema.Types.Mixed }],
    isBuiltIn: { type: Boolean, default: false },
    authorId: { type: String },
    iconName: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// MCP Server
const McpServerSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    transport: { type: String, enum: ['stdio', 'sse', 'inprocess'], default: 'stdio' },
    command: { type: String },
    args: [{ type: String }],
    env: { type: Schema.Types.Mixed },
    url: { type: String },
    isEnabled: { type: Boolean, default: true },
    status: { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' },
    lastPingAt: { type: String },
    errorMessage: { type: String },
    discoveredToolsCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Prompt Version
const PromptVersionSchema = new Schema(
  {
    skillId: { type: String, index: true },
    name: { type: String, required: true },
    version: { type: Number, required: true },
    systemPrompt: { type: String, required: true },
    userPromptTemplate: { type: String },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    benchmarkScores: { type: Schema.Types.Mixed },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Evaluation
const EvaluationSchema = new Schema(
  {
    testCaseId: { type: String, required: true, index: true },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    promptVersionId: { type: String },
    output: { type: String, required: true },
    metrics: { type: Schema.Types.Mixed, required: true },
    passed: { type: Boolean, required: true },
    notes: { type: String },
    executedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const MongoUserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const MongoConversationModel = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
export const MongoMessageModel = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export const MongoSkillModel = mongoose.models.Skill || mongoose.model('Skill', SkillSchema);
export const MongoMcpServerModel = mongoose.models.McpServer || mongoose.model('McpServer', McpServerSchema);
export const MongoPromptVersionModel = mongoose.models.PromptVersion || mongoose.model('PromptVersion', PromptVersionSchema);
export const MongoEvaluationModel = mongoose.models.Evaluation || mongoose.model('Evaluation', EvaluationSchema);

// ==========================================
// 2. High-Performance Universal Repository
// ==========================================

export class InMemoryStore<T extends { id: string; createdAt?: string; updatedAt?: string }> {
  private items: Map<string, T> = new Map();

  async find(filter: Partial<T> = {}): Promise<T[]> {
    const list = Array.from(this.items.values());
    return list.filter(item => {
      for (const [k, v] of Object.entries(filter)) {
        if ((item as Record<string, unknown>)[k] !== v) return false;
      }
      return true;
    });
  }

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }

  async findOne(filter: Partial<T>): Promise<T | null> {
    const results = await this.find(filter);
    return results[0] || null;
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<T> {
    const now = new Date().toISOString();
    const id = data.id || Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const item = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    } as T;
    this.items.set(id, item);
    return item;
  }

  async findByIdAndUpdate(id: string, updates: Partial<T>): Promise<T | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.items.set(id, updated);
    return updated;
  }

  async findByIdAndDelete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async count(filter: Partial<T> = {}): Promise<number> {
    const list = await this.find(filter);
    return list.length;
  }

  async clear(): Promise<void> {
    this.items.clear();
  }
}

export const memoryDb = {
  users: new InMemoryStore<IUser>(),
  conversations: new InMemoryStore<IConversation>(),
  messages: new InMemoryStore<IMessage>(),
  skills: new InMemoryStore<ISkill>(),
  mcpServers: new InMemoryStore<IMcpServer>(),
  promptVersions: new InMemoryStore<IPromptVersion>(),
  evaluations: new InMemoryStore<IEvalRunResult>(),
};
