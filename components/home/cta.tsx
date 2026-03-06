'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Bot } from 'lucide-react';

export function CTASection() {
  return (
    <section className="bg-brand-navy py-24 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center mx-auto mb-8">
            <Bot className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-6">
            Ready to Let Robert
            <br />
            <span className="text-gradient">Build Your Resume?</span>
          </h2>

          <p className="text-brand-muted text-lg max-w-xl mx-auto mb-10">
            Join thousands of job seekers who landed their dream role with a
            resume built by Robert. Start for free — no credit card required.
          </p>

          <Link
            href="/builder"
            className="group inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl hover:shadow-xl hover:shadow-brand-accent/25 transition-all hover:-translate-y-0.5"
          >
            Build My Resume Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
