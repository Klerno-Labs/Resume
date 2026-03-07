import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLANS } from '@/lib/stripe';
import { db } from '@/lib/db';
import { users, payments, subscriptions } from '@shared/schema';
import { eq } from 'drizzle-orm';
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
        const plan = session.metadata?.plan as keyof typeof PLANS;

        if (userId && plan && PLANS[plan]) {
          // Update payment status
          if (session.id) {
            await db
              .update(payments)
              .set({ status: 'completed', stripePaymentId: (session.payment_intent as string) || null })
              .where(eq(payments.stripeSessionId, session.id));
          }

          // Update user plan and credits
          await db
            .update(users)
            .set({
              plan,
              creditsRemaining: PLANS[plan].credits,
              currentSubscriptionId: session.subscription as string,
            })
            .where(eq(users.id, userId));

          // Create subscription record (idempotent - check if exists first)
          if (session.subscription) {
            const subId = session.subscription as string;
            const [existingSub] = await db
              .select({ id: subscriptions.id })
              .from(subscriptions)
              .where(eq(subscriptions.stripeSubscriptionId, subId))
              .limit(1);

            if (!existingSub) {
              const sub = await stripe.subscriptions.retrieve(subId) as unknown as {
                id: string;
                items: { data: Array<{ price: { id: string } }> };
                current_period_start: number;
                current_period_end: number;
              };
              await db.insert(subscriptions).values({
                userId,
                stripeSubscriptionId: sub.id,
                stripePriceId: sub.items.data[0]?.price.id || '',
                status: 'active',
                currentPeriodStart: new Date(sub.current_period_start * 1000),
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
              });
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as {
          id: string; status: string; current_period_start: number; current_period_end: number; cancel_at_period_end: boolean;
        };
        await db
          .update(subscriptions)
          .set({
            status: sub.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused',
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as { id: string };
        await db
          .update(subscriptions)
          .set({ status: 'canceled', updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));

        // Downgrade user to free
        const [subRecord] = await db
          .select({ userId: subscriptions.userId })
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, sub.id))
          .limit(1);

        if (subRecord) {
          await db
            .update(users)
            .set({ plan: 'free', creditsRemaining: PLANS.free.credits })
            .where(eq(users.id, subRecord.userId));
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as { subscription?: string };
        if (invoice.subscription) {
          await db
            .update(subscriptions)
            .set({ status: 'past_due', updatedAt: new Date() })
            .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string));
        }
        break;
      }
    }

    // Always return 200 for successfully processed events
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    // Return 200 to prevent Stripe from retrying on application errors
    // Only infrastructure failures (caught above at signature level) should return non-200
    return NextResponse.json({ received: true, error: 'Processing error logged' });
  }
}
