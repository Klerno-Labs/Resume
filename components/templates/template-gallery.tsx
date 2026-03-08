'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = ['All', 'Modern', 'Classic', 'Creative', 'Minimal', 'Executive'];

interface Template {
  id: string;
  name: string;
  category: string;
  popular: boolean;
  accent: string;
}

const templates: Template[] = [
  { id: 'modern-clean', name: 'Modern Clean', category: 'Modern', popular: true, accent: '#6366F1' },
  { id: 'executive-pro', name: 'Executive Pro', category: 'Executive', popular: true, accent: '#1E3A5F' },
  { id: 'minimal-edge', name: 'Minimal Edge', category: 'Minimal', popular: false, accent: '#111827' },
  { id: 'creative-bold', name: 'Creative Bold', category: 'Creative', popular: false, accent: '#EC4899' },
  { id: 'classic-serif', name: 'Classic Serif', category: 'Classic', popular: true, accent: '#78350F' },
  { id: 'tech-forward', name: 'Tech Forward', category: 'Modern', popular: false, accent: '#10B981' },
  { id: 'elegant-resume', name: 'Elegant', category: 'Classic', popular: false, accent: '#6B7280' },
  { id: 'startup-vibe', name: 'Startup Vibe', category: 'Creative', popular: true, accent: '#F59E0B' },
  { id: 'corporate-blue', name: 'Corporate Blue', category: 'Executive', popular: false, accent: '#2563EB' },
  { id: 'fresh-graduate', name: 'Fresh Graduate', category: 'Minimal', popular: false, accent: '#8B5CF6' },
  { id: 'senior-leader', name: 'Senior Leader', category: 'Executive', popular: false, accent: '#374151' },
  { id: 'designer-cv', name: 'Designer CV', category: 'Creative', popular: false, accent: '#F43F5E' },
  { id: 'engineer-spec', name: 'Engineer Spec', category: 'Modern', popular: true, accent: '#0EA5E9' },
  { id: 'healthcare-pro', name: 'Healthcare Pro', category: 'Classic', popular: false, accent: '#059669' },
  { id: 'sales-impact', name: 'Sales Impact', category: 'Modern', popular: false, accent: '#DC2626' },
  { id: 'academic-formal', name: 'Academic Formal', category: 'Classic', popular: false, accent: '#1F2937' },
];

