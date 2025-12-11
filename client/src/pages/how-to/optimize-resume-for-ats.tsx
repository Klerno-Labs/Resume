import React from 'react';
import Seo from '@/components/Seo';
import { Link } from 'wouter';

export default function HowToOptimizeResumeForAts() {
  const title = 'How to Optimize Resume for ATS | AI Resume Checker Guide';
  const description =
    'Step-by-step guide: optimize your resume for applicant tracking systems (ATS) using AI. Learn formatting tips, keyword strategy, and examples.';

  const faqJson = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is an ATS and why does it matter?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'ATS (Applicant Tracking Systems) scan resumes for keywords and structure before a human reviews them. Optimizing for ATS increases your chance of being seen.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can AI help optimize my resume for ATS?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI analyzes your resume, suggests role-specific keywords, rewrites bullets as achievements, and fixes formatting so ATS parses your resume correctly.',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Seo
        title={title}
        description={description}
        canonical="https://rewriteme.app/how-to/optimize-resume-for-ats"
        ogImage="https://rewriteme.app/og-image.png"
      />

      <main className="container mx-auto px-4 py-20 max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">How to Optimize Your Resume for ATS</h1>
        <p className="text-muted-foreground mb-6">
          A practical, AI-driven guide to make your resume readable by Applicant Tracking Systems
          and attractive to recruiters.
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Quick checklist</h2>
          <ul className="list-disc ml-6 text-muted-foreground">
            <li>Use clear section headings: Work Experience, Education, Skills</li>
            <li>Include role-relevant keywords from the job description</li>
            <li>
              Prefer achievement statements with numbers (e.g., "increased conversions by 35%")
            </li>
            <li>Avoid images, graphics, and unusual fonts that break parsing</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Use AI to speed this up</h2>
          <p className="text-muted-foreground">
            Upload your resume to our AI Resume Builder to get an instant ATS score, a rewritten
            resume, and a list of prioritized fixes.
          </p>
          <Link href="/ai-resume-builder">
            <button className="mt-4 bg-primary text-white px-4 py-2 rounded">
              Get free analysis
            </button>
          </Link>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }}
        />

        <footer className="text-sm text-muted-foreground mt-10">
          Back to <Link href="/ai-resume-builder">AI Resume Builder</Link>
        </footer>
      </main>
    </div>
  );
}
