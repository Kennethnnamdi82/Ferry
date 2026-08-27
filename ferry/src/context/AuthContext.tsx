import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { authApi, tokenStore, User, getApiErrorMessage } from "@/services/api";

interface RegisterResult {
  user: User;
  message: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;

  login: (email: string, password: string) => Promise<User>;

  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<RegisterResult>;

  logout: () => Promise<void>;

  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() =>
    tokenStore.getUser<User>(),
  );

  const [loading, setLoading] = useState<boolean>(!!tokenStore.access);

  /*
   * Bootstrap authentication state.
   *
   * If we already have an access token, ask the backend
   * for the current user.
   */
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!tokenStore.access) {
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

        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * LOGIN
   *
   * Login is the point where the user receives JWT tokens.
   *
   * The backend will reject unverified accounts with:
   *
   * {
   *   message: "Please verify your email before logging in.",
   *   code: "EMAIL_NOT_VERIFIED"
   * }
   */
  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({
      email,
      password,
    });

    tokenStore.setTokens(data.accessToken, data.refreshToken);

    tokenStore.setUser(data.user);

    setUser(data.user);

    return data.user;
  }, []);

  /*
   * REGISTER
   *
   * Registration NO LONGER authenticates the user.
   *
   * The backend creates the account and sends a verification email,
   * but does not issue access/refresh tokens yet.
   *
   * The user must verify their email and then log in.
   */
  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
    ): Promise<RegisterResult> => {
      const { data } = await authApi.register({
        name,
        email,
        password,
      });

      /*
       * IMPORTANT:
       *
       * Do NOT store tokens here.
       * Do NOT set the authenticated user here.
       *
       * The account must be verified first.
       */
      return data;
    },
    [],
  );

  /*
   * LOGOUT
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout API errors.
      // We still clear the local authentication state.
    }

    tokenStore.clear();
    setUser(null);
  }, []);

  /*
   * REFRESH CURRENT USER
   *
   * Used when the application needs to synchronize
   * the locally stored user with the backend.
   */
  const refresh = useCallback(async () => {
    if (!tokenStore.access) return;

    try {
      const { data } = await authApi.me();

      setUser(data.user);
      tokenStore.setUser(data.user);
    } catch {
      // The Axios interceptor handles authentication failures.
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}

export { getApiErrorMessage };
