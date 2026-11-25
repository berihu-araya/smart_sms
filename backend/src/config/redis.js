/**
 * Resilient Redis Connection Module
 * Provides clustered/standalone Redis client with automatic fallback for local tests.
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient = null;
let isConnected = false;

function initRedis() {
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis(REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying if Redis is not running
        }
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('Redis connected successfully for distributed rate limiting & caching');
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      // Log warning once, fallback to in-memory mode
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[Redis Notice] Redis unavailable (${err.message}). Rate limiter operating in in-memory fallback mode.`);
      }
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    // Attempt non-blocking connection
    redisClient.connect().catch(() => {
      isConnected = false;
    });
  } catch (err) {
    isConnected = false;
    redisClient = null;
  }

  return redisClient;
}

function getRedisClient() {
  if (!redisClient) {
    initRedis();
  }
  return isConnected ? redisClient : null;
}

function isRedisReady() {
  return isConnected && redisClient !== null && redisClient.status === 'ready';
}

async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
    isConnected = false;
  }
}

module.exports = {
  initRedis,
  getRedisClient,
  isRedisReady,
  closeRedis,
};
