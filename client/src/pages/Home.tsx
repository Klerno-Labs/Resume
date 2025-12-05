import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Zap, Award, FileText, Download, Wand2 } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { PricingModal } from "@/components/PricingModal";
import heroBg from "@assets/generated_images/abstract_minimalist_tech_background_with_soft_geometric_shapes_in_white_and_light_gray..png";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">R</div>
            <span className="font-display font-bold text-xl tracking-tight">ResumeRepairer.ai</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-primary transition-colors">Success Stories</a>
          </div>
          <div className="flex gap-4">
            <Link href="/auth">
              <button className="text-sm font-medium hover:text-primary transition-colors">Log in</button>
            </Link>
            <Link href="/auth">
              <button className="bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium hover:bg-primary hover:text-white transition-all shadow-lg hover:shadow-primary/25" data-testid="button-get-started">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src={heroBg} 
            alt="Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background"></div>
        </div>

        <div className="container relative z-10 px-4 mx-auto max-w-7xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            New: GPT-4o Analysis Engine
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground mb-6 max-w-4xl mx-auto leading-tight">
            Pass the ATS check.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-600">Land the interview.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            Instant AI resume repair. We fix formatting, rewrite weak bullets into quantifiable achievements, and optimize for ATS algorithms in seconds.
          </p>

          <div className="max-w-2xl mx-auto bg-card/50 backdrop-blur-sm p-2 rounded-2xl border shadow-2xl">
            <div className="bg-card rounded-xl p-8 border shadow-sm">
              <FileUpload />
            </div>
          </div>

          <div className="mt-12 flex justify-center gap-8 grayscale opacity-60">
            {/* Mock Logos */}
            <span className="font-display font-bold text-xl">Google</span>
            <span className="font-display font-bold text-xl">Microsoft</span>
            <span className="font-display font-bold text-xl">Uber</span>
            <span className="font-display font-bold text-xl">Airbnb</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-secondary/30">
        <div className="container px-4 mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Why resumes fail (and how we fix them)</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Most qualified candidates get rejected by robots before a human ever sees their application.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-6 h-6 text-yellow-500" />,
                title: "Instant Optimization",
                desc: "We rewrite passive language into strong, active voice bullets that highlight your impact."
              },
              {
                icon: <Award className="w-6 h-6 text-primary" />,
                title: "ATS Compliance",
                desc: "Our formatting engine ensures your resume is readable by all major Applicant Tracking Systems."
              },
              {
                icon: <CheckCircle2 className="w-6 h-6 text-green-500" />,
                title: "Score & Improve",
                desc: "Get a detailed score report with actionable feedback on 20+ key hiring factors."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-background border flex items-center justify-center mb-6 shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container px-4 mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground">Invest in your career for less than the cost of lunch.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic */}
            <div className="p-8 rounded-2xl border bg-card flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Basic</h3>
                <div className="text-3xl font-bold mt-2">$7</div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> 1 Resume Optimization</li>
                <li className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> PDF & DOCX Export</li>
                <li className="flex gap-2 text-sm text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-muted" /> ATS Report</li>
              </ul>
              <PricingModal 
                defaultPlan="basic"
                trigger={<button className="w-full py-2.5 rounded-lg border font-medium hover:bg-secondary transition-colors">Choose Basic</button>}
              />
            </div>

            {/* Pro */}
            <div className="p-8 rounded-2xl border-2 border-primary bg-card relative flex flex-col shadow-xl scale-105 z-10">
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">MOST POPULAR</div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-primary">Pro</h3>
                <div className="text-3xl font-bold mt-2">$19</div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> 3 Resume Optimizations</li>
                <li className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> PDF & DOCX Export</li>
                <li className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Detailed ATS Report</li>
                <li className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Keyword Optimization</li>
              </ul>
              <PricingModal 
                defaultPlan="pro"
                trigger={<button className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25">Choose Pro</button>}
              />
            </div>

            {/* Premium */}
            <div className="p-8 rounded-2xl border bg-card flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Premium</h3>
                <div className="text-3xl font-bold mt-2">$29</div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Unlimited Optimizations</li>
                <li className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> AI Cover Letters</li>
                <li className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> LinkedIn Profile Rewrite</li>
                <li className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Priority Support</li>
              </ul>
              <PricingModal 
                defaultPlan="premium"
                trigger={<button className="w-full py-2.5 rounded-lg border font-medium hover:bg-secondary transition-colors">Choose Premium</button>}
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 bg-slate-950 text-slate-400 text-sm">
        <div className="container px-4 mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>© 2025 ResumeRepairer.ai</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
