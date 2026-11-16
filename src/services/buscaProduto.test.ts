import { expect, test } from "@jest/globals";
import { distanciaLevenshtein, ordenarPorSemelhanca, pontuarProduto, produtosParaAssociar } from "./buscaProduto";

const produtos = [
  { id: 1, nome: "Sérum Vitamina C 30ml" },
  { id: 2, nome: "Creme Hidratante Facial" },
  { id: 3, nome: "Protetor Solar FPS 50" },
  { id: 4, nome: "Máscara de Argila" },
];

test("levenshtein conta edicoes", () => {
  expect(distanciaLevenshtein("hidratante", "hidratnte")).toBe(1);
  expect(distanciaLevenshtein("", "abc")).toBe(3);
  expect(distanciaLevenshtein("abc", "abc")).toBe(0);
});

test("ignora acento e caixa e aceita prefixo", () => {
  expect(pontuarProduto("serum", "Sérum Vitamina C")).toBe(1);
  expect(pontuarProduto("HIDRAT", "Creme Hidratante Facial")).toBe(1);
});

test("tolera erro de digitacao", () => {
  const lista = produtosParaAssociar(produtos, "hidratnte", "", null);
  expect(lista.map((p) => p.id)).toEqual([2]);
});

test("busca sem correspondencia nao lista nada", () => {
  expect(produtosParaAssociar(produtos, "xyzwq", "", null)).toEqual([]);
});

test("sem busca ordena pelo texto da nota", () => {
  const ordem = ordenarPorSemelhanca(produtos, "CR HIDRATANTE FACIAL 50G").map((p) => p.produto.id);
  expect(ordem[0]).toBe(2);
});

test("produto escolhido continua visivel mesmo fora da busca", () => {
  const lista = produtosParaAssociar(produtos, "argila", "", 1);
  expect(lista.map((p) => p.id)).toEqual([1, 4]);
});
