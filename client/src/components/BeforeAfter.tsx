import React from 'react';
import { CheckCircle, ArrowRight, Download } from 'lucide-react';
import type { Resume } from '@/lib/api';
import { Link } from 'wouter';

interface Props {
  resume: Resume;
}

export function BeforeAfter({ resume }: Props) {
  const original = resume.originalText || '';
  const improved = resume.improvedText || '';

  // Extract first few meaningful lines for preview
  const getPreviewLines = (text: string, maxLines = 3) => {
    const lines = text
      .split(/\r?\n/)
      .filter(line => line.trim().length > 0)
      .slice(0, maxLines);
    return lines.join('\n');
  };

  const originalPreview = getPreviewLines(original);
  const improvedPreview = getPreviewLines(improved);

  return (
    <div className="mt-8 max-w-5xl mx-auto">
      {/* Success Banner */}
      <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-100">Resume Optimized!</h3>
              <p className="text-sm text-green-700 dark:text-green-300">Your ATS score improved significantly</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-green-600 dark:text-green-400">{resume.atsScore ?? '--'}%</div>
            <div className="text-xs text-green-700 dark:text-green-300 mt-1">ATS Compatible</div>
          </div>
        </div>
      </div>

      {/* Clean Before/After Comparison */}
      <div className="bg-card rounded-2xl border shadow-lg overflow-hidden">
        <div className="grid md:grid-cols-2 divide-x divide-border">
          {/* Before */}
          <div className="p-6 bg-red-50/30 dark:bg-red-950/10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <h5 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Before</h5>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6 leading-relaxed">
              {originalPreview || '(No original text available)'}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              {original.split(/\r?\n/).filter(l => l.trim()).length} lines
            </div>
          </div>

          {/* After */}
          <div className="p-6 bg-green-50/30 dark:bg-green-950/10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <h5 className="font-semibold text-sm uppercase tracking-wide text-foreground">After - Optimized</h5>
            </div>
            <div className="text-sm text-foreground whitespace-pre-wrap line-clamp-6 leading-relaxed font-medium">
              {improvedPreview || '(No improved text available yet)'}
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ ATS Optimized • ✓ Action Verbs • ✓ Quantified
              </div>
            </div>
          </div>
        </div>

        {/* View Full Resume CTA */}
        <div className="bg-linear-to-r from-primary/5 to-violet-500/5 border-t p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold mb-1">Ready to download your improved resume?</p>
              <p className="text-sm text-muted-foreground">View the full optimized version in the editor</p>
            </div>
            <Link href={`/editor?resumeId=${resume.id}`}>
              <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105">
                <span>View Full Resume</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-card border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-primary">{resume.keywordsScore ?? '--'}/10</div>
          <div className="text-xs text-muted-foreground mt-1">Keywords</div>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-primary">{resume.formattingScore ?? '--'}/10</div>
          <div className="text-xs text-muted-foreground mt-1">Formatting</div>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{resume.status === 'completed' ? '✓' : '...'}</div>
          <div className="text-xs text-muted-foreground mt-1">Complete</div>
        </div>
      </div>
    </div>
  );
}

export default BeforeAfter;
