/* eslint-disable react-refresh/only-export-components */
import type { User } from '@banana/api-client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, refreshSession, setAccessToken } from '@/shared/api/client';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (correo: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;
    refreshSession().then((session) => {
      if (!active) return;
      if (session) {
        setUser(session.user);
        setStatus('authenticated');
      } else {
        setStatus('anonymous');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    };
    window.addEventListener('banana:session-expired', onExpired);
    return () => window.removeEventListener('banana:session-expired', onExpired);
  }, []);

  const login = useCallback(async (correo: string, password: string) => {
    const session = await api.login(correo, password);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // La sesión local se limpia aunque la revocación remota falle.
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return context;
}
