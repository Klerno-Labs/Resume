'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Bot, Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-navy pt-16 flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-8 h-8 text-brand-accent-light animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error. Please try again.');
      });
  }, [token]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-navy pt-16 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl glass p-8 text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center mx-auto mb-6">
              <Bot className="w-6 h-6 text-white" />
            </div>

            {status === 'loading' && (
              <div className="space-y-4">
                <Loader2 className="w-10 h-10 text-brand-accent-light animate-spin mx-auto" />
                <p className="text-white">Verifying your email...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                <h2 className="text-xl font-display font-bold text-white">Email Verified!</h2>
                <p className="text-brand-muted text-sm">Your email has been confirmed. You&apos;re all set to use RewriteMe.</p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white font-semibold text-sm"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                <h2 className="text-xl font-display font-bold text-white">Verification Failed</h2>
                <p className="text-brand-muted text-sm">{message}</p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-brand-accent-light text-sm hover:text-white transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </>
  );
}
