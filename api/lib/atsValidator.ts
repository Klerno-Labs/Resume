/**
 * ATS (Applicant Tracking System) Compatibility Validator
 * Checks resume HTML for ATS-friendly structure and formatting
 */

export interface ATSValidationResult {
  passed: boolean;
  score: number; // 0-100
  issues: Array<{
    type: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  warnings: string[];
}

/**
 * Validate resume HTML for ATS compatibility
 */
export function validateATSCompatibility(html: string): ATSValidationResult {
  const issues: Array<{ type: string; message: string; severity: 'high' | 'medium' | 'low' }> = [];
  const warnings: string[] = [];
  let score = 100;

  const htmlLower = html.toLowerCase();

  // Check 1: Standard Section Headers (CRITICAL)
  const standardHeaders = [
    'professional summary',
    'work experience',
    'experience',
    'skills',
    'education',
  ];

  const hasStandardHeaders = standardHeaders.some(header =>
    htmlLower.includes(header)
  );

  if (!hasStandardHeaders) {
    issues.push({
      type: 'section-headers',
      message: 'Missing standard section headers like "Work Experience", "Skills", "Education"',
      severity: 'high',
    });
    score -= 20;
  }

  // Check 2: Tables (ATS systems struggle with tables)
  if (htmlLower.includes('<table')) {
    issues.push({
      type: 'tables',
      message: 'Resume uses tables for layout - ATS systems cannot parse tables properly',
      severity: 'high',
    });
    score -= 25;
  }

  // Check 3: Complex Multi-Column Layouts
  const hasGridColumns = htmlLower.match(/grid-template-columns|display:\s*grid/g);
  const hasFlexColumns = htmlLower.match(/flex-direction:\s*row|display:\s*flex.*flex-wrap/g);

  if (hasGridColumns || hasFlexColumns) {
    warnings.push('Multi-column layout detected - may reduce ATS parsing accuracy. Single column is most ATS-friendly.');
    score -= 5;
  }

  // Check 4: Images and Graphics
  if (htmlLower.includes('<img') || htmlLower.includes('<svg')) {
    issues.push({
      type: 'graphics',
      message: 'Resume contains images or graphics - ATS cannot read visual content',
      severity: 'medium',
    });
    score -= 15;
  }

  // Check 5: Text Boxes and Absolute Positioning
  if (htmlLower.includes('position: absolute') || htmlLower.includes('position:absolute')) {
    issues.push({
      type: 'positioning',
      message: 'Absolute positioning detected - may cause ATS parsing errors',
      severity: 'medium',
    });
    score -= 10;
  }

  // Check 6: Semantic HTML
  const hasSemanticHTML = (
    htmlLower.includes('<header') &&
    htmlLower.includes('<section') &&
    (htmlLower.includes('<h1') || htmlLower.includes('<h2'))
  );

  if (!hasSemanticHTML) {
    issues.push({
      type: 'semantic-html',
      message: 'Missing semantic HTML tags (<header>, <section>, <h1>, <h2>) - reduces ATS parsing accuracy',
      severity: 'low',
    });
    score -= 5;
  }

  // Check 7: Skills Section Exists
  if (!htmlLower.includes('skill')) {
    issues.push({
      type: 'skills-section',
      message: 'No Skills section detected - critical for ATS keyword matching',
      severity: 'high',
    });
    score -= 15;
  }

  // Check 8: Date Format Consistency
  const datePatterns = [
    /\d{4}\s*-\s*\d{4}/g, // 2020 - 2023
    /\d{1,2}\/\d{4}/g,     // 01/2020
    /[a-z]+\s+\d{4}/gi,    // January 2020
  ];

  const dateMatches = datePatterns.map(pattern =>
    (html.match(pattern) || []).length
  );

  const inconsistentDates = dateMatches.filter(count => count > 0).length > 1;
  if (inconsistentDates) {
    warnings.push('Inconsistent date formats detected - use consistent format throughout');
    score -= 5;
  }

  // Check 9: Action Verbs (check for bullet points)
  const hasBullets = htmlLower.includes('<li') || htmlLower.includes('•') || htmlLower.includes('&bull;');
  if (!hasBullets) {
    warnings.push('No bullet points detected - achievements should use bullet point format');
    score -= 5;
  }

  // Check 10: Contact Information
  const hasEmail = htmlLower.includes('@') || htmlLower.includes('email');
  const hasPhone = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(html);

  if (!hasEmail && !hasPhone) {
    issues.push({
      type: 'contact-info',
      message: 'Contact information (email/phone) not clearly visible',
      severity: 'medium',
    });
    score -= 10;
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  return {
    passed: score >= 70, // Minimum threshold for ATS compatibility
    score,
    issues,
    warnings,
  };
}

/**
 * Get ATS compatibility recommendations
 */
export function getATSRecommendations(score: number): string[] {
  const recommendations: string[] = [];

  if (score < 70) {
    recommendations.push('🔴 Critical: This resume may be auto-rejected by ATS systems');
    recommendations.push('Use simple, linear layout without tables or complex columns');
    recommendations.push('Include standard section headers: Work Experience, Skills, Education');
  } else if (score < 85) {
    recommendations.push('🟡 Warning: Some ATS systems may have difficulty parsing this resume');
    recommendations.push('Consider simplifying layout to single-column format');
    recommendations.push('Ensure all sections use standard headers');
  } else {
    recommendations.push('✅ Good: This resume should pass most ATS systems');
    recommendations.push('Continue using standard headers and simple formatting');
  }

  return recommendations;
}
