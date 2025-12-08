import { Router } from "express";
import { PaymentService } from "../services/payment.service";
import { requireAuth } from "../lib/jwt";
import { validateRequest } from "../middleware/validation";
import { z } from "zod";

const router = Router();
const paymentService = new PaymentService();

const checkoutSchema = z.object({
  planId: z.string().min(1),
});

router.post(
  "/checkout",
  requireAuth,
  validateRequest(checkoutSchema),
  async (req, res, next) => {
    try {
      const { planId } = req.body as { planId: string };
      const userId = (req as any).userId;
      const session = await paymentService.createSubscriptionCheckout(userId, planId);
      res.json(session);
    } catch (error) {
      next(error);
    }
  },
);

router.post("/cancel", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const result = await paymentService.cancelSubscription(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/reactivate", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const result = await paymentService.reactivateSubscription(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/usage", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const result = await paymentService.getSubscriptionAnalytics(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
