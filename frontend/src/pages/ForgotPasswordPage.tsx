/** src/pages/ForgotPasswordPage.tsx — screen 03 from the design. */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import { api, getApiErrorMessage } from '../lib/api';
import { forgotPasswordSchema, ForgotPasswordValues } from '../lib/validation';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      await api.post('/auth/forgot-password', values);
      setSent(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white">Forgot Password? 🔒</h1>
      <p className="mt-1 text-sm text-muted">
        Don&apos;t worry! It happens. Please enter your email address.
      </p>

      {sent ? (
        <div className="mt-7 rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm text-slate-200">
          <p className="font-medium text-white">Check your inbox 📬</p>
          <p className="mt-1 text-muted">
            We&apos;ll send a password reset link to your email address if an account exists.
          </p>
        </div>
      ) : (
        <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <button type="submit" className="cf-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-muted hover:text-white"
      >
        ← Back to login
      </Link>
    </AuthLayout>
  );
}
