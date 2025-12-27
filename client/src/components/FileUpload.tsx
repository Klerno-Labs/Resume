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
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <motion.div
                  className="relative w-24 h-24 mb-6"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 opacity-20 blur-xl"></div>
                  <div className="relative w-full h-full rounded-2xl bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <Upload className="w-12 h-12 text-white" />
                  </div>
                </motion.div>
                <h3 className="text-2xl font-bold bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Upload Your Resume
                </h3>
                <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
                  Drag and drop your file here, or click to browse
                </p>
                <motion.div
                  className="mt-6 flex flex-col gap-3 text-xs"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1,
                      },
                    },
                  }}
                >
                  {[
                    'PDF, DOCX, DOC, or TXT (max 10MB)',
                    'Get instant ATS score and AI optimization',
                    '100% secure and confidential',
                  ].map((text, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-green-50 to-emerald-50 border border-green-200"
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 },
                      }}
                    >
                      <div className="w-5 h-5 rounded-full bg-linear-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-slate-700 font-medium">{text}</span>
                    </motion.div>
                  ))}
                </motion.div>
                <motion.div
                  className="mt-8"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold text-white bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    Or browse files
                  </span>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="processing-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 rounded-full bg-linear-to-br from-green-500 via-emerald-500 to-teal-500 opacity-20 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-green-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-linear-to-r from-green-500 via-emerald-500 to-teal-500 border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-10 h-10 text-green-600 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold bg-linear-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Uploading...
                </h3>
                <p className="text-sm text-slate-600 mt-2 max-w-xs font-medium">{file.name}</p>
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

      <motion.div
        className="flex justify-center gap-4 mt-8 text-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        {[
          { label: 'ATS Friendly', color: 'from-blue-500 to-blue-600' },
          { label: 'Secure & Private', color: 'from-purple-500 to-purple-600' },
          { label: 'Instant Analysis', color: 'from-pink-500 to-pink-600' },
        ].map((badge, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border-2 border-slate-200 shadow-sm"
          >
            <div className={`w-4 h-4 rounded-full bg-linear-to-br ${badge.color} flex items-center justify-center shrink-0`}>
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="font-medium text-slate-700">{badge.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
