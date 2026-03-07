'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Bot, Lock, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-navy pt-16 flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-8 h-8 text-brand-accent-light animate-spin" />
      </div>
    }>
      <ResetContent />
    </Suspense>
  );
}

function ResetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const passwordErrors = password.length > 0 ? [
    password.length < 12 ? 'At least 12 characters' : null,
    !/[A-Z]/.test(password) ? 'Uppercase letter' : null,
    !/[a-z]/.test(password) ? 'Lowercase letter' : null,
    !/[0-9]/.test(password) ? 'Number' : null,
    !/[^A-Za-z0-9]/.test(password) ? 'Special character' : null,
  ].filter(Boolean) as string[] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordErrors.length > 0) {
      setError('Password needs: ' + passwordErrors.join(', '));
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Something went wrong');
        return;
      }

      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-brand-navy pt-16 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white mb-4">Invalid reset link.</p>
            <Link href="/forgot-password" className="text-brand-accent-light hover:text-white transition-colors">
              Request a new one
            </Link>
          </div>
        </main>
      </>
    );
  }

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
                Set New Password
              </h1>
            </div>

            {done ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                <p className="text-white text-sm">Your password has been reset.</p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white font-semibold text-sm"
                >
                  Sign In <ArrowRight className="w-4 h-4" />
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
                    <label className="block text-sm text-brand-muted mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                        placeholder="12+ chars, uppercase, number, special"
                        required
                      />
                    </div>
                    {password.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                          { label: '12+ chars', ok: password.length >= 12 },
                          { label: 'A-Z', ok: /[A-Z]/.test(password) },
                          { label: 'a-z', ok: /[a-z]/.test(password) },
                          { label: '0-9', ok: /[0-9]/.test(password) },
                          { label: 'Special', ok: /[^A-Za-z0-9]/.test(password) },
                        ].map((r) => (
                          <span key={r.label} className={`text-[10px] px-2 py-0.5 rounded-full ${r.ok ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-brand-muted'}`}>
                            {r.ok ? '\u2713' : '\u2717'} {r.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-brand-muted mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                      <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                        placeholder="Repeat your password"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-accent to-purple-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-brand-accent/25 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </main>
    </>
  );
}
