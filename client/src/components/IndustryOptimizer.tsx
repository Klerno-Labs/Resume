import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Sparkles, Lock, Zap, CheckCircle2, TrendingUp, Target, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from '@/hooks/use-toast';

interface IndustryOptimizerProps {
  resumeText: string;
  onOptimizationComplete?: (optimizedText: string) => void;
  userTier: 'free' | 'premium' | 'pro' | 'admin';
  onUpgradeClick: () => void;
}

const industries = [
  { value: 'technology', label: 'Technology & Software', keywords: ['Agile', 'API', 'Cloud', 'DevOps'] },
  { value: 'finance', label: 'Finance & Banking', keywords: ['Risk Management', 'Compliance', 'Financial Analysis'] },
  { value: 'healthcare', label: 'Healthcare & Medical', keywords: ['Patient Care', 'HIPAA', 'Clinical'] },
  { value: 'marketing', label: 'Marketing & Advertising', keywords: ['Campaign Management', 'ROI', 'Analytics'] },
  { value: 'sales', label: 'Sales & Business Development', keywords: ['Lead Generation', 'CRM', 'Revenue Growth'] },
  { value: 'education', label: 'Education & Training', keywords: ['Curriculum Development', 'Student Engagement'] },
  { value: 'engineering', label: 'Engineering & Manufacturing', keywords: ['CAD', 'Quality Control', 'Process Optimization'] },
  { value: 'hr', label: 'Human Resources', keywords: ['Talent Acquisition', 'Employee Relations', 'HRIS'] },
  { value: 'legal', label: 'Legal & Compliance', keywords: ['Contract Negotiation', 'Regulatory', 'Litigation'] },
  { value: 'design', label: 'Design & Creative', keywords: ['UI/UX', 'Adobe Creative Suite', 'Brand Identity'] }
];

export function IndustryOptimizer({ resumeText, onOptimizationComplete, userTier, onUpgradeClick }: IndustryOptimizerProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const canUseFeature = userTier === 'premium' || userTier === 'pro' || userTier === 'admin';

  const optimizeForIndustry = async () => {
    if (!canUseFeature) {
      onUpgradeClick();
      return;
    }

    if (!selectedIndustry) {
      toast({
        title: "Select an Industry",
        description: "Please choose an industry to optimize for.",
        variant: "destructive"
      });
      return;
    }

    setIsOptimizing(true);

    try {
      const response = await fetch('/api/optimize-industry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          industry: selectedIndustry
        })
      });

      if (!response.ok) throw new Error('Failed to optimize');

      const result = await response.json() as { optimizedText?: string };

      if (onOptimizationComplete && result.optimizedText) {
        onOptimizationComplete(result.optimizedText);
      }

      toast({
        title: "Optimization Complete!",
        description: `Your resume has been optimized for ${industries.find(i => i.value === selectedIndustry)?.label}.`
      });
    } catch (error) {
      console.error('Industry optimization failed:', error);
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize for industry. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const selectedIndustryData = industries.find(i => i.value === selectedIndustry);

  return (
    <div className="space-y-4">
      {/* Enhanced Header */}
      <div className="bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Industry Optimizer</h3>
              <p className="text-xs text-muted-foreground">
                AI-powered industry-specific optimization
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
          <Card className="p-8 bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-2 border-indigo-200 dark:border-indigo-800">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Premium Feature</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Industry-Specific Optimization uses AI to rewrite your resume with industry-relevant
                terminology, keywords, and phrasing that resonates with hiring managers in your field.
              </p>
              <div className="flex flex-col gap-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Industry-specific terminology optimization
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  AI-powered keyword enhancement
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  10+ industry templates
                </div>
              </div>
              <Button
                onClick={onUpgradeClick}
                size="lg"
                className="bg-linear-to-r from-indigo-500 to-purple-500 text-white border-0 shadow-lg hover:shadow-xl transition-all"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Industry Selector */}
          <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-white">
              Select Your Target Industry
            </label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Choose an industry..." />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AnimatePresence mode="wait">
              {selectedIndustryData && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                      Key Keywords for {selectedIndustryData.label}:
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedIndustryData.keywords.map((keyword, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium border border-indigo-200 dark:border-indigo-700"
                      >
                        {keyword}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                {selectedIndustry ? (
                  <>
                    AI will optimize for{' '}
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      {selectedIndustryData?.label}
                    </span>
                  </>
                ) : (
                  'Select an industry to begin optimization'
                )}
              </p>
              <Button
                onClick={() => void optimizeForIndustry()}
                disabled={isOptimizing || !selectedIndustry}
                className="bg-linear-to-r from-indigo-500 to-purple-500 text-white border-0"
              >
                {isOptimizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Optimize for Industry
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* What Will Change */}
          <Card className="p-4 bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-2 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">What Will Be Optimized</h4>
                <p className="text-xs text-muted-foreground">AI-powered enhancements</p>
              </div>
            </div>
            <ul className="space-y-2">
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className="flex items-start gap-3 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Industry-specific terminology and buzzwords</span>
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.10 }}
                className="flex items-start gap-3 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Action verbs relevant to your field</span>
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-start gap-3 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Technical skills and tools commonly used</span>
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.20 }}
                className="flex items-start gap-3 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Metrics and achievements formatted for your industry</span>
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="flex items-start gap-3 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Professional summary tailored to industry expectations</span>
              </motion.li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
