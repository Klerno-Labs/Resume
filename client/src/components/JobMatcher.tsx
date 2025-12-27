import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Sparkles, Lock, TrendingUp, CheckCircle2, AlertCircle, Zap, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from '@/hooks/use-toast';

interface JobMatcherProps {
  resumeText: string;
  userTier: 'free' | 'premium' | 'pro' | 'admin';
  onUpgradeClick: () => void;
  onMatchComplete?: (suggestions: string[]) => void;
}

interface MatchResult {
  score: number;
  missingKeywords: string[];
  suggestions: string[];
  strengths: string[];
}

export function JobMatcher({ resumeText, userTier, onUpgradeClick, onMatchComplete }: JobMatcherProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const canUseFeature = userTier === 'premium' || userTier === 'pro' || userTier === 'admin';

  const analyzeMatch = async () => {
    if (!canUseFeature) {
      onUpgradeClick();
      return;
    }

    if (!jobDescription.trim()) {
      toast({
        title: "Missing Job Description",
        description: "Please paste a job description to analyze.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/match-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          jobDescription
        })
      });

      if (!response.ok) throw new Error('Failed to analyze match');

      const result = await response.json() as MatchResult;
      setMatchResult(result);

      if (onMatchComplete && result.suggestions) {
        onMatchComplete(result.suggestions);
      }

      toast({
        title: "✨ Analysis Complete!",
        description: `Your resume matches ${result.score}% of the job requirements.`
      });
    } catch (error) {
      console.error('Job match analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze job match. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { text: 'Excellent Match', icon: CheckCircle2, color: 'text-green-600' };
    if (score >= 60) return { text: 'Good Match', icon: TrendingUp, color: 'text-yellow-600' };
    return { text: 'Needs Improvement', icon: AlertCircle, color: 'text-red-600' };
  };

  return (
    <div className="space-y-4">
      {/* Enhanced Header */}
      <div className="bg-linear-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-blue-950/20 dark:via-cyan-950/20 dark:to-purple-950/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Job Matcher</h3>
              <p className="text-xs text-muted-foreground">
                AI-powered job description analysis
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={`font-semibold ${
              userTier === 'admin' ? 'bg-linear-to-r from-yellow-400 to-orange-500 text-white border-0' :
              userTier === 'pro' ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white border-0' :
              userTier === 'premium' ? 'bg-linear-to-r from-blue-500 to-cyan-500 text-white border-0' :
              'bg-slate-100 text-slate-700'
            }`}
          >
            {userTier.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Feature Gate for Free Users */}
      {!canUseFeature ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="p-8 bg-linear-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-blue-950/20 dark:via-cyan-950/20 dark:to-purple-950/20 border-2 border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Premium Feature</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                The Job Matcher uses advanced AI to analyze job postings and provide
                targeted recommendations to optimize your resume for specific roles.
              </p>
              <div className="flex flex-col gap-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Real-time keyword matching
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  AI-powered improvement suggestions
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Match score calculation
                </div>
              </div>
              <Button
                onClick={onUpgradeClick}
                size="lg"
                className="bg-linear-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg hover:shadow-xl transition-all"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Job Description Input */}
          <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-white">
              Paste Job Description
            </label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here...

Example:
We're looking for a Senior Software Engineer with 5+ years of experience in React, TypeScript, and Node.js. You'll lead our frontend team and architect scalable solutions..."
              className="min-h-[200px] font-mono text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              disabled={isAnalyzing}
            />
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                {jobDescription.length} characters
                {jobDescription.length > 0 && (
                  <span className="ml-2 text-green-600 dark:text-green-400">
                    • Ready to analyze
                  </span>
                )}
              </p>
              <Button
                onClick={() => void analyzeMatch()}
                disabled={isAnalyzing || !jobDescription.trim()}
                className="bg-linear-to-r from-blue-500 to-cyan-500 text-white border-0"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Match
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Match Results */}
          <AnimatePresence mode="wait">
            {matchResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                {/* Match Score */}
                <Card className={`p-6 bg-linear-to-r ${getScoreColor(matchResult.score)}/10 border-2 ${getScoreColor(matchResult.score).replace('from-', 'border-').split(' ')[0]}/30`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Match Score</h3>
                        {(() => {
                          const label = getScoreLabel(matchResult.score);
                          const Icon = label.icon;
                          return (
                            <Badge variant="outline" className={`${label.color} border-current`}>
                              <Icon className="w-3 h-3 mr-1" />
                              {label.text}
                            </Badge>
                          );
                        })()}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        How well your resume aligns with this job
                      </p>
                    </div>
                    <div className={`text-5xl font-bold bg-linear-to-r ${getScoreColor(matchResult.score)} bg-clip-text text-transparent`}>
                      {matchResult.score}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${matchResult.score}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`bg-linear-to-r ${getScoreColor(matchResult.score)} h-3 rounded-full`}
                    />
                  </div>
                </Card>

                {/* Strengths */}
                {matchResult.strengths.length > 0 && (
                  <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Your Strengths</h4>
                        <p className="text-xs text-muted-foreground">Skills and experience that match</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {matchResult.strengths.map((strength, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">{strength}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Missing Keywords */}
                {matchResult.missingKeywords.length > 0 && (
                  <Card className="p-4 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Missing Keywords</h4>
                        <p className="text-xs text-muted-foreground">Add these to improve your match</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {matchResult.missingKeywords.map((keyword, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium border border-orange-200 dark:border-orange-700"
                        >
                          {keyword}
                        </motion.span>
                      ))}
                    </div>
                  </Card>
                )}

                {/* AI Suggestions */}
                {matchResult.suggestions.length > 0 && (
                  <Card className="p-4 bg-linear-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-blue-950/20 border-2 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">AI Recommendations</h4>
                        <p className="text-xs text-muted-foreground">Click "Apply" to add these to your resume</p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {matchResult.suggestions.map((suggestion, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                        >
                          <span className="shrink-0 w-6 h-6 bg-linear-to-br from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{suggestion}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs bg-linear-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
                              onClick={() => {
                                if (onMatchComplete) {
                                  onMatchComplete([suggestion]);
                                }
                                toast({
                                  title: "Recommendation Noted",
                                  description: "Use this suggestion to manually improve your resume text.",
                                });
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Apply to Resume
                            </Button>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
