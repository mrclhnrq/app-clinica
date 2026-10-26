import { expect, jest, test } from "@jest/globals";
import { confirmarComConsulta, criarTrava, descartarComConsulta } from "./confirmacaoNota";
import { ErroNotaFiscal } from "./notaFiscalService";
import type { ConfirmarRequest, NotaResposta, ResumoConfirmacao } from "@/types/notaFiscal";

const pedido: ConfirmarRequest = { itens: [{ itemId: 1, acao: "REJEITAR", produtoId: null, criarNovo: false, nomeNovo: null, quantidade: null, valorUnitario: null }] };
const resumo: ResumoConfirmacao = { notaId: 42, status: "CONFIRMADA", itensConfirmados: [], itensRejeitados: [{ itemId: 1, motivo: "REJEITADO_PELA_USUARIA" }], produtosAfetados: [] };
const base: NotaResposta = { notaId: 42, status: "EM_REVISAO", fornecedor: null, dataEmissao: null, totalNota: null, chaveAcesso: null, avisos: [], codigoFalha: null, itens: [], resumoConfirmacao: null };
const confirmada: NotaResposta = { ...base, status: "CONFIRMADA", resumoConfirmacao: resumo };

function deps() {
  return { confirmar: jest.fn<() => Promise<ResumoConfirmacao>>(), consultar: jest.fn<() => Promise<NotaResposta>>(), descartar: jest.fn<() => Promise<void>>() };
}

test("200 usa ACK e sincronização só é solicitada após resumo do servidor", async () => {
  const api = deps();
  api.confirmar.mockResolvedValue(resumo);
  const recarregar = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const resposta = await confirmarComConsulta(42, pedido, api);
  expect(recarregar).not.toHaveBeenCalled();
  if (resposta.tipo !== "confirmada") throw new Error("ACK esperado");
  await recarregar();
  expect(resposta.resumo).toEqual(resumo);
  expect(api.consultar).not.toHaveBeenCalled();
  expect(recarregar).toHaveBeenCalledTimes(1);
});

test("timeout recupera CONFIRMADA via GET, sem repetir POST; erro de catálogo não desfaz ACK", async () => {
  const api = deps();
  api.confirmar.mockRejectedValue(new ErroNotaFiscal("TIMEOUT"));
  api.consultar.mockResolvedValue(confirmada);
  const resposta = await confirmarComConsulta(42, pedido, api);
  expect(resposta).toEqual({ tipo: "confirmada", resumo });
  const recarregar = jest.fn<() => Promise<void>>().mockRejectedValue(new Error("offline"));
  await expect(recarregar()).rejects.toThrow("offline");
  expect(api.confirmar).toHaveBeenCalledTimes(1);
  expect(api.consultar).toHaveBeenCalledTimes(1);
});

test("409 consulta estado próprio, não reenvia confirmação nem presume ACK", async () => {
  const api = deps();
  api.confirmar.mockRejectedValue(new ErroNotaFiscal("HTTP", 409, "CONFLITO_ESTADO"));
  api.consultar.mockResolvedValue(base);
  expect(await confirmarComConsulta(42, pedido, api)).toEqual({ tipo: "outroEstado", nota: base });
  expect(api.confirmar).toHaveBeenCalledTimes(1);
  api.consultar.mockResolvedValueOnce(confirmada);
  expect(await confirmarComConsulta(42, pedido, api)).toEqual({ tipo: "confirmada", resumo });
  api.consultar.mockRejectedValue(new ErroNotaFiscal("REDE"));
  await expect(confirmarComConsulta(42, pedido, api)).rejects.toMatchObject({ tipo: "REDE" });
});

test("trava bloqueia segundo toque e descarte simultâneo até concluir", async () => {
  const trava = criarTrava();
  let liberar: (() => void) | undefined;
  const pendente = new Promise<void>((resolve) => { liberar = resolve; });
  const acao = jest.fn(async () => { await pendente; });
  const primeiro = trava.executar(acao);
  await trava.executar(acao);
  expect(trava.ocupado).toBe(true);
  expect(acao).toHaveBeenCalledTimes(1);
  liberar?.();
  await primeiro;
  expect(trava.ocupado).toBe(false);
});

test("descarte 204, 409 confirmado e 404 não encontrado são distintos", async () => {
  const api = deps();
  api.descartar.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new ErroNotaFiscal("HTTP", 409)).mockRejectedValueOnce(new ErroNotaFiscal("HTTP", 404));
  expect(await descartarComConsulta(42, api)).toEqual({ tipo: "descartada" });
  api.consultar.mockResolvedValueOnce(confirmada).mockResolvedValueOnce({ ...base, status: "DESCARTADA" });
  expect(await descartarComConsulta(42, api)).toEqual({ tipo: "outroEstado", nota: confirmada });
  expect(await descartarComConsulta(42, api)).toEqual({ tipo: "descartada" });
  expect(api.descartar).toHaveBeenCalledTimes(3);
  api.descartar.mockRejectedValueOnce(new ErroNotaFiscal("HTTP", 404));
  api.consultar.mockRejectedValueOnce(new ErroNotaFiscal("HTTP", 404));
  expect(await descartarComConsulta(42, api)).toEqual({ tipo: "naoEncontrada" });
});
