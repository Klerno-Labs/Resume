'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Bot, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-navy pt-16 flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-8 h-8 text-brand-accent-light animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
  });

  const passwordErrors = isRegister && form.password.length > 0 ? [
    form.password.length < 12 ? 'At least 12 characters' : null,
    !/[A-Z]/.test(form.password) ? 'Uppercase letter' : null,
    !/[a-z]/.test(form.password) ? 'Lowercase letter' : null,
    !/[0-9]/.test(form.password) ? 'Number' : null,
    !/[^A-Za-z0-9]/.test(form.password) ? 'Special character' : null,
  ].filter(Boolean) as string[] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister && passwordErrors.length > 0) {
      setError('Password needs: ' + passwordErrors.join(', '));
      return;
    }
    setLoading(true);
    setError('');

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong');
        return;
      }

      router.push('/dashboard');
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
                {isRegister ? 'Create Account' : 'Welcome Back'}
              </h1>
              <p className="text-brand-muted text-sm mt-2">
                {isRegister
                  ? 'Join RewriteMe and let Robert build your resume'
                  : 'Sign in to continue with Robert'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-sm text-brand-muted mb-1.5">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                      placeholder="Your name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-brand-muted mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                    placeholder={isRegister ? '12+ chars, uppercase, number, special' : 'Your password'}
                    required
                  />
                </div>
                {isRegister && form.password.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { label: '12+ chars', ok: form.password.length >= 12 },
                      { label: 'A-Z', ok: /[A-Z]/.test(form.password) },
                      { label: 'a-z', ok: /[a-z]/.test(form.password) },
                      { label: '0-9', ok: /[0-9]/.test(form.password) },
                      { label: 'Special', ok: /[^A-Za-z0-9]/.test(form.password) },
                    ].map((r) => (
                      <span key={r.label} className={`text-[10px] px-2 py-0.5 rounded-full ${r.ok ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-brand-muted'}`}>
                        {r.ok ? '\u2713' : '\u2717'} {r.label}
                      </span>
                    ))}
                  </div>
                )}
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
                    {isRegister ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-brand-surface text-brand-muted">or</span>
              </div>
            </div>

            <a
              href="/api/auth/google"
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>

            {!isRegister && (
              <div className="mt-4 text-center">
                <Link href="/forgot-password" className="text-brand-muted text-xs hover:text-white transition-colors">
                  Forgot your password?
                </Link>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="text-brand-muted text-sm hover:text-white transition-colors"
              >
                {isRegister
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
}
