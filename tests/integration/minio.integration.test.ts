import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import bodyParser from 'body-parser';
import { Client as MinioClient } from 'minio';
import Redis from 'ioredis';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

describe('MinIO presign integration', () => {
  let app: any;
  let server: any;
  let minio: any;
  let redis: Redis.Redis;
  const bucket = process.env.S3_BUCKET || 'resume-test';

  beforeAll(async () => {
    // configure MinIO client
    minio = new MinioClient({
      endPoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
      secretKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
    });

    // create bucket
    try {
      await minio.makeBucket(bucket, 'us-east-1');
    } catch (e) {
      // ignore if exists
    }

    redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

    app = express();
    app.use(bodyParser.json());

    app.post('/api/uploads/presign', async (req, res) => {
      const { filename } = req.body;
      const key = `tests/${Date.now()}-${filename}`;
      const url = await new Promise<string>((resolve, reject) => {
        minio.presignedPutObject(bucket, key, 60, (err: any, presignedUrl: string) => {
          if (err) return reject(err);
          resolve(presignedUrl);
        });
      });
      res.json({ url, key });
    });

    app.post('/api/uploads/complete', async (req, res) => {
      const { key, filename } = req.body;
      // enqueue job
      await redis.lpush('upload_jobs_v1', JSON.stringify({ resumeId: `r-${Date.now()}`, bucket, key, filename }));
      res.json({ resumeId: `r-${Date.now()}`, status: 'queued' });
    });

    server = app.listen(4001);
  });

  afterAll(async () => {
    server.close();
    await redis.quit();
  });

  it('presign -> upload to MinIO -> complete enqueues job', async () => {
    const filename = 'sample.txt';
    const filePath = path.join(__dirname, '..', 'fixtures', filename);
    const fileBuf = fs.readFileSync(filePath);

    const presignRes = await fetch('http://localhost:4001/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    expect(presignRes.ok).toBe(true);
    const { url, key } = await presignRes.json();

    const putRes = await fetch(url, { method: 'PUT', body: fileBuf, headers: { 'Content-Type': 'text/plain' } });
    expect(putRes.ok).toBe(true);

    const completeRes = await fetch('http://localhost:4001/api/uploads/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, filename }),
    });
    expect(completeRes.ok).toBe(true);

    const job = await redis.rpop('upload_jobs_v1');
    expect(job).toBeTruthy();
  });
});
