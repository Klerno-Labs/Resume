import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

interface ComparisonViewProps {
  originalText: string;
  improvedText: string;
}

export function ComparisonView({ originalText, improvedText }: ComparisonViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Original Pane */}
      <div className="flex flex-col h-[600px] bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Original Resume</h3>
          <span className="text-xs text-red-500 font-medium">Detected 12 issues</span>
        </div>
        <ScrollArea className="flex-1 p-6 bg-white dark:bg-slate-950 font-mono text-sm leading-relaxed">
          <div className="whitespace-pre-wrap text-muted-foreground" data-testid="text-original">
            {originalText}
          </div>
        </ScrollArea>
      </div>

      {/* Improved Pane */}
      <div className="flex flex-col h-[600px] bg-card border border-primary/20 rounded-xl shadow-lg ring-4 ring-primary/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-2 z-10">
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            AI OPTIMIZED
          </div>
        </div>
        <div className="p-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-primary">Improved Version</h3>
          <span className="text-xs text-green-600 font-medium">Ready to download</span>
        </div>
        <ScrollArea className="flex-1 p-6 bg-white dark:bg-slate-950 font-mono text-sm leading-relaxed">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.5 }}
            className="whitespace-pre-wrap text-foreground"
            data-testid="text-improved"
          >
            {improvedText.split('\n').map((line, i) => {
               // Simple mock logic to highlight changes
               const isChanged = !originalText.includes(line);
               return (
                 <div key={i} className={`${isChanged ? 'bg-green-50 dark:bg-green-900/20 px-1 -mx-1 rounded border-l-2 border-green-400 pl-3 my-1' : 'my-0.5'}`}>
                   {line}
                 </div>
               )
            })}
          </motion.div>
        </ScrollArea>
      </div>
    </div>
  );
}
