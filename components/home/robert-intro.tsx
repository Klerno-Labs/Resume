'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, MessageSquare, ArrowRight } from 'lucide-react';

export function RobertSection() {
  return (
    <section className="bg-brand-navy py-24 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-accent/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Robert Intro */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 mb-6">
              <Bot className="w-4 h-4 text-brand-accent-light" />
              <span className="text-xs text-brand-accent-light font-medium">
                AI-Powered
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-6">
              Meet Robert.
              <br />
              <span className="text-gradient">Your Resume Architect.</span>
            </h2>
            <p className="text-brand-muted text-lg leading-relaxed mb-6">
              Robert isn&apos;t just another AI tool. He&apos;s the brain behind
              every resume we build. He reads your experience, understands the
              job market, and crafts a resume that speaks directly to recruiters
              and ATS systems.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                'Analyzes your experience and identifies strengths',
                'Rewrites bullet points with quantified achievements',
                'Optimizes keywords for your target industry',
                'Selects the perfect template and layout',
                'Generates matching cover letters on demand',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-brand-accent-light" />
                  </div>
                  <span className="text-brand-muted">{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/builder"
              className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl hover:shadow-lg hover:shadow-brand-accent/25 transition-all"
            >
              Talk to Robert
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Right: Chat Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="rounded-2xl glass p-6 space-y-4">
              {/* Chat header */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Robert</div>
                  <div className="text-green-400 text-xs flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Online
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/5 rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%]">
                    <p className="text-white text-sm">
                      Hey! I&apos;m Robert. Upload your resume or tell me about
                      your experience, and I&apos;ll build you something that
                      gets interviews.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <div className="bg-brand-accent/20 rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
                    <p className="text-white text-sm">
                      I&apos;m a software engineer with 5 years experience.
                      Looking for senior roles.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/5 rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%]">
                    <p className="text-white text-sm">
                      Great background! I&apos;ll optimize your resume for
                      senior SWE roles. Let me highlight your leadership,
                      architecture decisions, and impact metrics. Give me 30
                      seconds...
                    </p>
                  </div>
                </div>
              </div>

              {/* Input preview */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <div className="flex-1 bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-brand-muted text-sm">
                    Tell Robert about your experience...
                  </span>
                </div>
                <button className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-accent/10 to-purple-500/10 rounded-3xl blur-xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
