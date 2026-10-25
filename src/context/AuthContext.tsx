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
const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "auth_user";

function getWebStorage(): Storage | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}

function decodeTokenUser(token: string): UsuarioLogado | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    const userId = Number(claims.userId ?? claims.id ?? claims.sub);
    const email = typeof claims.email === "string" ? claims.email : "";
    const nome = typeof claims.nome === "string" ? claims.nome : typeof claims.name === "string" ? claims.name : "";
    const role = typeof claims.role === "string" ? claims.role : "";

    if (!Number.isFinite(userId) || !email) return null;
    return { userId, nome, email, role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioLogado | null>(null);

  useEffect(() => {
    const storage = getWebStorage();
    if (!storage) return;

    const token = storage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    const storedUser = storage.getItem(USER_STORAGE_KEY);
    let restoredUser: UsuarioLogado | null = null;
    if (storedUser) {
      try {
        restoredUser = JSON.parse(storedUser) as UsuarioLogado;
      } catch {
        storage.removeItem(USER_STORAGE_KEY);
      }
    }
    restoredUser ??= decodeTokenUser(token);
    // Permite testar com um JWT colado manualmente no localStorage.
    restoredUser ??= { userId: 0, nome: "", email: "", role: "" };

    if (restoredUser) {
      setAuthToken(token);
      setUser(restoredUser);
    }
  }, []);

  const signOut = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    getWebStorage()?.removeItem(TOKEN_STORAGE_KEY);
    getWebStorage()?.removeItem(USER_STORAGE_KEY);
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {
    const { token, userId, nome, email: emailUsuario, role } = await authService.login(email, senha);
    const usuario = { userId, nome, email: emailUsuario, role };
    setAuthToken(token);
    setUser(usuario);
    getWebStorage()?.setItem(TOKEN_STORAGE_KEY, token);
    getWebStorage()?.setItem(USER_STORAGE_KEY, JSON.stringify(usuario));
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