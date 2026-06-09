/**
 * src/lib/validation.ts
 * Client-side Zod schemas. These MIRROR the backend rules so users get instant
 * feedback; the backend remains the source of truth and re-validates everything.
 */
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[a-z]/, 'Contains a lowercase letter')
  .regex(/[A-Z]/, 'Contains an uppercase letter')
  .regex(/[0-9!@#$%^&*(),.?":{}|<>_\-]/, 'Contains a number or special character');

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email'),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  companyName: z.string().optional(),
  timezone: z.string().min(1, 'Select a timezone'),
});
export type ProfileValues = z.infer<typeof profileSchema>;

/** Returns a 0..4 strength score + label for a password. */
export function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
}
