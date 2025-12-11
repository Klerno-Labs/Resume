import type { Express } from 'express';
import crypto from 'crypto';
import { parseFile } from '../lib/fileParser';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors';
import { storage, db } from '../storage';
import { usageRecords } from '../../shared/schema';
import { and, eq, gte } from 'drizzle-orm';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export class ResumeService {
  async uploadAndProcess(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new ValidationError('File is required');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError('File size exceeds 10MB limit');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError('Invalid file type. Only PDF, DOCX, and TXT files are allowed.');
    }

    const user = await storage.getUser(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.plan === 'free') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const freeUsageThisMonth = await db
        .select()
        .from(usageRecords)
        .where(
          and(
            eq(usageRecords.userId, userId),
            eq(usageRecords.action, 'resume_optimization'),
            gte(usageRecords.createdAt, startOfMonth)
          )
        );

      if (freeUsageThisMonth.length >= 1) {
        throw new ForbiddenError(
          'Free plan limit reached for this month. Upgrade to continue optimizing.'
        );
      }
    }

    if (user.creditsRemaining <= 0) {
      throw new ForbiddenError('Insufficient credits');
    }

    const originalText = (await parseFile(file.buffer, file.mimetype)) || 'Uploaded resume content';
    const contentHash = crypto.createHash('sha256').update(originalText).digest('hex');

    const resume = await storage.createResume({
      userId,
      fileName: file.originalname,
      originalText,
      status: 'processing',
      contentHash,
      originalFileName: file.originalname,
    });

    await storage.updateUserCredits(userId, user.creditsRemaining - 1);
    await db.insert(usageRecords).values({
      userId,
      subscriptionId: user.currentSubscriptionId,
      action: 'resume_optimization',
      creditsUsed: 1,
      metadata: { fileName: file.originalname },
    });

    return resume;
  }

  async getResumeAnalysis(resumeId: string, userId: string) {
    const resume = await storage.getResume(resumeId);
    if (!resume || resume.userId !== userId) {
      throw new NotFoundError('Resume not found or unauthorized');
    }

    return resume;
  }
}
