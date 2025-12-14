import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import path from 'path';
import { app, appReady } from '../../server/index';
import { setupTestDb, teardownTestDb, clearDb } from '../helpers/db';

describe('Multipart Upload Integration', () => {
  beforeAll(async () => {
    await appReady;
    await setupTestDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('accepts a text file via multipart/form-data and returns resumeId', async () => {
    // Register a new user
    const registerRes = await request(app).post('/api/auth/register').send({
      email: `multipart-${Date.now()}@test.com`,
      password: 'TestPass123!@#',
      name: 'Multipart Test',
    });

    expect(registerRes.status).toBe(201);
    const cookie = registerRes.headers['set-cookie']?.[0];
    expect(cookie).toBeTruthy();

    const fixturePath = path.join(__dirname, '..', 'fixtures', 'sample.txt');

    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Cookie', cookie)
      .attach('file', fixturePath);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('resumeId');
    expect(res.body.status).toBe('processing');
  });
});
