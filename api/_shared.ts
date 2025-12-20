// Shared utilities for API endpoints - will be inlined by bundler
import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { neon } from '@neondatabase/serverless';

// Database connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}
export const sql = neon(process.env.DATABASE_URL);

// User interface
export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  plan: string;
  credits_remaining: number;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

// JWT helpers
export function generateToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
  } catch {
    return null;
  }
}

// Get user from request
export async function getUserFromRequest(req: VercelRequest): Promise<User | null> {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const users = await sql`SELECT * FROM users WHERE id = ${decoded.userId}`;
  return (users[0] as User) || null;
}

// Check if user is admin
export function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

// Detect production environment
export function isProductionEnv(req: VercelRequest): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL === '1') return true;
  const host = req.headers.host || '';
  return !host.includes('localhost') && !host.includes('127.0.0.1');
}

// CORS helper
export function setCORS(req: VercelRequest, headers: Record<string, string>) {
  const allowedOrigins = [
    'https://rewriteme.app',
    'http://localhost:5174',
    'http://localhost:3003',
    'http://localhost:5000'
  ];
  const origin = req.headers.origin || '';
  const isAllowed = allowedOrigins.includes(origin) || origin.includes('vercel.app');

  headers['Access-Control-Allow-Credentials'] = 'true';
  headers['Access-Control-Allow-Origin'] = isAllowed ? origin : allowedOrigins[0];
  headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
}
