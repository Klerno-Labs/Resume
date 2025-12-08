import type { Request, Response, NextFunction } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { subscriptions, users } from "../../shared/schema";

export async function detectTrialAbuse(
  email: string,
  ipAddress: string,
): Promise<{ isAbuser: boolean; reason?: string }> {
  const [local, domain] = email.toLowerCase().split("@");
  const baseLocal = local.split("+")[0];
  if (!domain) {
    return { isAbuser: false };
  }

  const similarEmails = await db
    .select()
    .from(users)
    .where(sql`${users.email} LIKE ${baseLocal}%@${domain}`);

  if (similarEmails.length > 2) {
    return { isAbuser: true, reason: "Multiple accounts with similar emails" };
  }

  // Placeholder: would need ip_address column on users or request log to enforce strictly.
  // Check for repeated cancellations after trial for this identity
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    const canceledTrials = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.status, "canceled"), eq(subscriptions.userId, user.id)));

    if (canceledTrials.length > 1) {
      return { isAbuser: true, reason: "History of cancelling after trial" };
    }
  }

  return { isAbuser: false };
}

export async function preventTrialAbuse(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || "";

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const abuseCheck = await detectTrialAbuse(email, ipAddress);

  if (abuseCheck.isAbuser) {
    return res.status(403).json({
      error: "Trial not available",
      message: "Based on account history, trial access is restricted. Please contact support.",
      reason: abuseCheck.reason,
    });
  }

  return next();
}
