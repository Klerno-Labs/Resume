import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Sparkles, Lock, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
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

      const result = await response.json();
      setMatchResult(result);

      if (onMatchComplete && result.suggestions) {
        onMatchComplete(result.suggestions);
      }

      toast({
        title: "Analysis Complete!",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-500" />
            Job Description Matcher
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Optimize your resume for specific job postings using AI analysis
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Your tier:</span>
          <span className={`font-semibold px-3 py-1 rounded-full ${
            userTier === 'pro' ? 'bg-purple-100 text-purple-700' :
            userTier === 'premium' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {userTier.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Feature Gate for Free Users */}
      {!canUseFeature ? (
        <Card className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="text-center">
            <Lock className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Premium Feature</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              The Job Description Matcher uses advanced AI to analyze job postings and suggest
              targeted improvements to your resume. Upgrade to Premium or Pro to unlock this feature.
            </p>
            <Button
              onClick={onUpgradeClick}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              Upgrade to Premium
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Job Description Input */}
          <Card className="p-6">
            <label className="block text-sm font-semibold mb-2">
              Paste Job Description
            </label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here...&#10;&#10;Example:&#10;We're looking for a Senior Software Engineer with 5+ years of experience in React, TypeScript, and Node.js. You'll lead our frontend team and architect scalable solutions..."
              className="min-h-[200px] font-mono text-sm"
              disabled={isAnalyzing}
            />
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                {jobDescription.length} characters
              </p>
              <Button
                onClick={analyzeMatch}
                disabled={isAnalyzing || !jobDescription.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-500"
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
          {matchResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Match Score */}
              <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-1">Match Score</h3>
                    <p className="text-sm text-muted-foreground">
                      How well your resume aligns with the job posting
                    </p>
                  </div>
                  <div className="text-5xl font-bold text-blue-600">
                    {matchResult.score}%
                  </div>
                </div>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${matchResult.score}%` }}
                  />
                </div>
              </Card>

              {/* Strengths */}
              {matchResult.strengths.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-bold">Your Strengths</h3>
                  </div>
                  <ul className="space-y-2">
                    {matchResult.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Missing Keywords */}
              {matchResult.missingKeywords.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-bold">Missing Keywords</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.missingKeywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* AI Suggestions */}
              {matchResult.suggestions.length > 0 && (
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-bold">AI Recommendations</h3>
                  </div>
                  <ul className="space-y-3">
                    {matchResult.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
