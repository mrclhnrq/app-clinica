import type { ImagemNota } from "@/services/notaFiscalImagem";

type ControleNavegavel = {
  solicitarNavegacao: (cienteDaPendencia?: boolean) => number | null;
  liberarNavegacao: () => void;
};

export type ResultadoNavegacao = "navegou" | "ignorada" | "falhou";

/** Navega no máximo uma vez para a nota aceita; se a navegação lançar erro, libera nova tentativa sem reenviar a imagem. */
export function navegarParaNotaAceita(controle: ControleNavegavel, substituir: (id: number) => void,
  cienteDaPendencia = false): ResultadoNavegacao {
  const id = controle.solicitarNavegacao(cienteDaPendencia);
  if (id === null) return "ignorada";
  try {
    substituir(id);
    return "navegou";
  } catch {
    controle.liberarNavegacao();
    return "falhou";
  }
}

export function criarControleCopiaNota(excluir: (imagem: ImagemNota) => void, avisarFalha: () => void) {
  let imagem: ImagemNota | null = null;
  let enviando = false;
  let encerrado = false;
  let pendentes: ImagemNota[] = [];
  let idAceito: number | null = null;
  let navegacaoSolicitada = false;

  function apagar(copia: ImagemNota): boolean {
    try {
      excluir(copia);
      pendentes = pendentes.filter((item) => item !== copia);
      if (imagem === copia) imagem = null;
      return true;
    } catch {
      if (!pendentes.includes(copia)) pendentes.push(copia);
      avisarFalha();
      return false;
    }
  }

  function apagarAtual(): boolean {
    if (enviando) return false;
    return imagem === null || apagar(imagem);
  }

  function tentarNovamente(): boolean {
    if (enviando) return false;
    for (const copia of [...pendentes]) apagar(copia);
    return pendentes.length === 0;
  }

  return {
    get imagem() { return imagem; },
    get pendente() { return pendentes.length > 0; },
    get idAceito() { return idAceito; },
    ativar(): void { encerrado = false; },
    receber(copia: ImagemNota): boolean {
      if (encerrado || enviando || idAceito !== null || pendentes.length > 0) { apagar(copia); return false; }
      if (!apagarAtual()) { apagar(copia); return false; }
      imagem = copia;
      return true;
    },
    iniciarEnvio(): ImagemNota | null {
      if (encerrado || enviando || idAceito !== null || pendentes.length > 0 || imagem === null) return null;
      enviando = true;
      return imagem;
    },
    finalizarEnvio(): boolean {
      if (!enviando) return false;
      enviando = false;
      const apagada = apagarAtual();
      if (!encerrado) return apagada;
      if (pendentes.length > 0) tentarNovamente();
      return imagem === null && pendentes.length === 0;
    },
    limparPreview: apagarAtual,
    tentarNovamente,
    registrarAceite(id: number): void {
      if (!Number.isSafeInteger(id) || id <= 0 || idAceito !== null) throw new Error("ID aceito inválido ou já registrado.");
      idAceito = id;
    },
    solicitarNavegacao(cienteDaPendencia = false): number | null {
      if (navegacaoSolicitada || idAceito === null || enviando ||
        (!cienteDaPendencia && (pendentes.length > 0 || imagem !== null))) return null;
      navegacaoSolicitada = true;
      return idAceito;
    },
    liberarNavegacao(): void { navegacaoSolicitada = false; },
    encerrar(): void {
      encerrado = true;
      if (enviando) return;
      const anteriores = new Set(pendentes);
      tentarNovamente();
      if (imagem !== null && !anteriores.has(imagem)) {
        const copia = imagem;
        if (!apagarAtual()) apagar(copia);
      }
    },
  };
}
