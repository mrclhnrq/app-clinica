import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { setAuthToken, setUnauthorizedHandler } from "@/services/api";
import * as authService from "@/services/authService";
import * as usuarioService from "@/services/usuarioService";

type UsuarioLogado = {
  userId: number;
  nome: string;
  email: string;
  role: string;
  fotoPerfil: string | null; // fonte única da foto: Home, Perfil e Editar leem daqui
};

type AuthContextValue = {
  user: UsuarioLogado | null;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => void;
  atualizarUsuario: (dados: Partial<Omit<UsuarioLogado, "userId">>) => void;
  trocarToken: (token: string) => void;
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
    return { userId, nome, email, role, fotoPerfil: null };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioLogado | null>(null);
  const { showToast } = useToast();
  const logado = useRef(false);
  useEffect(() => {
    logado.current = !!user;
  }, [user]);

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
    restoredUser ??= { userId: 0, nome: "", email: "", role: "", fotoPerfil: null };

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
    const usuario: UsuarioLogado = { userId, nome, email: emailUsuario, role, fotoPerfil: null };
    setAuthToken(token);
    setUser(usuario);
    getWebStorage()?.setItem(TOKEN_STORAGE_KEY, token);
    getWebStorage()?.setItem(USER_STORAGE_KEY, JSON.stringify(usuario));

    // O login não traz a foto; carregá-la em segundo plano não atrasa a entrada.
    usuarioService
      .buscar(userId)
      .then((u) => {
        setUser((atual) => {
          if (atual?.userId !== userId) return atual;
          const atualizado = { ...atual, fotoPerfil: u.fotoPerfil };
          getWebStorage()?.setItem(USER_STORAGE_KEY, JSON.stringify(atualizado));
          return atualizado;
        });
      })
      .catch(() => undefined);
  }, []);

  // mantém nome/e-mail/foto da sessão em dia depois de editar o perfil
  const atualizarUsuario = useCallback((dados: Partial<Omit<UsuarioLogado, "userId">>) => {
    setUser((atual) => {
      if (!atual) return atual;
      const atualizado = { ...atual, ...dados };
      getWebStorage()?.setItem(USER_STORAGE_KEY, JSON.stringify(atualizado));
      return atualizado;
    });
  }, []);

  // o JWT usa o e-mail como identificador: ao trocar o e-mail o backend devolve um token novo
  const trocarToken = useCallback((token: string) => {
    setAuthToken(token);
    getWebStorage()?.setItem(TOKEN_STORAGE_KEY, token);
  }, []);

  // se qualquer requisição voltar 401 (token expirado/inválido), avisa e volta ao login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!logado.current) return; // várias requisições podem falhar juntas: avisa uma vez só
      logado.current = false;
      showToast("Sessão expirada. Faça login novamente.", "error"); // mesmo texto do getErrorMessage
      signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut, showToast]);

  const value = useMemo(
    () => ({ user, signIn, signOut, atualizarUsuario, trocarToken }),
    [user, signIn, signOut, atualizarUsuario, trocarToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
