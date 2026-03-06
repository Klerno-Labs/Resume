'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Upload,
  Send,
  FileText,
  Sparkles,
  Download,
  Palette,
  Target,
  Loader2,
  CheckCircle2,
  ArrowRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type BuilderStep = 'welcome' | 'upload' | 'processing' | 'review' | 'design' | 'complete';

interface ChatMessage {
  role: 'robert' | 'user';
  content: string;
  timestamp: Date;
}

export function ResumeBuilder() {
  const [step, setStep] = useState<BuilderStep>('welcome');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'robert',
      content:
        "Hey! I'm Robert, your AI resume architect. I'll help you build a resume that gets interviews. You can upload your existing resume, or tell me about your experience and I'll create one from scratch. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resumeData, setResumeData] = useState<{
    originalText?: string;
    improvedText?: string;
    atsScore?: number;
    keywordsScore?: number;
    formattingScore?: number;
    resumeId?: string;
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addRobertMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { role: 'robert', content, timestamp: new Date() },
    ]);
  };

  const addUserMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content, timestamp: new Date() },
    ]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    addUserMessage(`Uploaded: ${file.name}`);
    setStep('processing');
    setIsTyping(true);

    addRobertMessage(
      `Got it! I'm reading through "${file.name}" now. Give me a moment to analyze your experience and identify areas for improvement...`
    );

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/resumes/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await res.json();
      setResumeData(data);
      setIsTyping(false);
      setStep('review');

      addRobertMessage(
        `Done! Here's what I found:\n\n` +
          `📊 **ATS Score: ${data.atsScore || 0}/100**\n` +
          `🔑 Keywords Score: ${data.keywordsScore || 0}/100\n` +
          `📝 Formatting Score: ${data.formattingScore || 0}/100\n\n` +
          `I've rewritten your resume with stronger action verbs, quantified achievements, and optimized keywords. ` +
          `Want to see the before/after comparison, choose a template design, or should I match it to a specific job posting?`
      );
    } catch (err: unknown) {
      setIsTyping(false);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      addRobertMessage(
        `Hmm, I ran into an issue: ${errorMessage}. Could you try uploading again? Make sure it's a PDF or DOCX file.`
      );
      setStep('upload');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userInput = input.trim();
    setInput('');
    addUserMessage(userInput);

    if (step === 'welcome') {
      const lowerInput = userInput.toLowerCase();
      if (
        lowerInput.includes('upload') ||
        lowerInput.includes('have a resume') ||
        lowerInput.includes('existing')
      ) {
        setStep('upload');
        addRobertMessage(
          "Great! Go ahead and upload your resume. I accept PDF and DOCX files. I'll analyze it and get to work."
        );
      } else {
        setStep('upload');
        setIsTyping(true);
        addRobertMessage(
          `Thanks for sharing that! To give you the best results, upload your current resume and I'll rewrite it with your goals in mind. Or if you don't have one yet, upload any draft — even a rough one works. I'll transform it.`
        );
        setIsTyping(false);
      }
    } else if (step === 'review') {
      const lowerInput = userInput.toLowerCase();
      if (
        lowerInput.includes('job') ||
        lowerInput.includes('match') ||
        lowerInput.includes('position') ||
        lowerInput.includes('posting')
      ) {
        setIsTyping(true);
        addRobertMessage(
          "Paste the job description below and I'll tailor your resume specifically for that role — matching keywords, skills, and requirements."
        );
        setIsTyping(false);
      } else if (
        lowerInput.includes('template') ||
        lowerInput.includes('design') ||
        lowerInput.includes('look')
      ) {
        setStep('design');
        addRobertMessage(
          "Let's pick a design! I'll show you templates that work best for your industry. Check out the template gallery below."
        );
      } else if (lowerInput.includes('cover letter')) {
        setIsTyping(true);
        addRobertMessage(
          "I can generate a cover letter that complements your resume. What's the job title and company you're applying to?"
        );
        setIsTyping(false);
      } else {
        setIsTyping(true);
        // Send to AI for job matching
        try {
          const res = await fetch('/api/match-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resumeText: resumeData.improvedText || resumeData.originalText,
              jobDescription: userInput,
            }),
          });

          if (res.ok) {
            const matchData = await res.json();
            addRobertMessage(
              `Here's your job match analysis:\n\n` +
                `🎯 **Match Score: ${matchData.score || 0}%**\n\n` +
                `${matchData.strengths ? `**Strengths:**\n${matchData.strengths.map((s: string) => `• ${s}`).join('\n')}\n\n` : ''}` +
                `${matchData.missingKeywords?.length ? `**Missing Keywords:**\n${matchData.missingKeywords.map((k: string) => `• ${k}`).join('\n')}\n\n` : ''}` +
                `${matchData.suggestions?.length ? `**Suggestions:**\n${matchData.suggestions.map((s: string) => `• ${s}`).join('\n')}\n\n` : ''}` +
                `Want me to optimize your resume for this specific role, or pick a template design?`
            );
          } else {
            addRobertMessage(
              "Got it! Would you like me to:\n• **Match** your resume to a job posting\n• **Choose a template** design\n• **Generate a cover letter**\n• **Download** your optimized resume"
            );
          }
        } catch {
          addRobertMessage(
            "I'd love to help with that! You can:\n• Paste a job description and I'll match your resume to it\n• Choose a template design\n• Generate a tailored cover letter\n• Download your optimized resume"
          );
        }
        setIsTyping(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-8rem)]">
        {/* Left: Chat with Robert */}
        <div className="lg:col-span-2 flex flex-col rounded-2xl glass overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold">Robert</div>
              <div className="text-green-400 text-xs flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Ready to build your resume
              </div>
            </div>
            <StepIndicator currentStep={step} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' && 'justify-end'
                  )}
                >
                  {msg.role === 'robert' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed',
                      msg.role === 'robert'
                        ? 'bg-white/5 rounded-tl-md text-white'
                        : 'bg-brand-accent/20 rounded-tr-md text-white'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/5 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-brand-muted animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-brand-muted animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 rounded-full bg-brand-muted animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-white/10">
            {(step === 'welcome' || step === 'upload') && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent-light text-sm hover:bg-brand-accent/20 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Resume
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {step === 'review' && (
              <div className="flex gap-2 mb-3 flex-wrap">
                <QuickAction
                  icon={<Target className="w-3.5 h-3.5" />}
                  label="Match to Job"
                  onClick={() => {
                    addRobertMessage(
                      "Paste the job description and I'll analyze how well your resume matches — then optimize it."
                    );
                  }}
                />
                <QuickAction
                  icon={<Palette className="w-3.5 h-3.5" />}
                  label="Choose Template"
                  onClick={() => {
                    setStep('design');
                    addRobertMessage(
                      "Let's pick a design that fits your industry. Check the template panel on the right."
                    );
                  }}
                />
                <QuickAction
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label="Cover Letter"
                  onClick={() => {
                    addRobertMessage(
                      "I'll generate a cover letter for you. What's the job title and company?"
                    );
                  }}
                />
                <QuickAction
                  icon={<Download className="w-3.5 h-3.5" />}
                  label="Download PDF"
                  onClick={() => {
                    addRobertMessage(
                      "Your resume is ready to download! Click the download button in the preview panel."
                    );
                  }}
                />
              </div>
            )}

            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell Robert about your experience..."
                rows={1}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-brand-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-accent-glow transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Preview / Actions Panel */}
        <div className="flex flex-col gap-4">
          {/* Score Card */}
          {resumeData.atsScore !== undefined && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl glass p-6"
            >
              <h3 className="text-white font-semibold mb-4">Resume Score</h3>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="url(#scoreGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(resumeData.atsScore / 100) * 251.2} 251.2`}
                    />
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#A855F7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-display font-bold text-white">
                      {resumeData.atsScore}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <ScoreBar label="ATS" score={resumeData.atsScore} />
                <ScoreBar label="Keywords" score={resumeData.keywordsScore || 0} />
                <ScoreBar label="Formatting" score={resumeData.formattingScore || 0} />
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <div className="rounded-2xl glass p-6">
            <h3 className="text-white font-semibold mb-4">
              {step === 'welcome' || step === 'upload' ? 'Get Started' : 'Actions'}
            </h3>

            {(step === 'welcome' || step === 'upload') && (
              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-left hover:bg-brand-accent/20 transition-colors group"
                >
                  <Upload className="w-5 h-5 text-brand-accent-light" />
                  <div>
                    <div className="text-white text-sm font-medium">Upload Resume</div>
                    <div className="text-brand-muted text-xs">PDF, DOCX, or DOC</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-brand-muted ml-auto group-hover:text-white transition-colors" />
                </button>
              </div>
            )}

            {step === 'processing' && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-accent/10 border border-brand-accent/20">
                <Loader2 className="w-5 h-5 text-brand-accent-light animate-spin" />
                <div>
                  <div className="text-white text-sm font-medium">Robert is analyzing...</div>
                  <div className="text-brand-muted text-xs">This takes about 30 seconds</div>
                </div>
              </div>
            )}

            {(step === 'review' || step === 'design' || step === 'complete') && (
              <div className="space-y-3">
                <ActionButton
                  icon={<Target className="w-4 h-4" />}
                  label="Match to Job"
                  description="Tailor for a specific role"
                />
                <ActionButton
                  icon={<Palette className="w-4 h-4" />}
                  label="Choose Template"
                  description="40+ professional designs"
                />
                <ActionButton
                  icon={<FileText className="w-4 h-4" />}
                  label="Cover Letter"
                  description="AI-generated, job-specific"
                />
                <ActionButton
                  icon={<Download className="w-4 h-4" />}
                  label="Download PDF"
                  description="Ready to submit"
                  primary
                />
              </div>
            )}
          </div>

          {/* Robert Branding */}
          <div className="rounded-2xl glass p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white text-sm font-semibold">Powered by Robert</span>
            </div>
            <p className="text-brand-muted text-xs">
              AI resume architect by RewriteMe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: BuilderStep }) {
  const steps = ['welcome', 'upload', 'processing', 'review', 'design', 'complete'];
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="hidden sm:flex items-center gap-1">
      {steps.slice(0, 4).map((s, i) => (
        <div
          key={s}
          className={cn(
            'w-2 h-2 rounded-full transition-colors',
            i <= currentIndex ? 'bg-brand-accent-light' : 'bg-white/10'
          )}
        />
      ))}
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-brand-muted text-xs hover:text-white hover:bg-white/10 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function ActionButton({
  icon,
  label,
  description,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors group',
        primary
          ? 'bg-gradient-to-r from-brand-accent to-purple-500 hover:shadow-lg hover:shadow-brand-accent/25'
          : 'bg-white/5 border border-white/10 hover:bg-white/10'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          primary ? 'bg-white/20' : 'bg-brand-accent/10'
        )}
      >
        <span className={primary ? 'text-white' : 'text-brand-accent-light'}>{icon}</span>
      </div>
      <div>
        <div className="text-white text-sm font-medium">{label}</div>
        <div className={cn('text-xs', primary ? 'text-white/70' : 'text-brand-muted')}>
          {description}
        </div>
      </div>
    </button>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-brand-muted">{label}</span>
        <span className="text-white font-medium">{score}/100</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-brand-accent to-purple-500 rounded-full"
        />
      </div>
    </div>
  );
}
