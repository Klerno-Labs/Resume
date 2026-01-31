import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check, AlertCircle, Loader2, FileX, Maximize2, Sparkles, Award, Eye } from 'lucide-react';

interface DesignPreview {
  templateName: string;
  templateStyle: string;
  layout: string;
  accentColor: string;
  html: string;
  contrastPassed: boolean;
  contrastSummary: {
    totalChecks: number;
    passedAA: number;
    passedAAA: number;
    failedAA: number;
  };
  atsScore: number;
  atsWarnings: string[];
  atsIssues: Array<{
    type: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

interface DesignPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previews: DesignPreview[];
  onSelectDesign: (html: string, templateName: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function DesignPreviewModal({
  isOpen,
  onClose,
  previews,
  onSelectDesign,
  isLoading = false,
  error = null,
}: DesignPreviewModalProps) {
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const [fullScreenPreview, setFullScreenPreview] = useState<number | null>(null);

  const hasNoPreviews = !isLoading && !error && previews.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] p-0 overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b bg-gradient-to-r from-white via-slate-50/50 to-white backdrop-blur-sm shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-bold text-2xl bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Choose Your Design
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 font-medium mt-0.5">
                {isLoading ? 'Generating unique designs...' : 'Select from 3 unique professional designs'}
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-slate-100/80 transition-all duration-200 rounded-lg"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-slate-600" />
          </Button>
        </div>

        {/* Preview Grid */}
        <div className="flex-1 overflow-auto p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                <Loader2 className="relative w-16 h-16 text-primary animate-spin" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Generating Your Designs
              </h3>
              <p className="text-sm text-slate-600 max-w-md font-medium leading-relaxed">
                Creating 3 unique professional layouts with optimized colors and typography...
              </p>
              <div className="mt-6 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-red-500/10 rounded-full blur-2xl"></div>
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-10 h-10 text-red-600" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900">Failed to Generate Designs</h3>
              <p className="text-sm text-slate-600 max-w-md mb-6 font-medium leading-relaxed bg-red-50/50 px-4 py-3 rounded-xl border border-red-100">{error}</p>
              <Button
                onClick={onClose}
                variant="outline"
                className="border-2 hover:border-primary/50 font-semibold transition-all duration-200 hover:scale-105 px-8"
              >
                Close and Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {hasNoPreviews && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-slate-300/10 rounded-full blur-2xl"></div>
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 flex items-center justify-center shadow-lg">
                  <FileX className="w-10 h-10 text-slate-400" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900">No Designs Available</h3>
              <p className="text-sm text-slate-600 max-w-md font-medium leading-relaxed">
                Please try generating designs again.
              </p>
            </div>
          )}

          {/* Previews Grid */}
          {!isLoading && !error && previews.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {previews.map((preview, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl border-2 transition-all duration-500 cursor-pointer group ${
                  selectedPreview === index
                    ? 'border-primary shadow-2xl ring-4 ring-primary/10 scale-[1.03] shadow-primary/20'
                    : 'border-slate-200 hover:border-primary/40 hover:shadow-2xl hover:scale-[1.02] shadow-lg shadow-slate-200/50'
                }`}
                onClick={() => setSelectedPreview(index)}
              >
                {/* Selection Glow Effect */}
                {selectedPreview === index && (
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-2xl blur opacity-20 animate-pulse"></div>
                )}

                {/* Template Info Header */}
                <div className="relative p-5 border-b bg-gradient-to-br from-slate-50/80 via-white to-slate-50/50 rounded-t-2xl">
                  <div className="flex items-start justify-between mb-3.5">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-2.5 text-slate-900 tracking-tight">
                        {preview.templateName}
                      </h4>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-semibold shadow-sm shadow-blue-200">
                          {preview.templateStyle}
                        </span>
                        <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full font-semibold shadow-sm shadow-purple-200">
                          {preview.layout}
                        </span>
                      </div>
                    </div>
                    {selectedPreview === index && (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center shrink-0 animate-in zoom-in duration-300 shadow-lg shadow-primary/30">
                        <Check className="w-5 h-5 text-white stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Validation Badges */}
                  <div className="flex flex-col gap-2.5">
                    {/* ATS Score Badge */}
                    <div className={`flex items-center gap-2 text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-all ${
                      preview.atsScore >= 90 ? 'text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100/80 border-2 border-emerald-200/60' :
                      preview.atsScore >= 80 ? 'text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100/80 border-2 border-blue-200/60' :
                      preview.atsScore >= 70 ? 'text-amber-700 bg-gradient-to-r from-amber-50 to-amber-100/80 border-2 border-amber-200/60' :
                      'text-red-700 bg-gradient-to-r from-red-50 to-red-100/80 border-2 border-red-200/60'
                    }`}>
                      <Award className={`w-4 h-4 ${preview.atsScore >= 90 ? 'text-emerald-600' : preview.atsScore >= 80 ? 'text-blue-600' : preview.atsScore >= 70 ? 'text-amber-600' : 'text-red-600'}`} />
                      <span>ATS Score: {preview.atsScore}%</span>
                    </div>

                    {/* Contrast Validation Badge */}
                    {preview.contrastPassed ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100/80 px-3.5 py-2 rounded-xl border-2 border-emerald-200/60 font-bold shadow-sm">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>WCAG AA Compliant</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-gradient-to-r from-amber-50 to-amber-100/80 px-3.5 py-2 rounded-xl border-2 border-amber-200/60 font-bold shadow-sm">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>
                          {preview.contrastSummary.failedAA} contrast warning{preview.contrastSummary.failedAA !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Iframe - Scaled thumbnail */}
                <div className="relative p-5 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 group overflow-hidden">
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[5]"></div>

                  <div className="relative bg-white shadow-xl rounded-lg overflow-hidden ring-1 ring-slate-200/50 transition-all duration-300 group-hover:shadow-2xl group-hover:ring-primary/20" style={{ height: '500px', position: 'relative' }}>
                    <iframe
                      srcDoc={preview.html}
                      className="border-0"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%) scale(0.48)',
                        transformOrigin: 'top center',
                        width: '8.5in',
                        height: '1042px',
                        display: 'block',
                        overflow: 'hidden',
                      }}
                      title={`Preview: ${preview.templateName}`}
                      sandbox="allow-same-origin allow-scripts"
                      scrolling="no"
                    />
                  </div>
                  {/* Full Size Button */}
                  <Button
                    size="sm"
                    className="absolute top-7 right-7 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl backdrop-blur-sm bg-white/95 hover:bg-white border-2 border-slate-200 hover:border-primary/50 z-10 font-semibold group-hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullScreenPreview(index);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1.5 text-primary" />
                    <span className="text-slate-700">View Full Size</span>
                  </Button>
                </div>

                {/* Apply Button */}
                <div className="relative p-5 border-t bg-gradient-to-br from-white via-slate-50/30 to-white">
                  <Button
                    className={`w-full transition-all duration-300 font-bold text-sm py-6 rounded-xl shadow-md hover:shadow-xl ${
                      selectedPreview === index
                        ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary scale-[1.02] shadow-primary/30'
                        : 'hover:scale-[1.02] border-2'
                    }`}
                    variant={selectedPreview === index ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDesign(preview.html, preview.templateName);
                      onClose();
                    }}
                  >
                    {selectedPreview === index ? (
                      <>
                        <Check className="w-5 h-5 mr-2 stroke-[2.5]" />
                        Apply This Design
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Select Design
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && previews.length > 0 && (
          <div className="flex items-center justify-between px-8 py-4 border-t bg-gradient-to-r from-white via-slate-50/50 to-white shrink-0 shadow-inner">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
              <p className="text-sm text-slate-600 font-medium">
                All designs use your resume content with different layouts and styles
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-2 hover:border-primary/50 font-semibold transition-all duration-200 hover:scale-105"
            >
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>

      {/* Full Screen Preview Dialog */}
      {fullScreenPreview !== null && (
        <Dialog open={true} onOpenChange={() => setFullScreenPreview(null)}>
          <DialogContent className="max-w-[95vw] w-[900px] max-h-[95vh] p-0 overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
            <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-white via-slate-50/50 to-white shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="font-bold text-xl text-slate-900">
                  {previews[fullScreenPreview]?.templateName}
                  <span className="text-slate-500 font-normal ml-2">- Full Preview</span>
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-slate-100/80 transition-all duration-200 rounded-lg"
                onClick={() => setFullScreenPreview(null)}
              >
                <X className="w-5 h-5 text-slate-600" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
              <div className="bg-white shadow-2xl mx-auto max-w-[8.5in] rounded-lg overflow-hidden ring-1 ring-slate-200/50">
                <iframe
                  srcDoc={previews[fullScreenPreview]?.html}
                  className="w-full border-0"
                  style={{ height: '11in' }}
                  title="Full Size Preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gradient-to-r from-white via-slate-50/50 to-white shrink-0 shadow-inner">
              <Button
                variant="outline"
                onClick={() => setFullScreenPreview(null)}
                className="border-2 hover:border-primary/50 font-semibold transition-all duration-200 hover:scale-105"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  const preview = previews[fullScreenPreview];
                  onSelectDesign(preview.html, preview.templateName);
                  setFullScreenPreview(null);
                  onClose();
                }}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary font-bold shadow-lg shadow-primary/30 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply This Design
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
