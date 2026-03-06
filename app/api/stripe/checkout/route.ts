import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { stripe, PLANS } from '@/lib/stripe';
import { db } from '@/lib/db';
import { users, payments } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { plan, interval = 'month' } = await req.json();

    if (!plan || !['basic', 'pro', 'premium'].includes(plan)) {
      return NextResponse.json({ message: 'Invalid plan' }, { status: 400 });
    }

    const planConfig = PLANS[plan as keyof typeof PLANS];
    const amount = interval === 'year' ? Math.round(planConfig.price * 10) : planConfig.price;

    // Get or create Stripe customer
    let customerId: string;
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (dbUser?.stripeCustomerId) {
      customerId = dbUser.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `RewriteMe ${planConfig.name} Plan`,
              description: `${planConfig.credits} resume credits per month`,
            },
            unit_amount: amount,
            recurring: { interval: interval === 'year' ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://rewriteme.app'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://rewriteme.app'}/pricing`,
      metadata: { userId: user.id, plan },
    });

    // Track payment
    await db.insert(payments).values({
      userId: user.id,
      stripeSessionId: session.id,
      plan: plan as 'basic' | 'pro' | 'premium',
      amount,
      status: 'pending',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ message: 'Failed to create checkout' }, { status: 500 });
  }
}
