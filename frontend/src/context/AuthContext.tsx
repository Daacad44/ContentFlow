/**
 * src/context/AuthContext.tsx
 * Global auth state. On mount it tries to silently restore a session via the
 * refresh cookie. Exposes login/register/logout and the current user.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { api, tokenStore } from '../lib/api';

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  companyName: string | null;
  timezone: string;
  role: Role;
  provider: 'LOCAL' | 'GOOGLE';
  emailVerified: boolean;
  profileComplete: boolean;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: true;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  setAccessToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      tokenStore.set(data.data.accessToken);
      setUser(data.data.user);
    } catch {
      tokenStore.set(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback<AuthContextValue['login']>(
    async (email, password, rememberMe) => {
      const { data } = await api.post('/auth/login', { email, password, rememberMe });
      tokenStore.set(data.data.accessToken);
      setUser(data.data.user);
      return data.data.user as User;
    },
    [],
  );

  const register = useCallback<AuthContextValue['register']>(async (input) => {
    await api.post('/auth/register', input);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      tokenStore.set(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.data.user);
  }, []);

  const setAccessToken = useCallback((token: string) => {
    tokenStore.set(token);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, setUser, refreshUser, setAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
