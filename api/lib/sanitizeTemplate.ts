/**
 * Sanitizes resume HTML to remove personal information and replace with placeholder data.
 * This ensures user privacy when saving generated designs as public templates.
 */

export function sanitizeResumeHTML(html: string): string {
  let sanitized = html;

  // Common patterns to replace with John Doe placeholders
  const replacements: [RegExp, string][] = [
    // Email addresses
    [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'john.doe@example.com'],

    // Phone numbers (various formats)
    [/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '(555) 123-4567'],
    [/\+?1?\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '(555) 123-4567'],

    // LinkedIn profiles
    [/linkedin\.com\/in\/[a-zA-Z0-9-]+/gi, 'linkedin.com/in/johndoe'],
    [/www\.linkedin\.com\/in\/[a-zA-Z0-9-]+/gi, 'linkedin.com/in/johndoe'],

    // GitHub profiles
    [/github\.com\/[a-zA-Z0-9-]+/gi, 'github.com/johndoe'],
    [/www\.github\.com\/[a-zA-Z0-9-]+/gi, 'github.com/johndoe'],

    // Portfolio/website URLs - only replace custom domains, keep example.com
    [/https?:\/\/(?!example\.com)[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g, 'https://www.johndoe.com'],

    // Street addresses (basic pattern)
    [/\d{1,5}\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)/gi, '123 Main Street'],

    // City, State ZIP patterns
    [/,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/g, ', NY 10001'],
  ];

  // Apply all replacements
  for (const [pattern, replacement] of replacements) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  // Replace what appears to be a person's name in h1/h2 tags or large text
  // This is tricky, so we'll use a conservative approach:
  // Look for capitalized words that might be names in header tags
  sanitized = sanitized.replace(
    /<h1[^>]*>([^<]*)<\/h1>/gi,
    (match, content) => {
      // If it looks like a name (2-4 capitalized words), replace with John Doe
      const words = content.trim().split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && words.every((w: string) => /^[A-Z]/.test(w))) {
        return match.replace(content, 'John Doe');
      }
      return match;
    }
  );

  // Replace common first+last name patterns in the document
  // This catches "John Smith" style names but avoids company names
  sanitized = sanitized.replace(
    /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    (match) => {
      // Skip if it's likely a company/organization (has Inc, LLC, Corp, etc nearby)
      const context = sanitized.substring(
        Math.max(0, sanitized.indexOf(match) - 50),
        Math.min(sanitized.length, sanitized.indexOf(match) + match.length + 50)
      );
      if (/\b(Inc|LLC|Corp|Ltd|Company|University|College|School)\b/i.test(context)) {
        return match;
      }
      // Only in the first 500 characters (likely header area)
      if (sanitized.indexOf(match) < 500) {
        return 'John Doe';
      }
      return match;
    }
  );

  return sanitized;
}

/**
 * Extracts design properties from HTML to create a template spec
 */
export function extractDesignProperties(html: string): {
  gradient?: string;
  accentColor?: string;
  fonts: string[];
} {
  const result: { gradient?: string; accentColor?: string; fonts: string[] } = {
    fonts: [],
  };

  // Extract gradient from CSS
  const gradientMatch = html.match(/linear-gradient\([^)]+\)/i);
  if (gradientMatch) {
    result.gradient = gradientMatch[0];
  }

  // Extract Google Fonts
  const fontMatches = html.matchAll(/family=([^&"']+)/g);
  for (const match of fontMatches) {
    const fontName = decodeURIComponent(match[1].replace(/\+/g, ' '));
    if (!result.fonts.includes(fontName)) {
      result.fonts.push(fontName);
    }
  }

  // Extract accent color (look for common color variables or hex codes)
  const colorMatch = html.match(/#[0-9a-fA-F]{6}/);
  if (colorMatch) {
    result.accentColor = colorMatch[0];
  }

  return result;
}
