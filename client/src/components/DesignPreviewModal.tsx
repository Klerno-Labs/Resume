import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check, AlertCircle } from 'lucide-react';

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
}

interface DesignPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previews: DesignPreview[];
  onSelectDesign: (html: string, templateName: string) => void;
}

export function DesignPreviewModal({
  isOpen,
  onClose,
  previews,
  onSelectDesign,
}: DesignPreviewModalProps) {
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] p-0 overflow-hidden flex flex-col bg-gray-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
          <div>
            <DialogTitle className="font-semibold text-xl">Choose Your Design</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Select from 3 unique professional designs
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {previews.map((preview, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-lg border-2 transition-all cursor-pointer hover:shadow-xl ${
                  selectedPreview === index
                    ? 'border-primary shadow-xl ring-2 ring-primary/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPreview(index)}
              >
                {/* Template Info Header */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">
                        {preview.templateName}
                      </h4>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {preview.templateStyle}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          {preview.layout}
                        </span>
                      </div>
                    </div>
                    {selectedPreview === index && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Contrast Validation Badge */}
                  {preview.contrastPassed ? (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                      <Check className="w-3 h-3" />
                      <span>WCAG AA Compliant</span>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                      <AlertCircle className="w-3 h-3" />
                      <span>
                        {preview.contrastSummary.failedAA} contrast warning(s)
                      </span>
                    </div>
                  )}
                </div>

                {/* Preview Iframe */}
                <div className="p-4 bg-gray-100">
                  <div className="bg-white shadow-md overflow-hidden">
                    <iframe
                      srcDoc={preview.html}
                      className="w-full border-0"
                      style={{
                        transform: 'scale(0.35)',
                        transformOrigin: 'top left',
                        width: '285%',
                        height: '600px',
                      }}
                      title={`Preview: ${preview.templateName}`}
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>

                {/* Apply Button */}
                <div className="p-4 border-t">
                  <Button
                    className="w-full"
                    variant={selectedPreview === index ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDesign(preview.html, preview.templateName);
                      onClose();
                    }}
                  >
                    {selectedPreview === index ? 'Apply This Design' : 'Select'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-white shrink-0">
          <p className="text-xs text-muted-foreground">
            All designs use your resume content with different layouts and styles
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
