/** src/pages/ResetPasswordPage.tsx — screen 04 from the design. */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/Field';
import { api, getApiErrorMessage } from '../lib/api';
import { resetPasswordSchema, ResetPasswordValues, passwordStrength } from '../lib/validation';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  const pw = watch('password') ?? '';
  const checks = [
    { ok: pw.length >= 8, label: 'At least 8 characters' },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), label: 'Uppercase & lowercase' },
    { ok: /[0-9!@#$%^&*]/.test(pw), label: 'Number or special character' },
  ];

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token) {
      toast.error('Invalid or missing reset token.');
      return;
    }
    try {
      await api.post('/auth/reset-password', { token, ...values });
      toast.success('Password reset! Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white">Reset Your Password 🔑</h1>
      <p className="mt-1 text-sm text-muted">Create a new password for your account</p>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <PasswordField
          label="New password"
          placeholder="••••••••••••"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-xs">
              <span className={c.ok ? 'text-green-400' : 'text-muted'}>
                {c.ok ? '✓' : '○'}
              </span>
              <span className={c.ok ? 'text-slate-300' : 'text-muted'}>{c.label}</span>
            </li>
          ))}
        </ul>

        <PasswordField
          label="Confirm new password"
          placeholder="••••••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <button
          type="submit"
          className="cf-btn-primary"
          disabled={isSubmitting || passwordStrength(pw).score < 2}
        >
          {isSubmitting ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-muted hover:text-white"
      >
        ← Back to login
      </Link>
    </AuthLayout>
  );
}
