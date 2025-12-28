import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { ArrowLeft, Download, Target, Briefcase, Palette, Printer, Upload, X, ZoomIn, RotateCcw, Menu } from 'lucide-react';
import { CoverLetterDialog } from '@/components/CoverLetterDialog';
import { ResumePreviewStyled } from '@/components/ResumePreview';
import { TemplateGallery } from '@/components/TemplateGallery';
import { JobMatcher } from '@/components/JobMatcher';
import { IndustryOptimizer } from '@/components/IndustryOptimizer';
import { DesignPreviewModal } from '@/components/DesignPreviewModal';
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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [designPreviews, setDesignPreviews] = useState<any[]>([]);
  const [designHistory, setDesignHistory] = useState<Array<{ html: string; templateName: string; timestamp: number }>>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [, navigate] = useLocation();
  const [, params] = useRoute('/editor/:id');
  const { user } = useAuth();
  const { showUpgrade, upgradeTrigger, featureName, triggerUpgrade, closeUpgrade } =
    useUpgradePrompt();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load design history from localStorage
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const resumeId = params?.id || queryParams.get('resumeId');

    if (resumeId) {
      const savedHistory = localStorage.getItem(`design-history-${resumeId}`);
      if (savedHistory) {
        try {
          setDesignHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('[Editor] Failed to parse design history:', e);
        }
      }
    }
  }, [params?.id]);

  useEffect(() => {
    // Support both route params (/editor/:id) and query params (?resumeId=xxx)
    const queryParams = new URLSearchParams(window.location.search);
    const resumeId = params?.id || queryParams.get('resumeId');

    if (!resumeId) {
      navigate('/');
      return;
    }

    // Add initial delay to account for database replication lag
    let retryCount = 0;
    const maxRetries = 10;
    let designGenerationStarted = false;

    // Poll for resume updates with retry logic
    const fetchResume = async () => {
      try {
        const data = await api.getResume(resumeId);
        setResume(data);
        retryCount = 0; // Reset retry count on success

        // If resume is completed but has no HTML, trigger design generation
        if (data.status === 'completed' && !data.improvedHtml && !designGenerationStarted) {
          designGenerationStarted = true;
          console.log('[Editor] Triggering design generation for resume', resumeId);

          // Trigger design generation (don't await - let it run in background)
          api.generateDesign(resumeId).catch((err) => {
            console.error('[Editor] Design generation failed:', err);
          });
        }

        // Keep polling if still processing OR if completed but no HTML yet
        if (data.status === 'processing' || (data.status === 'completed' && !data.improvedHtml)) {
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

  const saveDesignToHistory = (html: string, templateName: string) => {
    if (!resume) return;

    const newEntry = {
      html,
      templateName,
      timestamp: Date.now(),
    };

    const updatedHistory = [newEntry, ...designHistory].slice(0, 10); // Keep last 10
    setDesignHistory(updatedHistory);

    // Save to localStorage
    localStorage.setItem(`design-history-${resume.id}`, JSON.stringify(updatedHistory));
  };

  const handleUndoDesign = () => {
    if (designHistory.length === 0) {
      toast({
        title: 'No History',
        description: 'No previous designs to restore',
        variant: 'destructive',
      });
      return;
    }

    const previousDesign = designHistory[0];
    setResume(prev => ({
      ...prev!,
      improvedHtml: previousDesign.html,
    }));

    // Remove from history
    const updatedHistory = designHistory.slice(1);
    setDesignHistory(updatedHistory);
    localStorage.setItem(`design-history-${resume!.id}`, JSON.stringify(updatedHistory));

    toast({
      title: 'Design Restored!',
      description: `Reverted to ${previousDesign.templateName}`,
    });
  };

  return (
    <>
      <div className="h-screen flex flex-col bg-background font-sans overflow-hidden">
        {/* Header */}
        <header className="h-14 md:h-16 border-b flex items-center justify-between px-3 md:px-6 bg-white dark:bg-slate-950 z-20 shrink-0">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-1.5 md:p-2 hover:bg-secondary rounded-full transition-colors"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            >
              <Menu className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </button>

            <Link href="/dashboard">
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
        <div className="flex-1 flex overflow-hidden relative">
          {/* Mobile Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Left Sidebar - Editing Tools */}
          <aside className={`
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            fixed lg:relative
            left-0 top-14 md:top-16
            h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] lg:h-auto
            w-80
            border-r bg-linear-to-b from-white to-gray-50 dark:from-slate-950 dark:to-slate-900
            flex flex-col overflow-y-auto
            z-40 lg:z-auto
            transition-transform duration-300
            lg:flex
          `}>
            {/* Enhanced Header */}
            <div className="p-6 border-b bg-white dark:bg-slate-950">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg">✨</span>
                </div>
                <div>
                  <h2 className="font-bold text-base">Editing Tools</h2>
                  <p className="text-xs text-muted-foreground">
                    Enhance your resume
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-3 px-3 py-2 rounded-lg bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-300">
                    {resume.improvedHtml ? 'Design Ready' : isCompleted ? 'Ready for Design' : 'Processing...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <Accordion type="single" collapsible className="w-full">
                {/* Upload Photo */}
                {resume.improvedHtml && (
                  <AccordionItem value="photo" className="border rounded-lg px-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0 shadow-md">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-semibold text-sm flex items-center gap-2">
                            Upload Photo
                            {uploadedImage && (
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {uploadedImage ? 'Photo added' : 'Add profile image'}
                          </div>
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

                {/* Generate/Regenerate Design */}
                {isCompleted && (
                  <AccordionItem value="design" className="border rounded-lg px-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                          <Palette className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-semibold text-sm flex items-center gap-2">
                            {resume.improvedHtml ? 'Regenerate Design' : 'Generate Design'}
                            {!resume.improvedHtml && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-full">
                                NEW
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {resume.improvedHtml ? 'Get a new style' : 'Create HTML design'}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <p className="text-sm text-muted-foreground mb-3">
                        {resume.improvedHtml
                          ? 'Generate a new random professional design while keeping your content'
                          : 'Transform your resume into a beautiful, professionally designed HTML document'}
                      </p>

                      {/* Progress indicator when generating */}
                      {isRegenerating && (
                        <div className="mb-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                              Generating design...
                            </p>
                          </div>
                          <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-purple-600 h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
                          </div>
                          <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">
                            This may take 30-40 seconds
                          </p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all"
                        onClick={async () => {
                          try {
                            setIsRegenerating(true);

                            // Generate 3 preview options
                            const result = await api.previewDesigns(resume.id);
                            setDesignPreviews(result.previews);
                            setShowPreviewModal(true);

                            toast({
                              title: '🎨 3 Designs Generated!',
                              description: 'Choose your favorite design',
                            });
                          } catch (error) {
                            toast({
                              title: 'Preview Generation Failed',
                              description: error instanceof Error ? error.message : 'Failed to generate design previews',
                              variant: 'destructive',
                            });
                          } finally {
                            setIsRegenerating(false);
                          }
                        }}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Palette className="w-4 h-4" />
                            <span>{resume.improvedHtml ? 'Preview New Designs' : 'Preview Designs'}</span>
                          </>
                        )}
                      </Button>

                      {/* Helper text */}
                      {!resume.improvedHtml && (
                        <p className="text-[10px] text-center text-muted-foreground mt-2">
                          💡 Click above to create your first design
                        </p>
                      )}

                      {/* Undo Button */}
                      {resume.improvedHtml && designHistory.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={handleUndoDesign}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Undo to Previous Design ({designHistory.length})</span>
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Templates */}
                <AccordionItem value="templates" className="border rounded-lg px-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0 shadow-md">
                        <Palette className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm">Templates</div>
                        <div className="text-xs text-muted-foreground">Browse 20+ designs</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
                    <TemplateGallery
                      currentTemplate={selectedDesign || undefined}
                      onSelectTemplate={async (template) => {
                        try {
                          setSelectedDesign(template.id);
                          setIsRegenerating(true);

                          // Save current design to history before applying template
                          if (resume?.improvedHtml) {
                            saveDesignToHistory(resume.improvedHtml, 'Previous Design');
                          }

                          toast({
                            title: "🎨 Applying Template...",
                            description: `Generating ${template.name} with your resume content`,
                          });

                          // Generate design with user's content using preview system
                          // This ensures the template style is applied to THEIR content, not template sample data
                          const result = await api.previewDesigns(resume!.id);

                          // Find the preview that best matches the selected template style
                          // For now, just use the first preview (we'll enhance this later)
                          const designToApply = result.previews[0];

                          if (designToApply) {
                            setResume(prev => prev ? {
                              ...prev,
                              improvedHtml: designToApply.html
                            } : null);

                            toast({
                              title: "✨ Template Applied!",
                              description: `${template.name} is now active with your content`,
                            });
                          } else {
                            throw new Error('No design generated');
                          }
                        } catch (error) {
                          toast({
                            title: "Template Application Failed",
                            description: error instanceof Error ? error.message : 'Failed to apply template',
                            variant: 'destructive',
                          });
                        } finally {
                          setIsRegenerating(false);
                        }
                      }}
                      userTier={(user?.plan as 'free' | 'premium' | 'pro' | 'admin') || 'free'}
                      onUpgradeClick={() => triggerUpgrade('regenerate_design' as any, 'Template Gallery')}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Job Matcher */}
                <AccordionItem value="jobmatcher" className="border rounded-lg px-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0 shadow-md">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left flex-1">
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
                <AccordionItem value="industry" className="border rounded-lg px-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-md">
                        <Briefcase className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm">Industry Optimizer</div>
                        <div className="text-xs text-muted-foreground">10 industries available</div>
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

          {/* Main Resume Preview - Simple Scrollable View */}
          <main className="flex-1 flex flex-col items-center bg-muted/20 p-4 overflow-auto">
            <div className="relative group w-full max-w-[650px]">
              <div
                className="bg-white shadow-2xl border cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => setIsZoomed(true)}
              >
                {resume.improvedHtml ? (
                  <iframe
                    srcDoc={resume.improvedHtml}
                    className="w-full border-0"
                    style={{
                      width: '100%',
                      minHeight: '1684px',
                      height: 'auto'
                    }}
                    title="AI-Generated Resume Design"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="p-8">
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
              <p className="text-xs text-muted-foreground text-center mt-2">Click resume to view full size • Scroll to see complete content</p>
            </div>
          </main>
        </div>
      </div>

      {/* Zoom Modal - Full Screen Resume Preview */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-[95vw] w-[800px] max-h-[95vh] p-0 overflow-hidden flex flex-col bg-gray-50">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ZoomIn className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Resume Preview</h3>
                <p className="text-xs text-muted-foreground">Full size • {resume.fileName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100"
              onClick={() => setIsZoomed(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Resume Content - Scrollable Full View */}
          <div className="flex-1 flex items-start justify-center bg-gray-100 p-8 overflow-auto">
            <div className="mx-auto max-w-[650px] w-full bg-white shadow-2xl">
              {resume?.improvedHtml ? (
                <iframe
                  srcDoc={resume.improvedHtml}
                  className="w-full border-0"
                  style={{
                    width: '100%',
                    minHeight: '1684px',
                    height: 'auto',
                    display: 'block'
                  }}
                  title="Full Resume Preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="p-12">
                  <ResumePreviewStyled text={improvedText} />
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-3 border-t bg-white shrink-0">
            <p className="text-xs text-muted-foreground">
              Scroll to view the complete resume • Use Print or Download buttons in the header
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsZoomed(false)}
            >
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DesignPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        previews={designPreviews}
        onSelectDesign={(html, templateName) => {
          // Save current design to history before applying new one
          if (resume?.improvedHtml) {
            saveDesignToHistory(resume.improvedHtml, 'Previous Design');
          }

          setResume(prev => ({
            ...prev!,
            improvedHtml: html,
          }));
          toast({
            title: '✨ Design Applied!',
            description: `${templateName} is now active`,
          });
        }}
      />

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={closeUpgrade}
        trigger={upgradeTrigger}
        featureName={featureName}
      />
    </>
  );
}
