/**
 * In-Memory Sliding-Window Rate Limiter Middleware
 * Protects authentication and sensitive API endpoints against automated brute-force attacks.
 */

function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 15, // max requests per window
  message = "Too many requests from this IP. Please try again later.",
} = {}) {
  const ipHits = new Map();

  // Periodic garbage collection to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipHits.entries()) {
      if (now - record.startTime > windowMs) {
        ipHits.delete(ip);
      }
    }
  }, windowMs);

  // Unref interval so it does not keep process alive in tests
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    // Determine client IP (supports reverse proxies like Nginx)
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.socket.remoteAddress ||
      "unknown-ip";

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

// Pre-configured rate limiters
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes for auth endpoints
  message: "Too many login/authentication attempts from this IP address.",
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour for password resets
  message: "Too many password reset requests. Please wait before trying again.",
});

module.exports = {
  createRateLimiter,
  authLimiter,
  passwordResetLimiter,
};
