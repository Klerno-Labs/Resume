'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Try Robert with limited features',
    features: [
      '1 resume optimization',
      'Basic ATS scoring',
      '5 templates',
      'PDF export',
    ],
    cta: 'Get Started Free',
    href: '/builder',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For serious job seekers',
    features: [
      'Unlimited resume optimizations',
      'Full ATS reports',
      '40+ premium templates',
      'Cover letter generation',
      'Job matching analysis',
      'Industry optimization',
      'Priority AI processing',
    ],
    cta: 'Start Pro',
    href: '/pricing',
    highlighted: true,
  },
  {
    name: 'Premium',
    price: '$29',
    period: '/month',
    description: 'Maximum firepower for your job search',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Custom branding',
      'Unlimited cover letters',
      'Priority support',
      'Advanced analytics',
      'API access',
    ],
    cta: 'Go Premium',
    href: '/pricing',
    highlighted: false,
  },
];

export function PricingPreview() {
  return (
    <section className="bg-brand-navy py-24 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Simple, Transparent{' '}
            <span className="text-gradient">Pricing</span>
          </h2>
          <p className="text-brand-muted text-lg max-w-2xl mx-auto">
            Start free. Upgrade when you&apos;re ready. No surprises.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 ${
                plan.highlighted
                  ? 'glass glow-border'
                  : 'glass'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-brand-accent to-purple-500 text-white text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-brand-muted text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-display font-bold text-white">
                  {plan.price}
                </span>
                <span className="text-brand-muted text-sm ml-1">
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-brand-accent-light flex-shrink-0 mt-0.5" />
                    <span className="text-brand-muted text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-gradient-to-r from-brand-accent to-purple-500 text-white hover:shadow-lg hover:shadow-brand-accent/25'
                    : 'border border-white/10 text-white hover:bg-white/5'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
