/** src/pages/RegisterPage.tsx — screen 02 from the design. */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/AuthLayout';
import { Field, PasswordField } from '../components/Field';
import { PasswordStrength } from '../components/PasswordStrength';
import { GoogleButton } from '../components/GoogleButton';
import { useAuth } from '../context/AuthContext';
import { registerSchema, RegisterValues } from '../lib/validation';
import { getApiErrorMessage } from '../lib/api';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const password = watch('password') ?? '';

  const onSubmit = async (values: RegisterValues) => {
    try {
      await registerUser(values);
      toast.success('Account created! Check your email for a 6-digit code.');
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`, {
        state: { email: values.email },
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to create account.'));
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white">Create Your Account 🚀</h1>
      <p className="mt-1 text-sm text-muted">Join thousands of businesses today</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          label="Full name"
          placeholder="John Doe"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Field
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <div>
          <PasswordField
            label="Password"
            placeholder="••••••••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrength value={password} />
        </div>
        <PasswordField
          label="Confirm password"
          placeholder="••••••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" className="mt-0.5 accent-brand" {...register('acceptTerms')} />
          <span>
            I agree to the{' '}
            <a href="#" className="text-brand hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-brand hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>
        {errors.acceptTerms && <p className="cf-error">{errors.acceptTerms.message}</p>}

        <button type="submit" className="cf-btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create Account'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-ink-500" />
        or continue with
        <span className="h-px flex-1 bg-ink-500" />
      </div>
      <GoogleButton />

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
