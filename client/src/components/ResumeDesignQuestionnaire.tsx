import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Sparkles } from 'lucide-react';

export interface QuestionnaireAnswers {
  includePicture: string;
  style: string;
  colorScheme: string;
  layout: string;
  headerStyle: string;
  fontPairing: string;
  sectionDividers: string;
  accentColor: string;
  emphasisOn: string;
  contactInfoPlacement: string;
}

/**
 * Convert questionnaire answers into a detailed design prompt for AI
 */
export function generateDesignPrompt(answers: QuestionnaireAnswers): string {
  const pictureLine = answers.includePicture === 'yes'
    ? 'Include a professional circular profile picture placeholder in the header.'
    : 'Do not include a profile picture.';

  const styleDescriptions: Record<string, string> = {
    modern: 'modern, clean, contemporary design with sharp lines and ample white space',
    classic: 'classic, traditional, timeless design with serif fonts and balanced proportions',
    creative: 'creative, bold, artistic design with unique visual elements and dynamic layouts',
    minimalist: 'minimalist, simple, elegant design with maximum white space and minimal decoration',
    professional: 'professional, corporate, polished design with conservative styling',
    tech: 'tech-inspired, sleek, innovative design with geometric elements and modern aesthetics',
  };

  const colorSchemeDescriptions: Record<string, string> = {
    bold: 'Use bold, high-contrast colors with vivid accent tones',
    subtle: 'Use subtle, soft, muted color tones for a gentle appearance',
    monochrome: 'Use only black, white, and shades of gray for a monochrome palette',
    colorful: 'Use multiple complementary accent colors throughout',
    professional: 'Use a conservative, professional color palette with minimal color',
  };

  const layoutDescriptions: Record<string, string> = {
    single: 'single column layout with traditional linear flow',
    'two-column': 'two column layout with split content sections',
    sidebar: 'sidebar layout with main content area and dedicated side panel',
    asymmetric: 'asymmetric, creative layout with uneven column widths',
  };

  const headerDescriptions: Record<string, string> = {
    centered: 'centered header with name and title in the middle',
    left: 'left-aligned header with modern alignment',
    banner: 'full-width banner header with background color',
    split: 'split header with name on left and contact information on right',
  };

  const fontDescriptions: Record<string, string> = {
    'classic-serif': 'classic serif fonts like Times New Roman or Garamond',
    'modern-sans': 'modern sans-serif fonts like Helvetica or Inter',
    tech: 'geometric tech fonts like Montserrat or Roboto',
    creative: 'creative unique fonts like Playfair Display or Lora',
    minimal: 'minimal simple fonts like Source Sans Pro or Open Sans',
  };

  const dividerDescriptions: Record<string, string> = {
    lines: 'horizontal dividing lines between sections',
    spacing: 'white space only for section separation, no lines',
    icons: 'section icons with titles for visual interest',
    colored: 'accent-colored bars or dividers between sections',
    none: 'minimal separation with no visible dividers',
  };

  const accentColorMap: Record<string, string> = {
    blue: '#1d4ed8',     // 6.70:1 contrast (WCAG AA compliant)
    purple: '#7c3aed',   // 5.70:1 contrast (WCAG AA compliant)
    green: '#047857',    // 5.48:1 contrast (WCAG AA compliant)
    red: '#b91c1c',      // 6.47:1 contrast (WCAG AA compliant)
    orange: '#c2410c',   // 5.18:1 contrast (WCAG AA compliant)
    navy: '#1e3a8a',     // 10.36:1 contrast (WCAG AA compliant)
    teal: '#0f766e',     // 5.47:1 contrast (WCAG AA compliant)
    black: '#1a1a1a',    // 17.40:1 contrast (WCAG AA compliant)
  };

  const emphasisDescriptions: Record<string, string> = {
    skills: 'Give prominent visual emphasis to the skills section with larger space and visual elements',
    experience: 'Give prominent visual emphasis to work experience with detailed formatting',
    education: 'Give prominent visual emphasis to education section',
    projects: 'Give prominent visual emphasis to projects/portfolio section',
    balanced: 'Give balanced, equal emphasis to all resume sections',
  };

  const contactDescriptions: Record<string, string> = {
    header: 'Place contact information in the header at top of page',
    sidebar: 'Place contact information in the sidebar panel',
    footer: 'Place contact information in the footer at bottom',
    integrated: 'Integrate contact information within the name/title section',
  };

  const prompt = `You are an expert resume designer creating a ${styleDescriptions[answers.style]} resume.

DESIGN SPECIFICATIONS:
- Style: ${answers.style}
- Layout: ${layoutDescriptions[answers.layout]}
- Header: ${headerDescriptions[answers.headerStyle]}
- Fonts: ${fontDescriptions[answers.fontPairing]}
- Section Dividers: ${dividerDescriptions[answers.sectionDividers]}
- Color Scheme: ${colorSchemeDescriptions[answers.colorScheme]}
- Accent Color: ${accentColorMap[answers.accentColor]} (${answers.accentColor})
- Contact Info: ${contactDescriptions[answers.contactInfoPlacement]}
- Emphasis: ${emphasisDescriptions[answers.emphasisOn]}
- Profile Picture: ${pictureLine}

PROFESSIONAL RESUME DESIGN RULES (ATS-OPTIMIZED):
1. TYPOGRAPHY:
   - Use professional font sizes: Name (28-36px), Section Headers (16-18px), Body (11-12px)
   - Line height: 1.4-1.6 for readability
   - Use font-weight variations (400, 500, 600, 700) for hierarchy
   - Ensure excellent readability with proper letter-spacing
   - Use standard web-safe fonts for ATS compatibility

2. SPACING & LAYOUT (ATS-FRIENDLY - MAXIMIZE SPACE):
   - Page size: 8.5in x 11in (letter size) - USE FULL WIDTH
   - Body padding: EXACTLY 0.4in top/bottom, 0.5in left/right (this creates the margins)
   - NO max-width on containers - content should span full page width
   - Section spacing: 0.8-1.0rem between sections (tight but readable)
   - Item spacing: 0.3-0.5rem between list items (compact)
   - Line height: 1.4 for body text (tighter for more content)
   - PREFER simple, linear layouts - ATS systems parse top-to-bottom, left-to-right
   - AVOID complex multi-column layouts if possible - single column is most ATS-friendly
   - Maintain consistent vertical rhythm
   - CRITICAL: Maximize content space - use ALL available space, minimize margins

3. ATS COMPATIBILITY (CRITICAL):
   - Use standard section headers: "Professional Summary", "Work Experience", "Skills", "Education"
   - NO tables, NO text boxes, NO graphics or charts
   - Simple, clean HTML structure that ATS systems can parse
   - Content should be readable when copied as plain text
   - Every job entry should have clear company, title, and dates
   - Skills should be text-based, not visual bars or charts

3. COLOR USAGE (WCAG AA COMPLIANT ONLY):
   - Primary accent: ${accentColorMap[answers.accentColor]} for headers, icons, borders ONLY
   - Text colors (WCAG AA compliant on white):
     * Headings: #1a1a1a (17.40:1 contrast)
     * Body text: #333333 (12.63:1 contrast)
     * Metadata/dates: #595959 (7.00:1 contrast) - USE THIS, NOT #666666
   - Background: White (#ffffff) ONLY - no other backgrounds allowed
   - CRITICAL: Use ONLY these exact color values - no substitutions
   - These are the ONLY colors allowed in the entire document

4. VISUAL HIERARCHY:
   - Name should be the most prominent element
   - Section headers should be clearly distinct but not oversized
   - Use subtle dividers or spacing to separate sections
   - Bullet points should be clean and aligned
   - Dates and locations should be visually de-emphasized

5. PROFESSIONAL ELEMENTS:
   - Clean, aligned sections with consistent formatting
   - Professional icons for contact info (if applicable)
   - Proper date formatting (MMM YYYY or MM/YYYY)
   - Bullet points for achievements (not paragraphs)
   - No decorative graphics or unprofessional elements
   - Print-friendly design with no backgrounds that waste ink

6. TECHNICAL REQUIREMENTS:
   - Include <!DOCTYPE html> and proper HTML5 structure
   - Embed all CSS in <style> tag (no external stylesheets)
   - Use semantic HTML (header, section, article)
   - Set page size: @page { size: 8.5in 11in; margin: 0; }
   - Make responsive with @media print styles
   - No JavaScript or external dependencies

7. CONTENT FORMATTING:
   - Job titles and company names should be prominent
   - Skills should be easy to scan (consider columns or pills)
   - Education dates and degrees clearly formatted
   - Contact information easily accessible
   - URLs and email addresses should be clickable

CSS FRAMEWORK (USE EXACTLY - ALL COLORS WCAG AA COMPLIANT - MAXIMIZED SPACE):
\`\`\`css
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 11pt;
  line-height: 1.4;
  color: #333333;
  background: white;
  width: 100%;
  margin: 0;
  padding: 0.5in 0.6in;
  box-sizing: border-box;
}
h1 { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 6px; }
h2 { font-size: 16px; font-weight: 600; color: ${accentColorMap[answers.accentColor]}; margin: 14px 0 8px; border-bottom: 2px solid ${accentColorMap[answers.accentColor]}; padding-bottom: 3px; }
h3 { font-size: 12px; font-weight: 600; color: #1a1a1a; margin-bottom: 3px; }
.contact { font-size: 10pt; color: #595959; margin-bottom: 10px; }
.job-title { font-size: 11pt; color: #595959; font-weight: 400; margin-bottom: 3px; }
.company { font-weight: 600; color: #1a1a1a; }
.date { color: #595959; font-size: 10pt; font-style: italic; }
ul { margin-left: 16px; margin-top: 4px; }
li { margin-bottom: 3px; color: #333333; line-height: 1.4; }
\`\`\`

HTML STRUCTURE (FOLLOW THIS PATTERN):
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Resume</title>
  <style>/* CSS framework above */</style>
</head>
<body>
  <header>
    <h1>[Name]</h1>
    <div class="job-title">[Title]</div>
    <div class="contact">[Email] | [Phone] | [Location]</div>
  </header>

  <section>
    <h2>Professional Summary</h2>
    <p>[Summary text]</p>
  </section>

  <section>
    <h2>Experience</h2>
    <div class="job">
      <div class="job-header">
        <span class="company">[Company]</span> | <span class="date">[Dates]</span>
      </div>
      <h3>[Job Title]</h3>
      <ul>
        <li>[Achievement]</li>
      </ul>
    </div>
  </section>

  <section>
    <h2>Skills</h2>
    <p>[Skills list]</p>
  </section>

  <section>
    <h2>Education</h2>
    <div class="education">
      <div><span class="company">[School]</span> | <span class="date">[Dates]</span></div>
      <div>[Degree]</div>
    </div>
  </section>
</body>
</html>
\`\`\`

CRITICAL RULES - STRICTLY ENFORCE (ATS + WCAG AA COMPLIANCE):
- Use the EXACT CSS framework and HTML structure shown above as your foundation
- ONLY USE THESE COLORS - NO OTHER COLORS ALLOWED:
  * Accent: ${accentColorMap[answers.accentColor]} (section headers only)
  * Headings: #1a1a1a
  * Body: #333333
  * Metadata: #595959 (NOT #666666, NOT #999999, NOT any other gray)
  * Background: #ffffff (white only)
- ANY color not in the above list will cause WCAG AA failure
- Keep the design SIMPLE and CLEAN - no fancy graphics, gradients, or colored backgrounds
- Section headers (h2) should ONLY use the accent color for TEXT and BORDER - no background colors
- Maximum width 8.5 inches with 0.4in top/bottom, 0.5in left/right margins (TIGHT MARGINS - use ALL space)
- Include ALL resume content from the provided text - do not omit any sections
- Font sizes: Name 28px, Section headers 16px, Body 11pt, Metadata 10pt
- CRITICAL: Use compact spacing - line-height 1.4, tight margins between sections (14px), minimal padding
- Return ONLY valid JSON: {"html": "<!DOCTYPE html><html>...</html>"}
- The design must look like a traditional professional resume, not a website
- ZERO CONTRAST WARNINGS REQUIRED - use only approved colors

ATS COMPATIBILITY REQUIREMENTS (CRITICAL FOR 90%+ ATS SCORES):
- Use STANDARD section headers: "Professional Summary", "Work Experience", "Skills", "Education", "Certifications"
- Structure must be linear and parseable - avoid complex nested divs
- NO tables for layout (ATS cannot parse them) - use simple divs with proper semantic HTML
- NO text boxes, NO graphics, NO charts, NO images
- Each job entry must clearly show: Company | Job Title | Dates on one line, then bullets below
- Skills must be plain text lists, NOT visual bars or progress indicators
- Date format must be consistent: "Month YYYY - Month YYYY" or "MM/YYYY - MM/YYYY"
- Every achievement bullet should start with a strong action verb
- Content should remain readable when HTML is stripped (ATS extracts plain text)
- Use semantic HTML: <header>, <section>, <article>, <h1>, <h2>, <ul>, <li>
- Avoid excessive CSS that might interfere with text extraction

ABSOLUTELY FORBIDDEN - DO NOT USE:
- NO colored backgrounds on ANY element (header, sections, divs, etc.)
- NO background-color property except "background: white" or "background: #ffffff"
- NO colored banner headers - the header must have white background
- NO colored boxes or containers around name/contact info
- The ONLY place the accent color appears is: h2 text color and h2 border-bottom
- NO excessive padding or margins - every inch of space matters
- NO large gaps between sections - keep it tight and professional
- NO max-width constraints - use full page width (width: 100%)
- NO centering with "margin: 0 auto" - content spans edge to edge (respecting body padding only)

SPACE OPTIMIZATION (CRITICAL - FIT MORE CONTENT - MUST FOLLOW EXACTLY):
- Body padding: EXACTLY "padding: 0.5in 0.6in;" (NOT "padding: 0.5in;")
- Section spacing: EXACTLY "margin: 14px 0 8px;" for h2 headers
- List item spacing: EXACTLY "margin-bottom: 3px;" for li elements
- Line height: EXACTLY "line-height: 1.4;" for body text
- Header margins: Name "margin-bottom: 6px;", h2 "margin: 14px 0 8px;"
- Paragraph spacing: "margin-bottom: 3px;" between paragraphs
- CRITICAL: Minimize ALL whitespace while maintaining readability
- GOAL: Fit maximum content on one page - use EVERY available inch
- VERIFY: Measure margins with DevTools - they must be 0.4in top/bottom, 0.5in sides

EXAMPLE OF CORRECT HEADER (white background, WCAG AA compliant colors):
<header>
  <h1 style="color: #1a1a1a; background: white;">Name</h1>
  <div style="color: #595959; background: white;">Title</div>
  <div style="color: #595959; background: white;">Contact</div>
</header>

NEVER create headers like this (WRONG - colored background):
<header style="background: ${accentColorMap[answers.accentColor]}; color: white;">...</header>`;

  return prompt;
}

interface ResumeDesignQuestionnaireProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answers: QuestionnaireAnswers) => void;
  isGenerating?: boolean;
}

const questions = [
  {
    id: 'includePicture',
    question: 'Include a profile picture?',
    options: [
      { value: 'yes', label: 'Yes, include picture' },
      { value: 'no', label: 'No picture' },
    ],
  },
  {
    id: 'style',
    question: 'What style do you prefer?',
    options: [
      { value: 'modern', label: 'Modern - Clean and contemporary' },
      { value: 'classic', label: 'Classic - Traditional and timeless' },
      { value: 'creative', label: 'Creative - Bold and artistic' },
      { value: 'minimalist', label: 'Minimalist - Simple and elegant' },
      { value: 'professional', label: 'Professional - Corporate and polished' },
      { value: 'tech', label: 'Tech - Sleek and innovative' },
    ],
  },
  {
    id: 'colorScheme',
    question: 'How vibrant should the colors be?',
    options: [
      { value: 'bold', label: 'Bold - High contrast, vivid colors' },
      { value: 'subtle', label: 'Subtle - Soft, muted tones' },
      { value: 'monochrome', label: 'Monochrome - Black, white, and grays' },
      { value: 'colorful', label: 'Colorful - Multiple accent colors' },
      { value: 'professional', label: 'Professional - Conservative palette' },
    ],
  },
  {
    id: 'layout',
    question: 'What layout structure do you prefer?',
    options: [
      { value: 'single', label: 'Single Column - Traditional linear flow' },
      { value: 'two-column', label: 'Two Column - Split content layout' },
      { value: 'sidebar', label: 'Sidebar - Main content with side panel' },
      { value: 'asymmetric', label: 'Asymmetric - Creative uneven layout' },
    ],
  },
  {
    id: 'headerStyle',
    question: 'How should your name and title be displayed?',
    options: [
      { value: 'centered', label: 'Centered - Classic centered header' },
      { value: 'left', label: 'Left-aligned - Modern left alignment' },
      { value: 'banner', label: 'Banner - Full-width header bar' },
      { value: 'split', label: 'Split - Name left, contact right' },
    ],
  },
  {
    id: 'fontPairing',
    question: 'What font style do you prefer?',
    options: [
      { value: 'classic-serif', label: 'Classic Serif - Traditional Times/Garamond' },
      { value: 'modern-sans', label: 'Modern Sans - Clean Helvetica/Inter' },
      { value: 'tech', label: 'Tech - Geometric Montserrat/Roboto' },
      { value: 'creative', label: 'Creative - Unique Playfair/Lora' },
      { value: 'minimal', label: 'Minimal - Simple Source Sans/Open Sans' },
    ],
  },
  {
    id: 'sectionDividers',
    question: 'How should sections be separated?',
    options: [
      { value: 'lines', label: 'Lines - Horizontal dividing lines' },
      { value: 'spacing', label: 'Spacing - White space only' },
      { value: 'icons', label: 'Icons - Section icons with titles' },
      { value: 'colored', label: 'Colored Bars - Accent color dividers' },
      { value: 'none', label: 'None - Minimal separation' },
    ],
  },
  {
    id: 'accentColor',
    question: 'What accent color should be used?',
    options: [
      { value: 'blue', label: 'Blue - Professional and trustworthy' },
      { value: 'purple', label: 'Purple - Creative and modern' },
      { value: 'green', label: 'Green - Growth and balance' },
      { value: 'red', label: 'Red - Bold and energetic' },
      { value: 'orange', label: 'Orange - Friendly and confident' },
      { value: 'navy', label: 'Navy - Classic and authoritative' },
      { value: 'teal', label: 'Teal - Fresh and professional' },
      { value: 'black', label: 'Black - Elegant and timeless' },
    ],
  },
  {
    id: 'emphasisOn',
    question: 'What should stand out most?',
    options: [
      { value: 'skills', label: 'Skills - Highlight technical abilities' },
      { value: 'experience', label: 'Experience - Focus on work history' },
      { value: 'education', label: 'Education - Emphasize academic background' },
      { value: 'projects', label: 'Projects - Showcase portfolio work' },
      { value: 'balanced', label: 'Balanced - Equal emphasis on all sections' },
    ],
  },
  {
    id: 'contactInfoPlacement',
    question: 'Where should contact information go?',
    options: [
      { value: 'header', label: 'Header - Top of the page' },
      { value: 'sidebar', label: 'Sidebar - Left or right panel' },
      { value: 'footer', label: 'Footer - Bottom of the page' },
      { value: 'integrated', label: 'Integrated - Within name section' },
    ],
  },
];

export function ResumeDesignQuestionnaire({
  isOpen,
  onClose,
  onSubmit,
  isGenerating = false,
}: ResumeDesignQuestionnaireProps) {
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({});

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const allQuestionsAnswered = questions.every((q) => answers[q.id as keyof QuestionnaireAnswers]);

  const handleSubmit = () => {
    if (allQuestionsAnswered) {
      onSubmit(answers as QuestionnaireAnswers);
    }
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[800px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <DialogTitle className="font-semibold text-xl">Design Your Resume</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Answer 10 questions to create your perfect resume design
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Progress: {answeredCount} / {questions.length}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round((answeredCount / questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-primary/50 transition-colors"
              >
                <label className="block mb-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {index + 1}. {question.question}
                  </span>
                </label>
                <Select
                  value={answers[question.id as keyof QuestionnaireAnswers] || ''}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 shrink-0">
          <p className="text-xs text-muted-foreground">
            Your preferences will guide AI to create a custom design
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered || isGenerating}
              className="min-w-[140px]"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Design
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
