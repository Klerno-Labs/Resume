import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Bot, Target, Zap, Shield, FileText, Users } from 'lucide-react';

export const metadata = {
  title: 'About',
  description: 'Meet Robert — the AI resume architect powering RewriteMe.',
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-navy pt-16">
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Hero */}
            <div className="text-center mb-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center mx-auto mb-6">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-6">
                Meet <span className="text-gradient">Robert</span>
              </h1>
              <p className="text-brand-muted text-lg leading-relaxed max-w-2xl mx-auto">
                Robert is the AI brain behind RewriteMe. He was built with one mission:
                help people land interviews by creating resumes that actually work —
                not just look good.
              </p>
            </div>

            {/* Story */}
            <div className="glass rounded-2xl p-8 mb-12">
              <h2 className="text-2xl font-display font-bold text-white mb-4">
                Why We Built RewriteMe
              </h2>
              <div className="text-brand-muted leading-relaxed space-y-4">
                <p>
                  We kept seeing the same problem: talented people getting rejected before
                  anyone even read their resume. Not because they weren&apos;t qualified,
                  but because their resume couldn&apos;t get past the ATS bots or catch
                  a recruiter&apos;s eye in the 6 seconds they spend scanning it.
                </p>
                <p>
                  Generic resume builders give you a pretty template and call it a day.
                  Robert is different. He reads your experience like a recruiter would,
                  rewrites your content with proven formulas, and optimizes every word
                  for both humans and machines.
                </p>
                <p>
                  The result? Resumes that score 95+ on ATS systems and actually get
                  callbacks.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {[
                { value: '10,000+', label: 'Resumes Built' },
                { value: '95+', label: 'Avg ATS Score' },
                { value: '5,000+', label: 'Users Hired' },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-display font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-brand-muted text-sm">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* What Robert Does */}
            <h2 className="text-2xl font-display font-bold text-white mb-8 text-center">
              What Robert Brings to the Table
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  icon: Target,
                  title: 'ATS Intelligence',
                  desc: 'Every resume is optimized to pass automated screening systems used by 99% of companies.',
                },
                {
                  icon: Zap,
                  title: 'Instant Processing',
                  desc: 'Upload your resume and get an optimized version in under 60 seconds.',
                },
                {
                  icon: Shield,
                  title: 'Data Security',
                  desc: 'Your resume data is encrypted and never shared. Delete anytime.',
                },
                {
                  icon: FileText,
                  title: 'Full Suite',
                  desc: 'Resumes, cover letters, job matching, and industry optimization — all in one place.',
                },
              ].map((item) => (
                <div key={item.title} className="glass rounded-2xl p-6">
                  <item.icon className="w-8 h-8 text-brand-accent-light mb-4" />
                  <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                  <p className="text-brand-muted text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
