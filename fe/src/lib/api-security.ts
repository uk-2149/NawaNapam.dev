import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Validate HTTP method
 */
export function validateMethod(req: NextRequest, allowedMethods: string[]) {
  if (!allowedMethods.includes(req.method)) {
    return NextResponse.json(
      { error: `Method ${req.method} not allowed` },
      {
        status: 405,
        headers: {
          Allow: allowedMethods.join(", "),
        },
      }
    );
  }
  return null;
}

/**
 * Validate content type for POST/PUT/PATCH requests
 */
export function validateContentType(req: NextRequest) {
  const contentType = req.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 }
    );
  }
  return null;
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

/**
 * Create error response with security headers
 */
export function createErrorResponse(
  message: string,
  status: number = 400
): NextResponse {
  const response = NextResponse.json({ error: message }, { status });
  return addSecurityHeaders(response);
}

/**
 * Create success response with security headers
 */
export function createSuccessResponse(
  data: unknown,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return addSecurityHeaders(response);
}

/**
 * Verify request origin (for CORS)
 */
export function verifyOrigin(
  req: NextRequest,
  allowedOrigins: string[]
): boolean {
  const origin = req.headers.get("origin");

  if (!origin) {
    // Same-origin requests don't have an origin header
    return true;
  }

  return allowedOrigins.some((allowed) => {
    if (allowed === "*") return true;
    if (allowed.endsWith("*")) {
      const prefix = allowed.slice(0, -1);
      return origin.startsWith(prefix);
    }
    return origin === allowed;
  });
}

/**
 * Prevent timing attacks by using constant-time comparison
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((value) => chars[value % chars.length])
    .join("");
}

/**
 * Validate request size to prevent large payload attacks
 */
export async function validateRequestSize(
  req: NextRequest,
  maxSizeInBytes: number = 1024 * 1024 // 1MB default
): Promise<NextResponse | null> {
  const contentLength = req.headers.get("content-length");

  if (contentLength && parseInt(contentLength) > maxSizeInBytes) {
    return createErrorResponse(
      `Request body too large. Maximum size is ${maxSizeInBytes} bytes`,
      413
    );
  }

  return null;
}

/**
 * Log security events
 */
export function logSecurityEvent(event: {
  type: string;
  ip: string;
  userAgent?: string;
  details?: string;
}) {
  const timestamp = new Date().toISOString();
  console.warn(`[SECURITY] ${timestamp}`, event);

  // In production, send to a security monitoring service
  // e.g., Sentry, Datadog, etc.
}
