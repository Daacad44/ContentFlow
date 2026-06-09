import {
  Lock,
  UserPlus,
  HelpCircle,
  Mail,
  CheckCircle2,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

export interface AuthNavItem {
  index: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Sidebar AUTHENTICATION hierarchy — order is locked to the design. */
export const AUTH_NAV: AuthNavItem[] = [
  { index: '01', label: 'Login', href: '/login', icon: Lock },
  { index: '02', label: 'Register', href: '/register', icon: UserPlus },
  { index: '03', label: 'Forgot Password', href: '/forgot-password', icon: HelpCircle },
  { index: '04', label: 'Reset Password', href: '/reset-password', icon: Mail },
  { index: '05', label: 'Verify Email', href: '/verify-email', icon: CheckCircle2 },
  { index: '06', label: 'Complete Profile', href: '/complete-profile', icon: UserCheck },
];
