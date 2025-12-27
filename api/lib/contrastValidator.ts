/**
 * WCAG 2.1 Contrast Validation Utility
 * Validates color contrast ratios to ensure readability and accessibility
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error(`Invalid color format: ${color1} or ${color2}`);
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 2.1 Conformance Levels
 */
export const WCAG_STANDARDS = {
  AA_NORMAL: 4.5, // Normal text (< 18pt or < 14pt bold)
  AA_LARGE: 3.0, // Large text (≥ 18pt or ≥ 14pt bold)
  AAA_NORMAL: 7.0, // Enhanced normal text
  AAA_LARGE: 4.5, // Enhanced large text
};

/**
 * Check if contrast ratio meets WCAG AA standard
 */
export function meetsWCAG_AA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? WCAG_STANDARDS.AA_LARGE : WCAG_STANDARDS.AA_NORMAL;
  return ratio >= requiredRatio;
}

/**
 * Check if contrast ratio meets WCAG AAA standard
 */
export function meetsWCAG_AAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? WCAG_STANDARDS.AAA_LARGE : WCAG_STANDARDS.AAA_NORMAL;
  return ratio >= requiredRatio;
}

/**
 * Extract colors from HTML string using regex
 */
function extractColorsFromHTML(html: string): string[] {
  const colorRegex = /#([a-f0-9]{6}|[a-f0-9]{3})\b/gi;
  const matches = html.match(colorRegex) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Validate all color combinations in resume HTML
 * Returns validation report
 */
export interface ContrastValidationResult {
  isValid: boolean;
  contrastRatio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  foreground: string;
  background: string;
  context: string;
}

export function validateResumeContrast(html: string): {
  passed: boolean;
  results: ContrastValidationResult[];
  summary: {
    totalChecks: number;
    passedAA: number;
    passedAAA: number;
    failedAA: number;
  };
} {
  const results: ContrastValidationResult[] = [];

  // Common color combinations to check in resumes
  const checksToPerform: Array<{
    foreground: string;
    background: string;
    context: string;
    isLargeText?: boolean;
  }> = [];

  // Extract all colors from HTML
  const colors = extractColorsFromHTML(html);

  // Check text on white background (most common)
  colors.forEach((color) => {
    if (color.toLowerCase() !== '#ffffff' && color.toLowerCase() !== '#fff') {
      checksToPerform.push({
        foreground: color,
        background: '#ffffff',
        context: `${color} text on white background`,
        isLargeText: false,
      });
    }
  });

  // Check white text on colored backgrounds
  colors.forEach((color) => {
    if (color.toLowerCase() !== '#ffffff' && color.toLowerCase() !== '#fff') {
      checksToPerform.push({
        foreground: '#ffffff',
        background: color,
        context: `White text on ${color} background`,
        isLargeText: false,
      });
    }
  });

  // Perform all checks
  checksToPerform.forEach((check) => {
    try {
      const ratio = getContrastRatio(check.foreground, check.background);
      const meetsAA = meetsWCAG_AA(check.foreground, check.background, check.isLargeText);
      const meetsAAA = meetsWCAG_AAA(check.foreground, check.background, check.isLargeText);

      results.push({
        isValid: meetsAA,
        contrastRatio: ratio,
        meetsAA,
        meetsAAA,
        foreground: check.foreground,
        background: check.background,
        context: check.context,
      });
    } catch (error) {
      console.warn(`[Contrast] Failed to validate ${check.context}:`, error);
    }
  });

  const passedAA = results.filter((r) => r.meetsAA).length;
  const passedAAA = results.filter((r) => r.meetsAAA).length;
  const failedAA = results.filter((r) => !r.meetsAA).length;

  return {
    passed: failedAA === 0, // All checks must pass AA
    results,
    summary: {
      totalChecks: results.length,
      passedAA,
      passedAAA,
      failedAA,
    },
  };
}

/**
 * Get a professional alternative color if the current one fails contrast
 */
export function getSafeAlternativeColor(
  failedColor: string,
  background: string
): string {
  // Professional colors that meet WCAG AA on white background
  const safeColors = [
    '#1e40af', // Navy blue
    '#065f46', // Forest green
    '#7c3aed', // Purple
    '#991b1b', // Burgundy
    '#0f766e', // Teal
    '#1e3a8a', // Deep blue
    '#475569', // Slate gray
    '#1a1a1a', // Near black
  ];

  // Find first safe color that meets contrast requirements
  for (const color of safeColors) {
    if (meetsWCAG_AA(color, background)) {
      return color;
    }
  }

  // Fallback to dark gray (always safe on white)
  return '#1a1a1a';
}
