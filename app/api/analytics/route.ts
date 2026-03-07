import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { analyticsEvents, funnelSteps } from '@shared/schema';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const eventSchema = z.object({
  event: z.string().min(1).max(100),
  properties: z.record(z.unknown()).optional(),
  page: z.string().max(500).optional(),
  sessionId: z.string().max(100).optional(),
  funnelStep: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed } = rateLimit(`analytics:${ip}`, 60, 60_000);
    if (!allowed) {
      return NextResponse.json({ success: true }); // Silently drop
    }

    const user = await getAuthUser();
    const body = await req.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid event' }, { status: 400 });
    }

    const { event, properties, page, sessionId, funnelStep } = parsed.data;
    const sid = sessionId || crypto.randomUUID();

    await db.insert(analyticsEvents).values({
      userId: user?.id || null,
      sessionId: sid,
      event,
      properties: properties || {},
      page,
      referrer: req.headers.get('referer') || null,
      userAgent: req.headers.get('user-agent') || null,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    });

    // Track funnel step if provided
    if (funnelStep) {
      await db.insert(funnelSteps).values({
        sessionId: sid,
        userId: user?.id || null,
        step: funnelStep,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ success: true }); // Don't fail on analytics
  }
}
