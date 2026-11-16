import type { CodigoFalha, MotivoRejeicao } from "@/types/notaFiscal";

// Só texto de orientação para a usuária. Nunca incluir valores, CNPJ, chave ou trechos da nota.
const FALHAS: Readonly<Record<CodigoFalha, string>> = {
  IMAGEM_ILEGIVEL: "A foto está borrada, escura ou com reflexo, e os dados não puderam ser lidos. Tire outra foto com a nota inteira, em local iluminado e sem reflexo.",
  EXTRACAO_INVALIDA: "Não conseguimos extrair os dados desta foto. Confira se ela mostra uma nota fiscal inteira, e não outro documento, e tente com outra foto.",
  NOTA_INVALIDA: "A nota não tem itens ou total válidos para importar. Confira se é a nota fiscal correta; se for, tente com uma foto mais nítida da tabela de itens.",
  PROVEDOR_INDISPONIVEL: "O serviço de leitura está indisponível agora. Aguarde alguns minutos e envie a foto novamente.",
  DUPLICADA: "Esta nota já foi enviada antes. Confira a lista de notas antes de enviar a mesma foto de novo.",
  PROCESSAMENTO_FALHOU: "Ocorreu um erro interno ao processar a nota. Tente enviar a foto novamente; se o erro continuar, avise o suporte.",
};

const AVISOS: Readonly<Record<string, string>> = {
  FORNECEDOR_AUSENTE: "Não identificamos o fornecedor nesta nota. Confira o nome antes de confirmar.",
  CNPJ_INVALIDO: "O CNPJ do fornecedor não pôde ser validado e foi desconsiderado. Confira o fornecedor antes de confirmar.",
  TOTAL_DIVERGENTE: "A soma dos itens não bate com o total da nota. Confira quantidades e valores antes de confirmar.",
  CHAVE_DIVERGENTE: "A chave de acesso não confere com os dados da nota. Confira a foto antes de confirmar.",
  POSSIVEL_DUPLICATA: "Esta nota pode já ter sido importada. Confira antes de confirmar para não lançar a mesma compra duas vezes.",
  CHAVE_NAO_CONFIRMADA: "Não foi possível confirmar a chave de acesso da nota. Confira os dados com atenção; a verificação de nota repetida será feita só pelos valores.",
};

export const AVISO_GENERICO = "Esta nota tem um ponto a conferir. Revise os dados antes de confirmar.";

const MOTIVOS: Readonly<Record<MotivoRejeicao, string>> = {
  SEM_PRODUTO: "Nenhum produto correspondente foi encontrado para este item.",
  REJEITADO_PELA_USUARIA: "Você rejeitou este item na revisão.",
  DADOS_INVALIDOS: "Os dados deste item estão incompletos ou inválidos.",
};

export function textoFalhaNota(codigo: CodigoFalha): string {
  return FALHAS[codigo];
}

/** Códigos desconhecidos recebem texto genérico; o código bruto nunca é exibido. */
export function textoAvisoNota(codigo: string): string {
  return Object.hasOwn(AVISOS, codigo) ? AVISOS[codigo] : AVISO_GENERICO;
}

export function textoMotivoRejeicao(codigo: MotivoRejeicao): string {
  return MOTIVOS[codigo];
}
