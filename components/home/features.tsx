'use client';

import { motion } from 'framer-motion';
import {
  Bot,
  FileSearch,
  Palette,
  Target,
  FileText,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'Robert AI Engine',
    description:
      'Robert reads your resume like a recruiter would, then rewrites it to maximize your chances. Real intelligence, not templates.',
  },
  {
    icon: FileSearch,
    title: 'ATS Optimization',
    description:
      'Every resume is scanned and optimized for Applicant Tracking Systems. Pass the bots, reach the humans.',
  },
  {
    icon: Target,
    title: 'Job Matching',
    description:
      'Paste a job description and Robert tailors your resume with the exact keywords and skills they\'re looking for.',
  },
  {
    icon: Palette,
    title: '35+ Pro Templates',
    description:
      'Choose from professionally designed templates — modern, classic, creative, or minimal. All ATS-friendly.',
  },
  {
    icon: FileText,
    title: 'Cover Letters',
    description:
      'Robert generates tailored cover letters that complement your resume and match the job posting tone.',
  },
  {
    icon: Zap,
    title: 'Instant Results',
    description:
      'Upload your resume and get an optimized version in under 60 seconds. No waiting, no back-and-forth.',
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-brand-dark py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Everything You Need to{' '}
            <span className="text-gradient">Land the Job</span>
          </h2>
          <p className="text-brand-muted text-lg max-w-2xl mx-auto">
            Robert handles every aspect of your resume — from content to design
            to optimization. Here&apos;s what&apos;s under the hood.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group p-8 rounded-2xl glass hover:glow-border transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent/20 to-purple-500/20 flex items-center justify-center mb-5 group-hover:from-brand-accent/30 group-hover:to-purple-500/30 transition-colors">
                <feature.icon className="w-6 h-6 text-brand-accent-light" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-brand-muted leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
