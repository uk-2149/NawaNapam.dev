import { z } from "zod";

/**
 * Environment variable schema for security-critical settings
 */
const envSchema = z.object({
  // NextAuth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters for security"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Redis (for rate limiting)
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .min(1, "UPSTASH_REDIS_REST_TOKEN is required"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables on startup
 */
export function validateEnv(): Env {
  try {
    const env = envSchema.parse({
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
    });

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(
        (err) => `  - ${err.path.join(".")}: ${err.message}`
      );
      throw new Error(
        `Environment validation failed:\n${issues.join("\n")}\n\nPlease check your .env.local file.`
      );
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 */
export const env = validateEnv();

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === "production";

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === "development";

/**
 * Security warnings for development
 */
if (
  isDevelopment &&
  env.NEXTAUTH_SECRET === "development-secret-change-in-production"
) {
  console.warn(
    "\n⚠️  WARNING: Using default NEXTAUTH_SECRET in development.\n" +
      "   Generate a secure secret for production: openssl rand -base64 32\n"
  );
}
