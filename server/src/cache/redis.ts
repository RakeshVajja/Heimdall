import { config } from '../config/index.js';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService {
  private inMemoryCache = new Map<string, CacheEntry<unknown>>();
  private rateLimitBuckets = new Map<string, { count: number; resetTime: number }>();
  public isRedisConnected = false;

  constructor() {
    if (config.redis.url && config.redis.upstashToken) {
      console.log('[Cache] Upstash Redis configured via REST URL.');
      this.isRedisConnected = true;
    } else {
      console.log('[Cache] Running in-memory TTL caching and sliding rate limiter.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisConnected && config.redis.url && config.redis.upstashToken) {
      try {
        const res = await fetch(`${config.redis.url}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${config.redis.upstashToken}` },
        });
        if (res.ok) {
          const data = await res.json() as { result?: string };
          if (data.result) return JSON.parse(data.result) as T;
        }
      } catch (err) {
        console.warn('[Cache] Upstash GET error, falling back to in-memory:', err);
      }
    }

    const entry = this.inMemoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.inMemoryCache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    if (this.isRedisConnected && config.redis.url && config.redis.upstashToken) {
      try {
        await fetch(`${config.redis.url}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(JSON.stringify(value))}`, {
          headers: { Authorization: `Bearer ${config.redis.upstashToken}` },
        });
      } catch (err) {
        console.warn('[Cache] Upstash SET error:', err);
      }
    }

    this.inMemoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    if (this.isRedisConnected && config.redis.url && config.redis.upstashToken) {
      try {
        await fetch(`${config.redis.url}/del/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${config.redis.upstashToken}` },
        });
      } catch {}
    }
    this.inMemoryCache.delete(key);
  }

  // Sliding window rate limiter
  async checkRateLimit(
    identifier: string,
    maxRequests = config.redis.rateLimitMax,
    windowSec = config.redis.rateLimitWindowSec
  ): Promise<{ allowed: boolean; remaining: number; resetInSec: number }> {
    const now = Date.now();
    const windowMs = windowSec * 1000;
    const bucket = this.rateLimitBuckets.get(identifier);

    if (!bucket || now > bucket.resetTime) {
      this.rateLimitBuckets.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true, remaining: maxRequests - 1, resetInSec: windowSec };
    }

    if (bucket.count >= maxRequests) {
      const resetInSec = Math.ceil((bucket.resetTime - now) / 1000);
      return { allowed: false, remaining: 0, resetInSec };
    }

    bucket.count += 1;
    const resetInSec = Math.ceil((bucket.resetTime - now) / 1000);
    return { allowed: true, remaining: maxRequests - bucket.count, resetInSec };
  }
}

export const cache = new CacheService();
