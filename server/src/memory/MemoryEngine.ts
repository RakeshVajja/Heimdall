import { vectorStore } from './VectorStore.js';
import { llmRouter } from '../llm/LLMRouter.js';
import { SemanticContext, MemorySearchResult, Message } from '@heimdall/shared';
import { memoryDb } from '../db/models.js';

export class MemoryEngine {
  async saveMessageMemory(message: Message, userId: string): Promise<void> {
    if (!message.content || message.content.length < 10) return;

    try {
      const vector = await llmRouter.getEmbeddings(message.content);
      await vectorStore.upsert({
        id: message.id,
        vector,
        payload: {
          userId,
          conversationId: message.conversationId,
          messageId: message.id,
          type: 'message',
          text: message.content,
          metadata: message.metadata as Record<string, unknown>,
          timestamp: message.createdAt,
        },
      });
    } catch (err) {
      console.warn('[Memory] Failed to embed and save message memory:', err);
    }
  }

  async retrieveContext(query: string, userId: string, limit = 4): Promise<SemanticContext> {
    try {
      const queryVector = await llmRouter.getEmbeddings(query);
      const retrievedMemories = await vectorStore.search(queryVector, limit, userId);

      const user = await memoryDb.users.findById(userId);
      const userPreferencesSummary = user
        ? `User preferred provider: ${user.preferences.defaultProvider}, model: ${user.preferences.defaultModel}, theme: ${user.preferences.theme}`
        : undefined;

      return {
        userId,
        retrievedMemories,
        userPreferencesSummary,
        projectContextSummary: 'Workspace sandbox active with safe tool execution.',
      };
    } catch (err) {
      console.warn('[Memory] Context retrieval failed:', err);
      return {
        userId,
        retrievedMemories: [],
      };
    }
  }

  async hybridSearch(query: string, userId: string, limit = 10): Promise<MemorySearchResult[]> {
    // 1. Vector Search
    const queryVector = await llmRouter.getEmbeddings(query);
    const vectorResults = await vectorStore.search(queryVector, limit, userId);

    // 2. Keyword Search across stored messages
    const allMessages = await memoryDb.messages.find();
    const queryLower = query.toLowerCase();
    const keywordMatches: MemorySearchResult[] = allMessages
      .filter(m => m.content.toLowerCase().includes(queryLower))
      .map(m => ({
        id: m.id,
        score: 0.85,
        type: 'keyword_match',
        text: m.content,
        conversationId: m.conversationId,
        messageId: m.id,
        timestamp: m.createdAt,
        metadata: m.metadata as Record<string, unknown>,
      }));

    // 3. Merge & Deduplicate
    const combined = new Map<string, MemorySearchResult>();
    for (const v of vectorResults) {
      combined.set(v.id, v);
    }
    for (const k of keywordMatches) {
      if (combined.has(k.id)) {
        const existing = combined.get(k.id)!;
        existing.score = Math.min(1.0, existing.score + 0.2); // Boost score for dual hit
      } else {
        combined.set(k.id, k);
      }
    }

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export const memoryEngine = new MemoryEngine();
