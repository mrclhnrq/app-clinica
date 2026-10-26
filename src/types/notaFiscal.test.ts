import { expect, test } from "@jest/globals";
import type {
  ConfirmarRequest, DecisaoItem, ErroNota, EstadoItem, EstadoNota,
  Item, NotaResposta, ProdutoCatalogo, ResumoConfirmacao, UploadResposta,
} from "./notaFiscal";

const resumo: ResumoConfirmacao = {
  notaId: 42, status: "CONFIRMADA",
  itensConfirmados: [{ itemId: 101, produtoId: 17, quantidade: 5, custoUnitario: 250 }],
  itensRejeitados: [{ itemId: 102, motivo: "SEM_PRODUTO" }],
  produtosAfetados: [{ id: 17, estoqueAtual: 12, ultimoCusto: 250, valorVenda: null }],
};

const estadosNota: EstadoNota[] = ["PROCESSANDO", "EM_REVISAO", "CONFIRMADA", "FALHA", "DESCARTADA"];
const estadosItem: EstadoItem[] = ["PENDENTE", "VALIDO", "INVALIDO", "CONFIRMADO", "REJEITADO"];

function notaNoEstado(status: EstadoNota): NotaResposta {
  const base = {
    notaId: 42, fornecedor: null, dataEmissao: null, totalNota: null,
    chaveAcesso: null, avisos: [], itens: [],
  };
  if (status === "FALHA") {
    return { ...base, status, codigoFalha: "NOTA_INVALIDA", resumoConfirmacao: null };
  }
  if (status === "CONFIRMADA") {
    return { ...base, status, codigoFalha: null, resumoConfirmacao: resumo };
  }
  return { ...base, status, codigoFalha: null, resumoConfirmacao: null };
}

test("upload e decisões serializam nulos explícitos", () => {
  const upload: UploadResposta = { notaId: 42, status: "PROCESSANDO" };
  expect(JSON.stringify(upload)).toBe('{"notaId":42,"status":"PROCESSANDO"}');
  const itens: [DecisaoItem, ...DecisaoItem[]] = [
    { itemId: 101, acao: "ASSOCIAR", produtoId: 17, criarNovo: false, nomeNovo: null, quantidade: 5, valorUnitario: 250 },
    { itemId: 102, acao: "CRIAR_NOVO", produtoId: null, criarNovo: true, nomeNovo: "Novo", quantidade: 2, valorUnitario: 10 },
    { itemId: 103, acao: "REJEITAR", produtoId: null, criarNovo: false, nomeNovo: null, quantidade: null, valorUnitario: null },
  ];
  const request: ConfirmarRequest = { itens };
  expect(JSON.stringify(request)).toContain('"produtoId":null,"criarNovo":false,"nomeNovo":null,"quantidade":null,"valorUnitario":null');
  expect(Object.keys(request.itens[2])).toHaveLength(7);
});

test.each(estadosNota)("GET %s conserva dez campos e nulidade condicional", (status) => {
  const nota = notaNoEstado(status);
  const wire = JSON.stringify(nota);
  expect(Object.keys(nota)).toHaveLength(10);
  expect(wire).toContain(`"status":"${status}"`);
  expect(wire).toContain('"fornecedor":null');
  expect(wire).toContain('"avisos":[]');
  expect(wire).toContain('"itens":[]');
  expect(nota.codigoFalha).toBe(status === "FALHA" ? "NOTA_INVALIDA" : null);
  expect(nota.resumoConfirmacao).toEqual(status === "CONFIRMADA" ? resumo : null);
});

test.each(estadosItem)("item %s conserva nove campos e motivo", (status) => {
  const base = {
    itemId: 101, textoOriginal: "Produto sintético", quantidade: null,
    valorUnitario: null, valorTotal: null, produtoSugerido: null, confianca: null,
  };
  const item: Item = status === "INVALIDO" || status === "REJEITADO"
    ? { ...base, status, motivoRejeicao: { codigo: "DADOS_INVALIDOS", texto: "Dados inválidos" } }
    : { ...base, status, motivoRejeicao: null };
  const wire = JSON.stringify(item);
  expect(Object.keys(item)).toHaveLength(9);
  expect(wire).toContain(`"status":"${status}"`);
  expect(wire).toContain(status === "INVALIDO" || status === "REJEITADO"
    ? '"motivoRejeicao":{"codigo":"DADOS_INVALIDOS","texto":"Dados inválidos"}'
    : '"motivoRejeicao":null');
});

test("resumo recuperável preserva arrays vazios e valorVenda nulo", () => {
  const vazio: ResumoConfirmacao = {
    notaId: 42, status: "CONFIRMADA", itensConfirmados: [], itensRejeitados: [], produtosAfetados: [],
  };
  expect(Object.keys(vazio)).toHaveLength(5);
  expect(JSON.stringify(vazio)).toContain('"produtosAfetados":[]');
  expect(JSON.stringify(resumo)).toContain('"valorVenda":null');
  expect(notaNoEstado("CONFIRMADA").resumoConfirmacao).toEqual(resumo);
});

test("erro e catálogo não incluem campos internos", () => {
  const erro: ErroNota = { codigo: "CONFLITO_ESTADO", mensagem: "Confira o estado da nota.", notaId: null, statusAtual: "CONFIRMADA" };
  const catalogo: ProdutoCatalogo[] = [{ id: 17, nome: "Produto cadastrado" }];
  expect(Object.keys(erro)).toHaveLength(4);
  expect(JSON.stringify(erro)).toContain('"notaId":null');
  expect(JSON.stringify(catalogo)).toBe('[{"id":17,"nome":"Produto cadastrado"}]');
  expect(Object.keys(catalogo[0])).toEqual(["id", "nome"]);
});
