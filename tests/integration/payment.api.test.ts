import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app, appReady } from "../../server/index";
import { setupTestDb, teardownTestDb, clearDb } from "../helpers/db";

describe("Payment API Integration", () => {
  let db: any;
  let pool: any;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    await appReady;
    const setup = await setupTestDb();
    db = setup.db;
    pool = setup.pool;
  });

  afterAll(async () => {
    await teardownTestDb(pool);
  });

  beforeEach(async () => {
    await clearDb(db);

    const registerRes = await request(app).post("/api/auth/register").send({
      email: `payment-${Date.now()}@test.com`,
      password: "SecurePass123!@#",
      name: "Payment Test User",
    });

    authToken = registerRes.body.token;
    testUserId = registerRes.body.user.id;
  });

  describe("POST /api/payments/create", () => {
    it("should create Stripe checkout session for pro plan", async () => {
      const res = await request(app)
        .post("/api/payments/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ plan: "pro" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("sessionId");
      expect(res.body).toHaveProperty("url");
      expect(res.body.url).toMatch(/checkout\.stripe\.com/);
    });

    it("should create checkout session for premium plan", async () => {
      const res = await request(app)
        .post("/api/payments/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ plan: "premium" });

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toMatch(/^cs_test_/);
    });

    it("should reject invalid plan names", async () => {
      const res = await request(app)
        .post("/api/payments/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ plan: "invalid-plan-name" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid.*plan/i);
    });

    it("should reject missing plan parameter", async () => {
      const res = await request(app)
        .post("/api/payments/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/plan.*required/i);
    });

    it("should require authentication", async () => {
      const res = await request(app).post("/api/payments/create").send({ plan: "pro" });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/unauthorized|authentication/i);
    });

    it("should reject invalid JWT token", async () => {
      const res = await request(app)
        .post("/api/payments/create")
        .set("Authorization", "Bearer invalid-token-123")
        .send({ plan: "pro" });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/webhooks/stripe", () => {
    it("should process successful payment webhook", async () => {
      const mockWebhookPayload = {
        id: "evt_test_123",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            payment_status: "paid",
            amount_total: 1900,
            metadata: {
              userId: testUserId,
              plan: "pro",
            },
          },
        },
      };

      const res = await request(app)
        .post("/api/webhooks/stripe")
        .set("stripe-signature", "test-signature")
        .send(mockWebhookPayload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("received", true);
    });

    it("should reject webhook with missing signature", async () => {
      const res = await request(app).post("/api/webhooks/stripe").send({
        type: "checkout.session.completed",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/signature.*required/i);
    });

    it("should handle failed payment webhook", async () => {
      const mockWebhookPayload = {
        id: "evt_test_456",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_456",
            payment_status: "unpaid",
            metadata: { userId: testUserId, plan: "pro" },
          },
        },
      };

      const res = await request(app)
        .post("/api/webhooks/stripe")
        .set("stripe-signature", "test-signature")
        .send(mockWebhookPayload);

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/payments/history", () => {
    it("should return payment history for authenticated user", async () => {
      const res = await request(app)
        .get("/api/payments/history")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("payments");
      expect(Array.isArray(res.body.payments)).toBe(true);
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/payments/history");

      expect(res.status).toBe(401);
    });
  });
});
