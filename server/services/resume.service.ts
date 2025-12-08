import type { Express } from "express";
import { parseFile } from "../lib/fileParser";
import { ForbiddenError, NotFoundError, ValidationError } from "../lib/errors";
import { storage } from "../storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export class ResumeService {
  async uploadAndProcess(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new ValidationError("File is required");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError("File size exceeds 10MB limit");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError("Invalid file type. Only PDF, DOCX, and TXT files are allowed.");
    }

    const user = await storage.getUser(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.creditsRemaining <= 0) {
      throw new ForbiddenError("Insufficient credits");
    }

    const originalText =
      (await parseFile(file.buffer, file.mimetype)) || "Uploaded resume content";

    const resume = await storage.createResume({
      userId,
      fileName: file.originalname,
      originalText,
      status: "processing",
    });

    await storage.updateUserCredits(userId, user.creditsRemaining - 1);

    return resume;
  }

  async getResumeAnalysis(resumeId: string, userId: string) {
    const resume = await storage.getResume(resumeId);
    if (!resume || resume.userId !== userId) {
      throw new NotFoundError("Resume not found or unauthorized");
    }

    return resume;
  }
}
