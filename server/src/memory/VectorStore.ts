import { VectorRecord, MemorySearchResult } from '@heimdall/shared';
import { config } from '../config/index.js';

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class VectorStore {
  private inMemoryVectors: Map<string, VectorRecord> = new Map();
  public isQdrantConnected = false;

  constructor() {
    if (config.qdrant.url && config.qdrant.apiKey) {
      this.isQdrantConnected = true;
      console.log(`[VectorDB] Qdrant Cloud configured at: ${config.qdrant.url}`);
    } else {
      console.log('[VectorDB] Running high-speed in-memory vector store with cosine similarity.');
    }
  }

  async upsert(record: VectorRecord): Promise<void> {
    if (this.isQdrantConnected && config.qdrant.url && config.qdrant.apiKey) {
      try {
        await fetch(`${config.qdrant.url}/collections/${config.qdrant.collectionName}/points`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'api-key': config.qdrant.apiKey,
          },
          body: JSON.stringify({
            points: [
              {
                id: record.id,
                vector: record.vector,
                payload: record.payload,
              },
            ],
          }),
        });
      } catch (err) {
        console.warn('[VectorDB] Qdrant upsert failed, falling back to in-memory:', err);
      }
    }

    this.inMemoryVectors.set(record.id, record);
  }

  async search(queryVector: number[], limit = 5, userId?: string): Promise<MemorySearchResult[]> {
    if (this.isQdrantConnected && config.qdrant.url && config.qdrant.apiKey) {
      try {
        const res = await fetch(`${config.qdrant.url}/collections/${config.qdrant.collectionName}/points/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': config.qdrant.apiKey,
          },
          body: JSON.stringify({
            vector: queryVector,
            limit,
            with_payload: true,
            filter: userId ? { must: [{ key: 'userId', match: { value: userId } }] } : undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json() as {
            result?: Array<{
              id: string;
              score: number;
              payload?: VectorRecord['payload'];
            }>;
          };
          if (data.result && data.result.length > 0) {
            return data.result.map(r => ({
              id: String(r.id),
              score: r.score,
              type: r.payload?.type || 'message',
              text: r.payload?.text || '',
              conversationId: r.payload?.conversationId,
              messageId: r.payload?.messageId,
              timestamp: r.payload?.timestamp || new Date().toISOString(),
              metadata: r.payload?.metadata,
            }));
          }
        }
      } catch (err) {
        console.warn('[VectorDB] Qdrant search failed, falling back to in-memory:', err);
      }
    }

    // In-memory cosine similarity search
    const candidates = Array.from(this.inMemoryVectors.values())
      .filter(rec => !userId || rec.payload.userId === userId)
      .map(rec => ({
        record: rec,
        score: cosineSimilarity(queryVector, rec.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return candidates.map(c => ({
      id: c.record.id,
      score: Math.round(c.score * 1000) / 1000,
      type: c.record.payload.type,
      text: c.record.payload.text,
      conversationId: c.record.payload.conversationId,
      messageId: c.record.payload.messageId,
      timestamp: c.record.payload.timestamp,
      metadata: c.record.payload.metadata,
    }));
  }

  async count(): Promise<number> {
    return this.inMemoryVectors.size;
  }
}

export const vectorStore = new VectorStore();
