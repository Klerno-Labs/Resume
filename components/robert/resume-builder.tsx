'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  Copy,
  Check,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type BuilderStep = 'welcome' | 'upload' | 'processing' | 'review' | 'design' | 'complete';

interface ChatMessage {
  role: 'robert' | 'user';
  content: string;
  timestamp: Date;
}

const TEMPLATES = [
  { id: 'modern', name: 'Modern', category: 'modern', accent: '#6366F1' },
  { id: 'classic', name: 'Classic', category: 'classic', accent: '#1E40AF' },
  { id: 'minimal', name: 'Minimal', category: 'minimal', accent: '#374151' },
  { id: 'creative', name: 'Creative', category: 'creative', accent: '#7C3AED' },
  { id: 'executive', name: 'Executive', category: 'executive', accent: '#0F172A' },
  { id: 'tech', name: 'Tech Pro', category: 'modern', accent: '#059669' },
];

export function ResumeBuilder({ initialTemplate }: { initialTemplate?: string }) {
  const [step, setStep] = useState<BuilderStep>('welcome');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'robert',
      content:
        initialTemplate
          ? `Hey! I'm Robert, your AI resume architect. I see you picked the ${initialTemplate} template — great choice! Upload your resume and I'll optimize it with that style in mind.`
          : "Hey! I'm Robert, your AI resume architect. I'll help you build a resume that gets interviews. You can upload your existing resume, or tell me about your experience and I'll create one from scratch. What would you like to do?",
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
  const validTemplate = TEMPLATES.find((t) => t.id === initialTemplate);
  const [selectedTemplate, setSelectedTemplate] = useState(validTemplate ? initialTemplate! : 'modern');
  const [coverLetter, setCoverLetter] = useState('');
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addRobertMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { role: 'robert', content, timestamp: new Date() },
    ]);
  }, []);

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
          `ATS Score: ${data.atsScore || 0}/100\n` +
          `Keywords Score: ${data.keywordsScore || 0}/100\n` +
          `Formatting Score: ${data.formattingScore || 0}/100\n\n` +
          `I've rewritten your resume with stronger action verbs, quantified achievements, and optimized keywords. ` +
          `What would you like to do next?\n\n` +
          `- Match to a job posting\n- Choose a template design\n- Generate a cover letter\n- Download your optimized resume`
      );
    } catch (err: unknown) {
      setIsTyping(false);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      addRobertMessage(
        `Hmm, I ran into an issue: ${errorMessage}. Could you try uploading again? Make sure it's a PDF or DOCX file under 10MB.`
      );
      setStep('upload');
    }
  };

  const handleDownloadPDF = async () => {
    const text = resumeData.improvedText || resumeData.originalText;
    if (!text) return;

    setActionLoading('download');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const template = TEMPLATES.find((t) => t.id === selectedTemplate);

      // Header accent bar
      const accentColor = template?.accent || '#6366F1';
      const r = parseInt(accentColor.slice(1, 3), 16);
      const g = parseInt(accentColor.slice(3, 5), 16);
      const b = parseInt(accentColor.slice(5, 7), 16);
      doc.setFillColor(r, g, b);
      doc.rect(0, 0, 210, 8, 'F');

      // Content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);

      const lines = doc.splitTextToSize(text, 170);
      let y = 20;
      for (const line of lines) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 6;
      }

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Built with RewriteMe.app', 20, 290);

      doc.save('resume-rewriteme.pdf');
      addRobertMessage('Your PDF is downloading now! This version uses the ' + (template?.name || 'Modern') + ' template style.');
    } catch {
      addRobertMessage("Sorry, I had trouble generating the PDF. Try again in a moment.");
    }
    setActionLoading(null);
  };

  const handleCoverLetter = async () => {
    const text = resumeData.improvedText || resumeData.originalText;
    if (!text) return;

    setActionLoading('cover-letter');
    setIsTyping(true);
    addRobertMessage("Generating your cover letter now. I'll make it compelling and tailored...");

    try {
      const res = await fetch('/api/cover-letters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: text,
          jobDescription: 'General application — create a versatile cover letter highlighting the strongest qualifications from this resume.',
          tone: 'professional',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to generate');
      }

      const data = await res.json();
      setCoverLetter(data.content);
      setShowCoverLetter(true);
      addRobertMessage("Your cover letter is ready! I've opened it in the preview panel. You can copy it or I can tailor it for a specific job — just paste the job description.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      addRobertMessage(`Couldn't generate the cover letter: ${msg}. Please try again.`);
    }
    setIsTyping(false);
    setActionLoading(null);
  };

  const handleJobMatch = async (jobDescription: string) => {
    const text = resumeData.improvedText || resumeData.originalText;
    if (!text) return;

    setIsTyping(true);
    try {
      const res = await fetch('/api/match-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text, jobDescription }),
      });

      if (res.ok) {
        const matchData = await res.json();
        addRobertMessage(
          `Here's your job match analysis:\n\n` +
            `Match Score: ${matchData.score || 0}%\n\n` +
            `${matchData.strengths?.length ? `Strengths:\n${matchData.strengths.map((s: string) => `  - ${s}`).join('\n')}\n\n` : ''}` +
            `${matchData.missingKeywords?.length ? `Missing Keywords:\n${matchData.missingKeywords.map((k: string) => `  - ${k}`).join('\n')}\n\n` : ''}` +
            `${matchData.suggestions?.length ? `Suggestions:\n${matchData.suggestions.map((s: string) => `  - ${s}`).join('\n')}\n\n` : ''}` +
            `Want me to optimize your resume for this specific role?`
        );
      } else {
        const error = await res.json();
        throw new Error(error.message || 'Analysis failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      addRobertMessage(`Couldn't complete the analysis: ${msg}. Try pasting the job description again.`);
    }
    setIsTyping(false);
  };

  const handleIndustryOptimize = async (industry: string) => {
    const text = resumeData.improvedText || resumeData.originalText;
    if (!text) return;

    setIsTyping(true);
    setActionLoading('industry');
    try {
      const res = await fetch('/api/optimize-industry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text, industry }),
      });

      if (res.ok) {
        const data = await res.json();
        addRobertMessage(
          `Your resume has been optimized for the ${industry} industry!\n\n` +
            `Confidence Score: ${data.confidenceScore || 0}%\n\n` +
            `${data.addedKeywords?.length ? `Added Keywords:\n${data.addedKeywords.map((k: string) => `  + ${k}`).join('\n')}\n\n` : ''}` +
            `${data.industryTips?.length ? `Industry Tips:\n${data.industryTips.map((t: string) => `  - ${t}`).join('\n')}` : ''}`
        );
        if (data.optimizedText) {
          setResumeData((prev) => ({ ...prev, improvedText: data.optimizedText }));
        }
      } else {
        const error = await res.json();
        throw new Error(error.message || 'Optimization failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      addRobertMessage(`Couldn't optimize for industry: ${msg}. Please try again.`);
    }
    setIsTyping(false);
    setActionLoading(null);
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
        addRobertMessage(
          `Thanks for sharing that! To give you the best results, upload your current resume and I'll rewrite it with your goals in mind. Or if you don't have one yet, upload any draft — even a rough one works. I'll transform it.`
        );
      }
    } else if (step === 'review' || step === 'design') {
      const lowerInput = userInput.toLowerCase();
      if (lowerInput.includes('download')) {
        handleDownloadPDF();
      } else if (lowerInput.includes('cover letter')) {
        handleCoverLetter();
      } else if (
        lowerInput.includes('template') ||
        lowerInput.includes('design') ||
        lowerInput.includes('look')
      ) {
        setStep('design');
        addRobertMessage(
          "Check out the template selector in the panel on the right. Pick one that fits your industry, then download your resume in that style."
        );
      } else if (
        lowerInput.includes('industry') ||
        lowerInput.includes('optimize for') ||
        lowerInput.includes('tailor for')
      ) {
        // Extract industry name from input
        const industryMatch = userInput.match(/(?:for|industry[:\s]*)\s*(.+)/i);
        const industry = industryMatch ? industryMatch[1].trim() : userInput;
        if (industry.length >= 2 && industry.length <= 50) {
          await handleIndustryOptimize(industry);
        } else {
          addRobertMessage("What industry should I optimize for? Just type the name, like 'Healthcare' or 'Finance'.");
        }
      } else if (userInput.length > 50) {
        // Long text = likely a job description
        await handleJobMatch(userInput);
      } else {
        addRobertMessage(
          "I'm ready to help! You can:\n\n" +
            "- Paste a job description and I'll match your resume to it\n" +
            "- Optimize for a specific industry\n" +
            "- Choose a template design from the panel\n" +
            "- Ask me to generate a cover letter\n" +
            "- Download your optimized resume as PDF"
        );
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

            {(step === 'review' || step === 'design') && (
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
                      "Pick a template from the panel on the right. Each one is ATS-friendly and professionally designed."
                    );
                  }}
                />
                <QuickAction
                  icon={<Briefcase className="w-3.5 h-3.5" />}
                  label="Optimize for Industry"
                  disabled={actionLoading === 'industry'}
                  onClick={() => {
                    addRobertMessage(
                      "What industry are you targeting? Type the industry name (e.g., 'Healthcare', 'Finance', 'Tech') and I'll optimize your resume with industry-specific keywords."
                    );
                  }}
                />
                <QuickAction
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label="Cover Letter"
                  disabled={actionLoading === 'cover-letter'}
                  onClick={handleCoverLetter}
                />
                <QuickAction
                  icon={<Download className="w-3.5 h-3.5" />}
                  label="Download PDF"
                  disabled={actionLoading === 'download'}
                  onClick={handleDownloadPDF}
                />
              </div>
            )}

            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  step === 'review' || step === 'design'
                    ? 'Paste a job description or ask Robert anything...'
                    : 'Tell Robert about your experience...'
                }
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

          {/* Cover Letter Preview */}
          {showCoverLetter && coverLetter && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl glass p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Cover Letter</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(coverLetter)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Copy"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-brand-muted" />
                    )}
                  </button>
                  <button
                    onClick={() => setShowCoverLetter(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-brand-muted" />
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto text-sm text-brand-muted leading-relaxed whitespace-pre-wrap">
                {coverLetter}
              </div>
            </motion.div>
          )}

          {/* Template Selector (in design step) */}
          {(step === 'design' || step === 'review' || step === 'complete') && resumeData.improvedText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl glass p-6"
            >
              <h3 className="text-white font-semibold mb-4">Template Style</h3>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t.id);
                      addRobertMessage(`Great choice! The ${t.name} template is now selected. Download your resume when you're ready.`);
                    }}
                    className={cn(
                      'p-3 rounded-xl text-center transition-all',
                      selectedTemplate === t.id
                        ? 'bg-brand-accent/20 border border-brand-accent/40'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    )}
                  >
                    <div
                      className="w-full aspect-[8.5/11] rounded-md mb-2"
                      style={{ backgroundColor: t.accent + '20', borderTop: `3px solid ${t.accent}` }}
                    />
                    <span className="text-xs text-white">{t.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
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
                    <div className="text-brand-muted text-xs">PDF, DOCX, or DOC (max 10MB)</div>
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
                  onClick={() => {
                    addRobertMessage("Paste the job description below and I'll analyze the match.");
                  }}
                />
                <ActionButton
                  icon={<Palette className="w-4 h-4" />}
                  label="Choose Template"
                  description="6 professional designs"
                  onClick={() => {
                    setStep('design');
                    addRobertMessage("Pick a template style above. Each one is ATS-friendly.");
                  }}
                />
                <ActionButton
                  icon={<Briefcase className="w-4 h-4" />}
                  label="Industry Optimize"
                  description="Tailor for your industry"
                  loading={actionLoading === 'industry'}
                  onClick={() => {
                    addRobertMessage("What industry are you targeting? Type the name (e.g., 'Healthcare', 'Finance', 'Tech') and I'll optimize your resume.");
                  }}
                />
                <ActionButton
                  icon={<FileText className="w-4 h-4" />}
                  label="Cover Letter"
                  description="AI-generated, job-specific"
                  loading={actionLoading === 'cover-letter'}
                  onClick={handleCoverLetter}
                />
                <ActionButton
                  icon={<Download className="w-4 h-4" />}
                  label="Download PDF"
                  description="Ready to submit"
                  primary
                  loading={actionLoading === 'download'}
                  onClick={handleDownloadPDF}
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
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-brand-muted text-xs hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
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
  onClick,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  primary?: boolean;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors group',
        primary
          ? 'bg-gradient-to-r from-brand-accent to-purple-500 hover:shadow-lg hover:shadow-brand-accent/25'
          : 'bg-white/5 border border-white/10 hover:bg-white/10',
        loading && 'opacity-70'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          primary ? 'bg-white/20' : 'bg-brand-accent/10'
        )}
      >
        {loading ? (
          <Loader2 className={cn('w-4 h-4 animate-spin', primary ? 'text-white' : 'text-brand-accent-light')} />
        ) : (
          <span className={primary ? 'text-white' : 'text-brand-accent-light'}>{icon}</span>
        )}
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
