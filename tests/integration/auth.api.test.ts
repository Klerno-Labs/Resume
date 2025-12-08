import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { emailSchema, passwordSchema } from '../../shared/validators';

// Create a minimal test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';

  // Mock user database
  const users: Map<string, any> = new Map();
  let userIdCounter = 1;

  // Register endpoint
  app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error: any) {
      const message = error?.errors?.[0]?.message || 'Validation failed';
      return res.status(400).json({ error: message });
    }

    if (users.has(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = {
      id: `user-${userIdCounter++}`,
      email,
      plan: 'free',
      creditsRemaining: 1,
    };
    users.set(email, user);

    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true });
    res.status(201).json({ user });
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error: any) {
      const message = error?.errors?.[0]?.message || 'Validation failed';
      return res.status(400).json({ error: message });
    }

    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true });
    res.json({ user });
  });

  // Me endpoint
  app.get('/api/auth/me', (req, res) => {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      const user = users.get(decoded.email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ user });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  return { app, users };
};

describe('Auth API Integration Tests', () => {
  let app: express.Express;
  let users: Map<string, any>;
  const strongPassword = 'SecurePass123!';

  beforeAll(() => {
    const testApp = createTestApp();
    app = testApp.app;
    users = testApp.users;
  });

  beforeEach(() => {
    users.clear();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: strongPassword });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.creditsRemaining).toBe(1);
    });

    it('should return error for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: strongPassword });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return error for missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return error for short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Short1!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('12');
    });

    it('should return error for duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: strongPassword });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'AnotherPass123!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('User already exists');
    });

    it('should set auth cookie on registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: strongPassword });

      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('token=');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: strongPassword });
    });

    it('should login existing user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: strongPassword });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should return error for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: strongPassword });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should set auth cookie on login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: strongPassword });

      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user when authenticated', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: strongPassword });

      const cookie = registerRes.headers['set-cookie'][0];

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear auth cookie', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie'][0]).toContain('token=;');
    });
  });
});
