import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, tokenStore, User, RegisterResponse, getApiErrorMessage } from "@/services/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() =>
    tokenStore.access || tokenStore.refresh ? tokenStore.getUser<User>() : null);
  const [loading, setLoading] = useState(Boolean(tokenStore.access || tokenStore.refresh));

  useEffect(() => {
    let cancelled = false;
    const clearUser = () => setUser(null);
    window.addEventListener("auth:logout", clearUser);
    async function bootstrap() {
      if (!tokenStore.access && !tokenStore.refresh) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authApi.me();
        if (!cancelled) {
          setUser(data.user);
          tokenStore.setUser(data.user);
        }
      } catch {
        tokenStore.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
      window.removeEventListener("auth:logout", clearUser);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    tokenStore.setTokens(data.accessToken, data.refreshToken);
    tokenStore.setUser(data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data } = await authApi.register({ name, email, password });
    if (data.accessToken && data.refreshToken) {
      tokenStore.setTokens(data.accessToken, data.refreshToken);
      tokenStore.setUser(data.user);
      setUser(data.user);
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Local signout still works if the server is temporarily unreachable.
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.access && !tokenStore.refresh) return;
    const { data } = await authApi.me();
    setUser(data.user);
    tokenStore.setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user,
      isAdmin: user?.role === "admin", login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { getApiErrorMessage };
