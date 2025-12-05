import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Download, RefreshCw, Wand2, Check, AlertTriangle, FileText } from "lucide-react";
import { AtsScore } from "@/components/AtsScore";
import { ComparisonView } from "@/components/ComparisonView";
import { CoverLetterDialog } from "@/components/CoverLetterDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { api, type Resume } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Mock Data
const MOCK_ORIGINAL = `Jane Doe
Software Engineer
San Francisco, CA

Experience:
Worked at Tech Corp from 2020 to Present.
- Did coding in React and Python.
- Helped with the team projects.
- Fixed bugs in the system.
- Made the website faster.

Education:
University of Technology
Computer Science Degree

Skills:
React, JavaScript, HTML, CSS`;

const MOCK_IMPROVED = `Jane Doe
Software Engineer
San Francisco, CA

Experience:
Senior Software Engineer | Tech Corp | 2020 – Present
- Spearheaded the migration of a legacy monolith to a microservices architecture using Python and React, reducing deployment time by 40%.
- Collaborated with cross-functional teams to deliver 5+ major product features, resulting in a 15% increase in user engagement.
- Resolved critical system bugs, improving application stability to 99.9% uptime.
- Optimized frontend performance, achieving a 50% reduction in page load times through code splitting and lazy loading.

Education:
Bachelor of Science in Computer Science
University of Technology | Graduated with Honors

Skills:
Frontend: React.js, TypeScript, HTML5, CSS3, Tailwind CSS
Backend: Python, Node.js, PostgreSQL
Tools: Git, Docker, AWS, Jira`;

export default function Editor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("resume");
  const [resume, setResume] = useState<Resume | null>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get("resumeId");
    
    if (!resumeId) {
      navigate("/");
      return;
    }

    // Poll for resume updates
    const fetchResume = async () => {
      try {
        const data = await api.getResume(resumeId);
        setResume(data);
        
        if (data.status === "processing") {
          setTimeout(fetchResume, 2000); // Poll every 2 seconds
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    fetchResume();
  }, [navigate]);

  const handleOptimize = () => {
    setIsProcessing(true);
    toast({
      title: "Optimizing Resume",
      description: "AI is rewriting your bullets for maximum impact...",
    });
    
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Optimization Complete",
        description: "Your resume score increased!",
      });
    }, 2000);
  };

  if (!resume) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading resume...</p>
        </div>
      </div>
    );
  }

  const isCompleted = resume.status === "completed";
  const originalText = resume.originalText || MOCK_ORIGINAL;
  const improvedText = resume.improvedText || (isCompleted ? MOCK_IMPROVED : "Processing...");
  const atsScore = resume.atsScore || 50;

  return (
    <div className="h-screen flex flex-col bg-background font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-white dark:bg-slate-950 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 hover:bg-secondary rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>
          <div className="flex flex-col">
            <h1 className="font-semibold text-sm">{resume.fileName}</h1>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
              {isCompleted ? "Optimized" : "Processing..."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CoverLetterDialog resumeId={resume.id} />
          <Button 
            size="sm" 
            className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            onClick={() => {
              toast({
                title: "Exporting PDF...",
                description: "Your download will start in a moment.",
              });
            }}
          >
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Tools */}
        <aside className="w-80 border-r bg-secondary/30 flex flex-col overflow-y-auto">
          <div className="p-6 border-b bg-white dark:bg-slate-950">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Performance</h2>
            <AtsScore score={atsScore} />
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Critical Issues ({resume.issues?.length || 0})
              </h3>
              <div className="space-y-2">
                {resume.issues?.slice(0, 3).map((issue, i) => (
                  <div key={i} className="p-3 bg-white dark:bg-slate-950 border rounded-lg text-sm shadow-sm">
                    <div className={`font-medium mb-1 ${issue.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`}>
                      {issue.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <p className="text-muted-foreground text-xs">{issue.message}</p>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-sm">No issues detected.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
               <Button 
                 className="w-full gap-2" 
                 onClick={handleOptimize} 
                 disabled={isProcessing}
                 data-testid="button-optimize"
               >
                 {isProcessing ? (
                   <RefreshCw className="w-4 h-4 animate-spin" />
                 ) : (
                   <Wand2 className="w-4 h-4" />
                 )}
                 {isProcessing ? "Optimizing..." : "Re-Optimize with AI"}
               </Button>
            </div>
          </div>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 flex flex-col bg-muted/20 relative">
           <div className="p-2 border-b bg-white dark:bg-slate-950 flex justify-center">
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="resume">Resume Editor</TabsTrigger>
                  <TabsTrigger value="preview">Print Preview</TabsTrigger>
                </TabsList>
              </Tabs>
           </div>

           <div className="flex-1 p-8 overflow-hidden">
             <Tabs value={activeTab} className="h-full">
               <TabsContent value="resume" className="h-full mt-0">
                 <ComparisonView originalText={originalText} improvedText={improvedText} />
               </TabsContent>
               <TabsContent value="preview" className="h-full mt-0 flex items-center justify-center">
                 <div className="bg-white shadow-2xl w-[595px] h-[842px] p-12 text-[10px] overflow-hidden border">
                    <pre className="font-sans whitespace-pre-wrap text-slate-800">
                      {improvedText}
                    </pre>
                 </div>
               </TabsContent>
             </Tabs>
           </div>
        </main>

      </div>
    </div>
  );
}
