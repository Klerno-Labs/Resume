import { db } from '../db';
import { analyticsEvents, funnelSteps } from '../../shared/schema';
import { sql } from 'drizzle-orm';

export class AnalyticsService {
  async trackEvent(data: {
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
      userId: data.userId || null,
      sessionId: data.sessionId,
      event: data.event,
      properties: data.properties || null,
      page: data.page || null,
      referrer: data.referrer || null,
      userAgent: data.userAgent || null,
      ipAddress: data.ipAddress || null,
    });
  }

  async trackFunnelStep(sessionId: string, step: string, userId?: string) {
    await db.insert(funnelSteps).values({
      sessionId,
      userId: userId || null,
      step,
    });
  }

  async getFunnelMetrics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const steps = await db
      .select()
      .from(funnelSteps)
      .where(sql`completed_at >= ${startDate}`);

    const stepCounts = steps.reduce(
      (acc, step) => {
        acc[step.step] = (acc[step.step] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const funnelOrder = [
      'landing',
      'signup_started',
      'signup_completed',
      'first_upload',
      'first_optimization',
      'upgrade_viewed',
      'payment_initiated',
      'payment_completed',
    ];

    const conversions = funnelOrder.reduce(
      (acc, step, index) => {
        const count = stepCounts[step] || 0;
        const prev = index > 0 ? stepCounts[funnelOrder[index - 1]] || 1 : count;
        acc[step] = {
          count,
          conversionRate: prev > 0 ? (count / prev) * 100 : 0,
        };
        return acc;
      },
      {} as Record<string, { count: number; conversionRate: number }>
    );

    return { conversions, stepCounts, funnelOrder };
  }

  async getActivationMetrics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activatedUsers = await db.execute(sql`
      SELECT COUNT(DISTINCT u.id) as activated_count
      FROM users u
      JOIN usage_records ur ON ur.user_id = u.id
      WHERE u.created_at >= ${startDate}
      AND ur.action = 'resume_optimize'
      AND ur.created_at <= u.created_at + INTERVAL '24 hours'
    `);

    const totalSignups = await db.execute(sql`
      SELECT COUNT(*) as total_signups
      FROM users
      WHERE created_at >= ${startDate}
    `);

    const activated = Number((activatedUsers as any).rows?.[0]?.activated_count || 0);
    const signups = Number((totalSignups as any).rows?.[0]?.total_signups || 0);
    const activationRate = signups > 0 ? (activated / signups) * 100 : 0;

    return { activatedUsers: activated, totalSignups: signups, activationRate };
  }

  async getRevenueMetrics() {
    const activeSubscriptions = await db.execute(sql`
      SELECT 
        COUNT(*) as active_count,
        SUM(pp.amount) as mrr
      FROM subscriptions s
      JOIN pricing_plans pp ON pp.stripe_price_id = s.stripe_price_id
      WHERE s.status = 'active'
      AND pp.interval = 'month'
    `);

    const mrr = Number((activeSubscriptions as any).rows?.[0]?.mrr || 0);
    const activeCount = Number((activeSubscriptions as any).rows?.[0]?.active_count || 0);
    const arr = mrr * 12;

    const churnedSubs = await db.execute(sql`
      SELECT COUNT(*) as churned
      FROM subscriptions
      WHERE status = 'canceled'
      AND updated_at >= NOW() - INTERVAL '30 days'
    `);

    const churned = Number((churnedSubs as any).rows?.[0]?.churned || 0);
    const churnRate = activeCount > 0 ? (churned / activeCount) * 100 : 0;

    return {
      mrr: mrr / 100,
      arr: arr / 100,
      activeSubscriptions: activeCount,
      churnRate,
    };
  }
}
