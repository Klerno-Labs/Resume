import { createServer } from 'http';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/index';

export const app = createServer((req, res) => {
  void handler(req as VercelRequest, res as VercelResponse);
});

export const appReady = Promise.resolve();
