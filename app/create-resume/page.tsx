'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { motion } from 'framer-motion';
import { Plus, Trash2, Loader2, Bot, ArrowRight, ArrowLeft } from 'lucide-react';

interface Experience {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  degree: string;
  school: string;
  year: string;
}

type Step = 'personal' | 'experience' | 'education' | 'skills' | 'review';

export default function CreateResumePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    summary: '',
    experience: [{ title: '', company: '', startDate: '', endDate: '', description: '' }] as Experience[],
    education: [{ degree: '', school: '', year: '' }] as Education[],
    skills: [''],
    certifications: [''],
  });

  const steps: Step[] = ['personal', 'experience', 'education', 'skills', 'review'];
  const stepIndex = steps.indexOf(step);

  const next = () => setStep(steps[Math.min(stepIndex + 1, steps.length - 1)]);
  const prev = () => setStep(steps[Math.max(stepIndex - 1, 0)]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/resumes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          skills: form.skills.filter(Boolean),
          certifications: form.certifications.filter(Boolean),
          experience: form.experience.filter((e) => e.title),
          education: form.education.filter((e) => e.degree),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create');
      }
      const data = await res.json();
      router.push(`/editor/${data.resumeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy pt-16">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">Create Your Resume</h1>
          <p className="text-brand-muted text-sm">Fill in your details and Robert will optimize everything</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  i <= stepIndex ? 'bg-brand-accent text-white' : 'bg-white/10 text-brand-muted'
                }`}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-px ${i < stepIndex ? 'bg-brand-accent' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-2xl p-8">
          {/* Personal */}
          {step === 'personal' && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold mb-4">Personal Information</h2>
              <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
              <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <div>
                <label className="block text-sm text-brand-muted mb-1.5">Professional Summary</label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 resize-none"
                  placeholder="Brief overview of your professional background..."
                />
              </div>
            </div>
          )}

          {/* Experience */}
          {step === 'experience' && (
            <div className="space-y-6">
              <h2 className="text-white font-semibold">Work Experience</h2>
              {form.experience.map((exp, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-brand-muted text-xs">Position {i + 1}</span>
                    {form.experience.length > 1 && (
                      <button onClick={() => setForm({ ...form, experience: form.experience.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Input label="Job Title" value={exp.title} onChange={(v) => { const e = [...form.experience]; e[i] = { ...e[i], title: v }; setForm({ ...form, experience: e }); }} />
                  <Input label="Company" value={exp.company} onChange={(v) => { const e = [...form.experience]; e[i] = { ...e[i], company: v }; setForm({ ...form, experience: e }); }} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Start Date" value={exp.startDate} onChange={(v) => { const e = [...form.experience]; e[i] = { ...e[i], startDate: v }; setForm({ ...form, experience: e }); }} placeholder="Jan 2020" />
                    <Input label="End Date" value={exp.endDate} onChange={(v) => { const e = [...form.experience]; e[i] = { ...e[i], endDate: v }; setForm({ ...form, experience: e }); }} placeholder="Present" />
                  </div>
                  <div>
                    <label className="block text-sm text-brand-muted mb-1.5">Description</label>
                    <textarea
                      value={exp.description}
                      onChange={(e) => { const ex = [...form.experience]; ex[i] = { ...ex[i], description: e.target.value }; setForm({ ...form, experience: ex }); }}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 resize-none"
                      placeholder="Key responsibilities and achievements..."
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setForm({ ...form, experience: [...form.experience, { title: '', company: '', startDate: '', endDate: '', description: '' }] })}
                className="flex items-center gap-2 text-brand-accent-light text-sm hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Experience
              </button>
            </div>
          )}

          {/* Education */}
          {step === 'education' && (
            <div className="space-y-6">
              <h2 className="text-white font-semibold">Education</h2>
              {form.education.map((edu, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-brand-muted text-xs">Education {i + 1}</span>
                    {form.education.length > 1 && (
                      <button onClick={() => setForm({ ...form, education: form.education.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Input label="Degree" value={edu.degree} onChange={(v) => { const e = [...form.education]; e[i] = { ...e[i], degree: v }; setForm({ ...form, education: e }); }} />
                  <Input label="School" value={edu.school} onChange={(v) => { const e = [...form.education]; e[i] = { ...e[i], school: v }; setForm({ ...form, education: e }); }} />
                  <Input label="Year" value={edu.year} onChange={(v) => { const e = [...form.education]; e[i] = { ...e[i], year: v }; setForm({ ...form, education: e }); }} placeholder="2020" />
                </div>
              ))}
              <button
                onClick={() => setForm({ ...form, education: [...form.education, { degree: '', school: '', year: '' }] })}
                className="flex items-center gap-2 text-brand-accent-light text-sm hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Education
              </button>
            </div>
          )}

          {/* Skills */}
          {step === 'skills' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white font-semibold mb-4">Skills</h2>
                <div className="space-y-2">
                  {form.skills.map((skill, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={skill}
                        onChange={(e) => { const s = [...form.skills]; s[i] = e.target.value; setForm({ ...form, skills: s }); }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                        placeholder="e.g. Project Management"
                      />
                      {form.skills.length > 1 && (
                        <button onClick={() => setForm({ ...form, skills: form.skills.filter((_, j) => j !== i) })} className="text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setForm({ ...form, skills: [...form.skills, ''] })} className="flex items-center gap-2 text-brand-accent-light text-sm hover:text-white transition-colors">
                    <Plus className="w-4 h-4" /> Add Skill
                  </button>
                </div>
              </div>
              <div>
                <h2 className="text-white font-semibold mb-4">Certifications (Optional)</h2>
                <div className="space-y-2">
                  {form.certifications.map((cert, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={cert}
                        onChange={(e) => { const c = [...form.certifications]; c[i] = e.target.value; setForm({ ...form, certifications: c }); }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                        placeholder="e.g. AWS Solutions Architect"
                      />
                      {form.certifications.length > 1 && (
                        <button onClick={() => setForm({ ...form, certifications: form.certifications.filter((_, j) => j !== i) })} className="text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setForm({ ...form, certifications: [...form.certifications, ''] })} className="flex items-center gap-2 text-brand-accent-light text-sm hover:text-white transition-colors">
                    <Plus className="w-4 h-4" /> Add Certification
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold mb-4">Review & Submit</h2>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-white/5 rounded-lg"><span className="text-brand-muted">Name:</span> <span className="text-white">{form.name}</span></div>
                <div className="p-3 bg-white/5 rounded-lg"><span className="text-brand-muted">Email:</span> <span className="text-white">{form.email}</span></div>
                {form.summary && <div className="p-3 bg-white/5 rounded-lg"><span className="text-brand-muted">Summary:</span> <span className="text-white"> {form.summary.slice(0, 100)}...</span></div>}
                <div className="p-3 bg-white/5 rounded-lg"><span className="text-brand-muted">Experience:</span> <span className="text-white"> {form.experience.filter((e) => e.title).length} positions</span></div>
                <div className="p-3 bg-white/5 rounded-lg"><span className="text-brand-muted">Education:</span> <span className="text-white"> {form.education.filter((e) => e.degree).length} entries</span></div>
                <div className="p-3 bg-white/5 rounded-lg"><span className="text-brand-muted">Skills:</span> <span className="text-white"> {form.skills.filter(Boolean).length} skills</span></div>
              </div>
              <p className="text-brand-muted text-xs mt-4">
                Robert will optimize your resume with stronger action verbs, quantified achievements, and ATS-friendly formatting.
              </p>
            </div>
          )}
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prev}
            disabled={stepIndex === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-brand-muted text-sm hover:text-white transition-colors disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {step === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={loading || !form.name || !form.email}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white text-sm font-semibold hover:shadow-lg hover:shadow-brand-accent/25 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {loading ? 'Robert is working...' : 'Let Robert Optimize'}
            </button>
          ) : (
            <button
              onClick={next}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white text-sm font-semibold hover:shadow-lg hover:shadow-brand-accent/25 transition-all"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-brand-muted mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
      />
    </div>
  );
}
