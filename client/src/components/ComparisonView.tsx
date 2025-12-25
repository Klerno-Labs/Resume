import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { ResumePreview } from './ResumePreview';
import { Button } from './ui/button';

interface ComparisonViewProps {
  originalText: string;
  improvedText: string;
  improvedHtml?: string;
  requiresUpgrade?: boolean;
  onUpgradeClick?: () => void;
}

export function ComparisonView({ originalText, improvedText, improvedHtml, requiresUpgrade, onUpgradeClick }: ComparisonViewProps) {
  return (
    <div className={`grid grid-cols-1 ${improvedHtml ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 h-full`}>
      {/* Original Pane */}
      <div className="flex flex-col h-[650px] bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Original Resume
          </h3>
          <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded-full">
            Before
          </span>
        </div>
        <ScrollArea className="flex-1 bg-slate-50 dark:bg-slate-900">
          <div className="p-6" data-testid="text-original">
            <div className="bg-white dark:bg-slate-950 rounded-lg shadow-sm border p-6 min-h-[500px]">
              <ResumePreview text={originalText} />
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Improved Pane */}
      <div className="flex flex-col h-[650px] bg-card border-2 border-primary/30 rounded-xl shadow-xl overflow-hidden relative">
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-linear-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            AI OPTIMIZED
          </div>
        </div>
        <div className="p-4 bg-linear-to-r from-primary/10 to-primary/5 border-b border-primary/20 flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-primary">
            Improved Version
          </h3>
          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
            After
          </span>
        </div>
        <ScrollArea className="flex-1 bg-linear-to-b from-primary/5 to-transparent">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6"
            data-testid="text-improved"
          >
            <div className="bg-white dark:bg-slate-950 rounded-lg shadow-lg border-2 border-primary/10 p-6 min-h-[500px] ring-4 ring-primary/5 relative">
              {requiresUpgrade ? (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                  <Lock className="w-16 h-16 text-primary mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Unlock Your Optimized Resume</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Your free assessment is complete! Upgrade to access your professionally optimized resume text.
                  </p>
                  <Button onClick={onUpgradeClick} size="lg" className="bg-linear-to-r from-primary to-primary/80">
                    Upgrade Now
                  </Button>
                </div>
              ) : null}
              <ResumePreview text={improvedText} />
            </div>
          </motion.div>
        </ScrollArea>
      </div>

      {/* AI Design Pane - Only show if HTML design exists */}
      {improvedHtml && (
        <div className="flex flex-col h-[650px] bg-card border-2 border-purple-500/30 rounded-xl shadow-xl overflow-hidden relative">
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              AI DESIGN
            </div>
          </div>
          <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/5 border-b border-purple-500/20 flex items-center justify-between">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-purple-600">
              Professional Design
            </h3>
            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded-full">
              2-Column
            </span>
          </div>
          <ScrollArea className="flex-1 bg-gradient-to-b from-purple-500/5 to-transparent">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6"
            >
              <div className="bg-white rounded-lg shadow-lg border-2 border-purple-500/10 overflow-hidden ring-4 ring-purple-500/5">
                {requiresUpgrade ? (
                  <div className="h-[500px] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Lock className="w-16 h-16 text-purple-500 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Unlock AI Design</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Upgrade to access your professionally designed 2-column resume template.
                    </p>
                    <Button onClick={onUpgradeClick} size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500">
                      Upgrade Now
                    </Button>
                  </div>
                ) : (
                  <iframe
                    srcDoc={improvedHtml}
                    className="w-full h-[500px] border-0"
                    title="AI-Generated Resume Design"
                    sandbox="allow-same-origin"
                  />
                )}
              </div>
            </motion.div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
