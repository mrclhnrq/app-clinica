import { expect, test } from "@jest/globals";
import { custoEmCentavos, exigeCienciaExplicita, prepararRevisao, quantidadeInteira, type Escolha } from "./revisaoNota";
import type { Item } from "@/types/notaFiscal";

const itens: Item[] = [
  { itemId: 1, status: "INVALIDO", motivoRejeicao: { codigo: "DADOS_INVALIDOS", texto: "Custo ilegível" }, textoOriginal: "A", quantidade: null, valorUnitario: null, valorTotal: null, produtoSugerido: { id: 999, nome: "Outro" }, confianca: "BAIXA" },
  { itemId: 2, status: "VALIDO", motivoRejeicao: null, textoOriginal: "B", quantidade: 1, valorUnitario: 8, valorTotal: 8, produtoSugerido: null, confianca: "ALTA" },
];
const produtos = [{ id: 7, nome: "Meu produto" }];

test("item inválido corrigido e válido rejeitado exigem decisões explícitas completas", () => {
  const escolhas: Record<number, Escolha> = {
    1: { acao: "ASSOCIAR", produtoId: 7, quantidade: "3", valorUnitario: "1.234,50" },
    2: { acao: "REJEITAR" },
  };
  expect(() => prepararRevisao(itens, { 1: escolhas[1] }, produtos)).toThrow("item 2");
  expect(prepararRevisao(itens, escolhas, produtos)).toEqual({ itens: [
    { itemId: 1, acao: "ASSOCIAR", produtoId: 7, criarNovo: false, nomeNovo: null, quantidade: 3, valorUnitario: 1234.5 },
    { itemId: 2, acao: "REJEITAR", produtoId: null, criarNovo: false, nomeNovo: null, quantidade: null, valorUnitario: null },
  ] });
  expect(JSON.stringify(prepararRevisao(itens, escolhas, produtos))).toContain('"valorUnitario":1234.5');
});

test("sugestão fora do catálogo não autoriza associação; novo produto não define preço de venda", () => {
  expect(() => prepararRevisao([itens[0]], { 1: { acao: "ASSOCIAR", produtoId: 999, quantidade: "1", valorUnitario: "0,01" } }, produtos)).toThrow("produto disponível");
  expect(prepararRevisao([itens[0]], { 1: { acao: "CRIAR_NOVO", nomeNovo: " Novo ", quantidade: "1", valorUnitario: "0,01" } }, [])).toEqual({ itens: [
    { itemId: 1, acao: "CRIAR_NOVO", produtoId: null, criarNovo: true, nomeNovo: "Novo", quantidade: 1, valorUnitario: 0.01 },
  ] });
  expect(() => prepararRevisao(itens, { 1: { acao: "REJEITAR" }, 2: { acao: "REJEITAR" }, 3: { acao: "REJEITAR" } }, produtos)).toThrow("desconhecido");
  expect(() => prepararRevisao([itens[0], itens[0]], { 1: { acao: "REJEITAR" } }, produtos)).toThrow("únicos");
});

function criarNovoComNome(nomeNovo: string) {
  return prepararRevisao([itens[0]], { 1: { acao: "CRIAR_NOVO", nomeNovo, quantidade: "1", valorUnitario: "1,00" } }, []);
}

test("nome novo com length200 é aceito antes da confirmação explícita", () => {
  const nome = "a".repeat(200);
  expect(criarNovoComNome(nome).itens[0]).toMatchObject({ acao: "CRIAR_NOVO", criarNovo: true, nomeNovo: nome });
  expect(criarNovoComNome(` ${nome} `).itens[0]).toMatchObject({ nomeNovo: nome });
});

test("nome novo com length201 é rejeitado antes da confirmação explícita", () => {
  expect(() => criarNovoComNome("a".repeat(201))).toThrow("nome válido");
  expect(() => criarNovoComNome("a".repeat(255))).toThrow("nome válido");
});

test("nome novo vazio ou com caractere de controle ISO é rejeitado como no backend", () => {
  for (const nome of ["", "   ", "Ab\ncd", "Ab\u0000cd", "Ab\u007fcd", "Ab\u0085cd"]) {
    expect(() => criarNovoComNome(nome)).toThrow("nome válido");
  }
});

test("quantidade inteira e decimais ptBR só aceitam representação exata e limites do contrato", () => {
  expect(quantidadeInteira("2")).toBe(2);
  for (const valor of ["0", "1,5", "1.0", "01", "9007199254740992", " 2 "]) expect(quantidadeInteira(valor)).toBeNull();
  expect(custoEmCentavos("12,3")).toBe(1230);
  expect(custoEmCentavos("9999999,99")).toBe(999999999);
  for (const valor of ["0", "0,00", "1,234", "1.5", "10000000", "-2", "NaN", " 1,00 "]) expect(custoEmCentavos(valor)).toBeNull();
});

test("criação ou rejeição total exigem ciência explícita, associação comum não", () => {
  expect(exigeCienciaExplicita(prepararRevisao(itens, { 1: { acao: "REJEITAR" }, 2: { acao: "REJEITAR" } }, []))).toBe(true);
  expect(exigeCienciaExplicita(prepararRevisao([itens[0]], { 1: { acao: "CRIAR_NOVO", nomeNovo: "Novo", quantidade: "1", valorUnitario: "1,00" } }, []))).toBe(true);
  expect(exigeCienciaExplicita(prepararRevisao([itens[0]], { 1: { acao: "ASSOCIAR", produtoId: 7, quantidade: "1", valorUnitario: "1,00" } }, produtos))).toBe(false);
});
