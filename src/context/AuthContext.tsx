import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentLocalUser,
  loginLocalUser,
  logoutLocalUser,
  registerLocalUser,
  type LocalAuthUser,
} from "../api/localAuthService";

type AuthContextValue = {
  user: LocalAuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LocalAuthUser>;
  register: (username: string, password: string) => Promise<LocalAuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<LocalAuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const currentUser = await getCurrentLocalUser();
    setUser(currentUser);
    return currentUser;
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      setLoading(true);
      try {
        const currentUser = await getCurrentLocalUser();
        if (active) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Falha ao carregar sessao local:", error);
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const loggedUser = await loginLocalUser(username, password);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const createdUser = await registerLocalUser(username, password);
    setUser(createdUser);
    return createdUser;
  }, []);

  const logout = useCallback(async () => {
    await logoutLocalUser();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshSession,
    }),
    [user, loading, login, register, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
