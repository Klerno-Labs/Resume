import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Download, Target, Briefcase, Palette } from 'lucide-react';
import { CoverLetterDialog } from '@/components/CoverLetterDialog';
import { ResumePreviewStyled } from '@/components/ResumePreview';
import { TemplateGallery } from '@/components/TemplateGallery';
import { JobMatcher } from '@/components/JobMatcher';
import { IndustryOptimizer } from '@/components/IndustryOptimizer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { api, type Resume } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { exportResumeToPDF } from '@/lib/pdfExport';
import { useUpgradePrompt } from '@/hooks/useUpgradePrompt';
import { UpgradeModal } from '@/components/UpgradeModal';

export default function Editor() {
  const [activeTab, setActiveTab] = useState('preview');
  const [resume, setResume] = useState<Resume | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { showUpgrade, upgradeTrigger, featureName, triggerUpgrade, closeUpgrade } =
    useUpgradePrompt();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get('resumeId');

    if (!resumeId) {
      navigate('/');
      return;
    }

    // Add initial delay to account for database replication lag
    let retryCount = 0;
    const maxRetries = 10;

    // Poll for resume updates with retry logic
    const fetchResume = async () => {
      try {
        const data = await api.getResume(resumeId);
        setResume(data);
        retryCount = 0; // Reset retry count on success

        if (data.status === 'processing') {
          setTimeout(fetchResume, 2000); // Poll every 2 seconds
        }
      } catch (error) {
        retryCount++;

        // If resume not found and we haven't exceeded retries, try again
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage.includes('not found') && retryCount < maxRetries) {
          console.log(`[Editor] Resume not found yet, retry ${retryCount}/${maxRetries} in 1.5s...`);
          setTimeout(fetchResume, 1500); // Retry after 1.5 seconds
        } else {
          // Show error only after all retries exhausted
          toast({
            title: 'Having Trouble Loading Your Resume',
            description: retryCount >= maxRetries
              ? 'Your resume is still being processed. This usually takes just a few seconds. Try refreshing the page in a moment.'
              : 'There was an issue loading your resume. Please try uploading again or contact support if this continues.',
            variant: 'destructive',
          });
        }
      }
    };

    // Start fetching immediately - backend handles timing
    void fetchResume();
  }, []); // Removed navigate from dependencies to prevent infinite loop

  if (!resume) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading resume...</p>
        </div>
      </div>
    );
  }

  const isCompleted = resume.status === 'completed';
  const originalText = resume.originalText || '';
  const improvedText = resume.improvedText || (isCompleted ? '' : 'Processing your resume...');

  return (
    <>
      <div className="h-screen flex flex-col bg-background font-sans overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b flex items-center justify-between px-6 bg-white dark:bg-slate-950 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-secondary rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            </Link>
            <div className="flex flex-col">
              <h1 className="font-semibold text-sm">{resume.fileName}</h1>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}
                ></span>
                {isCompleted ? 'Optimized' : 'Processing...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CoverLetterDialog resumeId={resume.id} />
            <Button
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
              onClick={() => {
                try {
                  toast({
                    title: 'Exporting PDF...',
                    description: 'Generating your resume PDF...',
                  });

                  if (user?.plan === 'free') {
                    triggerUpgrade('watermark_notice');
                  }

                  exportResumeToPDF({
                    improvedText: resume.improvedText || resume.originalText,
                    fileName: resume.fileName,
                    atsScore: resume.atsScore,
                    watermarkText:
                      (user?.plan === 'free') ? 'Resume Repairer • Free Plan' : undefined,
                  });

                  toast({
                    title: 'Success!',
                    description: 'Your resume has been downloaded.',
                  });
                } catch {
                  toast({
                    title: 'Export Failed',
                    description: 'Failed to export PDF. Please try again.',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={!isCompleted}
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Area */}
          <main className="flex-1 flex flex-col bg-muted/20 relative">
            <div className="p-3 border-b bg-white dark:bg-slate-950">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-2 h-12">
                  <TabsTrigger value="preview" className="text-base" title="Preview and download your improved resume">
                    👁️ Preview & Download
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="text-base" title="Templates, job matching, and industry optimization">
                    🛠️ Advanced Tools
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 p-8 overflow-hidden">
              <Tabs value={activeTab} className="h-full">
                <TabsContent
                  value="preview"
                  className="h-full mt-0 flex items-center justify-center overflow-hidden"
                >
                  <div className="flex flex-col items-center gap-4 w-full h-full justify-center">
                    {/* Download Action Bar */}
                    <div className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">Your Improved Resume is Ready!</h3>
                        <p className="text-sm text-muted-foreground">
                          Download your ATS-optimized resume or continue editing below
                        </p>
                      </div>
                      <Button
                        size="lg"
                        onClick={() => {
                          try {
                            exportResumeToPDF({
                              originalText,
                              improvedText,
                              atsScore: resume.atsScore,
                              watermarkText:
                                (user?.plan === 'free') ? 'Resume Repairer • Free Plan' : undefined,
                            });

                            toast({
                              title: 'Success!',
                              description: 'Your resume has been downloaded.',
                            });
                          } catch {
                            toast({
                              title: 'Export Failed',
                              description: 'Failed to export PDF. Please try again.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        disabled={!isCompleted}
                        className="gap-2 px-6"
                      >
                        <Download className="w-5 h-5" />
                        Download Improved Resume
                      </Button>
                    </div>

                    {/* Regenerate Design Button (only for AI designs) */}
                    {resume.improvedHtml && (
                      <div className="flex justify-center mb-4">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              setIsRegenerating(true);
                              const result = await api.regenerateDesign(resume.id);

                              // Update resume with new design
                              setResume(prev => ({
                                ...prev,
                                improvedHtml: result.improvedHtml,
                              }));

                              toast({
                                title: 'New Design Generated!',
                                description: `${result.templateName} - ${result.regenerationsRemaining === Infinity ? 'Unlimited' : result.regenerationsRemaining} regenerations remaining`,
                              });
                            } catch (error) {
                              toast({
                                title: 'Regeneration Failed',
                                description: error instanceof Error ? error.message : 'Failed to regenerate design',
                                variant: 'destructive',
                              });
                            } finally {
                              setIsRegenerating(false);
                            }
                          }}
                          disabled={!isCompleted || isRegenerating}
                          className="gap-2"
                        >
                          {isRegenerating ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Generating New Design...
                            </>
                          ) : (
                            <>
                              <Palette className="w-4 h-4" />
                              Regenerate Design
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Preview - Fits on One Page, No Scroll */}
                    <div className="flex-1 flex justify-center items-center w-full">
                      <div
                        className="bg-white shadow-2xl border rounded-sm overflow-hidden"
                        style={{
                          width: '595px',
                          height: '842px',
                          transform: 'scale(0.65)',
                          transformOrigin: 'center center'
                        }}
                      >
                        {resume.improvedHtml ? (
                          <iframe
                            srcDoc={resume.improvedHtml}
                            className="w-full h-full border-0"
                            title="AI-Generated Resume Design"
                            sandbox="allow-same-origin"
                          />
                        ) : (
                          <div className="w-full h-full overflow-hidden">
                            <ResumePreviewStyled text={improvedText} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="advanced" className="h-full mt-0 overflow-auto">
                  <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Templates Card */}
                      <div className="bg-white dark:bg-slate-950 border rounded-lg p-6 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                            <Palette className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Resume Templates</h3>
                            <p className="text-xs text-muted-foreground">21 professional designs</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 flex-1">
                          Choose from modern, classic, creative, or minimal templates
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const modal = document.getElementById('templates-modal');
                            if (modal) modal.classList.remove('hidden');
                          }}
                        >
                          Browse Templates
                        </Button>
                      </div>

                      {/* Job Matcher Card */}
                      <div className="bg-white dark:bg-slate-950 border rounded-lg p-6 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <Target className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Job Matcher</h3>
                            <p className="text-xs text-muted-foreground">AI-powered analysis</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 flex-1">
                          See how well your resume matches specific job postings
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const modal = document.getElementById('jobmatcher-modal');
                            if (modal) modal.classList.remove('hidden');
                          }}
                        >
                          Analyze Job Match
                        </Button>
                      </div>

                      {/* Industry Optimizer Card */}
                      <div className="bg-white dark:bg-slate-950 border rounded-lg p-6 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Industry Optimizer</h3>
                            <p className="text-xs text-muted-foreground">10 specialized industries</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 flex-1">
                          Optimize your resume for tech, finance, healthcare, and more
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const modal = document.getElementById('industry-modal');
                            if (modal) modal.classList.remove('hidden');
                          }}
                        >
                          Optimize by Industry
                        </Button>
                      </div>
                    </div>

                    {/* Modals/Expandable Sections */}
                    <div id="templates-modal" className="hidden">
                      <div className="bg-white dark:bg-slate-950 border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Resume Templates</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const modal = document.getElementById('templates-modal');
                              if (modal) modal.classList.add('hidden');
                            }}
                          >
                            Close
                          </Button>
                        </div>
                        <TemplateGallery
                          currentTemplate={selectedDesign || undefined}
                          onSelectTemplate={(template) => {
                            setSelectedDesign(template.id);
                            setResume(prev => prev ? {
                              ...prev,
                              improvedHtml: template.htmlTemplate
                            } : null);
                            toast({
                              title: "Template Applied!",
                              description: `${template.name} is now active. Check the Preview tab to see it.`,
                            });
                            const modal = document.getElementById('templates-modal');
                            if (modal) modal.classList.add('hidden');
                            setActiveTab('preview');
                          }}
                          userTier={user?.plan || 'free'}
                          onUpgradeClick={() => triggerUpgrade('template_access', 'Template Gallery')}
                        />
                      </div>
                    </div>

                    <div id="jobmatcher-modal" className="hidden">
                      <div className="bg-white dark:bg-slate-950 border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Job Description Matcher</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const modal = document.getElementById('jobmatcher-modal');
                              if (modal) modal.classList.add('hidden');
                            }}
                          >
                            Close
                          </Button>
                        </div>
                        <JobMatcher
                          resumeText={improvedText || originalText}
                          userTier={user?.plan || 'free'}
                          onUpgradeClick={() => triggerUpgrade('job_matcher', 'Job Description Matcher')}
                          onMatchComplete={(suggestions) => {
                            console.log('[JobMatcher] Suggestions:', suggestions);
                          }}
                        />
                      </div>
                    </div>

                    <div id="industry-modal" className="hidden">
                      <div className="bg-white dark:bg-slate-950 border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Industry Optimization</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const modal = document.getElementById('industry-modal');
                              if (modal) modal.classList.add('hidden');
                            }}
                          >
                            Close
                          </Button>
                        </div>
                        <IndustryOptimizer
                          resumeText={improvedText || originalText}
                          userTier={user?.plan || 'free'}
                          onUpgradeClick={() => triggerUpgrade('industry_optimizer', 'Industry Optimization')}
                          onOptimizationComplete={(optimizedText) => {
                            setResume(prev => prev ? {
                              ...prev,
                              improvedText: optimizedText
                            } : null);
                            toast({
                              title: "Optimization Applied!",
                              description: "Your resume has been updated. Check the Resume tab to see changes.",
                            });
                            const modal = document.getElementById('industry-modal');
                            if (modal) modal.classList.add('hidden');
                            setActiveTab('resume');
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={closeUpgrade}
        trigger={upgradeTrigger}
        featureName={featureName}
      />
    </>
  );
}
