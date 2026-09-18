import mongoose from 'mongoose';
import { config } from '../config/index.js';

export interface DbStatus {
  connected: boolean;
  type: 'mongodb' | 'memory';
  databaseName: string;
}

let currentStatus: DbStatus = {
  connected: false,
  type: 'memory',
  databaseName: 'heimdall_in_memory',
};

export async function connectDatabase(): Promise<DbStatus> {
  if (config.mongodb.uri && !config.mongodb.useMemoryFallback) {
    try {
      await mongoose.connect(config.mongodb.uri, {
        serverSelectionTimeoutMS: 3000,
      });
      currentStatus = {
        connected: true,
        type: 'mongodb',
        databaseName: mongoose.connection.name || 'heimdall',
      };
      console.log(`[Database] Connected to MongoDB Atlas / Server: ${currentStatus.databaseName}`);
      return currentStatus;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Database] MongoDB connection failed (${msg}). Switching to in-memory active store.`);
    }
  }

  currentStatus = {
    connected: true,
    type: 'memory',
    databaseName: 'heimdall_in_memory',
  };
  console.log('[Database] Running with in-memory resilient document store.');
  return currentStatus;
}

export function getDbStatus(): DbStatus {
  return currentStatus;
}
