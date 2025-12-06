import jwt from "jsonwebtoken";
import { env } from "./env";
import type { Request, Response, NextFunction } from "express";

export interface JWTPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d", // Token expires in 7 days
  });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

// Express middleware to protect routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = verifyToken(token);
    // Attach user info to request
    (req as any).userId = payload.userId;
    (req as any).userEmail = payload.email;

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Optional: Middleware that doesn't fail if no auth present
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token;

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
