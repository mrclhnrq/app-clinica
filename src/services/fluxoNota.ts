import type { ImagemNota } from "@/services/notaFiscalImagem";
import { ErroNotaFiscal } from "@/services/notaFiscalService";
import type { NotaResposta, UploadResposta } from "@/types/notaFiscal";

export type ResultadoEnvio =
  | { tipo: "acompanhar"; id: number }
  | { tipo: "erro"; mensagem: string; respostaIncerta: boolean };

export async function enviarUmaVez(
  imagem: ImagemNota,
  enviar: (imagem: ImagemNota) => Promise<UploadResposta>,
): Promise<ResultadoEnvio> {
  try {
    const resposta = await enviar(imagem);
    if (resposta.status !== "PROCESSANDO" || !Number.isSafeInteger(resposta.notaId) || resposta.notaId <= 0) {
      return { tipo: "erro", mensagem: "Resposta inesperada do servidor. Consulte a nota antes de enviar novamente.", respostaIncerta: true };
    }
    return { tipo: "acompanhar", id: resposta.notaId };
  } catch (erro) {
    if (erro instanceof ErroNotaFiscal) {
      if (erro.status === 409 && erro.codigo === "DUPLICADA" && erro.notaId !== null) {
        return { tipo: "acompanhar", id: erro.notaId };
      }
      if (erro.status === 401) return { tipo: "erro", mensagem: "Sessão expirada. Entre novamente.", respostaIncerta: false };
      if (erro.status === 429) return { tipo: "erro", mensagem: "Limite de envios atingido. Aguarde antes de tentar novamente.", respostaIncerta: false };
      if (erro.status === 422) return { tipo: "erro", mensagem: "Não foi possível ler a imagem. Escolha outra foto nítida da nota antes de enviar novamente.", respostaIncerta: false };
      if (erro.status === 413) return { tipo: "erro", mensagem: "Imagem grande demais. Escolha outra foto menor antes de enviar novamente.", respostaIncerta: false };
      return { tipo: "erro", mensagem: erro.message, respostaIncerta: erro.tipo === "REDE" || erro.tipo === "TIMEOUT" || erro.tipo === "CONTRATO" };
    }
    return { tipo: "erro", mensagem: "Não foi possível confirmar a resposta. Consulte a nota antes de tentar novamente.", respostaIncerta: true };
  }
}

export function validarIdNota(valor: string): number | null {
  if (!/^[1-9]\d{0,15}$/.test(valor)) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) ? id : null;
}

export type EventoConsulta =
  | { tipo: "nota"; nota: NotaResposta }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "limite" };

export function acompanharNota(
  id: number,
  consultar: (id: number) => Promise<NotaResposta>,
  notificar: (evento: EventoConsulta) => void,
  agendar: (callback: () => void, ms: number) => ReturnType<typeof setTimeout> = setTimeout,
  cancelar: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout,
  aleatorio: () => number = Math.random,
): () => void {
  if (!Number.isSafeInteger(id) || id <= 0) throw new ErroNotaFiscal("ENTRADA");
  let ativo = true;
  let tentativas = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function consultarAgora() {
    tentativas += 1;
    try {
      const nota = await consultar(id);
      if (!ativo) return;
      if (nota.notaId !== id) throw new ErroNotaFiscal("CONTRATO");
      notificar({ tipo: "nota", nota });
      if (nota.status !== "PROCESSANDO") return;
      if (tentativas >= 8) { notificar({ tipo: "limite" }); return; }
      const jitter = Math.max(0, Math.min(1, aleatorio()));
       timer = agendar(consultarAgora, 3000 + Math.floor(jitter * 500));
    } catch (erro) {
      if (!ativo) return;
      const mensagem = erro instanceof ErroNotaFiscal && erro.status === 401 ? "Sessão expirada. Entre novamente." :
        erro instanceof ErroNotaFiscal && erro.status === 429 ? "Limite de consultas atingido. Aguarde para consultar novamente." :
          erro instanceof ErroNotaFiscal ? erro.message : "Não foi possível consultar a nota. Tente consultar novamente.";
      notificar({ tipo: "erro", mensagem });
    }
  }

  void consultarAgora();
  return () => { ativo = false; if (timer !== null) cancelar(timer); };
}
