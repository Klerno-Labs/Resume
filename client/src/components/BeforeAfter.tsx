import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Download, Sparkles, TrendingUp, FileText } from 'lucide-react';
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-linear-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6 mb-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-14 h-14 bg-linear-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <CheckCircle className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
                Resume Optimized!
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">Your ATS score improved significantly</p>
            </div>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
            className="text-right"
          >
            <div className="text-5xl font-bold bg-linear-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {resume.atsScore ?? '--'}%
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 mt-1 font-medium">ATS Compatible</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Clean Before/After Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"
      >
        <div className="grid md:grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="p-6 bg-linear-to-br from-red-50/50 to-orange-50/30 dark:from-red-950/10 dark:to-orange-950/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-slate-900 dark:text-white">Before</h5>
                <p className="text-xs text-muted-foreground">Original resume</p>
              </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-6 leading-relaxed bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-red-200 dark:border-red-900/30">
              {originalPreview || '(No original text available)'}
            </div>
            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 rounded-full">
                {original.split(/\r?\n/).filter(l => l.trim()).length} lines
              </span>
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="p-6 bg-linear-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/10 dark:to-emerald-950/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-slate-900 dark:text-white">After - Optimized</h5>
                <p className="text-xs text-green-600 dark:text-green-400">AI-enhanced version</p>
              </div>
            </div>
            <div className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap line-clamp-6 leading-relaxed font-medium bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-green-200 dark:border-green-900/30">
              {improvedPreview || '(No improved text available yet)'}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                ATS Optimized
              </span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Action Verbs
              </span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Quantified
              </span>
            </div>
          </motion.div>
        </div>

        {/* View Full Resume CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="bg-linear-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-t-2 border-slate-200 dark:border-slate-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                Ready to download your improved resume?
                <Download className="w-4 h-4 text-primary" />
              </p>
              <p className="text-sm text-muted-foreground">View the full optimized version in the editor</p>
            </div>
            <Link href={`/editor?resumeId=${resume.id}`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
              >
                <span>View Full Resume</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="grid grid-cols-3 gap-4 mt-6"
      >
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {resume.keywordsScore ?? '--'}/10
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-medium">Keywords</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {resume.formattingScore ?? '--'}/10
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-medium">Formatting</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {resume.status === 'completed' ? '✓' : '...'}
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-medium">Complete</div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default BeforeAfter;
