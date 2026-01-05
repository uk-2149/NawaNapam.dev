# Security Implementation Guide

## Overview

This application implements multiple layers of security to protect against common vulnerabilities including DDoS, XSS, CSRF, SQL Injection, and more.

## Security Measures Implemented

### 1. Security Headers (Next.js Config)

**Location**: `next.config.ts`

- **Strict-Transport-Security**: Enforces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Enables browser XSS filters
- **Content-Security-Policy**: Restricts resource loading to prevent XSS
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts access to browser features

### 2. Rate Limiting (DDoS Protection)

**Location**: `src/lib/rate-limit.ts`

Multiple rate limiters implemented:

- **API Routes**: 10 requests per 10 seconds
- **Auth Routes**: 5 requests per minute
- **Sensitive Operations**: 3 requests per 5 minutes
- **Page Views**: 100 requests per minute

Rate limiting is enforced in:

- `middleware.ts` for page-level protection
- Individual API routes for endpoint-specific limits

### 3. Input Validation & Sanitization

**Location**: `src/lib/security.ts`

Comprehensive validation using Zod schemas:

- **Email Validation**: Sanitizes and validates email format
- **Username Validation**: Alphanumeric with specific character rules
- **Password Validation**: Strong password requirements (min 8 chars, uppercase, lowercase, number)
- **HTML Sanitization**: DOMPurify removes malicious HTML/scripts
- **URL Validation**: Whitelists protocols and validates URL structure
- **SQL Wildcard Escaping**: Prevents SQL injection in LIKE queries
- **Prototype Pollution Prevention**: Removes dangerous properties from objects

### 4. API Security

**Location**: `src/lib/api-security.ts`

- **Method Validation**: Restricts HTTP methods per endpoint
- **Content-Type Validation**: Ensures proper content types
- **Request Size Limits**: Prevents large payload attacks
- **Origin Verification**: CORS protection
- **Constant-Time Comparison**: Prevents timing attacks
- **Security Event Logging**: Tracks suspicious activities

### 5. Authentication Security

- **NextAuth**: Industry-standard authentication
- **Password Hashing**: bcrypt with 12 salt rounds
- **Session Management**: Secure session tokens
- **Protected Routes**: Middleware-enforced route protection

### 6. Database Security

- **Prisma ORM**: Prevents SQL injection through parameterized queries
- **Input Sanitization**: All user inputs validated before database operations
- **Banned User Checks**: Prevents banned users from performing actions

### 7. XSS Prevention

- **DOMPurify**: Sanitizes HTML content
- **CSP Headers**: Restricts inline scripts and unsafe operations
- **React's Built-in Protection**: JSX automatically escapes values
- **Limited dangerouslySetInnerHTML**: Only used in controlled chart component

## Usage Examples

### Protecting an API Route

\`\`\`typescript
import { authRateLimiter, getClientIdentifier } from "@/lib/rate-limit";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-security";
import { sanitizeText } from "@/lib/security";

export async function POST(req: Request) {
// 1. Rate limiting
const identifier = getClientIdentifier(req);
const { success } = await authRateLimiter.limit(identifier);

if (!success) {
return createErrorResponse("Too many requests", 429);
}

// 2. Parse and validate input
const body = await req.json();
const validation = yourSchema.safeParse(body);

if (!validation.success) {
return createErrorResponse("Invalid input", 400);
}

// 3. Sanitize data
const sanitizedData = sanitizeText(validation.data.text);

// 4. Process request
const result = await processData(sanitizedData);

// 5. Return secure response
return createSuccessResponse(result);
}
\`\`\`

### Validating User Input

\`\`\`typescript
import { signupValidation, sanitizeHtml } from "@/lib/security";

// Validate form data
const validation = signupValidation.safeParse(formData);

if (!validation.success) {
// Handle errors
console.error(validation.error.errors);
return;
}

// Use sanitized data
const { email, username, password } = validation.data;
\`\`\`

## Environment Variables

Ensure these are set in your `.env.local`:

\`\`\`env

# NextAuth

NEXTAUTH_SECRET=your-secret-key-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# Upstash Redis (for rate limiting)

UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Database

DATABASE_URL=your-database-url
\`\`\`

## Best Practices

1. **Never trust user input**: Always validate and sanitize
2. **Use parameterized queries**: Let Prisma handle SQL injection prevention
3. **Keep dependencies updated**: Regularly update packages for security patches
4. **Monitor logs**: Watch for unusual patterns or security events
5. **Test security**: Regularly audit and penetration test
6. **Use HTTPS in production**: Never use HTTP for sensitive operations
7. **Implement proper CORS**: Whitelist only trusted origins
8. **Minimize data exposure**: Return only necessary data in API responses
9. **Use secure session storage**: HttpOnly, Secure, SameSite cookies
10. **Implement proper error handling**: Don't leak sensitive information in errors

## Additional Recommendations

### For Production:

1. **Set up WAF**: Use Cloudflare or similar for additional DDoS protection
2. **Enable logging**: Use Sentry, Datadog, or similar for security monitoring
3. **Implement 2FA**: Add two-factor authentication for sensitive accounts
4. **Regular backups**: Maintain secure, encrypted database backups
5. **Security scanning**: Use tools like Snyk, npm audit, or OWASP ZAP
6. **Penetration testing**: Conduct regular security audits
7. **Rate limit by IP**: Consider more sophisticated rate limiting strategies
8. **Implement CAPTCHA**: For sensitive operations like signup/login after rate limit hits

### Dependencies to Consider:

- `@edge-csrf/nextjs` - Already installed for CSRF protection
- `helmet` - Additional security headers (if not using Next.js headers)
- `express-rate-limit` - If using Express backend
- `joi` or `yup` - Alternative validation libraries (we use Zod)

## Compliance

This implementation helps meet requirements for:

- OWASP Top 10 protection
- GDPR compliance (with proper data handling)
- PCI DSS (if handling payment data, additional measures required)

## Testing Security

\`\`\`bash

# Check for vulnerabilities

npm audit

# Fix vulnerabilities

npm audit fix

# Check for outdated packages

npm outdated

# Run linting

npm run lint
\`\`\`

## Incident Response

If a security incident is detected:

1. **Identify**: Determine the scope and impact
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove the threat
4. **Recover**: Restore systems to normal operation
5. **Learn**: Document and improve security measures

## Support & Resources

- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Prisma Security](https://www.prisma.io/docs/concepts/more/security)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
