export function formatCurrency(value: number): string {
  const [inteiro, decimal] = value.toFixed(2).split(".");
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${comMilhar},${decimal}`;
}

// aceita "45", "45,5", "45.5" e "1.250,50"
export function parseCurrency(text: string): number {
  const limpo = text.replace(/[^\d,.]/g, "");
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const numero = parseFloat(normalizado);
  return Number.isNaN(numero) ? 0 : numero;
}

// busca sem diferenciar maiúscula/minúscula nem acento
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// 45 -> "45,00" (valor inicial dos campos de dinheiro nos formulários)
export const toMoneyText = (n: number) => n.toFixed(2).replace(".", ",");