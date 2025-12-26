import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Sparkles, Lock, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
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

      const result = await response.json();

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-500" />
            Industry-Specific Optimization
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tailor your resume language and keywords for specific industries
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
        <Card className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
          <div className="text-center">
            <Lock className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Premium Feature</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Industry-Specific Optimization uses AI to rewrite your resume with industry-relevant
              terminology, keywords, and phrasing that resonates with hiring managers in your field.
            </p>
            <Button
              onClick={onUpgradeClick}
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              Upgrade to Premium
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Industry Selector */}
          <Card className="p-6">
            <label className="block text-sm font-semibold mb-2">
              Select Your Target Industry
            </label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-full">
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

            {selectedIndustryData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-indigo-50 rounded-lg"
              >
                <p className="text-sm font-semibold text-indigo-900 mb-2">
                  Key Keywords for {selectedIndustryData.label}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedIndustryData.keywords.map((keyword, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-muted-foreground">
                AI will rewrite your resume to match {selectedIndustryData?.label || 'your selected industry'}
              </p>
              <Button
                onClick={optimizeForIndustry}
                disabled={isOptimizing || !selectedIndustry}
                className="bg-gradient-to-r from-indigo-500 to-purple-500"
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
          <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-bold">What Will Be Optimized</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span>Industry-specific terminology and buzzwords</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span>Action verbs relevant to your field</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span>Technical skills and tools commonly used</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span>Metrics and achievements formatted for your industry</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span>Professional summary tailored to industry expectations</span>
              </li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
