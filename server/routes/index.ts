import type { Express } from "express";
import type { Server } from "http";
import { apiLimiter } from "../lib/rateLimiter";
import { registerLegacyRoutes } from "./legacy";
import healthRoutes from "./health.routes";
import subscriptionRoutes from "./subscription.routes";
import stripeWebhookRoutes from "../webhooks/stripe";
import analyticsRoutes from "./analytics.routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.use("/api", apiLimiter);
  app.use("/api", healthRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/subscriptions", subscriptionRoutes);
  app.use("/api/webhooks", stripeWebhookRoutes);
  return registerLegacyRoutes(httpServer, app);
}
