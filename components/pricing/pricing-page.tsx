'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Sparkles, X, Loader2 } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    planId: 'free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for testing Robert',
    features: [
      { text: '3 resume optimizations', included: true },
      { text: 'Basic ATS scoring', included: true },
      { text: '5 starter templates', included: true },
      { text: 'PDF export', included: true },
      { text: 'Cover letters', included: false },
      { text: 'Job matching', included: false },
      { text: 'Industry optimization', included: false },
      { text: 'Priority AI processing', included: false },
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    planId: 'pro',
    price: '$12',
    period: '/month',
    description: 'For active job seekers',
    features: [
      { text: '50 resume optimizations/month', included: true },
      { text: 'Full ATS reports & scoring', included: true },
      { text: 'All premium templates', included: true },
      { text: 'PDF export', included: true },
      { text: 'Cover letter generation', included: true },
      { text: 'Job matching analysis', included: true },
      { text: 'Industry optimization', included: true },
      { text: 'Priority AI processing', included: true },
    ],
    cta: 'Start Pro',
    highlighted: true,
  },
  {
    name: 'Premium',
    planId: 'premium',
    price: '$29',
    period: '/month',
    description: 'Maximum job search firepower',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: '200 monthly credits', included: true },
      { text: 'All premium templates', included: true },
      { text: 'Unlimited cover letters', included: true },
      { text: 'Priority AI processing', included: true },
      { text: 'Industry-specific optimization', included: true },
      { text: 'Advanced ATS reports', included: true },
      { text: 'Priority support from Robert', included: true },
    ],
    cta: 'Go Premium',
    highlighted: false,
  },
];

export function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  async function handleCheckout(planId: string) {
    if (planId === 'free') {
      router.push('/builder');
      return;
    }

    if (!agreed) return;

    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });

      if (res.status === 401) {
        router.push('/login?redirect=/pricing');
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
            Simple, Transparent{' '}
            <span className="text-gradient">Pricing</span>
          </h1>
          <p className="text-brand-muted text-lg max-w-2xl mx-auto">
            Start free. No credit card required. Upgrade when Robert proves his worth.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 ${
                plan.highlighted ? 'glass glow-border' : 'glass'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-brand-accent to-purple-500 text-white text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-brand-muted text-sm">{plan.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-display font-bold text-white">{plan.price}</span>
                <span className="text-brand-muted ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-brand-accent-light flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-brand-muted/50 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? 'text-brand-muted' : 'text-brand-muted/50'
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.planId === 'free' ? (
                <Link
                  href="/builder"
                  className="block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all border border-white/10 text-white hover:bg-white/5"
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.planId)}
                  disabled={loading === plan.planId || !agreed}
                  className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-brand-accent to-purple-500 text-white hover:shadow-lg hover:shadow-brand-accent/25'
                      : 'border border-white/10 text-white hover:bg-white/5'
                  }`}
                >
                  {loading === plan.planId ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    plan.cta
                  )}
                </button>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-12 max-w-xl mx-auto">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-brand-accent focus:ring-brand-accent/50 cursor-pointer"
            />
            <span className="text-brand-muted text-sm leading-relaxed">
              I have read and agree to the{' '}
              <Link href="/terms" target="_blank" className="text-brand-accent-light underline hover:text-white transition-colors">
                Terms of Service &amp; Subscription Agreement
              </Link>
              , including the <strong className="text-white/80">no-refund policy</strong>. I understand that all
              sales are final and non-refundable.
            </span>
          </label>
        </div>

        <div className="mt-6 text-center">
          <p className="text-brand-muted text-xs">
            All sales are final. Cancel anytime &mdash; your access continues through the end of your billing period.
          </p>
        </div>
      </div>
    </section>
  );
}
