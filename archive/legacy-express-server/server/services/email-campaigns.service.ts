import nodemailer from 'nodemailer';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { emailLogs, users } from '../../shared/schema';

export class EmailCampaignService {
  private transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  async sendWelcomeEmail(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return;

    const email = {
      to: user.email,
      from: process.env.EMAIL_FROM || 'noreply@resumerepairer.com',
      subject: '🎉 Welcome to Resume Repairer!',
      html: `
        <h1>Hi ${user.name || 'there'}!</h1>
        <p>Welcome to Resume Repairer! You're one step closer to landing your dream job.</p>
        <h2>Here's what you can do:</h2>
        <ul>
          <li>✨ Optimize your resume with AI (1 free credit included!)</li>
          <li>📊 Get your ATS compatibility score</li>
          <li>📄 Export as professional PDF</li>
        </ul>
        <a href="https://resumerepairer.com/dashboard" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Get Started
        </a>
        <p style="margin-top: 24px; color: #666;">
          <strong>Pro tip:</strong> Use code WELCOME50 for 50% off your first month when you upgrade!
        </p>
      `,
    };

    await this.transporter.sendMail(email);
    await db.insert(emailLogs).values({
      userId: user.id,
      type: 'transactional',
      subject: email.subject,
    });
  }

  async sendActivationNudge(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.totalCreditsUsed > 0) return;

    const email = {
      to: user.email,
      from: process.env.EMAIL_FROM || 'noreply@resumerepairer.com',
      subject: "Haven't uploaded your resume yet? Here's why you should ⏰",
      html: `
        <h1>Your free credit is waiting!</h1>
        <p>Hi ${user.name || 'there'},</p>
        <p>You signed up 3 days ago but haven't tried Resume Repairer yet. Here's what you're missing:</p>
        <ul>
          <li>🎯 <strong>AI rewrites weak bullet points</strong> into achievement-focused statements</li>
          <li>📈 <strong>Instant ATS score</strong> shows how recruiters' systems see your resume</li>
          <li>🔍 <strong>Keyword optimization</strong> helps you match job descriptions</li>
        </ul>
        <p><strong>It takes just 2 minutes to see results.</strong></p>
        <a href="https://resumerepairer.com/upload" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Try It Now (Free)
        </a>
      `,
    };

    await this.transporter.sendMail(email);
    await db.insert(emailLogs).values({
      userId: user.id,
      type: 'marketing',
      subject: email.subject,
    });
  }

  async sendUpgradePrompt(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.plan !== 'free' || user.totalCreditsUsed === 0) return;

    const email = {
      to: user.email,
      from: process.env.EMAIL_FROM || 'noreply@resumerepairer.com',
      subject: '🚀 Ready to level up your job search?',
      html: `
        <h1>You've used Resume Repairer ${user.totalCreditsUsed} time(s)!</h1>
        <p>Hi ${user.name || 'there'},</p>
        <p>Great job optimizing your resume! Users who upgrade get 3x more interviews on average.</p>
        <h2>Unlock unlimited optimizations for just $19/month:</h2>
        <ul>
          <li>✅ Unlimited resume optimizations</li>
          <li>✅ Cover letter generator</li>
          <li>✅ Remove watermarks from exports</li>
          <li>✅ GPT-4o for best results</li>
          <li>✅ Custom templates</li>
        </ul>
        <a href="https://resumerepairer.com/pricing?code=WELCOME50" style="background: linear-gradient(to right, #4F46E5, #7C3AED); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Upgrade with 50% Off
        </a>
        <p style="margin-top: 16px; font-size: 14px; color: #666;">
          Use code <strong>WELCOME50</strong> at checkout. Offer expires in 48 hours.
        </p>
      `,
    };

    await this.transporter.sendMail(email);
    await db.insert(emailLogs).values({
      userId: user.id,
      type: 'marketing',
      subject: email.subject,
    });
  }
}
