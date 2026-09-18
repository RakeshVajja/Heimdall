import { executeInSandbox } from './Sandbox.js';
import { mongodbQueryInputSchema, ToolResult } from '@heimdall/shared';
import { memoryDb } from '../db/models.js';

export async function executeMongoQuery(rawArgs: unknown): Promise<ToolResult> {
  return executeInSandbox(
    'mongodb_query',
    mongodbQueryInputSchema,
    rawArgs,
    async ({ collection, operation, filter, limit }) => {
      // Direct safe queries on universal in-memory / mongo collections
      const storeMap: Record<string, { find: (filter?: Record<string, unknown>) => Promise<unknown[]>; count: (filter?: Record<string, unknown>) => Promise<number> }> = {
        conversations: memoryDb.conversations,
        messages: memoryDb.messages,
        skills: memoryDb.skills,
        mcpServers: memoryDb.mcpServers,
        evaluations: memoryDb.evaluations,
      };

      const targetStore = storeMap[collection];
      if (!targetStore) {
        return {
          collection,
          operation,
          results: [],
          message: `Collection '${collection}' not found or restricted. Available collections: ${Object.keys(storeMap).join(', ')}`,
        };
      }

      const queryFilter = filter || {};

      if (operation === 'count') {
        const count = await targetStore.count(queryFilter);
        return { collection, operation, count };
      }

      const rawResults = await targetStore.find(queryFilter);
      const results = rawResults.slice(0, limit || 20);

      return {
        collection,
        operation,
        count: results.length,
        results,
      };
    }
  );
}
