import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { ResumeCreationForm } from '@/components/ResumeCreationForm';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function CreateResume() {
  const [isCreating, setIsCreating] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const handleSubmit = async (formData: any) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to create a resume',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    try {
      setIsCreating(true);

      // Convert form data to resume text format
      const resumeText = formatResumeText(formData);

      // Create resume via API
      const response = await api.createResume({
        userId: user.id,
        fileName: `${formData.personalInfo.fullName} - Resume`,
        originalText: resumeText,
        improvedText: resumeText,
      });

      toast({
        title: 'Resume Created!',
        description: 'Your resume has been created successfully. Redirecting to editor...',
      });

      // Navigate to editor after short delay
      setTimeout(() => {
        navigate(`/editor/${response.id}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to create resume:', error);
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create resume',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const formatResumeText = (data: any): string => {
    const { personalInfo, summary, experience, education, skills, certifications } = data;

    let text = '';

    // Header
    text += `${personalInfo.fullName}\n`;
    text += `${personalInfo.email} | ${personalInfo.phone} | ${personalInfo.location}\n`;
    if (personalInfo.linkedin) text += `LinkedIn: ${personalInfo.linkedin}\n`;
    if (personalInfo.portfolio) text += `Portfolio: ${personalInfo.portfolio}\n`;
    text += '\n';

    // Professional Summary
    if (summary) {
      text += 'PROFESSIONAL SUMMARY\n';
      text += `${summary}\n\n`;
    }

    // Work Experience
    if (experience.length > 0 && experience[0].jobTitle) {
      text += 'WORK EXPERIENCE\n\n';
      experience.forEach((exp: any) => {
        if (!exp.jobTitle) return;
        text += `${exp.jobTitle}\n`;
        text += `${exp.company} | ${exp.location}\n`;
        const endDate = exp.current ? 'Present' : exp.endDate;
        text += `${exp.startDate} - ${endDate}\n`;
        exp.responsibilities.forEach((resp: string) => {
          if (resp.trim()) {
            text += `• ${resp}\n`;
          }
        });
        text += '\n';
      });
    }

    // Education
    if (education.length > 0 && education[0].degree) {
      text += 'EDUCATION\n\n';
      education.forEach((edu: any) => {
        if (!edu.degree) return;
        text += `${edu.degree}\n`;
        text += `${edu.school} | ${edu.location}\n`;
        text += `Graduated: ${edu.graduationDate}`;
        if (edu.gpa) text += ` | GPA: ${edu.gpa}`;
        text += '\n\n';
      });
    }

    // Skills
    if (skills.length > 0 && skills[0]) {
      text += 'SKILLS\n';
      const filteredSkills = skills.filter((s: string) => s.trim());
      text += filteredSkills.join(', ') + '\n\n';
    }

    // Certifications
    if (certifications.length > 0) {
      text += 'CERTIFICATIONS\n';
      certifications.forEach((cert: any) => {
        if (cert.name) {
          text += `${cert.name} - ${cert.issuer} (${cert.date})\n`;
        }
      });
      text += '\n';
    }

    return text.trim();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Create New Resume</h1>
                <p className="text-xs text-muted-foreground">Fill in your information to create a professional resume</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Introduction Card */}
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to Resume Builder!
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              Fill out the form below with your professional information. Once submitted, our AI will generate a beautifully formatted resume for you.
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Fields marked with * are required</li>
              <li>You can add multiple experiences, education entries, and skills</li>
              <li>Your resume will be automatically formatted and ready to download</li>
            </ul>
          </div>

          {/* Form */}
          <ResumeCreationForm onSubmit={handleSubmit} isLoading={isCreating} />
        </div>
      </main>
    </div>
  );
}