function TemplateMiniPreview({ template }: { template: Template }) {
  const { accent, category } = template;

  if (category === 'Creative') {
    return (
      <div className="w-full h-full bg-white p-3 flex">
        {/* Sidebar */}
        <div className="w-[35%] pr-2 flex flex-col gap-1.5" style={{ borderRight: `2px solid ${accent}` }}>
          <div className="w-8 h-8 rounded-full mx-auto" style={{ backgroundColor: accent, opacity: 0.15 }} />
          <div className="h-1.5 rounded-full w-3/4 mx-auto" style={{ backgroundColor: accent }} />
          <div className="h-1 rounded-full bg-gray-200 w-2/3 mx-auto" />
          <div className="mt-2 space-y-1">
            <div className="h-1 rounded-full" style={{ backgroundColor: accent, opacity: 0.3 }} />
            <div className="h-1 rounded-full bg-gray-200 w-4/5" />
            <div className="h-1 rounded-full bg-gray-200 w-3/5" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="h-1 rounded-full" style={{ backgroundColor: accent, opacity: 0.3 }} />
            <div className="h-1 rounded-full bg-gray-200 w-full" />
            <div className="h-1 rounded-full bg-gray-200 w-2/3" />
          </div>
        </div>
        {/* Main */}
        <div className="flex-1 pl-2 flex flex-col gap-1.5">
          <div className="h-1.5 rounded-full w-2/3" style={{ backgroundColor: accent, opacity: 0.4 }} />
          <div className="space-y-0.5">
            <div className="h-1 rounded-full bg-gray-200 w-full" />
            <div className="h-1 rounded-full bg-gray-200 w-11/12" />
            <div className="h-1 rounded-full bg-gray-200 w-4/5" />
          </div>
          <div className="mt-1 h-1.5 rounded-full w-1/2" style={{ backgroundColor: accent, opacity: 0.4 }} />
          <div className="space-y-0.5">
            <div className="h-1 rounded-full bg-gray-200 w-full" />
            <div className="h-1 rounded-full bg-gray-200 w-5/6" />
            <div className="h-1 rounded-full bg-gray-200 w-3/4" />
          </div>
          <div className="mt-1 h-1.5 rounded-full w-1/2" style={{ backgroundColor: accent, opacity: 0.4 }} />
          <div className="space-y-0.5">
            <div className="h-1 rounded-full bg-gray-200 w-full" />
            <div className="h-1 rounded-full bg-gray-200 w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (category === 'Executive') {
    return (
      <div className="w-full h-full bg-white flex flex-col">
        {/* Dark header */}
        <div className="px-3 py-3 flex flex-col gap-1" style={{ backgroundColor: accent }}>
          <div className="h-2 rounded-full bg-white/90 w-1/2" />
          <div className="h-1 rounded-full bg-white/50 w-2/3" />
        </div>
        {/* Body */}
        <div className="flex-1 p-3 flex flex-col gap-1.5">
          <div className="h-1 rounded-full w-2/5" style={{ backgroundColor: accent, opacity: 0.6 }} />
          <div className="h-[0.5px] w-full" style={{ backgroundColor: accent, opacity: 0.2 }} />
          <div className="space-y-0.5">
            <div className="h-1 rounded-full bg-gray-200 w-full" />
            <div className="h-1 rounded-full bg-gray-200 w-11/12" />
            <div className="h-1 rounded-full bg-gray-200 w-4/5" />
          </div>
          <div className="mt-1 h-1 rounded-full w-2/5" style={{ backgroundColor: accent, opacity: 0.6 }} />
          <div className="h-[0.5px] w-full" style={{ backgroundColor: accent, opacity: 0.2 }} />
          <div className="space-y-0.5">
            <div className="h-1 rounded-full bg-gray-200 w-full" />
            <div className="h-1 rounded-full bg-gray-200 w-5/6" />
            <div className="h-1 rounded-full bg-gray-200 w-3/4" />
          </div>
          <div className="mt-1 h-1 rounded-full w-1/3" style={{ backgroundColor: accent, opacity: 0.6 }} />
          <div className="h-[0.5px] w-full" style={{ backgroundColor: accent, opacity: 0.2 }} />
          <div className="space-y-0.5">
            <div className="h-1 rounded-full bg-gray-200 w-2/3" />
            <div className="h-1 rounded-full bg-gray-200 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (category === 'Minimal') {
    return (
      <div className="w-full h-full bg-white p-4 flex flex-col gap-2">
        <div className="h-2 rounded-full w-2/5" style={{ backgroundColor: accent }} />
        <div className="h-1 rounded-full bg-gray-300 w-1/2" />
        <div className="mt-2 h-[0.5px] bg-gray-200 w-full" />
        <div className="space-y-0.5">
          <div className="h-1 rounded-full bg-gray-200 w-full" />
          <div className="h-1 rounded-full bg-gray-200 w-11/12" />
          <div className="h-1 rounded-full bg-gray-200 w-4/5" />
        </div>
        <div className="mt-1 h-[0.5px] bg-gray-200 w-full" />
        <div className="space-y-0.5">
          <div className="h-1 rounded-full bg-gray-200 w-full" />
          <div className="h-1 rounded-full bg-gray-200 w-5/6" />
          <div className="h-1 rounded-full bg-gray-200 w-2/3" />
        </div>
        <div className="mt-1 h-[0.5px] bg-gray-200 w-full" />
        <div className="flex gap-1 flex-wrap mt-1">
          <div className="h-1.5 w-6 rounded-full bg-gray-200" />
          <div className="h-1.5 w-8 rounded-full bg-gray-200" />
          <div className="h-1.5 w-5 rounded-full bg-gray-200" />
          <div className="h-1.5 w-7 rounded-full bg-gray-200" />
        </div>
      </div>
    );
  }

  if (category === 'Classic') {
    return (
      <div className="w-full h-full bg-white p-3 flex flex-col gap-1.5">
        <div className="text-center flex flex-col items-center gap-0.5">
          <div className="h-2 rounded-full w-2/5" style={{ backgroundColor: accent }} />
          <div className="h-1 rounded-full bg-gray-300 w-1/3" />
        </div>
        <div className="h-[1px] w-full" style={{ backgroundColor: accent, opacity: 0.4 }} />
        <div className="h-1 rounded-full w-1/3" style={{ backgroundColor: accent, opacity: 0.7 }} />
        <div className="space-y-0.5">
          <div className="h-1 rounded-full bg-gray-200 w-full" />
          <div className="h-1 rounded-full bg-gray-200 w-11/12" />
          <div className="h-1 rounded-full bg-gray-200 w-4/5" />
        </div>
        <div className="h-[1px] w-full" style={{ backgroundColor: accent, opacity: 0.4 }} />
        <div className="h-1 rounded-full w-1/3" style={{ backgroundColor: accent, opacity: 0.7 }} />
        <div className="space-y-0.5">
          <div className="h-1 rounded-full bg-gray-200 w-full" />
          <div className="h-1 rounded-full bg-gray-200 w-5/6" />
          <div className="h-1 rounded-full bg-gray-200 w-3/4" />
        </div>
        <div className="h-[1px] w-full" style={{ backgroundColor: accent, opacity: 0.4 }} />
        <div className="h-1 rounded-full w-1/4" style={{ backgroundColor: accent, opacity: 0.7 }} />
        <div className="space-y-0.5">
          <div className="h-1 rounded-full bg-gray-200 w-2/3" />
          <div className="h-1 rounded-full bg-gray-200 w-1/2" />
        </div>
      </div>
    );
  }

  // Modern (default)
  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Accent bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
      <div className="flex-1 p-3 flex flex-col gap-1.5">
        <div className="h-2 rounded-full w-1/2" style={{ backgroundColor: accent }} />
        <div className="h-1 rounded-full bg-gray-300 w-2/3" />
        <div className="mt-1 h-1 rounded-full w-2/5" style={{ backgroundColor: accent, opacity: 0.4 }} />
        <div className="space-y-0.5">
          <div className="h-1 rounded-full bg-gray-200 w-full" />
          <div className="h-1 rounded-full bg-gray-200 w-11/12" />
          <div className="h-1 rounded-full bg-gray-200 w-4/5" />
        </div>
        <div className="mt-1 h-1 rounded-full w-2/5" style={{ backgroundColor: accent, opacity: 0.4 }} />
        <div className="space-y-0.5">
          <div className="h-1 rounded-full bg-gray-200 w-full" />
          <div className="h-1 rounded-full bg-gray-200 w-5/6" />
          <div className="h-1 rounded-full bg-gray-200 w-3/4" />
        </div>
        <div className="mt-1 h-1 rounded-full w-1/3" style={{ backgroundColor: accent, opacity: 0.4 }} />
        <div className="flex gap-1 flex-wrap">
          <div className="h-1.5 w-6 rounded-sm" style={{ backgroundColor: accent, opacity: 0.15 }} />
          <div className="h-1.5 w-8 rounded-sm" style={{ backgroundColor: accent, opacity: 0.15 }} />
          <div className="h-1.5 w-5 rounded-sm" style={{ backgroundColor: accent, opacity: 0.15 }} />
          <div className="h-1.5 w-7 rounded-sm" style={{ backgroundColor: accent, opacity: 0.15 }} />
        </div>
      </div>
    </div>
  );
}

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
            Professionally designed templates. All ATS-friendly. Robert will
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
              <div className="aspect-[8.5/11] bg-white/[0.02] relative overflow-hidden">
                <TemplateMiniPreview template={template} />
                {template.popular && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-brand-accent/90 text-white text-[10px] font-semibold flex items-center gap-1 z-10">
                    <Sparkles className="w-3 h-3" />
                    Popular
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                  <Link
                    href={`/builder?template=${template.id}`}
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
