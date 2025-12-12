import Stripe from 'stripe';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { payments, pricingPlans, subscriptions, usageRecords, users } from '../../shared/schema';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

export class PaymentService {
  async createSubscriptionCheckout(
    userId: string,
    planId: string,
    options?: { skipTrial?: boolean; billingInterval?: 'month' | 'year' }
  ) {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const [user] = (await db.select().from(users).where(eq(users.id, userId)).limit(1)) as any[];
    const [plan] = (await db
      .select()
      .from(pricingPlans)
      .where(eq(pricingPlans.id, planId))
      .limit(1)) as any[];

    if (!user || !plan) {
      throw new Error('User or plan not found');
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
    }

    const isFirstPurchase = user.lifetimeValue === 0;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.APP_URL}/pricing?payment=cancelled`,
      subscription_data: {
        metadata: { userId, planId, trialAwarded: 'no' },
        trial_period_days: options?.skipTrial ? 0 : undefined,
      },
      payment_method_collection: 'always',
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      discounts:
        isFirstPurchase && process.env.STRIPE_COUPON_WELCOME50
          ? [{ coupon: process.env.STRIPE_COUPON_WELCOME50 }]
          : undefined,
      custom_text: {
        submit: {
          message: '30-day money-back guarantee. Cancel anytime.',
        },
      },
      metadata: { userId, planId },
    });

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Create one-time credit purchase
   */
  async createCreditCheckout(userId: string, packSize: 'small' | 'medium' | 'large') {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }
    const { CREDIT_PACKAGES } = await import('../config/pricing');
    const pack = CREDIT_PACKAGES[packSize];
    const [user] = (await db.select().from(users).where(eq(users.id, userId)).limit(1)) as any[];
    if (!user) throw new Error('User not found');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: pack.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/dashboard?payment=success&type=credits`,
      cancel_url: `${process.env.APP_URL}/pricing?payment=cancelled`,
      metadata: {
        userId,
        packSize,
        credits: pack.credits.toString(),
        type: 'credits',
      },
    });

    return { url: session.url };
  }

  /**
   * Get subscription details for user
   */
  async getSubscriptionDetails(userId: string) {
    const [user] = (await db.select().from(users).where(eq(users.id, userId)).limit(1)) as any[];

    if (!user?.currentSubscriptionId) {
      return {
        plan: 'free',
        status: 'active',
        creditsRemaining: user?.creditsRemaining || 0,
      };
    }

    const [subscription] = (await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, user.currentSubscriptionId))
      .limit(1)) as any[];

    return {
      plan: user.plan,
      status: subscription?.status || 'unknown',
      currentPeriodEnd: subscription?.currentPeriodEnd,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
      creditsRemaining: user.creditsRemaining,
    };
  }

  /**
   * Create billing portal session
   */
  async createPortalSession(userId: string) {
    if (!stripe) throw new Error('Stripe is not configured');
    const [user] = (await db.select().from(users).where(eq(users.id, userId)).limit(1)) as any[];

    if (!user?.stripeCustomerId) {
      throw new Error('No payment method on file');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.APP_URL}/dashboard`,
    });

    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return { received: true };
    }

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        this.handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  async trackUsage(userId: string, action: string, creditsUsed: number = 1, metadata?: any) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.creditsRemaining < creditsUsed) {
      throw new Error('Insufficient credits');
    }

    await db
      .update(users)
      .set({
        creditsRemaining: user.creditsRemaining - creditsUsed,
        totalCreditsUsed: user.totalCreditsUsed + creditsUsed,
        lastActiveAt: new Date(),
      })
      .where(eq(users.id, userId));

    await db.insert(usageRecords).values({
      userId,
      subscriptionId: user.currentSubscriptionId,
      action,
      creditsUsed,
      metadata,
    });

    return { creditsRemaining: user.creditsRemaining - creditsUsed };
  }

  async getSubscriptionAnalytics(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.userId, userId))
      .orderBy(desc(usageRecords.createdAt))
      .limit(1000);

    const totalCreditsUsed = usage.reduce((sum, record) => sum + record.creditsUsed, 0);
    const actionBreakdown = usage.reduce(
      (acc, record) => {
        acc[record.action] = (acc[record.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalCreditsUsed,
      actionsPerformed: usage.length,
      actionBreakdown,
      usageHistory: usage,
    };
  }

  async cancelSubscription(userId: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.currentSubscriptionId) {
      throw new Error('No active subscription');
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, user.currentSubscriptionId))
      .limit(1);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscription.id));

    return { success: true, cancelAtPeriodEnd: true };
  }

  async reactivateSubscription(userId: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user?.currentSubscriptionId) {
      throw new Error('No subscription to reactivate');
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, user.currentSubscriptionId))
      .limit(1);

    if (!subscription || !subscription.cancelAtPeriodEnd) {
      throw new Error('Subscription is not scheduled for cancellation');
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscription.id));

    return { success: true };
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;
    if (!userId) return;

    const existingSub = (await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .limit(1)) as any[];

    const subscriptionData = {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      status: subscription.status as any,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      trialStart: (subscription as any).trial_start
        ? new Date((subscription as any).trial_start * 1000)
        : null,
      trialEnd: (subscription as any).trial_end
        ? new Date((subscription as any).trial_end * 1000)
        : null,
      updatedAt: new Date(),
    };

    if (existingSub.length > 0) {
      await db
        .update(subscriptions)
        .set(subscriptionData)
        .where(eq(subscriptions.id, existingSub[0].id));
    } else {
      const [newSub] = (await db
        .insert(subscriptions)
        .values(subscriptionData)
        .returning()) as any[];
      await db.update(users).set({ currentSubscriptionId: newSub.id }).where(eq(users.id, userId));
    }

    const [plan] = (await db
      .select()
      .from(pricingPlans)
      .where(eq(pricingPlans.stripePriceId, subscription.items.data[0].price.id))
      .limit(1)) as any[];

    if (plan) {
      await db
        .update(users)
        .set({ creditsRemaining: plan.creditsPerMonth })
        .where(eq(users.id, userId));
    }
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    await db
      .update(subscriptions)
      .set({ status: 'canceled', updatedAt: new Date() })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    const [sub] = (await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .limit(1)) as any[];

    if (sub) {
      await db
        .update(users)
        .set({
          plan: 'free',
          currentSubscriptionId: null,
          creditsRemaining: 0,
        })
        .where(eq(users.id, sub.userId));
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    if (!(invoice as any).subscription) return;

    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const [user] = (await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1)) as any[];

    if (user) {
      await db.insert(payments).values({
        userId: user.id,
        stripeSessionId: invoice.id,
        plan: user.plan,
        amount: invoice.amount_paid ?? 0,
        stripePaymentId: ((invoice as any).payment_intent as string) || null,
        status: 'completed',
      });

      await db
        .update(users)
        .set({ lifetimeValue: user.lifetimeValue + (invoice.amount_paid ?? 0) })
        .where(eq(users.id, user.id));
    }
  }

  private handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log('Payment failed for invoice:', invoice.id);
  }
}
