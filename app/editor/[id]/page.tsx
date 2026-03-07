'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { motion } from 'framer-motion';
import {
  Bot, Loader2, Download, Palette, Eye, EyeOff, ArrowLeft, RefreshCw, Save, FileText, Target, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResumeData {
  id: string;
  originalText: string;
  improvedText: string | null;
  atsScore: number | null;
  keywordsScore: number | null;
  formattingScore: number | null;
  status: string;
  analysis?: { designHtml?: string; template?: string; accentColor?: string };
}

const TEMPLATES = [
  { id: 'modern', name: 'Modern', accent: '#6366F1' },
  { id: 'classic', name: 'Classic', accent: '#1E40AF' },
  { id: 'minimal', name: 'Minimal', accent: '#374151' },
  { id: 'creative', name: 'Creative', accent: '#7C3AED' },
  { id: 'executive', name: 'Executive', accent: '#0F172A' },
  { id: 'tech', name: 'Tech Pro', accent: '#059669' },
];

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [designHtml, setDesignHtml] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDesignPanel, setShowDesignPanel] = useState(false);

  useEffect(() => {
    fetch(`/api/resumes/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) { router.push('/dashboard'); return; }
        setResume(data);
        if (data.analysis?.designHtml) {
          setDesignHtml(data.analysis.designHtml);
          setSelectedTemplate(data.analysis.template || 'modern');
        }
        setLoading(false);
      })
      .catch(() => router.push('/dashboard'));
  }, [id, router]);

  const handleGenerateDesign = async () => {
    if (!resume) return;
    setGenerating(true);
    try {
      const template = TEMPLATES.find((t) => t.id === selectedTemplate);
      const res = await fetch('/api/resumes/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: resume.id,
          template: selectedTemplate,
          accentColor: template?.accent || '#6366F1',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDesignHtml(data.html);
      }
    } catch { /* ignore */ }
    setGenerating(false);
  };

  const handleSaveDesign = async () => {
    if (!resume) return;
    setSaving(true);
    try {
      const template = TEMPLATES.find((t) => t.id === selectedTemplate);
      await fetch('/api/resumes/save-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: resume.id,
          template: selectedTemplate,
          accentColor: template?.accent,
          html: designHtml,
        }),
      });
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDownload = async () => {
    const text = resume?.improvedText || resume?.originalText || '';
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const template = TEMPLATES.find((t) => t.id === selectedTemplate);
    const color = template?.accent || '#6366F1';
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, 210, 8, 'F');
    doc.setFont('helvetica');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, 170);
    let y = 20;
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 6;
    }
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Built with RewriteMe.app', 20, 290);
    doc.save('resume-rewriteme.pdf');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-navy pt-16 flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-8 h-8 text-brand-accent-light animate-spin" />
      </div>
    );
  }

  if (!resume) return null;

  const displayText = showOriginal ? resume.originalText : (resume.improvedText || resume.originalText);

  return (
    <div className="min-h-screen bg-brand-navy pt-16">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-brand-muted hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-display font-bold text-white">Resume Editor</h1>
            {resume.atsScore && (
              <span className="px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent-light text-xs font-semibold">
                ATS: {resume.atsScore}/100
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-muted text-xs hover:text-white transition-colors"
            >
              {showOriginal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showOriginal ? 'Show Improved' : 'Show Original'}
            </button>
            <button
              onClick={() => setShowDesignPanel(!showDesignPanel)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-muted text-xs hover:text-white transition-colors"
            >
              <Palette className="w-3.5 h-3.5" />
              Design
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-brand-accent to-purple-500 text-white text-xs font-semibold hover:shadow-lg hover:shadow-brand-accent/25 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className={cn('flex flex-col gap-6', showDesignPanel ? 'lg:col-span-2' : 'lg:col-span-3')}>
            {/* Design Preview */}
            {designHtml ? (
              <div className="rounded-2xl glass overflow-hidden">
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <span className="text-white text-xs font-medium">Design Preview</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateDesign}
                      disabled={generating}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-brand-muted text-xs hover:text-white transition-colors"
                    >
                      <RefreshCw className={cn('w-3 h-3', generating && 'animate-spin')} />
                      Regenerate
                    </button>
                    <button
                      onClick={handleSaveDesign}
                      disabled={saving}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-brand-accent/10 text-brand-accent-light text-xs hover:bg-brand-accent/20 transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                  </div>
                </div>
                <iframe
                  srcDoc={designHtml}
                  className="w-full bg-white"
                  style={{ height: '800px' }}
                  title="Resume Design Preview"
                  sandbox=""
                />
              </div>
            ) : (
              /* Text Preview */
              <div className="rounded-2xl glass p-8">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-brand-accent-light" />
                  <span className="text-white text-sm font-medium">
                    {showOriginal ? 'Original Resume' : 'Optimized Resume'}
                  </span>
                </div>
                <div className="text-brand-muted text-sm leading-relaxed whitespace-pre-wrap">
                  {displayText}
                </div>
              </div>
            )}

            {/* Score Cards */}
            {resume.atsScore && (
              <div className="grid grid-cols-3 gap-4">
                <ScoreCard label="ATS Score" score={resume.atsScore} />
                <ScoreCard label="Keywords" score={resume.keywordsScore || 0} />
                <ScoreCard label="Formatting" score={resume.formattingScore || 0} />
              </div>
            )}
          </div>

          {/* Design Panel */}
          {showDesignPanel && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="rounded-2xl glass p-6">
                <h3 className="text-white font-semibold mb-4">Template Style</h3>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={cn(
                        'p-3 rounded-xl text-center transition-all',
                        selectedTemplate === t.id
                          ? 'bg-brand-accent/20 border border-brand-accent/40'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      )}
                    >
                      <div
                        className="w-full aspect-[8.5/11] rounded-md mb-2"
                        style={{ backgroundColor: t.accent + '20', borderTop: `3px solid ${t.accent}` }}
                      />
                      <span className="text-xs text-white">{t.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGenerateDesign}
                  disabled={generating}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white text-sm font-semibold hover:shadow-lg hover:shadow-brand-accent/25 transition-all disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generating ? 'Generating...' : 'Generate Design'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="glass rounded-xl p-4 text-center">
      <div className={cn('text-2xl font-display font-bold', color)}>{score}</div>
      <div className="text-brand-muted text-xs">{label}</div>
    </div>
  );
}
