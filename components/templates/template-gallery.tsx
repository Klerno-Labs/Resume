'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = ['All', 'Modern', 'Classic', 'Creative', 'Minimal', 'Executive'];

const templates = [
  { id: 'modern-clean', name: 'Modern Clean', category: 'Modern', popular: true },
  { id: 'executive-pro', name: 'Executive Pro', category: 'Executive', popular: true },
  { id: 'minimal-edge', name: 'Minimal Edge', category: 'Minimal', popular: false },
  { id: 'creative-bold', name: 'Creative Bold', category: 'Creative', popular: false },
  { id: 'classic-serif', name: 'Classic Serif', category: 'Classic', popular: true },
  { id: 'tech-forward', name: 'Tech Forward', category: 'Modern', popular: false },
  { id: 'elegant-resume', name: 'Elegant', category: 'Classic', popular: false },
  { id: 'startup-vibe', name: 'Startup Vibe', category: 'Creative', popular: true },
  { id: 'corporate-blue', name: 'Corporate Blue', category: 'Executive', popular: false },
  { id: 'fresh-graduate', name: 'Fresh Graduate', category: 'Minimal', popular: false },
  { id: 'senior-leader', name: 'Senior Leader', category: 'Executive', popular: false },
  { id: 'designer-cv', name: 'Designer CV', category: 'Creative', popular: false },
  { id: 'engineer-spec', name: 'Engineer Spec', category: 'Modern', popular: true },
  { id: 'healthcare-pro', name: 'Healthcare Pro', category: 'Classic', popular: false },
  { id: 'sales-impact', name: 'Sales Impact', category: 'Modern', popular: false },
  { id: 'academic-formal', name: 'Academic Formal', category: 'Classic', popular: false },
];

export function TemplateGallery() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered =
    activeCategory === 'All'
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
            Resume <span className="text-gradient">Templates</span>
          </h1>
          <p className="text-brand-muted text-lg max-w-2xl mx-auto">
            35+ professionally designed templates. All ATS-friendly. Robert will
            recommend the best one for your industry.
          </p>
        </motion.div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeCategory === cat
                  ? 'bg-brand-accent text-white'
                  : 'text-brand-muted hover:text-white hover:bg-white/5'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group glass rounded-2xl overflow-hidden hover:glow-border transition-all"
            >
              {/* Template preview placeholder */}
              <div className="aspect-[8.5/11] bg-white/[0.02] flex items-center justify-center relative">
                <FileText className="w-16 h-16 text-white/10" />
                {template.popular && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-brand-accent/90 text-white text-[10px] font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Popular
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                  <Link
                    href="/builder"
                    className="flex items-center gap-2 px-4 py-2 bg-white text-brand-navy rounded-lg text-sm font-semibold hover:bg-brand-cream transition-colors"
                  >
                    Use Template
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-white font-medium text-sm">{template.name}</h3>
                <p className="text-brand-muted text-xs mt-0.5">{template.category}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
