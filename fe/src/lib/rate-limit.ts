import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// Rate limiter for API routes - 10 requests per 10 seconds
export const apiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "ratelimit:api",
});

// Rate limiter for authentication routes - 5 requests per minute
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "ratelimit:auth",
});

// Stricter rate limiter for sensitive operations - 3 requests per 5 minutes
export const sensitiveRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "300 s"),
  analytics: true,
  prefix: "ratelimit:sensitive",
});

// General page rate limiter - 100 requests per minute
export const pageRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  analytics: true,
  prefix: "ratelimit:page",
});

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  // Try to get IP from headers (for deployments behind proxies)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  const ip =
    cfConnectingIp || forwardedFor?.split(",")[0] || realIp || "unknown";

  return ip;
}

/**
 * Check rate limit and return appropriate response
 */
export async function checkRateLimit(
  ratelimiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const { success, limit, remaining, reset } =
    await ratelimiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset,
  };
}
