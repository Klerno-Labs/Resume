import { describe, it, expect, beforeEach } from '@jest/globals';
import { generateToken } from '../jwt';
import jwt from 'jsonwebtoken';

describe('JWT Utilities', () => {
  const testPayload = {
    userId: 'test-user-123',
    email: 'test@example.com',
  };

  it('should generate a valid JWT token', () => {
    const token = generateToken(testPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should include correct payload in token', () => {
    const token = generateToken(testPayload);
    const decoded = jwt.decode(token) as any;

    expect(decoded.userId).toBe(testPayload.userId);
    expect(decoded.email).toBe(testPayload.email);
  });

  it('should set correct expiration time', () => {
    const token = generateToken(testPayload);
    const decoded = jwt.decode(token) as any;

    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();

    const expiresIn = decoded.exp - decoded.iat;
    expect(expiresIn).toBe(7 * 24 * 60 * 60); // 7 days in seconds
  });
});
