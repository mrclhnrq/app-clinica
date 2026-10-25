import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioLogado | null>(null);

  const signOut = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {
    const { token, userId, nome, email: emailUsuario, role } = await authService.login(email, senha);
    setAuthToken(token);
    setUser({ userId, nome, email: emailUsuario, role, fotoPerfil: null });

    // o login não traz a foto: busca em segundo plano sem atrasar a entrada
    usuarioService
      .buscar(userId)
      .then((u) => setUser((atual) => (atual?.userId === userId ? { ...atual, fotoPerfil: u.fotoPerfil } : atual)))
      .catch(() => {});
  }, []);

  // mantém nome/e-mail/foto da sessão em dia depois de editar o perfil
  const atualizarUsuario = useCallback((dados: Partial<Omit<UsuarioLogado, "userId">>) => {
    setUser((atual) => (atual ? { ...atual, ...dados } : atual));
  }, []);

  // o JWT usa o e-mail como identificador: ao trocar o e-mail o backend devolve um token novo
  const trocarToken = useCallback((token: string) => setAuthToken(token), []);

  // se qualquer requisição voltar 401, o interceptor chama signOut
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

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
