import jsPDF from 'jspdf';

export interface ResumeData {
  improvedText: string;
  fileName: string;
  atsScore?: number;
}

export async function exportResumeToPDF(resumeData: ResumeData): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);

  // Fonts and sizes
  const fontSize = 11;
  const lineHeight = 6;

  pdf.setFontSize(fontSize);

  // Split text into lines that fit the page width
  const lines = pdf.splitTextToSize(resumeData.improvedText, contentWidth);

  let yPosition = margin;

  // Add text to PDF, handling page breaks
  lines.forEach((line: string) => {
    if (yPosition + lineHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.text(line, margin, yPosition);
    yPosition += lineHeight;
  });

  // Generate filename
  const fileName = resumeData.fileName.replace(/\.[^/.]+$/, '') || 'resume';
  const timestamp = new Date().toISOString().split('T')[0];
  const pdfFileName = `${fileName}_optimized_${timestamp}.pdf`;

  // Download the PDF
  pdf.save(pdfFileName);
}

export async function exportResumeWithFormattingToPDF(
  htmlContent: string,
  fileName: string
): Promise<void> {
  // Create a temporary container for rendering
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '210mm'; // A4 width
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

    // Use html method for better formatting
    await pdf.html(container, {
      callback: (doc) => {
        const timestamp = new Date().toISOString().split('T')[0];
        const pdfFileName = `${fileName.replace(/\.[^/.]+$/, '')}_optimized_${timestamp}.pdf`;
        doc.save(pdfFileName);
      },
      x: 0,
      y: 0,
      width: 210, // A4 width in mm
      windowWidth: 800, // Virtual window width for rendering
    });
  } finally {
    document.body.removeChild(container);
  }
}
