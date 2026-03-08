import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
const FROM_EMAIL = process.env.FROM_EMAIL || 'Robert <noreply@rewriteme.app>';

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://rewriteme.app'}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset your RewriteMe password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Reset Your Password</h2>
        <p style="color: #555; line-height: 1.6;">
          You requested a password reset for your RewriteMe account. Click the button below to set a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 32px; background: #6366F1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://rewriteme.app'}/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify your RewriteMe email',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Welcome to RewriteMe!</h2>
        <p style="color: #555; line-height: 1.6;">
          Thanks for signing up. Please verify your email address to get started with Robert.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 32px; background: #6366F1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Verify Email
        </a>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
