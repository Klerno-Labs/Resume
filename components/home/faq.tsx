'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'What is Robert and how does it work?',
    answer:
      'Robert is our AI resume architect. He analyzes your experience, identifies your strongest selling points, rewrites weak bullet points with quantified achievements, and optimizes everything for ATS systems. Think of Robert as a professional resume writer that works in seconds instead of days.',
  },
  {
    question: 'Will my resume pass ATS systems?',
    answer:
      'Yes. Every resume Robert builds is optimized for Applicant Tracking Systems. He uses clean formatting, proper heading structures, and strategically places keywords that ATS systems scan for. Our average ATS score is 95+.',
  },
  {
    question: 'Can I upload my existing resume?',
    answer:
      'Absolutely. Upload your current resume as a PDF or DOCX file, and Robert will analyze it, identify areas for improvement, and rewrite it while preserving your unique experience and voice.',
  },
  {
    question: 'How is this different from other resume builders?',
    answer:
      'Most resume builders are glorified templates. Robert actually reads and understands your content, then rewrites it with recruiter-tested language, quantified achievements, and industry-specific keywords. It\'s the difference between a template and a professional writer.',
  },
  {
    question: 'Can Robert write cover letters too?',
    answer:
      'Yes. Robert generates tailored cover letters that complement your resume and match the tone of the job posting. Choose from professional, enthusiastic, academic, or creative styles.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Your resume data is encrypted in transit and at rest. We never share your personal information with third parties. You can delete your data at any time from your dashboard.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-brand-dark py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Frequently Asked{' '}
            <span className="text-gradient">Questions</span>
          </h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl glass overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="text-white font-medium pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-brand-muted flex-shrink-0 transition-transform',
                    openIndex === i && 'rotate-180'
                  )}
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-5 pb-5 text-brand-muted leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
