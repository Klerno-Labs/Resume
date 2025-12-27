import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Download, Target, Briefcase, Palette, Printer, Upload, X, ZoomIn } from 'lucide-react';
import { CoverLetterDialog } from '@/components/CoverLetterDialog';
import { ResumePreviewStyled } from '@/components/ResumePreview';
import { TemplateGallery } from '@/components/TemplateGallery';
import { JobMatcher } from '@/components/JobMatcher';
import { IndustryOptimizer } from '@/components/IndustryOptimizer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { api, type Resume } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { exportResumeToPDF } from '@/lib/pdfExport';
import { useUpgradePrompt } from '@/hooks/useUpgradePrompt';
import { UpgradeModal } from '@/components/UpgradeModal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Editor() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { showUpgrade, upgradeTrigger, featureName, triggerUpgrade, closeUpgrade } =
    useUpgradePrompt();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedImage(base64);

      // Inject image into resume HTML
      if (resume.improvedHtml) {
        const updatedHtml = resume.improvedHtml.replace(
          /<div class="photo-placeholder".*?<\/div>/,
          `<img src="${base64}" alt="Profile Photo" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid white;" />`
        );
        setResume(prev => prev ? { ...prev, improvedHtml: updatedHtml } : null);
      }

      toast({
        title: 'Image Uploaded!',
        description: 'Your photo has been added to the resume',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);

    if (resume.improvedHtml) {
      const updatedHtml = resume.improvedHtml.replace(
        /<img src="data:image.*?" alt="Profile Photo".*?\/>/,
        '<div class="photo-placeholder" style="width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.3); border: 4px solid white;"></div>'
      );
      setResume(prev => prev ? { ...prev, improvedHtml: updatedHtml } : null);
    }

    toast({
      title: 'Image Removed',
      description: 'Photo removed from resume',
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !resume.improvedHtml) return;

    printWindow.document.write(resume.improvedHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadHTML = () => {
    if (!resume.improvedHtml) return;

    const blob = new Blob([resume.improvedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resume.fileName.replace(/\.\w+$/, '')}_resume.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'HTML Downloaded!',
      description: 'You can open this file in any browser or edit it as needed.',
    });
  };

  return (
    <>
      <div className="h-screen flex flex-col bg-background font-sans overflow-hidden">
        {/* Header */}
        <header className="h-14 md:h-16 border-b flex items-center justify-between px-3 md:px-6 bg-white dark:bg-slate-950 z-20 shrink-0">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <Link href="/">
              <button className="p-1.5 md:p-2 hover:bg-secondary rounded-full transition-colors">
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </button>
            </Link>
            <div className="flex flex-col min-w-0">
              <h1 className="font-semibold text-xs md:text-sm truncate">{resume.fileName}</h1>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}
                ></span>
                {isCompleted ? 'Ready to Print' : 'Processing...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            <div className="hidden sm:block">
              <CoverLetterDialog resumeId={resume.id} />
            </div>
            {resume.improvedHtml && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 md:gap-2 text-xs md:text-sm hidden md:flex"
                  onClick={handleDownloadHTML}
                  disabled={!isCompleted}
                >
                  <Download className="w-3 h-3 md:w-4 md:h-4" />
                  <span>HTML</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 md:gap-2 text-xs md:text-sm"
                  onClick={handlePrint}
                  disabled={!isCompleted}
                >
                  <Printer className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden xs:inline">Print</span>
                </Button>
              </>
            )}
            <Button
              size="sm"
              className="gap-1 md:gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 text-xs md:text-sm"
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
              <Download className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden xs:inline">PDF</span>
            </Button>
          </div>
        </header>

        {/* Single-Page Layout: Sidebar + Resume Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Editing Tools */}
          <aside className="hidden lg:flex lg:w-80 border-r bg-secondary/10 flex-col overflow-y-auto">
            <div className="p-4 border-b bg-white dark:bg-slate-950">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <span className="text-lg">🛠️</span>
                Editing Tools
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Customize and optimize your resume
              </p>
            </div>

            <div className="p-4 space-y-3">
              <Accordion type="single" collapsible className="w-full">
                {/* Upload Photo */}
                {resume.improvedHtml && (
                  <AccordionItem value="photo" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                          <Upload className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm">Upload Photo</div>
                          <div className="text-xs text-muted-foreground">Add profile image</div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <p className="text-sm text-muted-foreground mb-3">
                        Add a professional photo to your resume (max 5MB)
                      </p>
                      {uploadedImage ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={uploadedImage}
                              alt="Uploaded"
                              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            />
                            <div className="flex-1">
                              <p className="text-xs text-green-600 font-medium">Photo uploaded</p>
                              <p className="text-xs text-muted-foreground">Visible in resume</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={handleRemoveImage}
                          >
                            <X className="w-4 h-4" />
                            <span>Remove Photo</span>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4" />
                            <span>Choose Photo</span>
                          </Button>
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Regenerate Design */}
                {resume.improvedHtml && (
                  <AccordionItem value="regenerate" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                          <Palette className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm">Regenerate Design</div>
                          <div className="text-xs text-muted-foreground">Get a new style</div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <p className="text-sm text-muted-foreground mb-3">
                        Generate a new random professional design while keeping your content
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={async () => {
                          try {
                            setIsRegenerating(true);
                            const result = await api.regenerateDesign(resume.id);

                            setResume(prev => ({
                              ...prev!,
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
                      >
                        {isRegenerating ? (
                          <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Palette className="w-4 h-4" />
                            <span>Generate New Design</span>
                          </>
                        )}
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Templates */}
                <AccordionItem value="templates" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                        <Palette className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm">Templates</div>
                        <div className="text-xs text-muted-foreground">21 professional designs</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
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
                          description: `${template.name} is now active.`,
                        });
                      }}
                      userTier={(user?.plan as 'free' | 'premium' | 'pro' | 'admin') || 'free'}
                      onUpgradeClick={() => triggerUpgrade('regenerate_design' as any, 'Template Gallery')}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Job Matcher */}
                <AccordionItem value="jobmatcher" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm">Job Matcher</div>
                        <div className="text-xs text-muted-foreground">AI-powered analysis</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
                    <JobMatcher
                      resumeText={improvedText || originalText}
                      userTier={(user?.plan as 'free' | 'premium' | 'pro' | 'admin') || 'free'}
                      onUpgradeClick={() => triggerUpgrade('regenerate_design' as any, 'Job Description Matcher')}
                      onMatchComplete={(suggestions) => {
                        console.log('[JobMatcher] Suggestions:', suggestions);
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Industry Optimizer */}
                <AccordionItem value="industry" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm">Industry Optimizer</div>
                        <div className="text-xs text-muted-foreground">10 industries</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
                    <IndustryOptimizer
                      resumeText={improvedText || originalText}
                      userTier={(user?.plan as 'free' | 'premium' | 'pro' | 'admin') || 'free'}
                      onUpgradeClick={() => triggerUpgrade('regenerate_design' as any, 'Industry Optimization')}
                      onOptimizationComplete={(optimizedText) => {
                        setResume(prev => prev ? {
                          ...prev,
                          improvedText: optimizedText
                        } : null);
                        toast({
                          title: "Optimization Applied!",
                          description: "Your resume has been updated.",
                        });
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </aside>

          {/* Main Resume Preview */}
          <main className="flex-1 flex flex-col items-center justify-center bg-muted/20 p-2 sm:p-4 overflow-hidden">
            <div className="relative group">
              <div
                className="bg-white shadow-xl sm:shadow-2xl border rounded-sm cursor-pointer hover:shadow-2xl transition-shadow relative"
                onClick={() => setIsZoomed(true)}
                style={
                  {
                    width: '595px',
                    height: '842px',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    transform: 'scale(var(--resume-scale))',
                    transformOrigin: 'center center',
                    overflow: 'hidden',
                    '--resume-scale': window.innerWidth < 1024
                      ? 'min(calc((100vw - 1rem) / 595), calc((100vh - 1rem - 64px - 40px) / 842))'
                      : 'min(calc((100vw - 320px - 2rem) / 595), calc((100vh - 2rem - 64px - 40px) / 842))'
                  } as React.CSSProperties
                }
              >
                {resume.improvedHtml ? (
                  <div className="w-full h-full overflow-hidden relative">
                    <iframe
                      srcDoc={resume.improvedHtml}
                      className="border-0 absolute"
                      title="AI-Generated Resume Design - Ready to Print"
                      sandbox="allow-same-origin"
                      style={{
                        width: '595px',
                        height: '1200px',
                        transform: 'scale(0.7)',
                        transformOrigin: 'top left',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full overflow-hidden">
                    <ResumePreviewStyled text={improvedText} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <div className="bg-white/90 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <ZoomIn className="w-4 h-4" />
                    <span className="text-sm font-medium">Click to expand</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">Click resume to view full size</p>
            </div>
          </main>
        </div>
      </div>

      {/* Zoom Modal */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-auto">
          <div className="relative bg-white">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white"
              onClick={() => setIsZoomed(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            {resume?.improvedHtml ? (
              <iframe
                srcDoc={resume.improvedHtml}
                className="w-full border-0"
                style={{ height: '1100px', minHeight: '842px' }}
                title="Full Resume Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="p-8">
                <ResumePreviewStyled text={improvedText} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={closeUpgrade}
        trigger={upgradeTrigger}
        featureName={featureName}
      />
    </>
  );
}
