import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
  SectionType,
} from 'docx';
import { saveAs } from 'file-saver';

const SECTION_HEADINGS = [
  'PROFESSIONAL SUMMARY',
  'SUMMARY',
  'EXPERIENCE',
  'WORK EXPERIENCE',
  'EDUCATION',
  'SKILLS',
  'CERTIFICATIONS',
  'PROJECTS',
  'AWARDS',
  'LANGUAGES',
  'VOLUNTEER',
  'REFERENCES',
];

function isHeading(line: string): boolean {
  const upper = line.trim().toUpperCase();
  return SECTION_HEADINGS.some((h) => upper === h || upper.startsWith(h));
}

function hexToRgb(hex: string): string {
  return hex.replace('#', '');
}

export async function downloadDocx(
  text: string,
  accentColor = '#6366F1',
  fileName = 'resume-rewriteme.docx'
) {
  const lines = text.split('\n');
  const accent = hexToRgb(accentColor);
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines but preserve spacing
    if (!line) {
      paragraphs.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    // First line = name
    if (i === 0) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 32,
              font: 'Calibri',
              color: accent,
            }),
          ],
        })
      );
      continue;
    }

    // Second line often has contact info (email | phone)
    if (i === 1 && (line.includes('@') || line.includes('|'))) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 200 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: accent },
          },
          children: [
            new TextRun({
              text: line,
              size: 18,
              font: 'Calibri',
              color: '666666',
            }),
          ],
        })
      );
      continue;
    }

    // Section headings
    if (isHeading(line)) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 120 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 4, color: accent },
          },
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 22,
              font: 'Calibri',
              color: accent,
              allCaps: true,
            }),
          ],
        })
      );
      continue;
    }

    // Bullet points
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 360 },
          children: [
            new TextRun({
              text: line.replace(/^[•\-*]\s*/, ''),
              size: 20,
              font: 'Calibri',
            }),
          ],
          bullet: { level: 0 },
        })
      );
      continue;
    }

    // Default paragraph
    paragraphs.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: line,
            size: 20,
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: { top: 720, bottom: 720, left: 1080, right: 1080 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}
