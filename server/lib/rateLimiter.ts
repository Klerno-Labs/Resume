import rateLimit from 'express-rate-limit';

// Authentication endpoints - prevent brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  statusCode: 429,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts. Please try again in 15 minutes.',
      retryAfter: 900, // 15 minutes in seconds
    });
  },
});

// Upload endpoints - prevent abuse
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads
  message: {
    error: 'Upload limit exceeded (10 per hour). Please try again later or upgrade your plan.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Upload limit exceeded (10 per hour). Please try again later or upgrade your plan.',
      retryAfter: 3600, // 1 hour in seconds
    });
  },
});

// General API - prevent DoS
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter: 900, // 15 minutes in seconds
    });
  },
});

// AI generation endpoints - prevent resource exhaustion
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 AI generations
  message: { error: 'AI generation limit exceeded (20 per hour). Please upgrade your plan.' },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res) => {
    res.status(429).json({
      error: 'AI generation limit exceeded (20 per hour). Please upgrade your plan.',
      retryAfter: 3600, // 1 hour in seconds
    });
  },
});
