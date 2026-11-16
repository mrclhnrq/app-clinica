import type { ProdutoCatalogo } from "@/types/notaFiscal";

export const PONTUACAO_MINIMA_BUSCA = 0.5;

export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function distanciaLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
    }
    anterior = atual;
  }
  return anterior[b.length];
}

function tokens(texto: string): string[] {
  return normalizarTexto(texto).split(" ").filter(Boolean);
}

/** Quanto a palavra digitada se parece com a palavra do nome (0 a 1). Aceita prefixo e erro de digitação. */
function similaridadePalavra(digitada: string, palavra: string): number {
  if (palavra.startsWith(digitada)) return 1;
  if (digitada.length >= 3 && palavra.includes(digitada)) return 0.9;
  const maior = Math.max(digitada.length, palavra.length);
  const similar = 1 - distanciaLevenshtein(digitada, palavra) / maior;
  return similar >= 0.6 ? similar : 0;
}

/** Media, entre as palavras do termo, da melhor correspondencia no nome. */
export function pontuarProduto(termo: string, nome: string): number {
  const procuradas = tokens(termo);
  const palavras = tokens(nome);
  if (procuradas.length === 0 || palavras.length === 0) return 0;
  const soma = procuradas.reduce((total, digitada) =>
    total + Math.max(...palavras.map((palavra) => similaridadePalavra(digitada, palavra))), 0);
  return soma / procuradas.length;
}

export type ProdutoPontuado = { produto: ProdutoCatalogo; pontuacao: number };

/** Ordena do mais parecido ao menos parecido, mantendo a ordem original nos empates. */
export function ordenarPorSemelhanca(produtos: ProdutoCatalogo[], termo: string): ProdutoPontuado[] {
  return produtos
    .map((produto, indice) => ({ produto, pontuacao: pontuarProduto(termo, produto.nome), indice }))
    .sort((a, b) => b.pontuacao - a.pontuacao || a.indice - b.indice)
    .map(({ produto, pontuacao }) => ({ produto, pontuacao }));
}

/**
 * Lista exibida ao associar. Sem busca digitada, ordena pelo texto da nota para os mais parecidos virem primeiro.
 * Com busca, so mostra o que realmente se parece. O produto ja escolhido nunca some da lista.
 */
export function produtosParaAssociar(produtos: ProdutoCatalogo[], busca: string, textoDaNota: string,
  escolhidoId: number | null, limite = 8): ProdutoCatalogo[] {
  const digitou = tokens(busca).length > 0;
  const ordenados = ordenarPorSemelhanca(produtos, digitou ? busca : textoDaNota);
  const filtrados = digitou ? ordenados.filter((p) => p.pontuacao >= PONTUACAO_MINIMA_BUSCA) : ordenados;
  const lista = filtrados.slice(0, limite).map((p) => p.produto);
  const escolhido = produtos.find((p) => p.id === escolhidoId);
  return escolhido && !lista.some((p) => p.id === escolhido.id) ? [escolhido, ...lista] : lista;
}
