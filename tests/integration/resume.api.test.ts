import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// Create a minimal test app for resume API
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';

  // Mock databases
  const users: Map<string, any> = new Map();
  const resumes: Map<string, any> = new Map();
  let resumeIdCounter = 1;

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Create test user helper
  const createUser = (email: string, credits: number = 5) => {
    const user = {
      id: `user-${email}`,
      email,
      plan: 'basic',
      creditsRemaining: credits,
    };
    users.set(user.id, user);
    return user;
  };

  // Get user's resumes
  app.get('/api/resumes', requireAuth, (req: any, res) => {
    const userResumes = Array.from(resumes.values()).filter((r) => r.userId === req.userId);
    res.json({ resumes: userResumes });
  });

  // Create resume
  app.post('/api/resume/upload', requireAuth, (req: any, res) => {
    const user = users.get(req.userId);
    if (!user || user.creditsRemaining <= 0) {
      return res.status(403).json({ error: 'No credits remaining' });
    }

    const { text, fileName } = req.body;
    if (!text || !fileName) {
      return res.status(400).json({ error: 'Text and fileName are required' });
    }

    const resume = {
      id: `resume-${resumeIdCounter++}`,
      userId: req.userId,
      fileName,
      originalText: text,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    resumes.set(resume.id, resume);

    res.json({ resume });
  });

  // Get resume by ID
  app.get('/api/resume/:id', requireAuth, (req: any, res) => {
    const resume = resumes.get(req.params.id);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    if (resume.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json({ resume });
  });

  // Helper to generate auth token
  const generateToken = (userId: string, email: string) => {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
  };

  return { app, users, resumes, createUser, generateToken };
};

describe('Resume API Integration Tests', () => {
  let app: express.Express;
  let users: Map<string, any>;
  let resumes: Map<string, any>;
  let createUser: (email: string, credits?: number) => any;
  let generateToken: (userId: string, email: string) => string;

  beforeAll(() => {
    const testApp = createTestApp();
    app = testApp.app;
    users = testApp.users;
    resumes = testApp.resumes;
    createUser = testApp.createUser;
    generateToken = testApp.generateToken;
  });

  beforeEach(() => {
    users.clear();
    resumes.clear();
  });

  describe('GET /api/resumes', () => {
    it('should return empty array for user with no resumes', async () => {
      const user = createUser('test@example.com');
      const token = generateToken(user.id, user.email);

      const res = await request(app).get('/api/resumes').set('Cookie', `token=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.resumes).toEqual([]);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/resumes');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/resume/upload', () => {
    it('should create a new resume', async () => {
      const user = createUser('test@example.com', 5);
      const token = generateToken(user.id, user.email);

      const res = await request(app)
        .post('/api/resume/upload')
        .set('Cookie', `token=${token}`)
        .send({
          text: 'My resume content',
          fileName: 'resume.pdf',
        });

      expect(res.status).toBe(200);
      expect(res.body.resume).toBeDefined();
      expect(res.body.resume.fileName).toBe('resume.pdf');
      expect(res.body.resume.originalText).toBe('My resume content');
    });

    it('should return error when no credits', async () => {
      const user = createUser('test@example.com', 0);
      const token = generateToken(user.id, user.email);

      const res = await request(app)
        .post('/api/resume/upload')
        .set('Cookie', `token=${token}`)
        .send({
          text: 'My resume content',
          fileName: 'resume.pdf',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('No credits remaining');
    });

    it('should return error when missing required fields', async () => {
      const user = createUser('test@example.com', 5);
      const token = generateToken(user.id, user.email);

      const res = await request(app)
        .post('/api/resume/upload')
        .set('Cookie', `token=${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/resume/:id', () => {
    it('should return resume by ID', async () => {
      const user = createUser('test@example.com', 5);
      const token = generateToken(user.id, user.email);

      // Create a resume first
      const createRes = await request(app)
        .post('/api/resume/upload')
        .set('Cookie', `token=${token}`)
        .send({
          text: 'My resume content',
          fileName: 'resume.pdf',
        });

      const resumeId = createRes.body.resume.id;

      const res = await request(app).get(`/api/resume/${resumeId}`).set('Cookie', `token=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.resume.id).toBe(resumeId);
    });

    it('should return 404 for non-existent resume', async () => {
      const user = createUser('test@example.com');
      const token = generateToken(user.id, user.email);

      const res = await request(app)
        .get('/api/resume/non-existent')
        .set('Cookie', `token=${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 for unauthorized access', async () => {
      // Create resume with user 1
      const user1 = createUser('user1@example.com', 5);
      const token1 = generateToken(user1.id, user1.email);

      const createRes = await request(app)
        .post('/api/resume/upload')
        .set('Cookie', `token=${token1}`)
        .send({
          text: 'My resume content',
          fileName: 'resume.pdf',
        });

      const resumeId = createRes.body.resume.id;

      // Try to access with user 2
      const user2 = createUser('user2@example.com');
      const token2 = generateToken(user2.id, user2.email);

      const res = await request(app)
        .get(`/api/resume/${resumeId}`)
        .set('Cookie', `token=${token2}`);

      expect(res.status).toBe(403);
    });
  });
});
