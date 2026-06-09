/** src/pages/LoginPage.tsx — screen 01 from the design. */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/AuthLayout';
import { Field, PasswordField } from '../components/Field';
import { GoogleButton } from '../components/GoogleButton';
import { useAuth } from '../context/AuthContext';
import { loginSchema, LoginValues } from '../lib/validation';
import { getApiErrorMessage } from '../lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const from =
    redirect ??
    (location.state as { from?: { pathname: string } })?.from?.pathname ??
    '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    try {
      const user = await login(values.email, values.password, values.rememberMe);
      toast.success('Welcome back!');
      navigate(user.profileComplete ? from : '/complete-profile', { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to sign in.'));
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white">Welcome Back 👋</h1>
      <p className="mt-1 text-sm text-muted">Sign in to your account</p>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          placeholder="••••••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-300">
            <input type="checkbox" className="accent-brand" {...register('rememberMe')} />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="cf-btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <Divider />
      <GoogleButton />

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-brand hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-ink-500" />
      or continue with
      <span className="h-px flex-1 bg-ink-500" />
    </div>
  );
}
