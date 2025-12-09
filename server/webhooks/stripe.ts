import { Router } from "express";
import { PaymentService } from "../services/payment.service";

const router = Router();
const paymentService = new PaymentService();

router.post("/stripe", async (req, res, next) => {
  try {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      return res.status(400).json({ message: "Stripe signature required" });
    }

    if (!req.rawBody || !(req.rawBody instanceof Buffer)) {
      return res.status(400).json({ message: "Invalid request body" });
    }
    const result = await paymentService.handleWebhook(req.rawBody, signature);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
