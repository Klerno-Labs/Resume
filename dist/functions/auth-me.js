// Bundled by esbuild for Vercel deployment


// api/_shared.ts
import jwt from "jsonwebtoken";
import { parse } from "cookie";
import { neon } from "@neondatabase/serverless";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
var sql = neon(process.env.DATABASE_URL);
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}
async function getUserFromRequest(req) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies.token;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const users = await sql`SELECT * FROM users WHERE id = ${decoded.userId}`;
  return users[0] || null;
}
function setCORS(req, headers) {
  const allowedOrigins = [
    "https://rewriteme.app",
    "http://localhost:5174",
    "http://localhost:3003",
    "http://localhost:5000"
  ];
  const origin = req.headers.origin || "";
  const isAllowed = allowedOrigins.includes(origin) || origin.includes("vercel.app");
  headers["Access-Control-Allow-Credentials"] = "true";
  headers["Access-Control-Allow-Origin"] = isAllowed ? origin : allowedOrigins[0];
  headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization";
}

// api/auth/me.ts
async function handler(req, res) {
  try {
    const headers = {};
    setCORS(req, headers);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.json({
        authenticated: false,
        user: null
      });
    }
    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        creditsRemaining: user.credits_remaining,
        emailVerified: user.email_verified
      }
    });
  } catch (error) {
    console.error("[/api/auth/me] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
export {
  handler as default
};
