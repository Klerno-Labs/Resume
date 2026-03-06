'use client';

import { motion } from 'framer-motion';
import { FileText, Users, TrendingUp, Star } from 'lucide-react';

const stats = [
  { icon: FileText, value: '10,000+', label: 'Resumes Built' },
  { icon: TrendingUp, value: '95+', label: 'Avg ATS Score' },
  { icon: Users, value: '5,000+', label: 'Users Hired' },
  { icon: Star, value: '4.9/5', label: 'User Rating' },
];

export function SocialProof() {
  return (
    <section className="bg-brand-dark py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <stat.icon className="w-6 h-6 text-brand-accent-light mx-auto mb-3" />
              <div className="text-3xl font-display font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-brand-muted">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
