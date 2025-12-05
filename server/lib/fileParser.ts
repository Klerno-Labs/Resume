import mammoth from "mammoth";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function parseFile(buffer: Buffer, mimetype: string): Promise<string> {
  try {
    // PDF parsing
    if (mimetype === "application/pdf") {
      const data = await pdfParse(buffer);
      return data.text;
    }

    // DOCX parsing
    if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // Plain text
    if (mimetype === "text/plain") {
      return buffer.toString("utf-8");
    }

    throw new Error("Unsupported file type. Please upload PDF, DOCX, or TXT files.");
  } catch (error: any) {
    throw new Error(`Failed to parse file: ${error.message}`);
  }
}
