import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setAuthToken, setUnauthorizedHandler } from "@/services/api";
import * as authService from "@/services/authService";

type UsuarioLogado = { userId: number; nome: string; email: string; role: string };

type AuthContextValue = {
  user: UsuarioLogado | null;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioLogado | null>(null);

  const signOut = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {
    const { token, userId, nome, email: emailUsuario, role } = await authService.login(email, senha);
    setAuthToken(token);
    setUser({ userId, nome, email: emailUsuario, role });
  }, []);

  // se qualquer requisição voltar 401, o interceptor chama signOut
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}