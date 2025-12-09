import { db } from "../db";
import { users, referrals } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class ReferralService {
  async generateReferralCode(userId: string): Promise<string> {
    const code = `RR${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
    return code;
  }

  async applyReferralCode(newUserId: string, referralCode: string) {
    const [referrer] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);

    if (!referrer) {
      throw new Error("Invalid referral code");
    }

    await db.insert(referrals).values({
      referrerId: referrer.id,
      referredId: newUserId,
      rewardCredits: 5,
    });

    await db
      .update(users)
      .set({
        referredBy: referrer.id,
        creditsRemaining: sql`credits_remaining + 5`,
      })
      .where(eq(users.id, newUserId));

    await db
      .update(users)
      .set({ creditsRemaining: referrer.creditsRemaining + 5 })
      .where(eq(users.id, referrer.id));

    await db
      .update(referrals)
      .set({ rewardGiven: true })
      .where(and(eq(referrals.referrerId, referrer.id), eq(referrals.referredId, newUserId)));

    return { success: true, creditsAwarded: 5 };
  }

  async getReferralStats(userId: string) {
    const allReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, userId));

    const totalReferrals = allReferrals.length;
    const paidConversions = allReferrals.filter((r) => r.convertedToPaid).length;
    const totalCreditsEarned = allReferrals.reduce(
      (sum, r) => sum + r.rewardCredits + (r.bonusCredits || 0),
      0,
    );

    return {
      totalReferrals,
      paidConversions,
      totalCreditsEarned,
      conversionRate: totalReferrals > 0 ? (paidConversions / totalReferrals) * 100 : 0,
    };
  }
}
