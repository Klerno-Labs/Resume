'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bot,
  Trash2,
  Upload,
  Sparkles,
  Download,
  ArrowRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  creditsRemaining: number;
}

interface ResumeItem {
  id: string;
  fileName: string;
  atsScore: number | null;
  status: string;
  createdAt: string;
}

const onboardingSteps = [
  {
    icon: Upload,
    title: 'Upload or Create',
    description: 'Start by uploading your existing resume (PDF or DOCX) or build one from scratch using our guided form.',
  },
  {
    icon: Sparkles,
    title: 'Robert Optimizes',
    description: 'Our AI analyzes your content, rewrites weak bullet points with quantified achievements, and optimizes for ATS systems.',
  },
  {
    icon: Download,
    title: 'Download & Apply',
    description: 'Download your polished resume as PDF or DOCX. Use job matching to tailor it for specific positions.',
  },
];

function OnboardingOverlay({ userName, onDismiss }: { userName: string | null; onDismiss: () => void }) {
  const [step, setStep] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg glass rounded-2xl overflow-hidden"
      >
        <div className="p-8">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-brand-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center mx-auto mb-6">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">
                Welcome{userName ? `, ${userName}` : ''}!
              </h2>
              <p className="text-brand-muted text-sm mb-8">
                I&apos;m Robert, your AI resume architect. Let me show you how I can help you land more interviews.
              </p>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white font-semibold text-sm hover:shadow-lg hover:shadow-brand-accent/25 transition-all"
              >
                Show Me How
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step >= 1 && step <= 3 && (
            <motion.div
              key={`step-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {/* Step indicators */}
              <div className="flex justify-center gap-2 mb-8">
                {onboardingSteps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i + 1 === step ? 'w-8 bg-brand-accent' : i + 1 < step ? 'w-4 bg-brand-accent/50' : 'w-4 bg-white/10'
                    )}
                  />
                ))}
              </div>

              {(() => {
                const s = onboardingSteps[step - 1];
                const Icon = s.icon;
                return (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-xl bg-brand-accent/10 flex items-center justify-center mx-auto mb-5">
                      <Icon className="w-7 h-7 text-brand-accent-light" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-brand-muted text-sm mb-8 max-w-sm mx-auto">{s.description}</p>
                  </div>
                );
              })()}

              <div className="flex justify-center gap-3">
                {step < 3 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white font-semibold text-sm hover:shadow-lg hover:shadow-brand-accent/25 transition-all"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    href="/builder"
                    onClick={onDismiss}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white font-semibold text-sm hover:shadow-lg hover:shadow-brand-accent/25 transition-all"
                  >
                    Build My First Resume
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </motion.div>
          )}

          {step > 0 && (
            <button
              onClick={onDismiss}
              className="mt-4 text-brand-muted text-xs hover:text-white transition-colors mx-auto block"
            >
              Skip for now
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  async function handleDelete(e: React.MouseEvent, resumeId: string) {
    e.stopPropagation();
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    setDeleting(resumeId);
    try {
      const res = await fetch(`/api/resumes/${resumeId}`, { method: 'DELETE' });
      if (res.ok) {
        setResumes((prev) => prev.filter((r) => r.id !== resumeId));
      }
    } catch { /* ignore */ }
    setDeleting(null);
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, resumeRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/resumes/list'),
        ]);

        if (!userRes.ok) {
          router.push('/login');
          return;
        }

        const userData = await userRes.json();
        setUser(userData.user);

        if (resumeRes.ok) {
          const resumeData = await resumeRes.json();
          setResumes(resumeData.resumes || []);
          if (!userData.user.onboardingCompleted && (resumeData.resumes || []).length === 0) {
            setShowOnboarding(true);
          }
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    fetch('/api/auth/onboarding', { method: 'POST' }).catch(() => {});
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-brand-navy pt-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-accent-light animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingOverlay userName={user?.name ?? null} onDismiss={dismissOnboarding} />
        )}
      </AnimatePresence>
      <main className="min-h-screen bg-brand-navy pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">
                Welcome back{user?.name ? `, ${user.name}` : ''}
              </h1>
              <p className="text-brand-muted text-sm mt-1">
                {user?.creditsRemaining ?? 0} credits remaining
              </p>
            </div>
            <Link
              href="/builder"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white font-semibold text-sm hover:shadow-lg hover:shadow-brand-accent/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Resume
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-accent/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-brand-accent-light" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{resumes.length}</div>
                  <div className="text-brand-muted text-xs">Total Resumes</div>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {resumes.length > 0
                      ? Math.round(
                          resumes
                            .filter((r) => r.atsScore)
                            .reduce((sum, r) => sum + (r.atsScore || 0), 0) /
                            Math.max(resumes.filter((r) => r.atsScore).length, 1)
                        )
                      : '—'}
                  </div>
                  <div className="text-brand-muted text-xs">Avg ATS Score</div>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-accent/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-brand-accent-light" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{user?.creditsRemaining ?? 0}</div>
                  <div className="text-brand-muted text-xs">Credits Left</div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumes List */}
          {resumes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-2xl p-12 text-center"
            >
              <Bot className="w-12 h-12 text-brand-accent-light mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No resumes yet</h2>
              <p className="text-brand-muted text-sm mb-6">
                Let Robert build your first resume. Upload an existing one or start from scratch.
              </p>
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white font-semibold text-sm hover:shadow-lg hover:shadow-brand-accent/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                Build My Resume
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {resumes.map((resume, i) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/editor/${resume.id}`)}
                  className="glass rounded-xl p-5 flex items-center gap-4 hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-accent/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-brand-accent-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">
                      {resume.fileName}
                    </div>
                    <div className="text-brand-muted text-xs flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(resume.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {resume.atsScore && (
                      <div className="text-right">
                        <div className="text-white font-semibold text-sm">{resume.atsScore}</div>
                        <div className="text-brand-muted text-xs">ATS Score</div>
                      </div>
                    )}
                    <div
                      className={cn(
                        'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                        resume.status === 'completed'
                          ? 'bg-green-500/10 text-green-400'
                          : resume.status === 'processing'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-red-500/10 text-red-400'
                      )}
                    >
                      {resume.status === 'completed' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {resume.status}
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, resume.id)}
                      disabled={deleting === resume.id}
                      className="p-2 rounded-lg text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Delete resume"
                    >
                      {deleting === resume.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
