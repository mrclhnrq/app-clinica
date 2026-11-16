import { expect, test } from "@jest/globals";
import type { CodigoFalha, MotivoRejeicao } from "@/types/notaFiscal";
import { AVISO_GENERICO, textoAvisoNota, textoFalhaNota, textoMotivoRejeicao } from "./mensagensNota";

const falhas: CodigoFalha[] = ["IMAGEM_ILEGIVEL", "EXTRACAO_INVALIDA", "NOTA_INVALIDA", "PROVEDOR_INDISPONIVEL", "DUPLICADA", "PROCESSAMENTO_FALHOU"];
const avisos = ["FORNECEDOR_AUSENTE", "CNPJ_INVALIDO", "TOTAL_DIVERGENTE", "CHAVE_DIVERGENTE", "POSSIVEL_DUPLICATA", "CHAVE_NAO_CONFIRMADA"];
const motivos: MotivoRejeicao[] = ["SEM_PRODUTO", "REJEITADO_PELA_USUARIA", "DADOS_INVALIDOS"];

test("cada código de falha tem texto específico, em português e sem o código bruto", () => {
  const textos = falhas.map(textoFalhaNota);
  expect(new Set(textos).size).toBe(falhas.length);
  for (const [indice, texto] of textos.entries()) {
    expect(texto.length).toBeGreaterThan(40);
    expect(texto.endsWith(".")).toBe(true);
    expect(texto).not.toMatch(/[A-Z]{3,}_[A-Z_]+/);
    expect(texto).not.toContain(falhas[indice]);
  }
});

test("IMAGEM_ILEGIVEL e EXTRACAO_INVALIDA orientam nova foto ou verificação da nota", () => {
  expect(textoFalhaNota("IMAGEM_ILEGIVEL")).toMatch(/outra foto/);
  expect(textoFalhaNota("EXTRACAO_INVALIDA")).toMatch(/nota fiscal inteira/);
});

test("cada aviso conhecido tem texto próprio e acionável", () => {
  const textos = avisos.map(textoAvisoNota);
  expect(new Set(textos).size).toBe(avisos.length);
  for (const texto of textos) {
    expect(texto).toMatch(/[Cc]onfira|[Rr]evise/);
    expect(texto).not.toMatch(/[A-Z]{3,}_[A-Z_]+/);
  }
});

test("aviso desconhecido recebe texto genérico e nunca ecoa a entrada", () => {
  const entrada = "CNPJ 12.345.678/0001-95 chave 35200112345678000195550010000000011000000012";
  expect(textoAvisoNota(entrada)).toBe(AVISO_GENERICO);
  expect(textoAvisoNota("ALGO_NOVO")).toBe(AVISO_GENERICO);
  expect(textoAvisoNota("constructor")).toBe(AVISO_GENERICO);
});

test("cada motivo de rejeição tem texto específico", () => {
  const textos = motivos.map(textoMotivoRejeicao);
  expect(new Set(textos).size).toBe(motivos.length);
  for (const texto of textos) expect(texto).not.toMatch(/[A-Z]{3,}_[A-Z_]+/);
});
