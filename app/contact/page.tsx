'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { motion } from 'framer-motion';
import { Send, Mail, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // In production, this would send to an API endpoint
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
  };

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
                Get in <span className="text-gradient">Touch</span>
              </h1>
              <p className="text-brand-muted text-lg">
                Have a question? Need help with your resume? We respond within 1 business day.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-8"
              >
                {sent ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2">Message Sent!</h3>
                    <p className="text-brand-muted text-sm">
                      We&apos;ll get back to you within 1 business day.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm text-brand-muted mb-1.5">Name</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-brand-muted mb-1.5">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-brand-muted mb-1.5">Subject</label>
                      <select
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                        required
                      >
                        <option value="">Select a topic</option>
                        <option value="support">Technical Support</option>
                        <option value="billing">Billing Question</option>
                        <option value="feedback">Feedback</option>
                        <option value="partnership">Partnership</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-brand-muted mb-1.5">Message</label>
                      <textarea
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        rows={5}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 resize-none"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-accent to-purple-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-brand-accent/25 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Send Message
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>

              {/* Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <div className="glass rounded-2xl p-6">
                  <Mail className="w-6 h-6 text-brand-accent-light mb-3" />
                  <h3 className="text-white font-semibold mb-1">Email</h3>
                  <p className="text-brand-muted text-sm">support@rewriteme.app</p>
                </div>
                <div className="glass rounded-2xl p-6">
                  <MessageSquare className="w-6 h-6 text-brand-accent-light mb-3" />
                  <h3 className="text-white font-semibold mb-1">Talk to Robert</h3>
                  <p className="text-brand-muted text-sm">
                    Have Robert help you directly in the{' '}
                    <a href="/builder" className="text-brand-accent-light hover:underline">
                      Resume Builder
                    </a>
                    .
                  </p>
                </div>
                <div className="glass rounded-2xl p-6">
                  <div className="text-brand-muted text-sm leading-relaxed">
                    <p className="font-semibold text-white mb-2">Response Times</p>
                    <ul className="space-y-1">
                      <li>General inquiries: 1 business day</li>
                      <li>Technical support: Same day</li>
                      <li>Billing issues: Same day</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
