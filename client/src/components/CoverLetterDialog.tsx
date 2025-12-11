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
            <Sparkles className="w-5 h-5 text-primary" />
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="job-desc">Job Description</Label>
                  <Textarea
                    id="job-desc"
                    placeholder="Paste the job description here..."
                    className="h-32 resize-none"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
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
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 space-y-4"
              >
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="font-medium text-foreground">Drafting your letter...</h3>
                  <p className="text-sm text-muted-foreground">
                    Matching keywords from job description
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/20 font-mono text-sm">
                  <div className="whitespace-pre-wrap">{result}</div>
                </ScrollArea>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Generated based on {tone} tone</span>
                  <span>245 words</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          {step === 'input' && (
            <Button onClick={() => void handleGenerate()} disabled={!jobDescription}>
              Generate Draft
            </Button>
          )}
          {step === 'result' && (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => setStep('input')}>
                Try Again
              </Button>
              <Button onClick={handleCopy} className="gap-2">
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
