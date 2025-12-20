// Bundled by esbuild for Vercel deployment


// api/health.ts
async function handler(req, res) {
  return res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasJwt: !!process.env.JWT_SECRET,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasStripe: !!process.env.STRIPE_SECRET_KEY
    }
  });
}
export {
  handler as default
};
