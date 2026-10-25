import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";

export type CadastroApi<T, TInput> = {
  listar: () => Promise<T[]>;
  criar: (input: TInput, usuarioId?: number) => Promise<T>;
  atualizar: (id: string, input: TInput) => Promise<T>;
  inativar: (id: string) => Promise<void>;
  reativar: (id: string) => Promise<T>;
};

export type CadastroContextValue<T, TInput> = {
  itens: T[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  getItem: (id: string) => T | undefined;
  adicionar: (input: TInput) => Promise<void>;
  editar: (id: string, input: TInput) => Promise<void>;
  inativar: (id: string) => Promise<void>;
  reativar: (id: string) => Promise<void>;
};

export function createCadastroContext<T extends { id: string; ativo: boolean }, TInput>(
  recurso: CadastroApi<T, TInput>,
  nome: string
) {
  const Context = createContext<CadastroContextValue<T, TInput> | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [itens, setItens] = useState<T[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const recarregar = useCallback(async () => {
      setCarregando(true);
      setErro(null);
      try {
        setItens(await recurso.listar());
      } catch (e) {
        setErro(getErrorMessage(e));
      } finally {
        setCarregando(false);
      }
    }, []);

    useEffect(() => {
      recarregar();
    }, [recarregar]);

    const getItem = useCallback((id: string) => itens.find((i) => i.id === id), [itens]);

    // espera o backend confirmar antes de mexer na lista local
    const adicionar = useCallback(
      async (input: TInput) => {
        const criado = await recurso.criar(input, user?.userId);
        setItens((prev) => [criado, ...prev]);
      },
      [user?.userId]
    );

    const editar = useCallback(async (id: string, input: TInput) => {
      const atualizado = await recurso.atualizar(id, input);
      setItens((prev) => prev.map((i) => (i.id === id ? atualizado : i)));
    }, []);

    const inativar = useCallback(async (id: string) => {
      await recurso.inativar(id);
      setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ativo: false } : i)));
    }, []);

    const reativar = useCallback(async (id: string) => {
      const reativado = await recurso.reativar(id);
      setItens((prev) => prev.map((i) => (i.id === id ? reativado : i)));
    }, []);

    const value = useMemo(
      () => ({ itens, carregando, erro, recarregar, getItem, adicionar, editar, inativar, reativar }),
      [itens, carregando, erro, recarregar, getItem, adicionar, editar, inativar, reativar]
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useCadastro() {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(`O contexto de ${nome} deve ser usado dentro do seu Provider`);
    return ctx;
  }

  return { Provider, useCadastro };
}