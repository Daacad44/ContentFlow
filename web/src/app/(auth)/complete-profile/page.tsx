import { Camera } from 'lucide-react';
import { AuthShell } from '@/components/layout/auth-shell';
import { ProfileIllustration } from '@/components/illustrations';
import { Field } from '@/components/auth/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TIMEZONES = [
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
  return (
    <AuthShell illustration={<ProfileIllustration />}>
      <h1 className="text-2xl font-bold text-white">Complete Your Profile ✨</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tell us more about yourself</p>

      {/* Avatar upload */}
      <div className="mt-6 flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16">
            <AvatarFallback>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="4" fill="#94a3b8" />
                <path d="M4 20a8 8 0 0 1 16 0Z" fill="#94a3b8" />
              </svg>
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            aria-label="Upload photo"
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white ring-2 ring-card"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-sm text-muted-foreground">Profile photo (optional)</span>
      </div>

      <form className="mt-6 space-y-4">
        <Field label="Full name" htmlFor="fullName">
          <Input id="fullName" placeholder="John Doe" defaultValue="John Doe" />
        </Field>

        <Field label="Company name (optional)" htmlFor="company">
          <Input id="company" placeholder="Acme Inc." defaultValue="Acme Inc." />
        </Field>

        <div className="space-y-1.5">
          <Label htmlFor="timezone">Time zone</Label>
          <Select defaultValue={TIMEZONES[0]}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select a time zone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full">
          Save &amp; Continue
        </Button>
      </form>

      <button className="mt-4 w-full text-center text-sm font-medium text-muted-foreground transition-colors hover:text-white">
        Skip for now
      </button>
    </AuthShell>
  );
}
