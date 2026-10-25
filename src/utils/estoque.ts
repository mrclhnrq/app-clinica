// limite fixo por enquanto; no próximo passo vira "estoque mínimo" de cada produto
export const ESTOQUE_BAIXO_LIMITE = 5;

export type NivelEstoque = "ok" | "baixo" | "zerado";

export function nivelEstoque(quantidade: number): NivelEstoque {
  if (quantidade <= 0) return "zerado";
  if (quantidade <= ESTOQUE_BAIXO_LIMITE) return "baixo";
  return "ok";
}

export function formatUnidades(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? "unidade" : "unidades"}`;
}