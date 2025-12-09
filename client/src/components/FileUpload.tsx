import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onUpload?: (file: File, resumeId: string) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      await processFile(droppedFile);
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      await processFile(selectedFile);
    }
  };

  const processFile = async (uploadedFile: File) => {
    if (!user) {
      setLocation("/auth");
      return;
    }

    setFile(uploadedFile);
    
    try {
      const result = await api.uploadResume(uploadedFile);
      if (onUpload) onUpload(uploadedFile, result.resumeId);

      // Wait a bit for UI then redirect
      setTimeout(() => {
        setLocation(`/editor?resumeId=${result.resumeId}`);
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setFile(null);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <motion.div
        layout
        className={`
          relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 ease-out
          ${isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-border hover:border-primary/50 hover:bg-secondary/50"
          }
          ${file ? "bg-green-50 border-green-200" : "bg-background"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
          onChange={handleFileChange}
          accept=".pdf,.docx,.doc,.txt"
          data-testid="input-file-upload"
        />

        <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[320px]">
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="upload-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Drop your resume here
                </h3>
                <p className="text-muted-foreground mt-2 max-w-xs">
                  Support for PDF, DOCX, DOC, and TXT files. We'll analyze it instantly.
                </p>
                <div className="mt-8">
                  <span className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                    Or browse files
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="processing-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-20 h-20 mb-6">
                  <svg className="animate-spin w-full h-full text-green-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-green-700">
                  Analyzing {file.name}
                </h3>
                <p className="text-green-600 mt-2">
                  Checking ATS compatibility...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="flex justify-center gap-6 mt-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>ATS Friendly</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>Secure & Private</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>Instant Analysis</span>
        </div>
      </div>
    </div>
  );
}
