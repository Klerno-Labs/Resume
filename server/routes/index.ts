import type { Express } from "express";
import type { Server } from "http";
import { apiLimiter } from "../lib/rateLimiter";
import { registerLegacyRoutes } from "./legacy";
import healthRoutes from "./health.routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.use("/api", apiLimiter);
  app.use("/api", healthRoutes);
  return registerLegacyRoutes(httpServer, app);
}
