import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { ResumeService } from "../../server/services/resume.service";
import { setupTestDb, teardownTestDb, clearDb, createTestUser } from "../helpers/db";
import { users, resumes } from "../../shared/schema";

describe("ResumeService", () => {
  let testDb: any;
  let pool: any;
  let resumeService: ResumeService;
  let testUser: any;

  beforeAll(async () => {
    const setup = await setupTestDb();
    testDb = setup.db;
    pool = setup.pool;
    resumeService = new ResumeService();
  });

  afterAll(async () => {
    await teardownTestDb(pool);
  });

  beforeEach(async () => {
    await clearDb(testDb);
    testUser = await createTestUser(testDb);
  });

  describe("uploadAndProcess", () => {
    it("should process valid PDF resume", async () => {
      const mockFile = {
        originalname: "resume.pdf",
        buffer: Buffer.from("%PDF-1.4 mock pdf content"),
        mimetype: "application/pdf",
        size: 1024 * 500,
      } as Express.Multer.File;

      const result = await resumeService.uploadAndProcess(mockFile, testUser.id);

      expect(result).toHaveProperty("id");
      expect(result.status).toBe("processing");
      expect(result.fileName).toBe("resume.pdf");
      expect(result.userId).toBe(testUser.id);
    });

    it("should reject files exceeding 10MB limit", async () => {
      const largeFile = {
        originalname: "large.pdf",
        buffer: Buffer.alloc(11 * 1024 * 1024),
        mimetype: "application/pdf",
        size: 11 * 1024 * 1024,
      } as Express.Multer.File;

      await expect(resumeService.uploadAndProcess(largeFile, testUser.id)).rejects.toThrow(
        /10MB/i,
      );
    });

    it("should reject invalid file types", async () => {
      const invalidFile = {
        originalname: "malicious.exe",
        buffer: Buffer.from("MZ\x90\x00"),
        mimetype: "application/x-msdownload",
        size: 1024,
      } as Express.Multer.File;

      await expect(resumeService.uploadAndProcess(invalidFile, testUser.id)).rejects.toThrow(
        /invalid.*file.*type/i,
      );
    });

    it("should enforce credit balance requirement", async () => {
      await testDb.update(users).set({ creditsRemaining: 0 }).where(eq(users.id, testUser.id));

      const mockFile = {
        originalname: "resume.pdf",
        buffer: Buffer.from("%PDF-1.4 content"),
        mimetype: "application/pdf",
        size: 1024,
      } as Express.Multer.File;

      await expect(resumeService.uploadAndProcess(mockFile, testUser.id)).rejects.toThrow(
        /insufficient.*credit/i,
      );
    });

    it("should deduct credits after successful upload", async () => {
      const initialCredits = testUser.creditsRemaining;

      const mockFile = {
        originalname: "resume.pdf",
        buffer: Buffer.from("%PDF-1.4 content"),
        mimetype: "application/pdf",
        size: 1024,
      } as Express.Multer.File;

      await resumeService.uploadAndProcess(mockFile, testUser.id);

      const [updatedUser] = await testDb.select().from(users).where(eq(users.id, testUser.id));

      expect(updatedUser.creditsRemaining).toBe(initialCredits - 1);
    });
  });

  describe("getResumeAnalysis", () => {
    it("should return analysis for completed resume", async () => {
      const [resume] = await testDb
        .insert(resumes)
        .values({
          userId: testUser.id,
          fileName: "test.pdf",
          originalText: "content",
          status: "completed",
          atsScore: 85,
          analysis: { skills: ["JavaScript", "TypeScript"], improvements: ["Add metrics"] },
        })
        .returning();

      const analysis = await resumeService.getResumeAnalysis(resume.id, testUser.id);

      expect(analysis).toHaveProperty("atsScore", 85);
      expect(analysis?.analysis?.skills).toContain("JavaScript");
    });

    it("should throw error for resume belonging to different user", async () => {
      const otherUser = await createTestUser(testDb, "other@example.com");

      const [resume] = await testDb
        .insert(resumes)
        .values({
          userId: otherUser.id,
          fileName: "test.pdf",
          originalText: "content",
          status: "completed",
        })
        .returning();

      await expect(resumeService.getResumeAnalysis(resume.id, testUser.id)).rejects.toThrow(
        /not found|unauthorized/i,
      );
    });
  });
});
