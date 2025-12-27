import { motion } from 'framer-motion';
import { TrendingUp, FileText, Award } from 'lucide-react';

interface AtsScoreProps {
  score: number;
  keywordsScore?: number;
  formattingScore?: number;
}

export function AtsScore({ score, keywordsScore, formattingScore }: AtsScoreProps) {
  const circumference = 2 * Math.PI * 40; // radius 40
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getGradientColor = (s: number) => {
    if (s >= 80) return 'from-green-500 to-emerald-500';
    if (s >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getBarColor = (s: number) => {
    if (s >= 8) return 'bg-linear-to-r from-green-500 to-emerald-500';
    if (s >= 6) return 'bg-linear-to-r from-yellow-500 to-orange-500';
    return 'bg-linear-to-r from-red-500 to-pink-500';
  };

  // Use provided scores or calculate estimates from overall ATS score
  const keywords = keywordsScore ?? Math.round((score / 100) * 10);
  const formatting = formattingScore ?? Math.max(1, Math.round((score / 100) * 10) - 1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-xl"
    >
      {/* Header Badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${getGradientColor(score)} flex items-center justify-center shadow-md`}>
          <Award className="w-4 h-4 text-white" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">ATS Score</h4>
          <p className="text-xs text-muted-foreground">Applicant Tracking System</p>
        </div>
      </div>

      <div className="relative w-36 h-36 flex items-center justify-center mb-4">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="72"
            cy="72"
            r="60"
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            className="text-slate-200 dark:text-slate-700"
          />
          {/* Progress Circle */}
          <motion.circle
            initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 60 - (score / 100) * 2 * Math.PI * 60 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            cx="72"
            cy="72"
            r="60"
            stroke="url(#scoreGradient)"
            strokeWidth="10"
            fill="none"
            strokeDasharray={2 * Math.PI * 60}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={getColor(score).replace('text-', 'stop-')} />
              <stop offset="100%" className={getColor(score).replace('text-', 'stop-')} style={{ opacity: 0.6 }} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className={`text-4xl font-bold bg-linear-to-r ${getGradientColor(score)} bg-clip-text text-transparent`}
            data-testid="text-ats-score"
          >
            {score}
          </motion.span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
            Score
          </span>
        </div>
      </div>

      <div className="w-full space-y-4">
        {/* Keywords */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="space-y-2"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Keywords</span>
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">{keywords}/10</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${keywords * 10}%` }}
              transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
              className={`${getBarColor(keywords)} h-full rounded-full shadow-sm`}
            />
          </div>
        </motion.div>

        {/* Formatting */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="space-y-2"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Formatting</span>
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">{formatting}/10</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${formatting * 10}%` }}
              transition={{ delay: 1.0, duration: 0.8, ease: "easeOut" }}
              className={`${getBarColor(formatting)} h-full rounded-full shadow-sm`}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
