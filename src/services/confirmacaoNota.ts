import { confirmar, consultar, descartar, ErroNotaFiscal } from "@/services/notaFiscalService";
import type { ConfirmarRequest, NotaResposta, ResumoConfirmacao } from "@/types/notaFiscal";

type Transporte = { confirmar: typeof confirmar; consultar: typeof consultar; descartar: typeof descartar };
const transporte: Transporte = { confirmar, consultar, descartar };

export function criarTrava() {
  let ocupado = false;
  return {
    get ocupado() { return ocupado; },
    async executar(acao: () => Promise<void>): Promise<void> {
      if (ocupado) return;
      ocupado = true;
      try { await acao(); } finally { ocupado = false; }
    },
  };
}

function consultarAposConflito(erro: unknown): boolean {
  return erro instanceof ErroNotaFiscal &&
    (erro.tipo === "TIMEOUT" || erro.tipo === "REDE" || (erro.tipo === "HTTP" && erro.status === 409));
}

export type ResultadoConfirmacao =
  | { tipo: "confirmada"; resumo: ResumoConfirmacao }
  | { tipo: "outroEstado"; nota: NotaResposta };

export async function confirmarComConsulta(id: number, pedido: ConfirmarRequest, api: Transporte = transporte): Promise<ResultadoConfirmacao> {
  try {
    return { tipo: "confirmada", resumo: await api.confirmar(id, pedido) };
  } catch (erro) {
    if (!consultarAposConflito(erro)) throw erro;
    const nota = await api.consultar(id);
    return nota.status === "CONFIRMADA" ? { tipo: "confirmada", resumo: nota.resumoConfirmacao } : { tipo: "outroEstado", nota };
  }
}

export type ResultadoDescarte = { tipo: "descartada" } | { tipo: "outroEstado"; nota: NotaResposta } | { tipo: "naoEncontrada" };

export async function descartarComConsulta(id: number, api: Transporte = transporte): Promise<ResultadoDescarte> {
  try {
    await api.descartar(id);
    return { tipo: "descartada" };
  } catch (erro) {
    if (!consultarAposConflito(erro) && !(erro instanceof ErroNotaFiscal && erro.status === 404)) throw erro;
    try {
      const nota = await api.consultar(id);
      return nota.status === "DESCARTADA" ? { tipo: "descartada" } : { tipo: "outroEstado", nota };
    } catch (consultaErro) {
      if (consultaErro instanceof ErroNotaFiscal && consultaErro.status === 404) return { tipo: "naoEncontrada" };
      throw consultaErro;
    }
  }
}
