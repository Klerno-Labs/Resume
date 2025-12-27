import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Check } from 'lucide-react';
import { useLocation } from 'wouter';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onUpload?: (file: File, resumeId: string) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.ms-word',
      'text/plain',
      'application/zip',
      'application/x-zip',
      'application/octet-stream',
    ];

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return {
        valid: false,
        error: `Invalid file type. Please upload PDF, DOCX, DOC, or TXT files.`,
      };
    }

    // Check MIME type (if available)
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      // Extension is valid but MIME type doesn't match - could be a renamed file
      console.warn(`MIME type mismatch: ${file.type} for ${fileName}`);
    }

    return { valid: true };
  }, []);

  const processFile = useCallback(
    async (uploadedFile: File) => {
      // Client-side guard for legacy .doc files (older Word format)
      const lowerName = (uploadedFile.name || '').toLowerCase();
      const isLegacyDoc = lowerName.endsWith('.doc') || uploadedFile.type === 'application/msword';
      if (isLegacyDoc) {
        toast({
          title: 'Unsupported file type',
          description: 'Legacy .doc files are not supported. Please convert to .docx or PDF and try again.',
          variant: 'destructive',
        });
        return;
      }

      if (!user) {
        setLocation('/auth');
        return;
      }

      // Validate file before upload
      const validation = validateFile(uploadedFile);
      if (!validation.valid) {
        toast({
          title: 'Invalid file',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }

      setFile(uploadedFile);
      setProgress(0);
      setErrorMessage(null);

      const ac = new AbortController();
      setController(ac);

      // show uploading toast
      const toastHandle = toast({ title: 'Uploading...', description: '0%', duration: 100000 });

      try {
        const result = await api.uploadResume(
          uploadedFile,
          (percent) => {
            setProgress(percent);
            try {
              toastHandle.update({ id: toastHandle.id, description: `${percent}%` });
            } catch {
              // Ignore toast update errors
            }
          },
          ac.signal
        );

        // Handle duplicate detection response
        if (result.isDuplicate) {
          setFile(null);
          setProgress(null);
          toast({
            title: 'Duplicate Resume Detected',
            description:
              "You've already uploaded this exact resume. Please upload a different file or modify your current resume to try again.",
            variant: 'destructive',
            duration: 5000,
          });
          return;
        }

        // Normal flow for new uploads
        // Immediate redirect for faster UX - database write is async
        if (onUpload) onUpload(uploadedFile, result.resumeId);
        setLocation(`/editor?resumeId=${result.resumeId}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to upload file';
        setErrorMessage(msg);
        toastHandle.update({ id: toastHandle.id, title: 'Upload failed', description: msg });
        toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
        setFile(null);
        setProgress(null);
      }
      finally {
        try {
          toastHandle.dismiss();
        } catch {
          // Ignore toast dismiss errors
        }
        setController(null);
      }
    },
    [user, setLocation, validateFile, toast, onUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        void processFile(droppedFile);
      }
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];
        void processFile(selectedFile);
      }
    },
    [processFile]
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <motion.div
        layout
        className={`
          relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 ease-out
          ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }
          ${file ? 'bg-green-50 border-green-200' : 'bg-background'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
          onChange={handleFileChange}
          accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
          data-testid="input-file-upload"
          aria-label="Upload resume file (PDF, DOCX, DOC, or TXT)"
          title="Click to select or drag and drop your resume"
        />

        <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-80">
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
                <h3 className="text-xl font-semibold text-foreground">Upload Your Resume</h3>
                <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
                  Drag and drop your file here, or click to browse
                </p>
                <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>PDF, DOCX, DOC, or TXT (max 10MB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Get instant ATS score and AI optimization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>100% secure and confidential</span>
                  </div>
                </div>
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
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-green-700">Uploading...</h3>
                <p className="text-sm text-green-600 mt-2 max-w-xs">{file.name}</p>
                {progress !== null && (
                  <div className="w-full max-w-xs mt-4">
                    <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-linear-to-r from-green-500 to-emerald-500 h-2.5 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        {progress < 50 ? 'Uploading...' : progress < 90 ? 'Processing...' : 'Almost done...'}
                      </span>
                      <span className="text-xs font-medium text-green-600">{progress}%</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      {controller && (
                        <button
                          className="px-3 py-1 text-xs rounded bg-red-50 text-red-700"
                          onClick={() => {
                            controller.abort();
                            setFile(null);
                            setProgress(null);
                            toast({ title: 'Upload cancelled', description: 'The upload was cancelled.' });
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      {errorMessage && (
                        <button
                          className="px-3 py-1 text-xs rounded bg-primary/10 text-primary"
                          onClick={() => {
                            // retry
                            setErrorMessage(null);
                            if (file) void processFile(file);
                          }}
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
