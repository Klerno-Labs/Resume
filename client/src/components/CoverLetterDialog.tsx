import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface CoverLetterDialogProps {
  resumeId?: string;
}

export function CoverLetterDialog({ resumeId }: CoverLetterDialogProps) {
  const [step, setStep] = useState<'input' | 'generating' | 'result'>('input');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState('professional');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!user || !resumeId) {
      toast({
        title: 'Error',
        description: 'Please upload a resume first',
        variant: 'destructive',
      });
      return;
    }

    setStep('generating');

    try {
      const coverLetter = await api.generateCoverLetter(resumeId, jobDescription, tone);
      setResult(coverLetter.content);
      setStep('result');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate cover letter',
        variant: 'destructive',
      });
      setStep('input');
    }
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-cover-letter">
          <FileText className="w-4 h-4" />
          Cover Letter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            AI Cover Letter Generator
          </DialogTitle>
          <DialogDescription>
            Paste the job description and we'll craft a tailored cover letter instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AnimatePresence mode="wait">
            {step === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="job-desc" className="text-sm font-medium">
                    Job Description
                  </Label>
                  <Textarea
                    id="job-desc"
                    placeholder="Paste the job description here..."
                    className="h-32 resize-none border-2 focus:border-purple-300 transition-colors"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional & Confident</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic & Energetic</SelectItem>
                      <SelectItem value="academic">Academic & Formal</SelectItem>
                      <SelectItem value="creative">Creative & Storytelling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 rounded-lg bg-linear-to-r from-purple-50 via-pink-50 to-blue-50 border border-purple-200">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-purple-500 mt-0.5" />
                    <span>AI will analyze the job description and match it with your resume to create a compelling cover letter that highlights your relevant experience.</span>
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-12 space-y-4"
              >
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-linear-to-br from-purple-500 via-pink-500 to-blue-500 opacity-20 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-purple-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-linear-to-r from-purple-500 via-pink-500 to-blue-500 border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-foreground text-lg">Crafting your letter...</h3>
                  <motion.p
                    className="text-sm text-muted-foreground"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Matching keywords from job description
                  </motion.p>
                </div>
              </motion.div>
            )}

            {step === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="relative">
                  <div className="absolute -inset-1 bg-linear-to-r from-purple-500 via-pink-500 to-blue-500 rounded-lg opacity-20 blur"></div>
                  <ScrollArea className="relative h-[300px] w-full rounded-lg border-2 border-purple-200 p-4 bg-white shadow-sm">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {result}
                    </div>
                  </ScrollArea>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-linear-to-r from-purple-50 via-pink-50 to-blue-50 border border-purple-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">Generated with {tone} tone</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">{result.split(/\s+/).length} words</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          {step === 'input' && (
            <Button
              onClick={() => void handleGenerate()}
              disabled={!jobDescription}
              className="bg-linear-to-r from-purple-500 via-pink-500 to-blue-500 hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Draft
            </Button>
          )}
          {step === 'result' && (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => setStep('input')} className="border-2">
                Try Again
              </Button>
              <Button
                onClick={handleCopy}
                className="gap-2 bg-linear-to-r from-purple-500 via-pink-500 to-blue-500 hover:opacity-90 transition-opacity"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
