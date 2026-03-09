'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Sparkles, Loader2 } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    planId: 'starter',
    price: '$9.99',
    credits: 10,
    description: 'Great for a single job application',
    features: [
      '10 resume credits',
      'ATS scoring & optimization',
      'All templates',
      'PDF & DOCX export',
      'Cover letter generation',
    ],
    cta: 'Buy Starter',
    highlighted: false,
  },
  {
    name: 'Pro',
    planId: 'pro',
    price: '$19.99',
    credits: 30,
    description: 'Best value for active job seekers',
    features: [
      '30 resume credits',
      'Full ATS reports & scoring',
      'All premium templates',
      'PDF & DOCX export',
      'Cover letter generation',
      'Job matching analysis',
      'Industry optimization',
    ],
    cta: 'Buy Pro',
    highlighted: true,
  },
  {
    name: 'Premium',
    planId: 'premium',
    price: '$39.99',
    credits: 100,
    description: 'Maximum firepower for your job search',
    features: [
      '100 resume credits',
      'Everything in Pro',
      'Priority AI processing',
      'Advanced ATS reports',
      'Industry-specific optimization',
    ],
    cta: 'Buy Premium',
    highlighted: false,
  },
];

export function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  async function handleCheckout(planId: string) {
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
            Buy Credits,{' '}
            <span className="text-gradient">Use Anytime</span>
          </h1>
          <p className="text-brand-muted text-lg max-w-2xl mx-auto">
            One-time purchase. No subscriptions. Credits never expire.
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
                  Best Value
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-brand-muted text-sm">{plan.description}</p>
              </div>

              <div className="mb-2">
                <span className="text-5xl font-display font-bold text-white">{plan.price}</span>
              </div>
              <p className="text-brand-accent-light text-sm font-medium mb-8">
                {plan.credits} credits &middot; one-time
              </p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-brand-accent-light flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-brand-muted">{feature}</span>
                  </li>
                ))}
              </ul>

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
                Terms of Service
              </Link>
              , including the <strong className="text-white/80">no-refund policy</strong>. I understand that all
              sales are final and non-refundable.
            </span>
          </label>
        </div>

        <div className="mt-6 text-center">
          <p className="text-brand-muted text-xs">
            All sales are final. Credits are added to your account instantly and never expire.
          </p>
        </div>
      </div>
    </section>
  );
}
