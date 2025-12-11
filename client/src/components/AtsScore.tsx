import { motion } from 'framer-motion';

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

  const getBarColor = (s: number) => {
    if (s >= 8) return 'bg-green-500';
    if (s >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Use provided scores or calculate estimates from overall ATS score
  const keywords = keywordsScore ?? Math.round((score / 100) * 10);
  const formatting = formattingScore ?? Math.max(1, Math.round((score / 100) * 10) - 1);

  return (
    <div className="flex flex-col items-center p-6 bg-card rounded-xl border shadow-sm">
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted/30"
          />
          {/* Progress Circle */}
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            cx="64"
            cy="64"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeLinecap="round"
            className={getColor(score)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${getColor(score)}`} data-testid="text-ats-score">
            {score}
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            ATS Score
          </span>
        </div>
      </div>

      <div className="mt-4 w-full space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Keywords</span>
          <span className="font-medium">{keywords}/10</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className={`${getBarColor(keywords)} h-full rounded-full`}
            style={{ width: `${keywords * 10}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Formatting</span>
          <span className="font-medium">{formatting}/10</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className={`${getBarColor(formatting)} h-full rounded-full`}
            style={{ width: `${formatting * 10}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
