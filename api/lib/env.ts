import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  DATABASE_TEST_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .refine((val) => {
      // In production, ensure the secret is not the example from .env.example
      if (process.env.NODE_ENV === 'production') {
        const insecureExamples = [
          'minimum-32-character-secret-key-change-this-in-production',
          'change-this-in-production',
          'your-secret-key-here',
          'example-secret',
        ];
        return !insecureExamples.some((example) => val.includes(example));
      }
      return true;
    }, 'JWT_SECRET appears to be using an example/default value. Use a cryptographically secure random secret in production.'),
  JWT_EXPIRY: z.string().default('7d'),
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional but recommended
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_RETURN_URL: z.string().url().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Sentry Error Tracking
  SENTRY_DSN: z.string().optional(),

  // Admin emails (comma-separated for multiple admins)
  ADMIN_EMAILS: z.string().optional(),

  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  APP_URL: z.string().url().default('http://localhost:5000'),
  CORS_ORIGIN: z
    .string()
    .transform((val) => val.split(',').map((v) => v.trim()))
    .refine(
      (origins) => !origins.some((origin) => origin.includes('*')),
      'Wildcards not allowed in production CORS origins'
    ),

  // Redis / caching
  REDIS_URL: z.string().optional(),

  // Design integrations
  FIGMA_TOKEN: z.string().optional(),
  FIGMA_FILE_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
  if (_env) return _env;

  try {
    _env = envSchema.parse(process.env);
    return _env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\nPlease check your .env file and compare with .env.example');
      throw new Error('Environment validation failed');
    }
    throw error;
  }
}

// Lazy initialization with proxy for backwards compatibility
export const env = new Proxy({} as Env, {
  get(target, prop) {
    const validated = validateEnv();
    return (validated as any)[prop];
  }
});
