// Redis client for caching cluster data
// Used to cache fetched project data to reduce cluster queries

import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true, // Don't connect immediately
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (error) => {
  console.error('❌ Redis error:', error);
});

redis.on('ready', () => {
  console.log('✅ Redis ready');
});

// Cache key generators
export const CACHE_KEYS = {
  // Full project data cache
  project: (clusterId: string, projectKey: string) =>
    `cluster:${clusterId}:project:${projectKey}`,

  // Cluster online status
  clusterOnline: (clusterId: string) =>
    `cluster:${clusterId}:online`,

  // Data request result
  requestResult: (requestId: string) =>
    `request:${requestId}:result`,

  // Project metadata list cache
  projectsList: (clusterId: string, filters: string) =>
    `cluster:${clusterId}:projects:${filters}`,
};

// Default TTL: 1 hour (3600 seconds)
export const DEFAULT_TTL = 3600;

// Helper functions
export async function getCachedProject(clusterId: string, projectKey: string) {
  try {
    const key = CACHE_KEYS.project(clusterId, projectKey);
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.error('Error getting cached project:', error);
    return null;
  }
}

export async function setCachedProject(
  clusterId: string,
  projectKey: string,
  data: any,
  ttl: number = DEFAULT_TTL
) {
  try {
    const key = CACHE_KEYS.project(clusterId, projectKey);
    await redis.setex(key, ttl, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error setting cached project:', error);
    return false;
  }
}

export async function invalidateProjectCache(clusterId: string, projectKey: string) {
  try {
    const key = CACHE_KEYS.project(clusterId, projectKey);
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Error invalidating project cache:', error);
    return false;
  }
}

// Initialize connection on import
redis.connect().catch((error) => {
  console.error('Failed to connect to Redis:', error);
  console.warn('⚠️  Redis unavailable - caching disabled');
});

export { redis };
export default redis;
