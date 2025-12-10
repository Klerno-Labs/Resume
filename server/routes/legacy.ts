import type { Express } from "express";
import type { Server } from "http";
import { storage } from "../storage";
import multer from "multer";
import { parseFile } from "../lib/fileParser";
import { optimizeResume, generateCoverLetter } from "../lib/openai";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateToken, requireAuth } from "../lib/jwt";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../lib/email";
import { env } from "../lib/env";
import Stripe from "stripe";
import { getResumeTemplates, isFigmaConfigured } from "../lib/figma";
import { authLimiter, uploadLimiter } from "../lib/rateLimiter";
import { validateRequest } from "../middleware/validation";
import { registerSchema, loginSchema } from "../validators/auth.validators";
import { sanitizeText } from "../lib/sanitize";
import { AuthService } from "../services/auth.service";
import { ReferralService } from "../services/referral.service";
import { EmailCampaignService } from "../services/email-campaigns.service";
import { passwordSchema } from "../../shared/validators";
import type { User } from "../../shared/schema";

// File upload configuration with security limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.ms-word',
      'text/plain',
      'application/zip',
      'application/x-zip',
      'application/x-zip-compressed',
      'application/octet-stream'
    ];

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const fileName = file.originalname.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    // Check MIME type first
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else if (hasValidExtension) {
      // Fallback to extension-based validation (some browsers send incorrect MIME types for DOCX)
      console.log(`[FileFilter] Accepting file with MIME type fallback: ${file.originalname} (MIME: ${file.mimetype})`);
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed. Received: ${file.mimetype}`));
    }
  }
});

// Initialize Stripe if configured
let stripe: Stripe | null = null;
const isTestEnv = process.env.NODE_ENV === "test";
if (env.STRIPE_SECRET_KEY && !isTestEnv) {
  stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  });
}

export function registerLegacyRoutes(
  httpServer: Server,
  app: Express
): Server {
  const authService = new AuthService();
  const referralService = new ReferralService();
  const emailCampaignService = new EmailCampaignService();

  // Auth routes
  app.post(
    "/api/auth/register",
    authLimiter,
    validateRequest(registerSchema),
    async (req, res, next) => {
      try {
        const { email, password, name, referralCode } = req.body as {
          email: string;
          password: string;
          name?: string;
          referralCode?: string;
        };

        const safeName = name ? sanitizeText(name) : undefined;
        const { user, token, verificationToken } = await authService.register({
          email,
          password,
          name: safeName,
        });

        if (referralCode) {
          try {
            await referralService.applyReferralCode(user.id, referralCode);
          } catch (err) {
            console.warn("Referral code not applied:", err);
          }
        }

        sendVerificationEmail(email, verificationToken).catch((err) => {
          console.error("Failed to send verification email:", err);
        });

        emailCampaignService.sendWelcomeEmail(user.id).catch((err) => {
          console.error("Failed to send welcome email:", err);
        });

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(201).json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            creditsRemaining: user.creditsRemaining,
            emailVerified: !!user.emailVerified,
          },
          token,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/auth/login",
    authLimiter,
    validateRequest(loginSchema),
    async (req, res, next) => {
      try {
        const { email, password } = req.body as { email: string; password: string };
        const { user, token } = await authService.login({ email, password });

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            creditsRemaining: user.creditsRemaining,
            emailVerified: !!user.emailVerified,
          },
          token,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  // Google OAuth - Initiate
  app.get("/api/auth/google", (req, res) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: "Google OAuth is not configured" });
    }

    const redirectUri = `${env.APP_URL}/api/auth/google/callback`;
    const scope = encodeURIComponent("email profile");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    
    res.redirect(authUrl);
  });

  // Google OAuth - Callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        return res.redirect("/auth?error=no_code");
      }

      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        return res.redirect("/auth?error=oauth_not_configured");
      }

      const redirectUri = `${env.APP_URL}/api/auth/google/callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        console.error("Token exchange failed:", await tokenResponse.text());
        return res.redirect("/auth?error=token_exchange_failed");
      }

      const tokens = await tokenResponse.json() as { access_token: string };

      // Get user info from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        return res.redirect("/auth?error=user_info_failed");
      }

      const googleUser = await userInfoResponse.json() as { email: string; name?: string; id: string };

      // Check if user exists
      let user = await storage.getUserByEmail(googleUser.email);

      // Check if this is an admin email
      const adminEmails = (env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
      const isAdmin = adminEmails.includes(googleUser.email.toLowerCase());

      if (!user) {
        // Create new user with Google OAuth (no password needed)
        // Use a cryptographically secure random token instead of predictable placeholder
        const secureOAuthToken = crypto.randomBytes(32).toString('hex');
        user = await storage.createUser({
          email: googleUser.email,
          passwordHash: `oauth_${secureOAuthToken}`,
          name: googleUser.name,
          plan: isAdmin ? "admin" : "free",
          creditsRemaining: isAdmin ? 9999 : 1,
          verificationToken: null,
        });

        // Mark email as verified since Google already verified it
        await storage.verifyUserEmail(user.id);
      } else if (isAdmin && user.plan !== 'admin') {
        // Upgrade existing user to admin if they're in admin list
        await storage.updateUserPlan(user.id, 'admin', 9999);
        user.plan = 'admin';
        user.creditsRemaining = 9999;
      }

      // Generate JWT token
      const token = generateToken({ userId: user.id, email: user.email });

      // Set cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect to home page where user can upload resume
      res.redirect("/");
    } catch (error: any) {
      console.error("Google OAuth error:", error);
      res.redirect("/auth?error=oauth_failed");
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          creditsRemaining: user.creditsRemaining,
          emailVerified: !!user.emailVerified,
        }
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Email verification
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      await storage.verifyUserEmail(user.id);

      // Send welcome email
      sendWelcomeEmail(user.email, user.name || undefined).catch(err => {
        console.error("Failed to send welcome email:", err);
      });

      res.json({ success: true, message: "Email verified successfully" });
    } catch (error: any) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Request password reset
  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    const startTime = Date.now();
    const MINIMUM_RESPONSE_TIME = 200; // milliseconds

    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      if (user) {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await storage.setPasswordResetToken(user.id, resetToken, resetTokenExpiry);

        // Send reset email (don't await to avoid timing differences)
        sendPasswordResetEmail(email, resetToken).catch((err) => {
          console.error("Failed to send password reset email:", err);
        });
      }

      // Add constant-time delay to prevent timing attacks
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, MINIMUM_RESPONSE_TIME - elapsed);

      await new Promise(resolve => setTimeout(resolve, remainingDelay));

      // Always return the same message regardless of whether user exists
      res.json({ success: true, message: "If the email exists, a reset link has been sent" });
    } catch (error: any) {
      console.error("Password reset request error:", error);

      // Ensure minimum response time even on error
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, MINIMUM_RESPONSE_TIME - elapsed);
      await new Promise(resolve => setTimeout(resolve, remainingDelay));

      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }

      try {
        passwordSchema.parse(password);
      } catch (error) {
        const message =
          error instanceof z.ZodError && error.errors[0]?.message
            ? error.errors[0].message
            : "Invalid password";
        return res.status(400).json({ error: message });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 12);
      await storage.updatePassword(user.id, passwordHash);

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Resume upload and optimization (protected route)
  app.post("/api/resumes/upload", requireAuth, uploadLimiter, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = (req as any).userId;

      // STEP 1: Parse file BEFORE deducting credits
      let originalText: string | undefined;
      try {
        originalText = await parseFile(req.file.buffer, req.file.mimetype, req.file.originalname);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("File parse error:", errorMessage);
        return res.status(400).json({ error: errorMessage });
      }

      // STEP 2: Validate parsed content
      if (!originalText || originalText.length < 100) {
        return res.status(400).json({
          error: "Resume content is too short or could not be parsed. Please try another file."
        });
      }

      // STEP 3: Log upload
      console.log(`[Upload] User ${userId} uploaded "${req.file.originalname}"`);

      // STEP 5: New resume - deduct credit atomically
      const userAfterDeduction = await storage.deductCreditAtomic(userId);

      if (!userAfterDeduction) {
        return res.status(403).json({ error: "No credits remaining" });
      }

      console.log(`[Credit] Deducted 1 credit from user ${userId}. Remaining: ${userAfterDeduction.creditsRemaining}`);

      const resume = await storage.createResume({
        userId,
        fileName: req.file.originalname,
        originalText,
        status: "processing",
      });

      console.log(`[Resume] Created resume ${resume.id} for user ${userId}`);

      // STEP 7: Start optimization in background
      optimizeResume(originalText)
        .then(async (result) => {
          await storage.updateResume(resume.id, {
            improvedText: result.improvedText,
            atsScore: result.atsScore,
            keywordsScore: result.keywordsScore,
            formattingScore: result.formattingScore,
            issues: result.issues,
            status: "completed",
          });
          console.log(`[Optimize] Completed optimization for resume ${resume.id}`);
        })
        .catch(async (error) => {
          console.error(`[Optimize] Failed for resume ${resume.id}:`, error);
          await storage.updateResume(resume.id, {
            status: "failed",
          });
          // Refund credit on optimization failure
          await storage.updateUserCredits(userId, userAfterDeduction.creditsRemaining + 1);
          console.log(`[Credit] Refunded 1 credit to user ${userId} due to optimization failure`);
        });

      res.json({
        resumeId: resume.id,
        status: "processing",
      });

    } catch (error: unknown) {
      console.error("Upload error:", error);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
      }

      // Provide detailed error information
      if (error instanceof Error && error.message.includes('Invalid file type')) {
        return res.status(400).json({ error: error.message });
      }

      // Database or other errors
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
      res.status(500).json({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Get resume status and results (protected)
  app.get("/api/resumes/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resume = await storage.getResume(req.params.id);

      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Verify ownership
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      res.json(resume);
    } catch (error: any) {
      console.error("Get resume error:", error);
      res.status(500).json({ error: "Failed to fetch resume" });
    }
  });

  // Get user's resumes (protected)
  app.get("/api/users/:userId/resumes", requireAuth, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).userId;
      const requestedUserId = req.params.userId;

      // Users can only fetch their own resumes
      if (authenticatedUserId !== requestedUserId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const resumes = await storage.getResumesByUser(requestedUserId);
      res.json(resumes);
    } catch (error: any) {
      console.error("Get resumes error:", error);
      res.status(500).json({ error: "Failed to fetch resumes" });
    }
  });

  // Generate cover letter (protected)
  app.post("/api/cover-letters/generate", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { resumeId, jobDescription, tone } = req.body;

      if (!resumeId || !jobDescription) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const resume = await storage.getResume(resumeId);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Verify ownership
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const cleanJobDescription = sanitizeText(jobDescription);
      const resumeText = resume.improvedText || resume.originalText;
      const result = await generateCoverLetter(resumeText, cleanJobDescription, tone || "professional");

      const coverLetter = await storage.createCoverLetter({
        userId,
        resumeId,
        jobDescription: cleanJobDescription,
        tone: tone || "professional",
        content: result.content,
      });

      res.json(coverLetter);
    } catch (error: any) {
      console.error("Cover letter generation error:", error);
      res.status(500).json({ error: "Failed to generate cover letter" });
    }
  });

  // Fetch Figma-powered resume design templates
  app.get("/api/design/templates", requireAuth, async (req, res) => {
    try {
      if (!isFigmaConfigured()) {
        return res.status(503).json({ error: "Figma integration is not configured" });
      }

      const requestedFileKey = typeof req.query.fileKey === "string" ? req.query.fileKey : undefined;
      const fileKey = requestedFileKey || env.FIGMA_FILE_KEY;

      if (!fileKey) {
        return res.status(400).json({
          error: "Missing Figma file key. Provide ?fileKey=FILE_KEY or set FIGMA_FILE_KEY.",
        });
      }

      const templates = await getResumeTemplates(fileKey);

      res.json({
        templates,
        sourceFileKey: fileKey,
      });
    } catch (error: any) {
      console.error("Figma template fetch error:", error);
      res.status(500).json({ error: "Failed to fetch resume designs from Figma" });
    }
  });

  // Payment processing with Stripe
  app.post("/api/payments/create", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { plan } = req.body;

      if (!plan) {
        return res.status(400).json({ message: "Plan is required" });
      }

      const amounts: Record<User["plan"], number> = {
        free: 0,
        admin: 0,
        basic: 700,
        pro: 1900,
        premium: 2900,
      };

      const normalizedPlan = plan as User["plan"];
      const amount = amounts[normalizedPlan];
      if (!amount) {
        return res.status(400).json({ message: "Invalid plan" });
      }

      const credits: Record<User["plan"], number> = {
        free: 0,
        admin: 9999,
        basic: 1,
        pro: 3,
        premium: 999,
      };

      let sessionId: string;
      let url: string;
      let paymentId: string;

      if (stripe) {
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          currency: "usd",
          success_url: env.STRIPE_RETURN_URL || `${env.APP_URL}/payments/return`,
          cancel_url: env.STRIPE_RETURN_URL || `${env.APP_URL}/payments/cancel`,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: { name: `${plan} plan` },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
          metadata: { userId, plan },
        });

        const payment = await storage.createPayment({
          userId,
          plan: normalizedPlan,
          amount,
          status: "pending",
          stripeSessionId: session.id,
        });

        sessionId = session.id;
        url = session.url || "";
        paymentId = payment.id;
      } else {
        const payment = await storage.createPayment({
          userId,
          plan: normalizedPlan,
          amount,
          status: "pending",
        });

        sessionId = `cs_test_${payment.id}`;
        url = `https://checkout.stripe.com/pay/${sessionId}`;
        paymentId = payment.id;

        setTimeout(async () => {
          await storage.updatePaymentStatus(payment.id, "completed", sessionId);
          await storage.updateUserPlan(userId, normalizedPlan);
          await storage.updateUserCredits(userId, credits[normalizedPlan] ?? 0);
        }, 1000);
      }

      res.json({
        paymentId,
        sessionId,
        url,
        status: "pending",
      });
    } catch (error: any) {
      console.error("Payment creation error:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Stripe webhook handler
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      return res.status(400).json({ message: "Stripe signature required" });
    }

    // Always require valid Stripe configuration and signature verification
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      console.error("Stripe webhook received but Stripe is not properly configured");
      return res.status(503).json({ message: "Payment system not configured" });
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        env.STRIPE_WEBHOOK_SECRET,
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { userId, plan: planMetadata } = (session.metadata || {}) as {
          userId: string;
          plan: User["plan"];
        };

        if (session.payment_status === "paid" && userId && planMetadata) {
          const credits: Record<User["plan"], number> = {
            free: 0,
            admin: 9999,
            basic: 1,
            pro: 3,
            premium: 999,
          };

          const plan = planMetadata || "basic";
          await storage.updateUserPlan(userId, plan);
          await storage.updateUserCredits(userId, credits[plan] ?? 0);
        }
      }

      return res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      return res.status(400).json({ message: `Webhook Error: ${error.message}` });
    }
  });

  app.get("/api/payments/history", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const payments = await storage.getPaymentsByUser(userId);
      return res.json({ payments });
    } catch (error) {
      console.error("Payment history error:", error);
      return res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  // Get payment status (protected)
  app.get("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const payment = await storage.getPayment(req.params.id);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // Verify ownership
      if (payment.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      res.json(payment);
    } catch (error: any) {
      console.error("Get payment error:", error);
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  return httpServer;
}
