'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Bot, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Something went wrong');
        return;
      }

      setSent(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-navy pt-16 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl glass p-8"
          >
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-display font-bold text-white">
                Reset Password
              </h1>
              <p className="text-brand-muted text-sm mt-2">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            {sent ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                <p className="text-white text-sm">
                  If an account exists with <strong>{email}</strong>, a password reset link has been sent.
                </p>
                <p className="text-brand-muted text-xs">
                  Check your inbox and spam folder. The link expires in 1 hour.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-brand-accent-light text-sm hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-brand-muted mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-accent to-purple-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-brand-accent/25 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-brand-muted text-sm hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </main>
    </>
  );
}
