import { useState } from 'react';
import { Plus, Trash2, Briefcase, GraduationCap, Award, Code } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card } from './ui/card';

interface Experience {
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  responsibilities: string[];
}

interface Education {
  degree: string;
  school: string;
  location: string;
  graduationDate: string;
  gpa?: string;
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
}

interface ResumeData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
}

interface ResumeCreationFormProps {
  onSubmit: (data: ResumeData) => void;
  isLoading?: boolean;
}

export function ResumeCreationForm({ onSubmit, isLoading = false }: ResumeCreationFormProps) {
  const [formData, setFormData] = useState<ResumeData>({
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      portfolio: '',
    },
    summary: '',
    experience: [
      {
        jobTitle: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        responsibilities: [''],
      },
    ],
    education: [
      {
        degree: '',
        school: '',
        location: '',
        graduationDate: '',
        gpa: '',
      },
    ],
    skills: [''],
    certifications: [],
  });

  const handlePersonalInfoChange = (field: keyof typeof formData.personalInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value },
    }));
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          jobTitle: '',
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          responsibilities: [''],
        },
      ],
    }));
  };

  const removeExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  const updateExperience = (index: number, field: keyof Experience, value: any) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) =>
        i === index ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const addResponsibility = (expIndex: number) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) =>
        i === expIndex ? { ...exp, responsibilities: [...exp.responsibilities, ''] } : exp
      ),
    }));
  };

  const updateResponsibility = (expIndex: number, respIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) =>
        i === expIndex
          ? {
              ...exp,
              responsibilities: exp.responsibilities.map((r, ri) =>
                ri === respIndex ? value : r
              ),
            }
          : exp
      ),
    }));
  };

  const removeResponsibility = (expIndex: number, respIndex: number) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) =>
        i === expIndex
          ? { ...exp, responsibilities: exp.responsibilities.filter((_, ri) => ri !== respIndex) }
          : exp
      ),
    }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        { degree: '', school: '', location: '', graduationDate: '', gpa: '' },
      ],
    }));
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) =>
        i === index ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  const addSkill = () => {
    setFormData(prev => ({ ...prev, skills: [...prev.skills, ''] }));
  };

  const updateSkill = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map((s, i) => (i === index ? value : s)),
    }));
  };

  const removeSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuer: '', date: '' }],
    }));
  };

  const updateCertification = (index: number, field: keyof Certification, value: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) =>
        i === index ? { ...cert, [field]: value } : cert
      ),
    }));
  };

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Personal Information */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            👤
          </div>
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.personalInfo.fullName}
              onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.personalInfo.email}
              onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
              placeholder="john.doe@example.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={formData.personalInfo.phone}
              onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
              required
            />
          </div>
          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.personalInfo.location}
              onChange={(e) => handlePersonalInfoChange('location', e.target.value)}
              placeholder="New York, NY"
              required
            />
          </div>
          <div>
            <Label htmlFor="linkedin">LinkedIn (Optional)</Label>
            <Input
              id="linkedin"
              value={formData.personalInfo.linkedin}
              onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
              placeholder="linkedin.com/in/johndoe"
            />
          </div>
          <div>
            <Label htmlFor="portfolio">Portfolio/Website (Optional)</Label>
            <Input
              id="portfolio"
              value={formData.personalInfo.portfolio}
              onChange={(e) => handlePersonalInfoChange('portfolio', e.target.value)}
              placeholder="johndoe.com"
            />
          </div>
        </div>
      </Card>

      {/* Professional Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Professional Summary *</h2>
        <Textarea
          value={formData.summary}
          onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
          placeholder="Write a brief professional summary (2-3 sentences) highlighting your key qualifications and career goals..."
          rows={4}
          required
        />
      </Card>

      {/* Experience */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Work Experience
          </h2>
          <Button type="button" onClick={addExperience} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            Add Experience
          </Button>
        </div>

        <div className="space-y-6">
          {formData.experience.map((exp, expIndex) => (
            <div key={expIndex} className="border rounded-lg p-4 bg-gray-50 relative">
              {formData.experience.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExperience(expIndex)}
                  className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Job Title *</Label>
                  <Input
                    value={exp.jobTitle}
                    onChange={(e) => updateExperience(expIndex, 'jobTitle', e.target.value)}
                    placeholder="Software Engineer"
                    required
                  />
                </div>
                <div>
                  <Label>Company *</Label>
                  <Input
                    value={exp.company}
                    onChange={(e) => updateExperience(expIndex, 'company', e.target.value)}
                    placeholder="Tech Corp"
                    required
                  />
                </div>
                <div>
                  <Label>Location *</Label>
                  <Input
                    value={exp.location}
                    onChange={(e) => updateExperience(expIndex, 'location', e.target.value)}
                    placeholder="San Francisco, CA"
                    required
                  />
                </div>
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    value={exp.startDate}
                    onChange={(e) => updateExperience(expIndex, 'startDate', e.target.value)}
                    placeholder="January 2020"
                    required
                  />
                </div>
                <div>
                  <Label>End Date {!exp.current && '*'}</Label>
                  <Input
                    value={exp.endDate}
                    onChange={(e) => updateExperience(expIndex, 'endDate', e.target.value)}
                    placeholder="December 2023"
                    disabled={exp.current}
                    required={!exp.current}
                  />
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id={`current-${expIndex}`}
                    checked={exp.current}
                    onChange={(e) => updateExperience(expIndex, 'current', e.target.checked)}
                    className="mr-2"
                  />
                  <Label htmlFor={`current-${expIndex}`} className="cursor-pointer">
                    Currently working here
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Key Responsibilities & Achievements *</Label>
                  <Button
                    type="button"
                    onClick={() => addResponsibility(expIndex)}
                    size="sm"
                    variant="ghost"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                {exp.responsibilities.map((resp, respIndex) => (
                  <div key={respIndex} className="flex gap-2">
                    <Textarea
                      value={resp}
                      onChange={(e) => updateResponsibility(expIndex, respIndex, e.target.value)}
                      placeholder="• Developed and maintained..."
                      rows={2}
                      required
                    />
                    {exp.responsibilities.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeResponsibility(expIndex, respIndex)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Education */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            Education
          </h2>
          <Button type="button" onClick={addEducation} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            Add Education
          </Button>
        </div>

        <div className="space-y-4">
          {formData.education.map((edu, eduIndex) => (
            <div key={eduIndex} className="border rounded-lg p-4 bg-gray-50 relative">
              {formData.education.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEducation(eduIndex)}
                  className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Degree *</Label>
                  <Input
                    value={edu.degree}
                    onChange={(e) => updateEducation(eduIndex, 'degree', e.target.value)}
                    placeholder="Bachelor of Science in Computer Science"
                    required
                  />
                </div>
                <div>
                  <Label>School/University *</Label>
                  <Input
                    value={edu.school}
                    onChange={(e) => updateEducation(eduIndex, 'school', e.target.value)}
                    placeholder="University of California"
                    required
                  />
                </div>
                <div>
                  <Label>Location *</Label>
                  <Input
                    value={edu.location}
                    onChange={(e) => updateEducation(eduIndex, 'location', e.target.value)}
                    placeholder="Berkeley, CA"
                    required
                  />
                </div>
                <div>
                  <Label>Graduation Date *</Label>
                  <Input
                    value={edu.graduationDate}
                    onChange={(e) => updateEducation(eduIndex, 'graduationDate', e.target.value)}
                    placeholder="May 2019"
                    required
                  />
                </div>
                <div>
                  <Label>GPA (Optional)</Label>
                  <Input
                    value={edu.gpa}
                    onChange={(e) => updateEducation(eduIndex, 'gpa', e.target.value)}
                    placeholder="3.8/4.0"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Skills */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-600" />
            Skills
          </h2>
          <Button type="button" onClick={addSkill} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            Add Skill
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {formData.skills.map((skill, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={skill}
                onChange={(e) => updateSkill(index, e.target.value)}
                placeholder="JavaScript, Python, React..."
                required
              />
              {formData.skills.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSkill(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Certifications */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Certifications (Optional)
          </h2>
          <Button type="button" onClick={addCertification} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            Add Certification
          </Button>
        </div>

        {formData.certifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No certifications added yet. Click "Add Certification" to include your professional certifications.
          </p>
        ) : (
          <div className="space-y-4">
            {formData.certifications.map((cert, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50 relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCertification(index)}
                  className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Certification Name</Label>
                    <Input
                      value={cert.name}
                      onChange={(e) => updateCertification(index, 'name', e.target.value)}
                      placeholder="AWS Certified Developer"
                    />
                  </div>
                  <div>
                    <Label>Issuing Organization</Label>
                    <Input
                      value={cert.issuer}
                      onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                      placeholder="Amazon Web Services"
                    />
                  </div>
                  <div>
                    <Label>Date Obtained</Label>
                    <Input
                      value={cert.date}
                      onChange={(e) => updateCertification(index, 'date', e.target.value)}
                      placeholder="June 2023"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" size="lg" disabled={isLoading} className="min-w-[200px]">
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Creating Resume...
            </>
          ) : (
            <>
              Create Resume
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
