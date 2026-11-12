/**
 * Sliding-Window In-Memory Rate Limiter Middleware
 * 
 * Protects sensitive endpoints (authentication, submission) against
 * automated brute-force attacks and Denial of Service (DoS).
 */
export function createRateLimiter({ windowMs = 15 * 60 * 1000, maxRequests = 5, message = 'Too many requests. Please try again later.' } = {}) {
  const requestHistory = new Map();

  // Periodic cleanup of expired IP records to prevent memory leaks in V8 Heap
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requestHistory.entries()) {
      const activeTimestamps = timestamps.filter(time => now - time < windowMs);
      if (activeTimestamps.length === 0) {
        requestHistory.delete(ip);
      } else {
        requestHistory.set(ip, activeTimestamps);
      }
    }
  }, Math.max(windowMs / 2, 60000));

  return function rateLimiterMiddleware(req, res, next) {
    // Use Express req.ip (respecting `trust proxy` configuration) rather than raw spoofable headers
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const now = Date.now();

    const timestamps = requestHistory.get(ip) || [];
    const activeTimestamps = timestamps.filter(time => now - time < windowMs);

    if (activeTimestamps.length >= maxRequests) {
      const oldestActive = activeTimestamps[0];
      const resetTimeSeconds = Math.ceil((oldestActive + windowMs - now) / 1000);

      res.setHeader('Retry-After', resetTimeSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil((oldestActive + windowMs) / 1000));

      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: resetTimeSeconds
      });
    }

    activeTimestamps.push(now);
    if (requestHistory.size > 10000 && !requestHistory.has(ip)) {
      const oldestKey = requestHistory.keys().next().value;
      if (oldestKey) requestHistory.delete(oldestKey);
    }
    requestHistory.set(ip, activeTimestamps);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - activeTimestamps.length));

    return next();
  };
}
