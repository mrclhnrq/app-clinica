import type { ConfirmarRequest, DecisaoItem, Item, ProdutoCatalogo } from "@/types/notaFiscal";

export type Escolha =
  | { acao: "ASSOCIAR"; produtoId: number; quantidade: string; valorUnitario: string }
  | { acao: "CRIAR_NOVO"; nomeNovo: string; quantidade: string; valorUnitario: string }
  | { acao: "REJEITAR" };

export function exigeCienciaExplicita(pedido: ConfirmarRequest): boolean {
  return pedido.itens.every((item) => item.acao === "REJEITAR") ||
    pedido.itens.some((item) => item.acao === "CRIAR_NOVO");
}

export function quantidadeInteira(texto: string): number | null {
  if (!/^[1-9]\d*$/.test(texto)) return null;
  const valor = Number(texto);
  return Number.isSafeInteger(valor) ? valor : null;
}

export function custoEmCentavos(texto: string): number | null {
  if (!/^(?:0|[1-9]\d{0,6}|[1-9]\d{0,2}(?:\.\d{3}){1,2})(?:,\d{1,2})?$/.test(texto)) return null;
  const [reais, centavos = ""] = texto.split(",");
  const valor = Number(reais.replace(/\./g, "")) * 100 + Number(centavos.padEnd(2, "0"));
  return Number.isSafeInteger(valor) && valor >= 1 && valor <= 999999999 ? valor : null;
}

export const LIMITE_NOME_NOVO_PRODUTO = 200;

export function nomeNovoValido(nome: string): boolean {
  return nome.trim().length > 0 && nome.length <= LIMITE_NOME_NOVO_PRODUTO &&
    Array.from(nome).every((caractere) => {
      const codigo = caractere.charCodeAt(0);
      return codigo > 0x1f && (codigo < 0x7f || codigo > 0x9f);
    });
}

export type RascunhoInicial = {
  acao: "" | Escolha["acao"]; produtoId: number | null; nomeNovo: string; quantidade: string; valorUnitario: string;
};

function quantidadeSugerida(valor: number | null): string {
  return valor !== null && Number.isInteger(valor) && valor > 0 ? String(valor) : "";
}

function custoSugerido(valor: number | null): string {
  return valor !== null && valor > 0 ? valor.toFixed(2).replace(".", ",") : "";
}

/** Decisao inicial vinda da propria nota, para a usuaria so conferir e corrigir o que estiver errado. */
export function rascunhoInicial(item: Item, produtos: ProdutoCatalogo[]): RascunhoInicial {
  const base = { produtoId: null, nomeNovo: "", quantidade: "", valorUnitario: "" };
  if (item.status !== "VALIDO") return { ...base, acao: "REJEITAR" };
  const quantidade = quantidadeSugerida(item.quantidade);
  const valorUnitario = custoSugerido(item.valorUnitario);
  const sugerido = item.produtoSugerido;
  if (sugerido && produtos.some((produto) => produto.id === sugerido.id)) {
    // Confianca alta ja vem decidida. Nas demais a usuaria confirma com um toque, para nao somar ao produto errado.
    if (item.confianca !== "ALTA") return { ...base, acao: "", quantidade, valorUnitario };
    return { ...base, acao: "ASSOCIAR", produtoId: sugerido.id, quantidade, valorUnitario };
  }
  const nomeNovo = item.textoOriginal.trim().slice(0, LIMITE_NOME_NOVO_PRODUTO);
  return { ...base, acao: "CRIAR_NOVO", nomeNovo, quantidade, valorUnitario };
}

function decidir(itemId: number, escolha: Escolha, produtos: ProdutoCatalogo[]): DecisaoItem {
  if (escolha.acao === "REJEITAR") {
    return { itemId, acao: "REJEITAR", produtoId: null, criarNovo: false, nomeNovo: null, quantidade: null, valorUnitario: null };
  }
  const quantidade = quantidadeInteira(escolha.quantidade);
  const centavos = custoEmCentavos(escolha.valorUnitario);
  if (quantidade === null || centavos === null) throw new Error(`Corrija a quantidade e o custo do item ${itemId}.`);
  const valorUnitario = centavos / 100;
  if (escolha.acao === "CRIAR_NOVO") {
    const nomeNovo = escolha.nomeNovo.trim();
    if (!nomeNovoValido(nomeNovo)) throw new Error(`Informe um nome válido para o item ${itemId}.`);
    return { itemId, acao: "CRIAR_NOVO", produtoId: null, criarNovo: true, nomeNovo, quantidade, valorUnitario };
  }
  if (!produtos.some((produto) => produto.id === escolha.produtoId)) {
    throw new Error(`Selecione um produto disponível para o item ${itemId}.`);
  }
  return { itemId, acao: "ASSOCIAR", produtoId: escolha.produtoId, criarNovo: false, nomeNovo: null, quantidade, valorUnitario };
}

export function prepararRevisao(itens: Item[], escolhas: Readonly<Record<number, Escolha>>, produtos: ProdutoCatalogo[]): ConfirmarRequest {
  if (itens.length === 0 || new Set(itens.map((item) => item.itemId)).size !== itens.length ||
    itens.some((item) => !Number.isSafeInteger(item.itemId) || item.itemId <= 0)) {
    throw new Error("A nota não possui itens válidos e únicos para revisão.");
  }
  const ids = new Set(itens.map((item) => item.itemId));
  if (Object.keys(escolhas).some((id) => !ids.has(Number(id)))) throw new Error("A revisão contém um item desconhecido.");
  const decisoes = itens.map((item) => {
    const escolha = escolhas[item.itemId];
    if (!escolha) throw new Error(`Escolha uma ação para o item ${item.itemId}.`);
    return decidir(item.itemId, escolha, produtos);
  });
  const [primeira, ...resto] = decisoes;
  return { itens: [primeira, ...resto] };
}
