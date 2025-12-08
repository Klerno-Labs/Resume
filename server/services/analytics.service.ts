import { db } from "../db";
import { analyticsEvents, funnelSteps } from "../../shared/schema";

export class AnalyticsService {
  async trackEvent(params: {
    userId?: string;
    sessionId: string;
    event: string;
    properties?: Record<string, any>;
    page?: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    await db.insert(analyticsEvents).values({
      userId: params.userId,
      sessionId: params.sessionId,
      event: params.event,
      properties: params.properties,
      page: params.page,
      referrer: params.referrer,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });
  }

  async recordFunnelStep(params: { sessionId: string; step: string; userId?: string }) {
    await db.insert(funnelSteps).values({
      sessionId: params.sessionId,
      userId: params.userId,
      step: params.step,
    });
  }
}
