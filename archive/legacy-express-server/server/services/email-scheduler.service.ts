import { db } from '../db';
import { users } from '../../shared/schema';
import { EmailCampaignService } from './email-campaigns.service';
import { eq } from 'drizzle-orm';

export class EmailScheduler {
  private emailService = new EmailCampaignService();

  async runDailySchedule() {
    const allUsers = await db.select().from(users);
    const now = new Date();

    for (const user of allUsers) {
      const createdAt = user.createdAt ? new Date(user.createdAt) : null;
      if (!createdAt) continue;
      const daysSinceSignup = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceSignup === 0) {
        await this.emailService.sendWelcomeEmail(user.id);
      } else if (daysSinceSignup === 3) {
        await this.emailService.sendActivationNudge(user.id);
      } else if (daysSinceSignup === 7) {
        await this.emailService.sendUpgradePrompt(user.id);
      }
    }
  }
}
