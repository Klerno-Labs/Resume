import type { Express } from 'express';
import type { Server } from 'http';
import { apiLimiter } from '../lib/rateLimiter';
import { registerLegacyRoutes } from './legacy';
import healthRoutes from './health.routes';
import subscriptionRoutes from './subscription.routes';
import stripeWebhookRoutes from '../webhooks/stripe';
import analyticsRoutes from './analytics.routes';

export function registerRoutes(httpServer: Server, app: Express): Server {
  // Register webhooks first (before body parser and rate limiter)
  app.use('/api/webhooks', stripeWebhookRoutes);

  // Register specific routes before applying global rate limiter
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api', healthRoutes);

  // Apply rate limiter to remaining /api routes
  app.use('/api', apiLimiter);

  return registerLegacyRoutes(httpServer, app);
}
