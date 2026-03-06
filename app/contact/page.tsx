'use client';

import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { motion } from 'framer-motion';
import { Bot, HelpCircle, FileText, CreditCard } from 'lucide-react';

const helpTopics = [
  {
    icon: Bot,
    title: 'Talk to Robert',
    description: 'Get instant help building, optimizing, or improving your resume directly in the builder.',
    link: '/builder',
    cta: 'Open Resume Builder',
  },
  {
    icon: FileText,
    title: 'Resume Tips',
    description: 'Robert can score your resume, suggest improvements, and tailor it for any job posting.',
    link: '/builder',
    cta: 'Get Started',
  },
  {
    icon: CreditCard,
    title: 'Billing & Plans',
    description: 'Manage your subscription, view plan details, and upgrade or downgrade anytime.',
    link: '/settings',
    cta: 'Manage Billing',
  },
  {
    icon: HelpCircle,
    title: 'FAQ',
    description: 'Robert uses AI to analyze, optimize, and redesign your resume for ATS systems and recruiters.',
    link: '/builder',
    cta: 'Try It Free',
  },
];

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-navy pt-16">
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
                How Can We <span className="text-gradient">Help?</span>
              </h1>
              <p className="text-brand-muted text-lg">
                Robert is available 24/7 to help you build the perfect resume.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {helpTopics.map((topic, i) => (
                <motion.div
                  key={topic.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    href={topic.link}
                    className="block glass rounded-2xl p-6 hover:bg-white/[0.03] transition-colors group"
                  >
                    <topic.icon className="w-8 h-8 text-brand-accent-light mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2">{topic.title}</h3>
                    <p className="text-brand-muted text-sm mb-4">{topic.description}</p>
                    <span className="text-brand-accent-light text-sm font-medium group-hover:underline">
                      {topic.cta} &rarr;
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
