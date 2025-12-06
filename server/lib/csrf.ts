import { doubleCsrf } from "csrf-csrf";
import { env } from "./env";

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => env.JWT_SECRET, // Use JWT secret for CSRF
  cookieName: "x-csrf-token",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

export { generateToken as generateCsrfToken, doubleCsrfProtection as csrfProtection };
