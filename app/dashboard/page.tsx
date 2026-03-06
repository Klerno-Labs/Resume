'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bot,
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

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
      <main className="min-h-screen bg-brand-navy pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">
                Welcome back{user?.name ? `, ${user.name}` : ''}
              </h1>
              <p className="text-brand-muted text-sm mt-1">
                {user?.plan === 'free'
                  ? `${user.creditsRemaining} credits remaining`
                  : `${user?.plan} plan`}
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
                  <div className="flex items-center gap-4">
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
