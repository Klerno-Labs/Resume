import React from 'react';
import type { Resume } from '@/lib/api';

interface Props {
  resume: Resume;
}

export function BeforeAfter({ resume }: Props) {
  const original = resume.originalText || '';
  const improved = resume.improvedText || '';

  // Simple line-based comparison for visual before/after (not a proper diff)
  const originalLines = original.split(/\r?\n/).slice(0, 200);
  const improvedLines = improved.split(/\r?\n/).slice(0, 200);

  return (
    <div className="mt-8 bg-card p-6 rounded-2xl border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold">ATS Score</h4>
          <div className="text-3xl font-bold text-primary">{resume.atsScore ?? '--'}</div>
          <div className="text-sm text-muted-foreground">
            Keywords: {resume.keywordsScore ?? '--'} • Formatting: {resume.formattingScore ?? '--'}
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>File: {resume.fileName}</div>
          <div className="mt-1">Status: {resume.status}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h5 className="font-semibold mb-2">Before</h5>
          <div className="prose max-h-64 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground p-3 bg-background rounded">
            {originalLines.join('\n') || '(No original text available)'}
          </div>
        </div>

        <div>
          <h5 className="font-semibold mb-2">After</h5>
          <div className="prose max-h-64 overflow-auto whitespace-pre-wrap text-sm text-foreground p-3 bg-background rounded">
            {improvedLines.join('\n') || '(No improved text available yet)'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BeforeAfter;
