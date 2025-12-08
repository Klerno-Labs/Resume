// Test setup file
import { vi } from 'vitest';

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.DATABASE_TEST_URL = process.env.DATABASE_URL;
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.NODE_ENV = 'test';
process.env.APP_URL = 'http://localhost:3003';
process.env.CORS_ORIGIN = 'http://localhost:3003';

// Global test timeout
vi.setConfig({ testTimeout: 10000 });
