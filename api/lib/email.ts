import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: parseInt(env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendVerificationEmail(email: string, token: string) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('Email not configured - verification email not sent');
    return;
  }

  const verificationUrl = `${env.APP_URL}/verify-email?token=${token}`;

  await transport.sendMail({
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to: email,
    subject: 'Verify your Resume Repairer account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Resume Repairer!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}"
           style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          If you didn't create an account, please ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('Email not configured - password reset email not sent');
    return;
  }

  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;

  await transport.sendMail({
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to: email,
    subject: 'Reset your Resume Repairer password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="${resetUrl}"
           style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, name?: string) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('Email not configured - welcome email not sent');
    return;
  }

  await transport.sendMail({
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to: email,
    subject: 'Welcome to Resume Repairer!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome${name ? `, ${name}` : ''}!</h2>
        <p>Your Resume Repairer account has been verified successfully.</p>
        <p>You now have access to:</p>
        <ul>
          <li>AI-powered resume optimization</li>
          <li>ATS scoring and analysis</li>
          <li>Cover letter generation</li>
          <li>1 free credit to get started</li>
        </ul>
        <a href="${env.APP_URL}"
           style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Get Started
        </a>
        <p>Happy job hunting!</p>
      </div>
    `,
  });
}
