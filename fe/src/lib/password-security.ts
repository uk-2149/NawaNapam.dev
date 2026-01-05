import bcrypt from "bcryptjs";

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @param rounds - Salt rounds (default: 12)
 * @returns Hashed password
 */
export async function hashPassword(
  password: string,
  rounds: number = 12
): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Compare a plain text password with a hash
 * @param password - Plain text password
 * @param hash - Bcrypt hash
 * @returns True if password matches
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check password strength
 * @param password - Password to check
 * @returns Strength score (0-4) and feedback
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  else feedback.push("Use at least 12 characters for better security");

  // Character variety
  if (/[a-z]/.test(password)) score++;
  else feedback.push("Include lowercase letters");

  if (/[A-Z]/.test(password)) score++;
  else feedback.push("Include uppercase letters");

  if (/[0-9]/.test(password)) score++;
  else feedback.push("Include numbers");

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push("Include special characters (!@#$%^&*)");

  // Common patterns
  if (/^[0-9]+$/.test(password)) {
    score = 0;
    feedback.push("Don't use only numbers");
  }

  if (/^[a-zA-Z]+$/.test(password)) {
    score = Math.min(score, 2);
    feedback.push("Don't use only letters");
  }

  // Sequential characters
  if (
    /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(
      password
    )
  ) {
    score = Math.max(0, score - 1);
    feedback.push("Avoid sequential characters");
  }

  // Repeated characters
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push("Avoid repeated characters");
  }

  const isStrong = score >= 4;

  if (isStrong) {
    feedback.push("Strong password!");
  }

  return {
    score: Math.min(score, 4),
    feedback,
    isStrong,
  };
}

/**
 * Generate a secure random password
 * @param length - Password length (default: 16)
 * @returns Random password
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const allChars = lowercase + uppercase + numbers + special;

  let password = "";

  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * Check if password is compromised (basic check against common passwords)
 * In production, integrate with HaveIBeenPwned API
 */
const commonPasswords = [
  "password",
  "123456",
  "123456789",
  "12345678",
  "12345",
  "1234567",
  "password1",
  "123123",
  "1234567890",
  "qwerty",
  "abc123",
  "password123",
  "admin",
  "letmein",
  "welcome",
  "monkey",
  "1234",
  "dragon",
  "master",
  "666666",
];

export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  return commonPasswords.some((common) => lower.includes(common));
}

/**
 * Validate password meets minimum requirements
 */
export function validatePasswordRequirements(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must be at most 128 characters long");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (isCommonPassword(password)) {
    errors.push("Password is too common. Please choose a stronger password");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
