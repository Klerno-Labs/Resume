'use client';

import Link from 'next/link';
import { ArrowRight, Bot, FileText, Sparkles, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-navy pt-16">
      {/* Background gradient effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/20 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-brand-accent/20 mb-8"
        >
          <Bot className="w-4 h-4 text-brand-accent-light" />
          <span className="text-sm text-brand-accent-light font-medium">
            Meet Robert — Your AI Resume Expert
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white leading-tight mb-6"
        >
          Your Resume, Rewritten
          <br />
          <span className="text-gradient">By AI That Gets You Hired</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg sm:text-xl text-brand-muted max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Robert analyzes your experience, optimizes for ATS systems, and
          delivers a professionally designed resume — in minutes, not hours.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link
            href="/builder"
            className="group px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl hover:shadow-xl hover:shadow-brand-accent/25 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            Build My Resume
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/templates"
            className="px-8 py-4 text-lg font-semibold text-white border border-white/10 rounded-xl hover:bg-white/5 transition-all"
          >
            View Templates
          </Link>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-brand-muted"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span>ATS-Optimized</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-accent-light" />
            <span>AI-Powered</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>40+ Templates</span>
          </div>
        </motion.div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 50L48 45.7C96 41.3 192 32.7 288 30.8C384 29 480 34 576 41.2C672 48.3 768 57.7 864 55.8C960 54 1056 41 1152 36.8C1248 32.7 1344 37.3 1392 39.7L1440 42V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z" fill="currentColor" className="text-brand-dark" />
        </svg>
      </div>
    </section>
  );
}
