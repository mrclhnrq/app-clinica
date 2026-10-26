import { expect, test } from "@jest/globals";
import { avaliarConsulta, consultaPertenceAConta, notaVisivel } from "@/app/(autenticado)/notas/[id]";
import { permissaoBloqueada } from "@/app/(autenticado)/notas/captura";
import { erroCorrigivelDeRevisao } from "./RevisaoNota";
import { ErroNotaFiscal } from "@/services/notaFiscalService";
import type { NotaResposta } from "@/types/notaFiscal";

const revisao: NotaResposta = {
  notaId: 42, status: "EM_REVISAO", fornecedor: null, dataEmissao: null, totalNota: null,
  chaveAcesso: null, avisos: [], codigoFalha: null, itens: [], resumoConfirmacao: null,
};

test("retorno ao foco com mesma revisão mantém rascunho e dados novos exigem revisão", () => {
  expect(avaliarConsulta(revisao, { ...revisao, avisos: [] })).toBe("manterRascunho");
  expect(avaliarConsulta(revisao, { ...revisao, avisos: ["Alterada no servidor"] })).toBe("reiniciarRevisao");
  expect(avaliarConsulta(null, revisao)).toBe("atualizar");
});

test("GET antigo de revisão não substitui ACK confirmado", () => {
  const confirmada: NotaResposta = { ...revisao, status: "CONFIRMADA", resumoConfirmacao: {
    notaId: 42, status: "CONFIRMADA", itensConfirmados: [], itensRejeitados: [], produtosAfetados: [],
  } };
  expect(avaliarConsulta(confirmada, revisao)).toBe("ignorar");
  expect(avaliarConsulta(revisao, confirmada)).toBe("atualizar");
});

test("422 e entrada inválida são corrigíveis sem consulta; timeout e 409 não são", () => {
  expect(erroCorrigivelDeRevisao(new ErroNotaFiscal("HTTP", 422))).toBe(true);
  expect(erroCorrigivelDeRevisao(new ErroNotaFiscal("ENTRADA"))).toBe(true);
  expect(erroCorrigivelDeRevisao(new ErroNotaFiscal("TIMEOUT"))).toBe(false);
  expect(erroCorrigivelDeRevisao(new ErroNotaFiscal("HTTP", 409))).toBe(false);
});

test("ajustes só são oferecidos quando o sistema informa bloqueio permanente", () => {
  expect(permissaoBloqueada({ granted: false, canAskAgain: false })).toBe(true);
  expect(permissaoBloqueada({ granted: false, canAskAgain: true })).toBe(false);
  expect(permissaoBloqueada({ granted: true, canAskAgain: false })).toBe(false);
  expect(permissaoBloqueada({ granted: "false", canAskAgain: false })).toBe(false);
  expect(permissaoBloqueada(null)).toBe(false);
});

test("mesmo ID não exibe dados fiscais ao sair ou entrar em outra conta", () => {
  const anterior = { usuarioId: 10, nota: revisao };
  expect(notaVisivel(10, 42, anterior)).toBe(revisao);
  expect(notaVisivel(null, 42, anterior)).toBeNull();
  expect(notaVisivel(20, 42, anterior)).toBeNull();
  expect(notaVisivel(10, 43, anterior)).toBeNull();
  expect(avaliarConsulta(notaVisivel(20, 42, anterior), revisao)).toBe("atualizar");
});

test("GET tardio iniciado sob outra identidade não entra na nota atual", async () => {
  let resolver!: (nota: NotaResposta) => void;
  const getAntigo = new Promise<NotaResposta>((resolve) => { resolver = resolve; });
  let visivel: NotaResposta | null = null;
  const requisicao = getAntigo.then((resposta) => {
    if (consultaPertenceAConta(20, 42, 10, resposta)) visivel = resposta;
  });
  resolver(revisao);
  await requisicao;
  expect(visivel).toBeNull();
  expect(consultaPertenceAConta(20, 42, 20, revisao)).toBe(true);
  expect(consultaPertenceAConta(20, 43, 20, revisao)).toBe(false);
});
