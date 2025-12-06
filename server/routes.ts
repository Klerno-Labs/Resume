import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { parseFile } from "./lib/fileParser";
import { optimizeResume, generateCoverLetter } from "./lib/openai";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { generateToken, requireAuth } from "./lib/jwt";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "./lib/email";
import { env } from "./lib/env";
import Stripe from "stripe";

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
      'text/plain'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
});

// Initialize Stripe if configured
let stripe: Stripe | null = null;
if (env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
  });
}

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: "Too many uploads, please try again later.",
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "Too many requests, please try again later.",
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Apply general API rate limiting
  app.use("/api", apiLimiter);

  // Auth routes
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user with free plan and 1 free credit
      const user = await storage.createUser({
        email,
        passwordHash,
        name,
        plan: "free",
        creditsRemaining: 1,
        verificationToken,
      });

      // Send verification email (non-blocking)
      sendVerificationEmail(email, verificationToken).catch(err => {
        console.error("Failed to send verification email:", err);
      });

      // Generate JWT token
      const token = generateToken({ userId: user.id, email: user.email });

      // Set cookie
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
        }
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
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
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

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
        user = await storage.createUser({
          email: googleUser.email,
          passwordHash: `google_oauth_${googleUser.id}`, // Placeholder for OAuth users
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
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return res.json({ success: true, message: "If the email exists, a reset link has been sent" });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.setPasswordResetToken(user.id, resetToken, resetTokenExpiry);

      // Send reset email
      await sendPasswordResetEmail(email, resetToken);

      res.json({ success: true, message: "If the email exists, a reset link has been sent" });
    } catch (error: any) {
      console.error("Password reset request error:", error);
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

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);
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

      // Check user credits
      const user = await storage.getUser(userId);
      if (!user || user.creditsRemaining <= 0) {
        return res.status(403).json({ error: "No credits remaining" });
      }

      // Parse file
      const originalText = await parseFile(req.file.buffer, req.file.mimetype);

      if (!originalText || originalText.length < 100) {
        return res.status(400).json({ error: "Resume content is too short or could not be parsed" });
      }

      // Create resume record
      const resume = await storage.createResume({
        userId,
        fileName: req.file.originalname,
        originalText,
        status: "processing",
      });

      // Start optimization in background
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

          // Deduct credit
          await storage.updateUserCredits(userId, user.creditsRemaining - 1);
        })
        .catch(async (error) => {
          console.error("Optimization error:", error);
          await storage.updateResume(resume.id, {
            status: "failed",
          });
        });

      res.json({ resumeId: resume.id, status: "processing" });
    } catch (error: any) {
      console.error("Upload error:", error);
      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || "Failed to upload file" });
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

      const resumeText = resume.improvedText || resume.originalText;
      const result = await generateCoverLetter(resumeText, jobDescription, tone || "professional");

      const coverLetter = await storage.createCoverLetter({
        userId,
        resumeId,
        jobDescription,
        tone: tone || "professional",
        content: result.content,
      });

      res.json(coverLetter);
    } catch (error: any) {
      console.error("Cover letter generation error:", error);
      res.status(500).json({ error: "Failed to generate cover letter" });
    }
  });

  // Payment processing with Stripe
  app.post("/api/payments/create", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { plan } = req.body;

      if (!plan) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const amounts: Record<string, number> = {
        basic: 700,   // $7.00
        pro: 1900,    // $19.00
        premium: 2900, // $29.00
      };

      const amount = amounts[plan];
      if (!amount) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      // If Stripe is configured, create real payment intent
      if (stripe) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: 'usd',
          metadata: {
            userId,
            plan,
          },
        });

        const payment = await storage.createPayment({
          userId,
          plan,
          amount,
          status: "pending",
          stripePaymentId: paymentIntent.id,
        });

        res.json({
          paymentId: payment.id,
          clientSecret: paymentIntent.client_secret,
          status: "pending"
        });
      } else {
        // Fallback to mock payment for development
        const payment = await storage.createPayment({
          userId,
          plan,
          amount,
          status: "pending",
        });

        // Simulate success after 1 second
        setTimeout(async () => {
          await storage.updatePaymentStatus(payment.id, "completed", "mock_stripe_" + payment.id);

          // Update user plan and credits
          const credits: Record<string, number> = {
            basic: 1,
            pro: 3,
            premium: 999, // unlimited
          };

          await storage.updateUserPlan(userId, plan);
          await storage.updateUserCredits(userId, credits[plan]);
        }, 1000);

        res.json({ paymentId: payment.id, status: "pending", mock: true });
      }
    } catch (error: any) {
      console.error("Payment creation error:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // Stripe webhook handler
  if (stripe && env.STRIPE_WEBHOOK_SECRET) {
    app.post("/api/webhooks/stripe", async (req, res) => {
      const sig = req.headers['stripe-signature'];

      if (!sig) {
        return res.status(400).send('No signature');
      }

      try {
        const event = stripe!.webhooks.constructEvent(
          req.rawBody as Buffer,
          sig,
          env.STRIPE_WEBHOOK_SECRET!
        );

        if (event.type === 'payment_intent.succeeded') {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const { userId, plan } = paymentIntent.metadata;

          // Find payment by Stripe ID
          const payments = await storage.getPaymentsByUser(userId);
          const payment = payments.find(p => p.stripePaymentId === paymentIntent.id);

          if (payment) {
            await storage.updatePaymentStatus(payment.id, "completed", paymentIntent.id);

            // Update user plan and credits
            const credits: Record<string, number> = {
              basic: 1,
              pro: 3,
              premium: 999,
            };

            await storage.updateUserPlan(userId, plan);
            await storage.updateUserCredits(userId, credits[plan]);
          }
        }

        res.json({ received: true });
      } catch (error: any) {
        console.error("Webhook error:", error);
        res.status(400).send(`Webhook Error: ${error.message}`);
      }
    });
  }

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
