/**
 * Hybrid Distributed Redis & In-Memory Rate Limiter Middleware
 * Uses atomic Redis counters across container replicas in production,
 * with automatic zero-configuration fallback to in-memory sliding-window for dev and tests.
 */

const { getRedisClient, isRedisReady } = require('../config/redis');

function createRateLimiter({
  prefix = 'rl',
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 15, // max requests per window
  message = "Too many requests from this IP. Please try again later.",
} = {}) {
  const ipHits = new Map();
  const windowSec = Math.ceil(windowMs / 1000);

  // Periodic in-memory garbage collection
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipHits.entries()) {
      if (now - record.startTime > windowMs) {
        ipHits.delete(ip);
      }
    }
  }, windowMs);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return async function rateLimiterMiddleware(req, res, next) {
    // Determine client IP (supports reverse proxies like Nginx)
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.socket.remoteAddress ||
      "unknown-ip";

    const redis = getRedisClient();

    // 1. Distributed Redis Execution (Cluster / Production)
    if (redis && isRedisReady()) {
      const redisKey = `ratelimit:${prefix}:${clientIp}`;
      try {
        const count = await redis.incr(redisKey);
        if (count === 1) {
          await redis.expire(redisKey, windowSec);
        }

        if (count > max) {
          let ttl = await redis.ttl(redisKey);
          if (ttl < 0) ttl = windowSec;
          res.setHeader("Retry-After", ttl);

          return res.status(429).json({
            success: false,
            message: `${message} (Retry after ${ttl} seconds)`,
            data: null,
          });
        }

        return next();
      } catch (err) {
        // Fall through to in-memory fallback if Redis call fails
      }
    }

    // 2. In-Memory Sliding-Window Fallback (Dev / Tests)
    const now = Date.now();
    let record = ipHits.get(clientIp);

    if (!record || now - record.startTime > windowMs) {
      record = {
        count: 1,
        startTime: now,
      };
      ipHits.set(clientIp, record);
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const remainingSeconds = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader("Retry-After", remainingSeconds);

      return res.status(429).json({
        success: false,
        message: `${message} (Retry after ${remainingSeconds} seconds)`,
        data: null,
      });
    }

    return next();
  };
}

// Pre-configured production rate limiters
const authLimiter = createRateLimiter({
  prefix: 'auth',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes for auth endpoints
  message: "Too many login/authentication attempts from this IP address.",
});

const passwordResetLimiter = createRateLimiter({
  prefix: 'pwd_reset',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour for password resets
  message: "Too many password reset requests. Please wait before trying again.",
});

module.exports = {
  createRateLimiter,
  authLimiter,
  passwordResetLimiter,
};
