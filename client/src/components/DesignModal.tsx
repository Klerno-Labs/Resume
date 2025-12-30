import { X, Check, Download, FileCode, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface DesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  onChooseDesign: () => void;
  isSelected?: boolean;
  userTier?: 'free' | 'premium' | 'pro' | 'admin';
  onUpgradeClick?: () => void;
}

export function DesignModal({
  isOpen,
  onClose,
  htmlContent,
  onChooseDesign,
  isSelected = false,
  userTier = 'free',
  onUpgradeClick
}: DesignModalProps) {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateStyle, setTemplateStyle] = useState<'modern' | 'classic' | 'creative' | 'minimal'>('modern');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || !templateDescription.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await api.saveTemplate({
        name: templateName.trim(),
        style: templateStyle,
        description: templateDescription.trim(),
        htmlContent,
        isPublic: true,
      });

      toast({
        title: 'Template saved!',
        description: `Your template "${result.template.name}" has been saved successfully. Personal information has been removed for privacy.`,
      });

      setIsSaveDialogOpen(false);
      setTemplateName('');
      setTemplateDescription('');
    } catch (error) {
      toast({
        title: 'Failed to save template',
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadHTML = () => {
    if (userTier === 'free') {
      onUpgradeClick?.();
      return;
    }

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "Your resume HTML has been downloaded.",
    });
  };

  const handleDownloadPDF = () => {
    if (userTier === 'free') {
      onUpgradeClick?.();
      return;
    }

    toast({
      title: "Generating PDF...",
      description: "This may take a few seconds.",
    });

    // Use existing PDF export functionality
    try {
      const iframe = document.querySelector('iframe[title="Resume Design Preview"]') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "PDF Export",
        description: "Use your browser's Print function (Ctrl/Cmd + P) and select 'Save as PDF'",
        variant: "default",
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-[90vw] h-[90vh] max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-linear-to-r from-purple-50 to-pink-50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <h2 className="text-xl font-bold text-gray-900">AI-Generated Resume Design</h2>
                {isSelected && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isSelected ? (
                  <Button
                    onClick={onChooseDesign}
                    className="bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Choose This Design
                  </Button>
                ) : (
                  <span className="text-sm text-gray-600 font-medium">This is your active design</span>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Resume Preview */}
            <div className="flex-1 overflow-auto bg-gray-50 p-8">
              <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
                <iframe
                  srcDoc={htmlContent}
                  className="w-full min-h-[842px] border-0"
                  title="Resume Design Preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Tip:</span> This 2-column gradient design is ATS-friendly and professional
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsSaveDialogOpen(true)}
                  className="flex items-center gap-2 border-purple-200 hover:bg-purple-50"
                  disabled={userTier === 'free'}
                  title={userTier === 'free' ? 'Premium feature' : 'Save this design as a reusable template'}
                >
                  <Save className="w-4 h-4" />
                  Save as Template
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadHTML}
                  className="flex items-center gap-2"
                >
                  <FileCode className="w-4 h-4" />
                  Download HTML
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close Preview
                </Button>
                {!isSelected && (
                  <Button
                    onClick={onChooseDesign}
                    className="bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Choose This Design
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Save Template Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Save className="w-4 h-4 text-white" />
              </div>
              Save as Template
            </DialogTitle>
            <DialogDescription>
              Save this design as a reusable template. Your personal information will be automatically removed for privacy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="e.g., Modern Purple Gradient"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-style">Style *</Label>
              <Select value={templateStyle} onValueChange={(value) => setTemplateStyle(value as typeof templateStyle)}>
                <SelectTrigger className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description *</Label>
              <Textarea
                id="template-description"
                placeholder="Describe this template's unique features..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                className="h-24 resize-none border-2"
              />
            </div>

            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-xs text-purple-700 flex items-start gap-2">
                <Save className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Your resume data will be sanitized automatically. Names, emails, phone numbers, and other personal info will be replaced with placeholder data (John Doe, etc.) to protect your privacy.</span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveAsTemplate()}
              disabled={isSaving || !templateName.trim() || !templateDescription.trim()}
              className="bg-linear-to-r from-purple-500 to-pink-500 hover:opacity-90"
            >
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}
