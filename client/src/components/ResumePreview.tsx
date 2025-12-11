import { useMemo } from 'react';

interface ResumePreviewProps {
  text: string;
  className?: string;
}

interface ParsedResume {
  name: string;
  title: string;
  contactLine: string;
  sections: Array<{
    title: string;
    content: string[];
  }>;
  rawLines: string[];
}

function parseResumeText(text: string): ParsedResume {
  const lines = text.split('\n').map((l) => l.trim());
  const nonEmptyLines = lines.filter(Boolean);

  // Extract name (first non-empty line)
  const name = nonEmptyLines[0] || 'Your Name';

  // Extract title (second line if it looks like a title)
  let title = '';
  let contactLine = '';
  let headerEndIdx = 1;

  if (
    nonEmptyLines[1] &&
    !nonEmptyLines[1].includes('@') &&
    !nonEmptyLines[1].match(/^\d/) &&
    nonEmptyLines[1].length < 60
  ) {
    title = nonEmptyLines[1];
    headerEndIdx = 2;
  }

  // Look for contact info (email, phone, location in one line or separate)
  for (let i = headerEndIdx; i < Math.min(headerEndIdx + 3, nonEmptyLines.length); i++) {
    const line = nonEmptyLines[i];
    if (line && (line.includes('@') || line.match(/\d{3}[\s\-.]?\d{3}/) || line.includes(','))) {
      contactLine = line;
      headerEndIdx = i + 1;
      break;
    }
  }

  // Parse sections - look for common section headers
  const sections: ParsedResume['sections'] = [];
  const sectionKeywords = [
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'summary',
    'objective',
    'achievements',
    'awards',
    'professional',
    'work',
    'technical',
    'core competencies',
    'qualifications',
  ];

  let currentSection: { title: string; content: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const lineLower = trimmedLine
      .toLowerCase()
      .replace(/[:\-–—_]/g, ' ')
      .trim();

    // Check if this line is a section header
    const isSectionHeader =
      sectionKeywords.some((keyword) => {
        const words = lineLower.split(/\s+/);
        return words.some((word) => word === keyword || word.startsWith(keyword));
      }) &&
      trimmedLine.length < 40 &&
      !trimmedLine.startsWith('-') &&
      !trimmedLine.startsWith('•');

    if (isSectionHeader && trimmedLine) {
      if (currentSection && currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        title: trimmedLine.replace(/[:\-–—_]/g, '').trim(),
        content: [],
      };
    } else if (currentSection && trimmedLine) {
      currentSection.content.push(trimmedLine);
    }
  }

  if (currentSection && currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  return { name, title, contactLine, sections, rawLines: nonEmptyLines };
}

export function ResumePreview({ text, className = '' }: ResumePreviewProps) {
  const parsed = useMemo(() => parseResumeText(text), [text]);

  // If no sections found, show formatted raw text
  if (parsed.sections.length === 0) {
    return (
      <div className={`bg-white text-slate-800 font-sans ${className}`}>
        <div className="space-y-1">
          {parsed.rawLines.map((line, idx) => {
            const isBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*');
            const isHeader = line === line.toUpperCase() && line.length < 30 && !isBullet;
            const isName = idx === 0;

            if (isName) {
              return (
                <h1
                  key={idx}
                  className="text-xl font-bold text-slate-900 text-center pb-2 border-b border-slate-200 mb-3"
                >
                  {line}
                </h1>
              );
            }

            if (isHeader) {
              return (
                <h2
                  key={idx}
                  className="text-xs font-bold uppercase tracking-widest text-blue-600 border-b border-blue-200 pb-1 mt-4 mb-2"
                >
                  {line}
                </h2>
              );
            }

            if (isBullet) {
              return (
                <div
                  key={idx}
                  className="flex gap-2 text-[11px] text-slate-700 leading-relaxed pl-4"
                >
                  <span className="text-blue-500">•</span>
                  <span>{line.replace(/^[-•*]\s*/, '')}</span>
                </div>
              );
            }

            return (
              <p key={idx} className="text-[11px] text-slate-700 leading-relaxed">
                {line}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white text-slate-800 font-sans ${className}`}>
      {/* Header */}
      <div className="text-center pb-3 border-b-2 border-slate-200 mb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{parsed.name}</h1>
        {parsed.title && (
          <p className="text-xs text-blue-600 font-medium uppercase tracking-widest mt-1">
            {parsed.title}
          </p>
        )}
        {parsed.contactLine && (
          <p className="text-[10px] text-slate-500 mt-2">{parsed.contactLine}</p>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {parsed.sections.map((section, idx) => (
          <div key={idx}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 border-b border-blue-200 pb-1 mb-2">
              {section.title}
            </h2>
            <div className="space-y-1">
              {section.content.map((line, lineIdx) => {
                const isBullet =
                  line.startsWith('-') || line.startsWith('•') || line.startsWith('*');
                const bulletText = isBullet ? line.replace(/^[-•*]\s*/, '') : line;

                // Check if it's a job/education entry line (has dates)
                const hasDate = line.match(/\b(19|20)\d{2}\b/);
                const hasSeparator =
                  line.includes('|') || line.includes('–') || line.includes(' - ');

                if (isBullet) {
                  return (
                    <div
                      key={lineIdx}
                      className="flex gap-2 text-[11px] text-slate-700 leading-relaxed pl-3"
                    >
                      <span className="text-blue-500 flex-shrink-0">•</span>
                      <span>{bulletText}</span>
                    </div>
                  );
                }

                if (hasDate && hasSeparator) {
                  const parts = line.split(/\s*[|–]\s*|\s+-\s+/);
                  return (
                    <div
                      key={lineIdx}
                      className="flex justify-between items-baseline mt-2 first:mt-0 gap-2"
                    >
                      <div className="flex-1">
                        <span className="font-semibold text-[11px] text-slate-900">{parts[0]}</span>
                        {parts[1] && !parts[1].match(/\d{4}/) && (
                          <span className="text-[11px] text-slate-600 ml-1">| {parts[1]}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 italic flex-shrink-0">
                        {parts.find((p) => p.match(/\d{4}/)) || ''}
                      </span>
                    </div>
                  );
                }

                // Skills line with commas
                if (section.title.toLowerCase().includes('skill') && line.includes(',')) {
                  const colonIdx = line.indexOf(':');
                  if (colonIdx > 0) {
                    return (
                      <div key={lineIdx} className="text-[11px] leading-relaxed">
                        <span className="font-semibold text-slate-900">
                          {line.substring(0, colonIdx)}:
                        </span>
                        <span className="text-slate-700">{line.substring(colonIdx + 1)}</span>
                      </div>
                    );
                  }
                }

                return (
                  <p key={lineIdx} className="text-[11px] text-slate-700 leading-relaxed">
                    {line}
                  </p>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Styled version for Print Preview
export function ResumePreviewStyled({ text, className = '' }: ResumePreviewProps) {
  const parsed = useMemo(() => parseResumeText(text), [text]);

  return (
    <div
      className={`bg-white text-slate-800 p-10 min-h-full ${className}`}
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      {/* Elegant Header */}
      <div className="text-center pb-5 mb-6 border-b-2 border-slate-300">
        <h1 className="text-2xl font-normal text-slate-900 tracking-[0.15em] uppercase">
          {parsed.name}
        </h1>
        {parsed.title && (
          <p className="text-sm text-slate-600 tracking-widest mt-2">{parsed.title}</p>
        )}
        {parsed.contactLine && (
          <p className="text-xs text-slate-500 mt-3 tracking-wide">{parsed.contactLine}</p>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {parsed.sections.length > 0
          ? parsed.sections.map((section, idx) => (
              <div key={idx}>
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-700 border-b border-slate-400 pb-1 mb-3">
                  {section.title}
                </h2>
                <div className="space-y-1.5 pl-1">
                  {section.content.map((line, lineIdx) => {
                    const isBullet =
                      line.startsWith('-') || line.startsWith('•') || line.startsWith('*');
                    const bulletText = isBullet ? line.replace(/^[-•*]\s*/, '') : line;
                    const hasDate = line.match(/\b(19|20)\d{2}\b/);

                    if (isBullet) {
                      return (
                        <div
                          key={lineIdx}
                          className="flex gap-3 text-[11px] text-slate-700 leading-relaxed pl-2"
                        >
                          <span className="text-slate-400">◆</span>
                          <span>{bulletText}</span>
                        </div>
                      );
                    }

                    if (hasDate) {
                      return (
                        <p
                          key={lineIdx}
                          className="text-[11px] text-slate-800 leading-relaxed font-semibold mt-2 first:mt-0"
                        >
                          {line}
                        </p>
                      );
                    }

                    return (
                      <p key={lineIdx} className="text-[11px] text-slate-700 leading-relaxed">
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))
          : // Fallback: show raw lines with basic formatting
            parsed.rawLines.slice(1).map((line, idx) => {
              const isBullet = line.startsWith('-') || line.startsWith('•');
              const isHeader = line === line.toUpperCase() && line.length < 30;

              if (isHeader) {
                return (
                  <h2
                    key={idx}
                    className="text-sm font-bold uppercase tracking-[0.2em] text-slate-700 border-b border-slate-400 pb-1 mt-4 mb-3"
                  >
                    {line}
                  </h2>
                );
              }

              if (isBullet) {
                return (
                  <div
                    key={idx}
                    className="flex gap-3 text-[11px] text-slate-700 leading-relaxed pl-2"
                  >
                    <span className="text-slate-400">◆</span>
                    <span>{line.replace(/^[-•*]\s*/, '')}</span>
                  </div>
                );
              }

              return (
                <p key={idx} className="text-[11px] text-slate-700 leading-relaxed">
                  {line}
                </p>
              );
            })}
      </div>
    </div>
  );
}
