import jwt from 'jsonwebtoken';
import { env } from './env.js';
import type { Request, Response, NextFunction } from 'express';

export interface JWTPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Express middleware to protect routes
function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }
  return req.cookies?.token;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const payload = verifyToken(token);
    // Attach user info to request
    (req as any).userId = payload.userId;
    (req as any).userEmail = payload.email;

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Optional: Middleware that doesn't fail if no auth present
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = verifyToken(token);
      (req as any).userId = payload.userId;
      (req as any).userEmail = payload.email;
    }

    next();
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
}
