import jsPDF from 'jspdf';

export interface ResumeData {
  improvedText: string;
  fileName: string;
  atsScore?: number;
}

interface ParsedResume {
  name: string;
  title: string;
  contact: string[];
  sections: Array<{ title: string; content: string[] }>;
}

function parseResumeText(text: string): ParsedResume {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const name = lines[0] || "Your Name";
  let title = "";
  let startIdx = 1;
  
  if (lines[1] && !lines[1].includes('@') && !lines[1].match(/^\d/) && !lines[1].includes('|')) {
    title = lines[1];
    startIdx = 2;
  }
  
  // Extract contact lines
  const contact: string[] = [];
  for (let i = startIdx; i < Math.min(startIdx + 4, lines.length); i++) {
    const line = lines[i];
    if (line && (line.includes('@') || line.match(/\d{3}/) || line.includes(',') || line.includes('linkedin') || line.includes('github'))) {
      contact.push(line);
    }
  }
  
  // Parse sections
  const sections: ParsedResume['sections'] = [];
  const sectionHeaders = ['experience', 'education', 'skills', 'projects', 'certifications', 'summary', 'objective', 'achievements', 'awards', 'professional experience', 'work experience', 'technical skills'];
  
  let currentSection: { title: string; content: string[] } | null = null;
  
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase().replace(/[:\-–—]/g, '').trim();
    const isHeader = sectionHeaders.some(h => lineLower === h || lineLower.startsWith(h + ' '));
    
    if (isHeader) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.replace(/[:\-–—]/g, '').trim(), content: [] };
    } else if (currentSection) {
      currentSection.content.push(line);
    }
  }
  
  if (currentSection) sections.push(currentSection);
  
  return { name, title, contact, sections };
}

export async function exportResumeToPDF(resumeData: ResumeData): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  
  const parsed = parseResumeText(resumeData.improvedText);
  let y = margin;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const darkColor: [number, number, number] = [30, 41, 59];
  const grayColor: [number, number, number] = [100, 116, 139];

  // Helper function to check page break
  const checkPageBreak = (neededSpace: number) => {
    if (y + neededSpace > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  // Name - Large, elegant
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(...darkColor);
  pdf.text(parsed.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Title
  if (parsed.title) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...primaryColor);
    pdf.text(parsed.title.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  // Contact info - single line
  if (parsed.contact.length > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...grayColor);
    const contactLine = parsed.contact.slice(0, 3).join('  •  ');
    pdf.text(contactLine, pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  // Divider line
  y += 2;
  pdf.setDrawColor(...primaryColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Sections
  for (const section of parsed.sections) {
    checkPageBreak(20);
    
    // Section header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...darkColor);
    pdf.text(section.title.toUpperCase(), margin, y);
    
    // Underline
    const textWidth = pdf.getTextWidth(section.title.toUpperCase());
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y + 1, margin + textWidth, y + 1);
    y += 7;

    // Section content
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...darkColor);

    for (const line of section.content) {
      checkPageBreak(8);
      
      const isBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*');
      const bulletText = isBullet ? line.replace(/^[-•*]\s*/, '') : line;
      
      if (isBullet) {
        // Bullet point with proper formatting
        pdf.setTextColor(...primaryColor);
        pdf.text('▸', margin + 2, y);
        pdf.setTextColor(...darkColor);
        
        const bulletLines = pdf.splitTextToSize(bulletText, contentWidth - 8);
        for (let i = 0; i < bulletLines.length; i++) {
          if (i > 0) checkPageBreak(5);
          pdf.text(bulletLines[i], margin + 8, y);
          y += 5;
        }
      } else {
        // Check if it's a job title line (has dates or |)
        const isJobLine = line.includes('|') || line.match(/\d{4}/) || line.includes('–');
        
        if (isJobLine) {
          y += 2; // Extra space before job entries
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          
          // Split by | or – to separate title, company, dates
          const parts = line.split(/\s*[|–]\s*/);
          if (parts.length >= 2) {
            pdf.text(parts[0], margin, y);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(...grayColor);
            const dateText = parts[parts.length - 1];
            pdf.text(dateText, pageWidth - margin, y, { align: 'right' });
            if (parts.length > 2) {
              pdf.setTextColor(...darkColor);
              pdf.text(parts[1], margin + pdf.getTextWidth(parts[0]) + 4, y);
            }
          } else {
            pdf.text(line, margin, y);
          }
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...darkColor);
          y += 6;
        } else {
          // Regular text
          const wrappedLines = pdf.splitTextToSize(line, contentWidth);
          for (const wrappedLine of wrappedLines) {
            checkPageBreak(5);
            pdf.text(wrappedLine, margin, y);
            y += 5;
          }
        }
      }
    }
    
    y += 4; // Space after section
  }

  // Generate filename and save
  const fileName = resumeData.fileName.replace(/\.[^/.]+$/, '') || 'resume';
  const timestamp = new Date().toISOString().split('T')[0];
  pdf.save(`${fileName}_optimized_${timestamp}.pdf`);
}

export async function exportResumeWithFormattingToPDF(
  htmlContent: string,
  fileName: string
): Promise<void> {
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '210mm';
  container.style.padding = '20mm';
  container.style.backgroundColor = 'white';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '11pt';
  container.style.lineHeight = '1.5';

  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    await pdf.html(container, {
      callback: (doc) => {
        const timestamp = new Date().toISOString().split('T')[0];
        const pdfFileName = `${fileName.replace(/\.[^/.]+$/, '')}_optimized_${timestamp}.pdf`;
        doc.save(pdfFileName);
      },
      x: 0,
      y: 0,
      width: 210,
      windowWidth: 800,
    });
  } finally {
    document.body.removeChild(container);
  }
}
