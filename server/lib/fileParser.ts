import mammoth from 'mammoth';

type PdfParseModule = typeof import('pdf-parse');
type PdfParseFunction = (buffer: Buffer) => Promise<{ text: string }>;

let cachedPdfParse: PdfParseFunction | null = null;

async function resolvePdfParse(): Promise<PdfParseFunction> {
  if (cachedPdfParse) {
    return cachedPdfParse;
  }

  const module = await import('pdf-parse');
  const resolved = (module as PdfParseModule).default ?? module;
  cachedPdfParse = resolved as PdfParseFunction;
  return cachedPdfParse;
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Remove excessive blank lines
    .replace(/[ \t]+/g, ' ') // Normalize whitespace
    .trim();
}

function validateExtractedText(text: string, filename: string): void {
  const MIN_TEXT_LENGTH = 50;

  if (!text || text.trim().length === 0) {
    throw new Error(`File appears to be empty or corrupted: ${filename}`);
  }

  if (text.trim().length < MIN_TEXT_LENGTH) {
    throw new Error(
      `File contains insufficient text content (minimum ${MIN_TEXT_LENGTH} characters required): ${filename}`
    );
  }
}

export async function parseFile(
  buffer: Buffer,
  mimetype: string,
  filename: string = 'unknown'
): Promise<string> {
  try {
    let rawText = '';

    // PDF parsing
    if (mimetype === 'application/pdf') {
      const pdfParse = await resolvePdfParse();
      const data = await pdfParse(buffer);
      rawText = data.text;
    }
    // DOCX parsing - handle multiple MIME types
    else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/zip' ||
      mimetype === 'application/x-zip' ||
      mimetype === 'application/x-zip-compressed' ||
      mimetype === 'application/octet-stream'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });

        if (result.messages.length > 0) {
          console.log(`[FileParser] Mammoth warnings for ${filename}:`, result.messages);
        }

        rawText = result.value;
      } catch (mammothError) {
        throw new Error(
          `Failed to parse DOCX file. The file may be corrupted or in an unsupported format.`
        );
      }
    }
    // Legacy .doc files are not parsed by the server
    else if (mimetype === 'application/msword' || mimetype === 'application/vnd.ms-word') {
      throw new Error(
        'Legacy .doc files are not supported. Please convert to .docx or PDF before uploading.'
      );
    }
    // Plain text
    else if (mimetype === 'text/plain') {
      rawText = buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${mimetype}. Please upload PDF, DOCX, or TXT files.`);
    }

    // Clean and validate the extracted text
    const cleanedText = cleanExtractedText(rawText);
    validateExtractedText(cleanedText, filename);

    return cleanedText;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to parse file: ${String(error)}`);
  }
}
