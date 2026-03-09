import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { users, payments } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ message: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET required');
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err);
    return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const credits = parseInt(session.metadata?.credits || '0', 10);

        if (userId && credits > 0 && session.payment_status === 'paid') {
          // Update payment status
          if (session.id) {
            await db
              .update(payments)
              .set({ status: 'completed', stripePaymentId: (session.payment_intent as string) || null })
              .where(eq(payments.stripeSessionId, session.id));
          }

          // Add credits to user (additive — they stack)
          await db
            .update(users)
            .set({
              creditsRemaining: sql`${users.creditsRemaining} + ${credits}`,
            })
            .where(eq(users.id, userId));
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ received: true, error: 'Processing error logged' });
  }
}
