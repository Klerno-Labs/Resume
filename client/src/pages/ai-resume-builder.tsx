import React from "react";
import Seo from "@/components/Seo";
import { Link } from "wouter";

export default function AiResumeBuilder() {
  const title = "AI Resume Builder & ATS Resume Optimizer | RewriteMe";
  const description = "AI-powered resume optimizer: get an ATS score, keyword optimization, and a rewritten resume that lands interviews. Try free analysis now.";

  return (
    <div className="min-h-screen bg-background font-sans">
      <Seo title={title} description={description} canonical="https://rewriteme.app/ai-resume-builder" ogImage="https://rewriteme.app/og-image.png" />

      <main className="container mx-auto px-4 py-20 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold">AI Resume Builder & ATS Resume Optimizer</h1>
          <p className="mt-3 text-muted-foreground">Upload your resume and get an AI-optimized, ATS-friendly version with a clear ATS score and targeted keyword suggestions.</p>
        </header>

        <section className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">AI Rewrite</h3>
            <p className="text-sm text-muted-foreground">Transform weak bullets into quantified achievements that hiring managers notice.</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">ATS Score & Fixes</h3>
            <p className="text-sm text-muted-foreground">Get an instant ATS score and prioritized fixes for keywords and formatting.</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">Role Targeting</h3>
            <p className="text-sm text-muted-foreground">Tailor your resume to roles like Software Engineer, Nurse, Sales — match the keywords recruiters search for.</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Get started</h2>
          <p className="text-muted-foreground mb-6">Try a free analysis or sign up for credit packs to download optimized resumes.</p>
          <div className="flex gap-4">
            <Link href="/auth">
              <button className="bg-primary text-white px-6 py-3 rounded">Get free analysis</button>
            </Link>
            <Link href="/pricing">
              <button className="border px-6 py-3 rounded">See pricing</button>
            </Link>
          </div>
        </section>

        <footer className="text-sm text-muted-foreground">Learn more: <Link href="/how-to/optimize-resume-for-ats">How to optimize your resume for ATS</Link></footer>
      </main>
    </div>
  );
}
