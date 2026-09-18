import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  clientUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  mongodb: {
    uri: string;
    useMemoryFallback: boolean;
  };
  redis: {
    url?: string;
    upstashToken?: string;
    rateLimitMax: number;
    rateLimitWindowSec: number;
  };
  qdrant: {
    url?: string;
    apiKey?: string;
    collectionName: string;
  };
  providers: {
    groqApiKey?: string;
    geminiApiKey?: string;
    ollamaBaseUrl: string;
    tavilyApiKey?: string;
    githubToken?: string;
  };
  sandbox: {
    baseDir: string;
    timeoutMs: number;
  };
}

export const config: AppConfig = {
  env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  jwt: {
    secret: process.env.JWT_SECRET || 'heimdall_ultra_secure_jwt_secret_key_2026_dev_mode',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'heimdall_ultra_secure_refresh_secret_key_2026_dev_mode',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/heimdall',
    useMemoryFallback: !process.env.MONGODB_URI || process.env.MONGODB_USE_MEMORY_FALLBACK === 'true',
  },
  redis: {
    url: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitWindowSec: parseInt(process.env.RATE_LIMIT_WINDOW_SEC || '60', 10),
  },
  qdrant: {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: process.env.QDRANT_COLLECTION || 'heimdall_memories',
  },
  providers: {
    groqApiKey: process.env.GROQ_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    tavilyApiKey: process.env.TAVILY_API_KEY,
    githubToken: process.env.GITHUB_TOKEN,
  },
  sandbox: {
    baseDir: path.resolve(__dirname, '../../../../sandbox'),
    timeoutMs: parseInt(process.env.SANDBOX_TIMEOUT_MS || '15000', 10),
  },
};
