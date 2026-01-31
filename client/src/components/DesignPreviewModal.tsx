import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check, AlertCircle, Loader2, FileX, Maximize2 } from 'lucide-react';

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
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] p-0 overflow-hidden flex flex-col bg-gray-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
          <div>
            <DialogTitle className="font-semibold text-xl">Choose Your Design</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isLoading ? 'Generating unique designs...' : 'Select from 3 unique professional designs'}
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Preview Grid */}
        <div className="flex-1 overflow-auto p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generating Your Designs</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Creating 3 unique professional layouts with optimized colors and typography...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Failed to Generate Designs</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">{error}</p>
              <Button onClick={onClose} variant="outline">
                Close and Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {hasNoPreviews && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileX className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Designs Available</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Please try generating designs again.
              </p>
            </div>
          )}

          {/* Previews Grid */}
          {!isLoading && !error && previews.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {previews.map((preview, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] ${
                  selectedPreview === index
                    ? 'border-primary shadow-xl ring-4 ring-primary/20 scale-[1.02]'
                    : 'border-gray-200 hover:border-primary/50'
                }`}
                onClick={() => setSelectedPreview(index)}
              >
                {/* Template Info Header */}
                <div className="p-4 border-b bg-gradient-to-br from-gray-50 to-white">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base mb-2">
                        {preview.templateName}
                      </h4>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                          {preview.templateStyle}
                        </span>
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                          {preview.layout}
                        </span>
                      </div>
                    </div>
                    {selectedPreview === index && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 animate-in zoom-in duration-200">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Validation Badges */}
                  <div className="flex flex-col gap-2">
                    {/* ATS Score Badge */}
                    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border font-medium ${
                      preview.atsScore >= 90 ? 'text-green-700 bg-green-50 border-green-200' :
                      preview.atsScore >= 80 ? 'text-blue-700 bg-blue-50 border-blue-200' :
                      preview.atsScore >= 70 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                      'text-red-700 bg-red-50 border-red-200'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                      <span>ATS Score: {preview.atsScore}%</span>
                    </div>

                    {/* Contrast Validation Badge */}
                    {preview.contrastPassed ? (
                      <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1.5 rounded-md border border-green-200">
                        <Check className="w-3.5 h-3.5" />
                        <span className="font-medium">WCAG AA Compliant</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {preview.contrastSummary.failedAA} contrast warning(s)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Iframe - Scaled thumbnail */}
                <div className="p-4 bg-gray-100 relative group">
                  <div className="bg-white shadow-md rounded-sm overflow-hidden" style={{ height: '500px', position: 'relative' }}>
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
                    variant="secondary"
                    className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullScreenPreview(index);
                    }}
                  >
                    <Maximize2 className="w-4 h-4 mr-1" />
                    View Full Size
                  </Button>
                </div>

                {/* Apply Button */}
                <div className="p-4 border-t bg-gray-50">
                  <Button
                    className="w-full transition-all duration-200"
                    variant={selectedPreview === index ? 'default' : 'outline'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDesign(preview.html, preview.templateName);
                      onClose();
                    }}
                  >
                    {selectedPreview === index ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Apply This Design
                      </>
                    ) : (
                      'Select Design'
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
          <div className="flex items-center justify-between px-6 py-3 border-t bg-white shrink-0">
            <p className="text-xs text-muted-foreground">
              All designs use your resume content with different layouts and styles
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>

      {/* Full Screen Preview Dialog */}
      {fullScreenPreview !== null && (
        <Dialog open={true} onOpenChange={() => setFullScreenPreview(null)}>
          <DialogContent className="max-w-[95vw] w-[900px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <DialogTitle className="font-semibold text-lg">
                {previews[fullScreenPreview]?.templateName} - Full Preview
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFullScreenPreview(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-100">
              <div className="bg-white shadow-lg mx-auto max-w-[8.5in]">
                <iframe
                  srcDoc={previews[fullScreenPreview]?.html}
                  className="w-full border-0"
                  style={{ height: '11in' }}
                  title="Full Size Preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t shrink-0">
              <Button variant="outline" onClick={() => setFullScreenPreview(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const preview = previews[fullScreenPreview];
                  onSelectDesign(preview.html, preview.templateName);
                  setFullScreenPreview(null);
                  onClose();
                }}
              >
                Apply This Design
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
