'use client';

import { motion } from 'framer-motion';
import { Upload, Bot, Sparkles, Download } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    step: '01',
    title: 'Upload or Start Fresh',
    description:
      'Upload your existing resume (PDF, DOCX) or tell Robert about your experience from scratch.',
  },
  {
    icon: Bot,
    step: '02',
    title: 'Robert Takes Over',
    description:
      'Robert analyzes your content, rewrites weak bullet points, adds quantified achievements, and optimizes for ATS.',
  },
  {
    icon: Sparkles,
    step: '03',
    title: 'Choose Your Design',
    description:
      'Pick from professionally designed templates. Robert recommends the best layout for your industry.',
  },
  {
    icon: Download,
    step: '04',
    title: 'Download & Apply',
    description:
      'Export as PDF, match to job descriptions, generate cover letters — everything you need to apply with confidence.',
  },
];

export function ProcessSection() {
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
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-brand-muted text-lg max-w-2xl mx-auto">
            Four simple steps. Robert handles the hard part.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] right-[-40%] h-px bg-gradient-to-r from-brand-accent/30 to-transparent" />
              )}

              <div className="text-center">
                <div className="relative inline-flex mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-accent/10 to-purple-500/10 border border-brand-accent/20 flex items-center justify-center">
                    <step.icon className="w-10 h-10 text-brand-accent-light" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center text-white text-xs font-bold">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-brand-muted text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
