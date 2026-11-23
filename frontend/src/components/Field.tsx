/**
 * src/components/Field.tsx
 * Reusable text input + password input with show/hide toggle. Designed to plug
 * straight into react-hook-form's register().
 */
import { forwardRef, InputHTMLAttributes, useState } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="min-w-0">
        <label htmlFor={inputId} className="cf-label">
          {label}
        </label>
        <input id={inputId} ref={ref} className={className ? `cf-input ${className}` : 'cf-input'} {...props} />
        {error && <p className="cf-error">{error}</p>}
      </div>
    );
  },
);
Field.displayName = 'Field';

export const PasswordField = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, id, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const inputId = id ?? props.name;
    return (
      <div>
        <label htmlFor={inputId} className="cf-label">
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={show ? 'text' : 'password'}
            className="cf-input pr-11"
            {...props}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
            aria-label={show ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {show ? <EyeOff /> : <Eye />}
          </button>
        </div>
        {error && <p className="cf-error">{error}</p>}
      </div>
    );
  },
);
PasswordField.displayName = 'PasswordField';

function Eye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 3 18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 4.2A10 10 0 0 1 22 12a17 17 0 0 1-2.2 3M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 3.4-.6" />
    </svg>
  );
}
