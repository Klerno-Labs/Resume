import { Link } from "wouter";
import { CheckCircle2, Zap, Award, LogOut, User } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { PricingModal } from "@/components/PricingModal";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { api, type Resume } from "@/lib/api";
import BeforeAfter from "@/components/BeforeAfter";
import heroBg from "@assets/generated_images/abstract_minimalist_tech_background_with_soft_geometric_shapes_in_white_and_light_gray..png";

export default function Home() {
  const { user, logout } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loadingResumeId, setLoadingResumeId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function pollResume(id: string) {
      // poll until status is not processing
      for (let i = 0; i < 20 && mounted; i++) {
        try {
          const r = await api.getResume(id);
          setResume(r);
          if (r.status && r.status !== "processing") {
            setLoadingResumeId(null);
            break;
          }
        } catch (_err) {
          // ignore transient errors
        }
        await new Promise((res) => setTimeout(res, 1500));
      }
    }

    if (loadingResumeId) void pollResume(loadingResumeId);
    return () => { mounted = false; };
  }, [loadingResumeId]);

  return (
    <div className="min-h-screen bg-background font-sans">
      
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto max-w-7xl">
          <div className="flex items-center gap-2">
            <img src="/rewritemelogo.png" alt="RewriteMe" className="h-20 w-auto" />
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="/ai-resume-builder" className="hover:text-primary transition-colors">AI Builder</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-primary transition-colors">Success Stories</a>
          </div>
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{user.email}</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {user.creditsRemaining} credits
                  </span>
                </div>
                <Link href="/editor">
                  <button className="text-sm font-medium hover:text-primary transition-colors">Dashboard</button>
                </Link>
                <button 
                  onClick={() => logout()}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth">
                  <button className="text-sm font-medium hover:text-primary transition-colors">Log in</button>
                </Link>
                <Link href="/auth">
                  <button className="bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium hover:bg-primary hover:text-white transition-all shadow-lg hover:shadow-primary/25" data-testid="button-get-started">
                    Get Started
                  </button>
                </Link>
              </>
            )}
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
              <FileUpload onUpload={(file, resumeId) => {
                // show quick preview while redirect still happens
                setLoadingResumeId(resumeId);
              }} />
            </div>
          </div>

          {/* Quick result preview shown after upload */}
          {resume ? (
            resume.status === "processing" ? (
              <div className="mt-6 text-sm text-muted-foreground">Processing your resume — final results will be ready shortly. You can continue in the dashboard.</div>
            ) : (
              <BeforeAfter resume={resume} />
            )
          ) : null}

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

      {/* How It Works */}
      <section className="py-24 bg-secondary/20">
        <div className="container px-4 mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Transform your resume in three simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-xl font-bold mb-2">Upload Resume</h3>
              <p className="text-muted-foreground">Upload your current resume in PDF, DOCX, or paste text directly</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-xl font-bold mb-2">AI Analysis</h3>
              <p className="text-muted-foreground">Our AI scans for ATS compatibility, keywords, and formatting issues</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-xl font-bold mb-2">Download & Apply</h3>
              <p className="text-muted-foreground">Get your optimized resume and start landing more interviews</p>
            </div>
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

      {/* FAQ Section with Schema.org markup */}
      <section id="faq" className="py-24 bg-secondary/20">
        <div className="container px-4 mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about optimizing your resume</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What is an ATS resume checker?",
                a: "An ATS (Applicant Tracking System) resume checker analyzes your resume to ensure it can be properly read by the automated systems that 98% of Fortune 500 companies use to screen applicants. Our AI checks formatting, keywords, and structure to maximize your chances of passing ATS screening."
              },
              {
                q: "How does AI resume optimization work?",
                a: "Our AI analyzes your resume content and rewrites weak bullets using strong action verbs and quantifiable achievements. It identifies missing keywords, fixes formatting issues, and restructures your content to highlight your impact and skills that match job requirements."
              },
              {
                q: "Is the ATS checker really free?",
                a: "Yes! Every new user gets 1 free credit to test our resume optimizer. You can upload your resume, get a complete ATS compatibility score, and see detailed feedback on what to improve - completely free."
              },
              {
                q: "What file formats do you support?",
                a: "We support PDF, DOCX (Microsoft Word), and plain text. You can also paste your resume text directly into our editor. After optimization, you can download your improved resume in both PDF and DOCX formats."
              },
              {
                q: "How long does resume optimization take?",
                a: "Our AI processes your resume in 30-60 seconds. You'll get instant ATS scoring, keyword analysis, and a completely rewritten version optimized for applicant tracking systems and hiring managers."
              },
              {
                q: "Will this work for my industry?",
                a: "Yes! Our AI is trained on resumes across all industries - tech, healthcare, finance, marketing, engineering, and more. It adapts its recommendations based on your field and the specific terminology used in your industry."
              },
              {
                q: "What makes your resume optimizer better than others?",
                a: "Unlike basic ATS checkers, we don't just scan - we rewrite. Our GPT-4 powered AI completely transforms weak content into compelling, achievement-focused bullets. Plus, we provide actionable feedback on formatting, keywords, and specific improvements."
              },
              {
                q: "Can I use this for multiple job applications?",
                a: "Absolutely! With our Pro and Premium plans, you can optimize your resume multiple times. We recommend tailoring your resume for each application by adjusting keywords and achievements to match specific job descriptions."
              }
            ].map((faq, i) => (
              <details key={i} className="group bg-card border rounded-xl p-6 hover:shadow-md transition-shadow">
                <summary className="flex justify-between items-center cursor-pointer list-none font-semibold text-lg">
                  <span>{faq.q}</span>
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-muted-foreground leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>

          {/* Schema.org FAQ Markup */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is an ATS resume checker?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "An ATS (Applicant Tracking System) resume checker analyzes your resume to ensure it can be properly read by the automated systems that 98% of Fortune 500 companies use to screen applicants. Our AI checks formatting, keywords, and structure to maximize your chances of passing ATS screening."
                }
              },
              {
                "@type": "Question",
                "name": "How does AI resume optimization work?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our AI analyzes your resume content and rewrites weak bullets using strong action verbs and quantifiable achievements. It identifies missing keywords, fixes formatting issues, and restructures your content to highlight your impact and skills that match job requirements."
                }
              },
              {
                "@type": "Question",
                "name": "Is the ATS checker really free?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Every new user gets 1 free credit to test our resume optimizer. You can upload your resume, get a complete ATS compatibility score, and see detailed feedback on what to improve - completely free."
                }
              },
              {
                "@type": "Question",
                "name": "What file formats do you support?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "We support PDF, DOCX (Microsoft Word), and plain text. You can also paste your resume text directly into our editor. After optimization, you can download your improved resume in both PDF and DOCX formats."
                }
              },
              {
                "@type": "Question",
                "name": "How long does resume optimization take?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our AI processes your resume in 30-60 seconds. You'll get instant ATS scoring, keyword analysis, and a completely rewritten version optimized for applicant tracking systems and hiring managers."
                }
              },
              {
                "@type": "Question",
                "name": "Will this work for my industry?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Our AI is trained on resumes across all industries - tech, healthcare, finance, marketing, engineering, and more. It adapts its recommendations based on your field and the specific terminology used in your industry."
                }
              },
              {
                "@type": "Question",
                "name": "What makes your resume optimizer better than others?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Unlike basic ATS checkers, we don't just scan - we rewrite. Our GPT-4 powered AI completely transforms weak content into compelling, achievement-focused bullets. Plus, we provide actionable feedback on formatting, keywords, and specific improvements."
                }
              },
              {
                "@type": "Question",
                "name": "Can I use this for multiple job applications?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Absolutely! With our Pro and Premium plans, you can optimize your resume multiple times. We recommend tailoring your resume for each application by adjusting keywords and achievements to match specific job descriptions."
                }
              }
            ]
          })}} />
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="container px-4 mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Success Stories</h2>
            <p className="text-muted-foreground">Real results from real job seekers</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Chen",
                role: "Software Engineer at Google",
                text: "After optimizing my resume with RewriteMe, I went from 0 responses to 5 interviews in 2 weeks. The ATS formatting made all the difference.",
                rating: 5
              },
              {
                name: "Marcus Johnson",
                role: "Marketing Manager",
                text: "The AI rewrites were incredible. My bullets went from boring tasks to achievement-focused results. Got a 30% salary increase at my new role.",
                rating: 5
              },
              {
                name: "Priya Patel",
                role: "Data Analyst",
                text: "I was skeptical about AI resume tools, but this is different. It actually understands context and writes naturally. Worth every penny.",
                rating: 5
              }
            ].map((testimonial, i) => (
              <div key={i} className="bg-card p-6 rounded-2xl border shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-500">★</span>
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">"{testimonial.text}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            ))}
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
