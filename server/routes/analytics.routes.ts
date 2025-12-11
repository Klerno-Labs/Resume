import crypto from 'crypto';
import { Router } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { optionalAuth } from '../lib/jwt';

const router = Router();
const analyticsService = new AnalyticsService();

router.post('/event', optionalAuth, async (req, res) => {
  try {
    const { event, properties, page, referrer } = req.body;
    const sessionId = (req as any).session?.id || req.cookies?.sessionId || crypto.randomUUID();

    await analyticsService.trackEvent({
      userId: (req as any).userId,
      sessionId,
      event,
      properties,
      page,
      referrer,
      userAgent: req.get('user-agent') || undefined,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

router.post('/funnel/:step', optionalAuth, async (req, res) => {
  try {
    const { step } = req.params;
    const sessionId = (req as any).session?.id || req.cookies?.sessionId || crypto.randomUUID();

    await analyticsService.trackFunnelStep(sessionId, step, (req as any).userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track funnel step' });
  }
});

export default router;
