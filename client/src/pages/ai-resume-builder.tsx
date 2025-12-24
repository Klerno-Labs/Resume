import React, { useState, useEffect } from 'react';
import Seo from '@/components/Seo';
import { Link, useLocation } from 'wouter';
import { FileUpload } from '@/components/FileUpload';
import { useAuth } from '@/lib/auth';
import { api, type Resume } from '@/lib/api';
import BeforeAfter from '@/components/BeforeAfter';

export default function AiResumeBuilder() {
  const title = 'AI Resume Builder & ATS Resume Optimizer | RewriteMe';
  const description =
    'AI-powered resume optimizer: get an ATS score, keyword optimization, and a rewritten resume that lands interviews. Try free analysis now.';

  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loadingResumeId, setLoadingResumeId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function pollResume(id: string) {
      for (let i = 0; i < 20 && mounted; i++) {
        try {
          const r = await api.getResume(id);
          setResume(r);
          if (r.status && r.status !== 'processing') {
            setLoadingResumeId(null);
            break;
          }
        } catch (_err) {
          // ignore transient errors
        }
        await new Promise((res) => setTimeout(res, 1500));
      }
      if (mounted) {
        const finalCheck = await api.getResume(id).catch(() => null);
        if (!finalCheck || finalCheck.status === 'processing') {
          setLoadingResumeId(null);
          console.error('Resume processing timed out after 30 seconds');
        }
      }
    }

    if (loadingResumeId) void pollResume(loadingResumeId);
    return () => {
      mounted = false;
    };
  }, [loadingResumeId]);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Seo
        title={title}
        description={description}
        canonical="https://rewriteme.app/ai-resume-builder"
        ogImage="https://rewriteme.app/og-image.png"
      />

      <main className="container mx-auto px-4 py-20 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold">AI Resume Builder & ATS Resume Optimizer</h1>
          <p className="mt-3 text-muted-foreground">
            Upload your resume and get an AI-optimized, ATS-friendly version with a clear ATS score
            and targeted keyword suggestions.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">AI Rewrite</h3>
            <p className="text-sm text-muted-foreground">
              Transform weak bullets into quantified achievements that hiring managers notice.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">ATS Score & Fixes</h3>
            <p className="text-sm text-muted-foreground">
              Get an instant ATS score and prioritized fixes for keywords and formatting.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">Role Targeting</h3>
            <p className="text-sm text-muted-foreground">
              Tailor your resume to roles like Software Engineer, Nurse, Sales — match the keywords
              recruiters search for.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Get started</h2>

          {user ? (
            <div className="max-w-2xl mx-auto bg-card/50 backdrop-blur-sm p-2 rounded-2xl border shadow-2xl">
              <div className="bg-card rounded-xl p-8 border shadow-sm">
                <FileUpload
                  onUpload={(file, resumeId) => {
                    setLoadingResumeId(resumeId);
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                Try a free analysis or sign up for credit packs to download optimized resumes.
              </p>
              <div className="flex gap-4">
                <Link href="/auth">
                  <button className="bg-primary text-white px-6 py-3 rounded">Get free analysis</button>
                </Link>
                <Link href="/pricing">
                  <button className="border px-6 py-3 rounded">See pricing</button>
                </Link>
              </div>
            </>
          )}

          {resume ? (
            resume.status === 'processing' ? (
              <div className="mt-6 text-sm text-muted-foreground">
                Processing your resume — final results will be ready shortly. You can continue in
                the dashboard.
              </div>
            ) : (
              <BeforeAfter resume={resume} />
            )
          ) : null}
        </section>

        <footer className="text-sm text-muted-foreground">
          Learn more:{' '}
          <Link href="/how-to/optimize-resume-for-ats">How to optimize your resume for ATS</Link>
        </footer>
      </main>
    </div>
  );
}
