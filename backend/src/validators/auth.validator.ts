/**
 * src/validators/auth.validator.ts
 * Zod schemas = the single source of truth for request validation AND the
 * documented validation rules. Password policy is enforced here.
 */
import { z } from 'zod';

/**
 * Password policy:
 *  - min 8 chars
 *  - at least one lowercase, one uppercase
 *  - at least one number OR special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9!@#$%^&*(),.?":{}|<>_\-]/, 'Password must contain a number or special character.');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please provide a valid email address.')
  .max(254);

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required.').max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the Terms of Service.' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Verification code must be exactly 6 digits.'),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

/** Legacy link-based verification (deprecated — use verifyOtpSchema). */
export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Invalid verification token.'),
});

export const resetPasswordOtpSchema = z
  .object({
    email: emailSchema,
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Reset code must be exactly 6 digits.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

/** Legacy token-based reset (deprecated — use resetPasswordOtpSchema). */
export const resetPasswordTokenSchema = z
  .object({
    token: z.string().min(10, 'Invalid reset token.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
