import rateLimit from "express-rate-limit";

// Authentication endpoints - prevent brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many authentication attempts. Please try again in 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Upload endpoints - prevent abuse
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads
  message: "Upload limit exceeded. Please try again in an hour.",
  standardHeaders: true,
  legacyHeaders: false,
});

// General API - prevent DoS
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: "Too many requests. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});

// AI generation endpoints - prevent resource exhaustion
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 AI generations
  message: "AI generation limit exceeded. Please upgrade your plan.",
  standardHeaders: true,
  legacyHeaders: false,
});
