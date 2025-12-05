import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { parseFile } from "./lib/fileParser";
import { optimizeResume, generateCoverLetter } from "./lib/openai";
import { z } from "zod";
import bcrypt from "bcryptjs";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user with free plan and 1 free credit
      const user = await storage.createUser({
        email,
        passwordHash,
        name,
        plan: "free",
        creditsRemaining: 1,
      });

      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name,
          plan: user.plan,
          creditsRemaining: user.creditsRemaining,
        } 
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
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

      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name,
          plan: user.plan,
          creditsRemaining: user.creditsRemaining,
        } 
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Resume upload and optimization
  app.post("/api/resumes/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.body.userId; // In production, get from session/JWT
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check user credits
      const user = await storage.getUser(userId);
      if (!user || user.creditsRemaining <= 0) {
        return res.status(403).json({ error: "No credits remaining" });
      }

      // Parse file
      const originalText = await parseFile(req.file.buffer, req.file.mimetype);

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
      res.status(500).json({ error: error.message || "Failed to upload file" });
    }
  });

  // Get resume status and results
  app.get("/api/resumes/:id", async (req, res) => {
    try {
      const resume = await storage.getResume(req.params.id);
      
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      res.json(resume);
    } catch (error: any) {
      console.error("Get resume error:", error);
      res.status(500).json({ error: "Failed to fetch resume" });
    }
  });

  // Get user's resumes
  app.get("/api/users/:userId/resumes", async (req, res) => {
    try {
      const resumes = await storage.getResumesByUser(req.params.userId);
      res.json(resumes);
    } catch (error: any) {
      console.error("Get resumes error:", error);
      res.status(500).json({ error: "Failed to fetch resumes" });
    }
  });

  // Generate cover letter
  app.post("/api/cover-letters/generate", async (req, res) => {
    try {
      const { userId, resumeId, jobDescription, tone } = req.body;

      if (!userId || !resumeId || !jobDescription) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const resume = await storage.getResume(resumeId);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
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

  // Payment processing (mock - would integrate with Stripe in production)
  app.post("/api/payments/create", async (req, res) => {
    try {
      const { userId, plan } = req.body;

      if (!userId || !plan) {
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

      const payment = await storage.createPayment({
        userId,
        plan,
        amount,
        status: "pending",
      });

      // In production, create Stripe payment intent here
      // For now, simulate success
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

      res.json({ paymentId: payment.id, status: "pending" });
    } catch (error: any) {
      console.error("Payment creation error:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // Get payment status
  app.get("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      res.json(payment);
    } catch (error: any) {
      console.error("Get payment error:", error);
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  return httpServer;
}
