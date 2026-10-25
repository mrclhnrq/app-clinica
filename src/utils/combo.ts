import { ItemCombo } from "@/types/combo";

export const calcularTotal = (itens: ItemCombo[]) => itens.reduce((soma, item) => soma + item.valorVenda, 0);

// 447.06 com 15% -> 380.00 (arredonda em 2 casas)
export function aplicarDesconto(total: number, descontoPercentual: number): number {
  return Math.round(total * (1 - descontoPercentual / 100) * 100) / 100;
}

export function formatPercentual(valor: number): string {
  const texto = Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace(".", ",");
  return `${texto}%`;
}

export const rotuloItem = (item: ItemCombo) => (item.ativo ? item.nome : `${item.nome} (inativo)`);

// Aplica a marcação do seletor, mas preserva itens que já estavam no combo e hoje estão
// inativos (não aparecem como opção, então só saem pelo "x" do chip).
export function aplicarSelecao(atuais: ItemCombo[], marcados: string[], disponiveis: ItemCombo[]): ItemCombo[] {
  const idsDisponiveis = new Set(disponiveis.map((item) => item.id));
  const preservados = atuais.filter((item) => !idsDisponiveis.has(item.id));
  const novos = disponiveis.filter((item) => marcados.includes(item.id));
  return [...preservados, ...novos];
}