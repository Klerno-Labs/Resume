'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-navy pt-16 flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-8 h-8 text-brand-accent-light animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Give webhook time to process
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-brand-navy pt-16">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="w-16 h-16 text-brand-accent-light mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-display font-bold text-white mb-3">
              Processing your payment...
            </h1>
            <p className="text-brand-muted">Just a moment while we set up your account.</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Welcome to the team!
            </h1>
            <p className="text-brand-muted text-lg mb-8">
              Your plan is now active. Robert is ready to build you an incredible resume.
            </p>
            <div className="glass rounded-2xl p-6 mb-8">
              <p className="text-white text-sm mb-1 font-medium">What&apos;s next?</p>
              <ul className="text-brand-muted text-sm space-y-2 text-left max-w-xs mx-auto">
                <li>- Upload your resume and let Robert optimize it</li>
                <li>- Use job matching to tailor for specific roles</li>
                <li>- Generate cover letters in seconds</li>
                <li>- Choose from professional templates</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-brand-accent/25 transition-all"
              >
                Start Building
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 rounded-xl text-white font-semibold hover:bg-white/5 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
}
