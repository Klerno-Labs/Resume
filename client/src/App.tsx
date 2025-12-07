import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Editor from "@/pages/Editor";
import Auth from "@/pages/Auth";
import PaymentSuccess from "@/pages/PaymentSuccess";
import AiResumeBuilder from "@/pages/ai-resume-builder";
import ResumeSoftwareEngineer from "@/pages/resume/software-engineer";
import HowToOptimizeResumeForAts from "@/pages/how-to/optimize-resume-for-ats";

function Router() {
  const { restoreSession } = useAuth();

  // Restore session on mount and when returning from OAuth
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ai-resume-builder" component={AiResumeBuilder} />
      <Route path="/resume/software-engineer" component={ResumeSoftwareEngineer} />
      <Route path="/how-to/optimize-resume-for-ats" component={HowToOptimizeResumeForAts} />
      <Route path="/auth" component={Auth} />
      <Route path="/editor" component={Editor} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
