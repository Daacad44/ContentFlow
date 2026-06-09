/** src/components/PasswordStrength.tsx — live strength meter. */
import { passwordStrength } from '../lib/validation';

const COLORS = ['bg-red-500', 'bg-red-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500'];

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const { score, label } = passwordStrength(value);
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${
              i < score ? COLORS[score] : 'bg-ink-500'
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        Strength: <span className="font-medium text-slate-300">{label}</span>
      </p>
    </div>
  );
}
