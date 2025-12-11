import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock the storage module
const mockStorage = {
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getUser: vi.fn(),
  getUserByVerificationToken: vi.fn(),
  verifyUserEmail: vi.fn(),
};

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

describe('Auth Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare('wrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token', () => {
    const secret = 'test-secret-key-that-is-at-least-32-characters-long';

    it('should generate valid JWT token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const token = jwt.sign(payload, secret, { expiresIn: '7d' });

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify and decode JWT token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const token = jwt.sign(payload, secret, { expiresIn: '7d' });

      const decoded = jwt.verify(token, secret) as typeof payload;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should reject invalid JWT token', () => {
      const token = 'invalid.token.here';

      expect(() => jwt.verify(token, secret)).toThrow();
    });

    it('should reject token with wrong secret', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const token = jwt.sign(payload, secret, { expiresIn: '7d' });

      expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });

    it('should reject expired token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const token = jwt.sign(payload, secret, { expiresIn: '-1s' });

      expect(() => jwt.verify(token, secret)).toThrow();
    });
  });

  describe('Email Validation', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    it('should validate correct email', () => {
      expect(emailRegex.test('test@example.com')).toBe(true);
      expect(emailRegex.test('user.name@domain.org')).toBe(true);
      expect(emailRegex.test('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(emailRegex.test('invalid')).toBe(false);
      expect(emailRegex.test('invalid@')).toBe(false);
      expect(emailRegex.test('@domain.com')).toBe(false);
      expect(emailRegex.test('spaces in@email.com')).toBe(false);
    });
  });

  describe('Password Strength', () => {
    it('should require minimum 8 characters', () => {
      const minLength = 8;
      expect('short'.length >= minLength).toBe(false);
      expect('longpassword'.length >= minLength).toBe(true);
    });
  });
});
