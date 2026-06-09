/** src/pages/CompleteProfilePage.tsx — screen 06 from the design. */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import { api, getApiErrorMessage } from '../lib/api';
import { profileSchema, ProfileValues } from '../lib/validation';
import { useAuth } from '../context/AuthContext';

const TIMEZONES = [
  'UTC',
  '(GMT+03:00) Nairobi',
  '(GMT+00:00) London',
  '(GMT-05:00) New York',
  '(GMT-08:00) Los Angeles',
  '(GMT+01:00) Berlin',
  '(GMT+05:30) Mumbai',
  '(GMT+08:00) Singapore',
  '(GMT+09:00) Tokyo',
  '(GMT+10:00) Sydney',
];

export default function CompleteProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      companyName: user?.companyName ?? '',
      timezone: user?.timezone ?? 'UTC',
    },
  });

  const onSubmit = async (values: ProfileValues) => {
    try {
      const { data } = await api.patch('/users/me', values);
      setUser(data.data.user);
      toast.success('Profile saved!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white">Complete Your Profile ✨</h1>
      <p className="mt-1 text-sm text-muted">Tell us more about yourself</p>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-600 text-2xl">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            '🧑'
          )}
        </div>
        <span className="text-sm text-muted">Profile photo (optional)</span>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          label="Full name"
          placeholder="John Doe"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Field
          label="Company name (optional)"
          placeholder="Acme Inc."
          error={errors.companyName?.message}
          {...register('companyName')}
        />
        <div>
          <label htmlFor="timezone" className="cf-label">
            Time zone
          </label>
          <select id="timezone" className="cf-input" {...register('timezone')}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          {errors.timezone && <p className="cf-error">{errors.timezone.message}</p>}
        </div>

        <button type="submit" className="cf-btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save & Continue'}
        </button>
      </form>

      <button
        onClick={() => navigate('/dashboard', { replace: true })}
        className="mt-4 w-full text-center text-sm font-medium text-muted hover:text-white"
      >
        Skip for now
      </button>
    </AuthLayout>
  );
}
