import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';

interface DesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  onChooseDesign: () => void;
  isSelected?: boolean;
}

export function DesignModal({ isOpen, onClose, htmlContent, onChooseDesign, isSelected = false }: DesignModalProps) {
  if (!isOpen) return null;

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
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
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
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
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
                  sandbox="allow-same-origin"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Tip:</span> This 2-column gradient design is ATS-friendly and professional
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close Preview
                </Button>
                {!isSelected && (
                  <Button
                    onClick={onChooseDesign}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
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
    </AnimatePresence>
  );
}
