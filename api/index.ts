import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';
import Stripe from 'stripe';
import getRawBody from 'raw-body';
// Initialize services
const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-11-17.clover' });

// Price configuration
const PRICES = {
  basic: { amount: 700, credits: 1, name: 'Basic Plan' },
  pro: { amount: 1900, credits: 3, name: 'Pro Plan' },
  premium: { amount: 2900, credits: 999, name: 'Premium Plan' },
} as const;

// Create Stripe checkout session
    if (path === '/api/payments/create-checkout' && method === 'POST') {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { plan } = body;
      if (!plan || !PRICES[plan as keyof typeof PRICES]) {
        return res.status(400).json({ error: 'Invalid plan' });
      }

      const priceConfig = PRICES[plan as keyof typeof PRICES];

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: priceConfig.name,
                description: `${priceConfig.credits === 999 ? 'Unlimited' : priceConfig.credits} resume optimization${priceConfig.credits !== 1 ? 's' : ''}`,
              },
              unit_amount: priceConfig.amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/#pricing`,
        customer_email: user.email,
        metadata: {
          userId: user.id,
          plan: plan,
          credits: priceConfig.credits.toString(),
        },
      });

      return res.json({ url: session.url });
    }

    // Verify payment success
    if (path === '/api/payments/verify' && method === 'POST') {
      const { sessionId } = body;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const credits = parseInt(session.metadata?.credits || '0');

        if (userId && plan) {
          // Update user plan and credits
          await sql`
            UPDATE users 
            SET plan = ${plan}, credits_remaining = credits_remaining + ${credits}
            WHERE id = ${userId}
          `;

          // Record payment
          await sql`
            INSERT INTO payments (user_id, stripe_session_id, plan, amount, status)
            VALUES (${userId}, ${sessionId}, ${plan}, ${session.amount_total}, 'completed')
            ON CONFLICT (stripe_session_id) DO NOTHING
          `;

          return res.json({ success: true, plan, credits });
        }
      }

      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Stripe webhook
    if (path === '/api/webhooks/stripe' && method === 'POST') {
      const sig = req.headers['stripe-signature'] as string;

      let event: Stripe.Event;
      try {
        // For webhooks, we must use the raw request body exactly as received
        const rawBody = await getRawBody(req);
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const credits = parseInt(session.metadata?.credits || '0');

        if (userId && plan && session.payment_status === 'paid') {
          await sql`
            UPDATE users
            SET plan = ${plan}, credits_remaining = credits_remaining + ${credits}
            WHERE id = ${userId}
          `;

          await sql`
            INSERT INTO payments (user_id, stripe_session_id, plan, amount, status)
            VALUES (${userId}, ${session.id}, ${plan}, ${session.amount_total}, 'completed')
            ON CONFLICT (stripe_session_id) DO NOTHING
          `;
        }
      }

      return res.json({ received: true });
    }

    // Analytics: Track event
    if (path === '/api/analytics/event' && method === 'POST') {
      const { event, properties, page, referrer, sessionId } = body;

      if (!event || !sessionId) {
        return res.status(400).json({ error: 'Event name and sessionId required' });
      }

      // Get user if authenticated (optional for analytics)
      const user = await getUserFromRequest(req);
      const userId = user?.id || null;

      const userAgent = req.headers['user-agent'] || null;
      const ipAddress =
        (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || null;

      // Store analytics event (gracefully handle if table doesn't exist yet)
      try {
        await sql`
          INSERT INTO analytics_events (user_id, session_id, event, properties, page, referrer, user_agent, ip_address)
          VALUES (${userId}, ${sessionId}, ${event}, ${JSON.stringify(properties || {})}, ${page || null}, ${referrer || null}, ${userAgent}, ${ipAddress})
        `;
      } catch (err) {
        // Silently ignore if analytics table doesn't exist - don't break the app
        console.warn('Analytics event failed (table may not exist):', err);
      }

      return res.json({ success: true });
    }

    // Analytics: Track funnel step
    if (path.match(/^\/api\/analytics\/funnel\/[^/]+$/) && method === 'POST') {
      const step = path.split('/').pop();
      const { sessionId } = body;

      if (!step || !sessionId) {
        return res.status(400).json({ error: 'Step and sessionId required' });
      }

      // Get user if authenticated (optional for analytics)
      const user = await getUserFromRequest(req);
      const userId = user?.id || null;

      // Store funnel step (gracefully handle if table doesn't exist yet)
      try {
        await sql`
          INSERT INTO funnel_steps (session_id, step, user_id)
          VALUES (${sessionId}, ${step}, ${userId})
        `;
      } catch (err) {
        // Silently ignore if funnel table doesn't exist - don't break the app
        console.warn('Funnel tracking failed (table may not exist):', err);
      }

      return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Background resume processing
async function processResume(resumeId: string, originalText: string) {
  try {
    const [optimizationResult, scoreResult] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Optimize resumes. Output JSON only.' },
          {
            role: 'user',
            content: `Rewrite this resume with strong action verbs and quantified achievements.\n\n${originalText}\n\n{"improvedText": "optimized resume"}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2500,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Score resumes. Output JSON only.' },
          {
            role: 'user',
            content: `Score this resume.\n\n${originalText.substring(0, 1500)}\n\n{"atsScore": 0-100, "keywordsScore": 0-10, "formattingScore": 0-10, "issues": [{"type": "issue", "message": "fix", "severity": "high"}]}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      }),
    ]);

    const optimization = JSON.parse(optimizationResult.choices[0].message.content || '{}');
    const scores = JSON.parse(scoreResult.choices[0].message.content || '{}');

    await sql`
      UPDATE resumes SET
        improved_text = ${optimization.improvedText || originalText},
        ats_score = ${scores.atsScore || 70},
        keywords_score = ${scores.keywordsScore || 7},
        formatting_score = ${scores.formattingScore || 7},
        issues = ${JSON.stringify(scores.issues || [])},
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${resumeId}
    `;
  } catch (error) {
    console.error('Process error:', error);
    await sql`UPDATE resumes SET status = 'failed' WHERE id = ${resumeId}`;
  }
}
