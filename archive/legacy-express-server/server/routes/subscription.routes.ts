import { Router } from 'express';
import { z } from 'zod';
import { PaymentService } from '../services/payment.service';
import { requireAuth } from '../lib/jwt';

const router = Router();
const paymentService = new PaymentService();

router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { planId } = z
      .object({
        planId: z.enum(['starter', 'professional', 'business']),
        billingInterval: z.enum(['month', 'year']).optional(),
      })
      .parse(req.body);

    const session = await paymentService.createSubscriptionCheckout((req as any).userId, planId, {
      billingInterval: req.body.billingInterval,
    });
    res.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Checkout failed',
    });
  }
});

router.post('/credits/checkout', requireAuth, async (req, res) => {
  try {
    const { packSize } = z
      .object({
        packSize: z.enum(['small', 'medium', 'large']),
      })
      .parse(req.body);

    const session = await paymentService.createCreditCheckout((req as any).userId, packSize);
    res.json({ sessionUrl: session.url });
  } catch (error) {
    res.status(400).json({ error: 'Credit purchase failed' });
  }
});

router.get('/details', requireAuth, async (req, res) => {
  try {
    const details = await paymentService.getSubscriptionDetails((req as any).userId);
    res.json(details);
  } catch {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const result = await paymentService.cancelSubscription((req as any).userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Cancellation failed',
    });
  }
});

router.post('/portal', requireAuth, async (req, res) => {
  try {
    const session = await paymentService.createPortalSession((req as any).userId);
    res.json({ portalUrl: session.url });
  } catch {
    res.status(400).json({ error: 'Failed to open billing portal' });
  }
});

export default router;
