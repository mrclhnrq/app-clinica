// Os IDs int64 e decimais são números JSON; não fazer aritmética monetária em number
// nem assumir que IDs acima de Number.MAX_SAFE_INTEGER preservam precisão no JS.
export type EstadoNota = "PROCESSANDO" | "EM_REVISAO" | "CONFIRMADA" | "FALHA" | "DESCARTADA";
export type EstadoItem = "PENDENTE" | "VALIDO" | "INVALIDO" | "CONFIRMADO" | "REJEITADO";
export type Confianca = "ALTA" | "MEDIA" | "BAIXA";
export type CodigoFalha =
  | "IMAGEM_ILEGIVEL" | "EXTRACAO_INVALIDA" | "NOTA_INVALIDA"
  | "PROVEDOR_INDISPONIVEL" | "DUPLICADA" | "PROCESSAMENTO_FALHOU";
export type MotivoRejeicao = "SEM_PRODUTO" | "REJEITADO_PELA_USUARIA" | "DADOS_INVALIDOS";
export type CodigoErro =
  | "SOLICITACAO_INVALIDA" | "IMAGEM_INVALIDA" | "DUPLICADA" | "NOTA_INVALIDA"
  | "CONFLITO_ESTADO" | "SEM_ACESSO" | "LIMITE_EXCEDIDO" | "SERVICO_INDISPONIVEL";

export type UploadResposta = { notaId: number; status: "PROCESSANDO" };
export type Fornecedor = { cnpj: string | null; razaoSocial: string | null };
export type ProdutoSugerido = { id: number; nome: string };
export type Rejeicao = { codigo: MotivoRejeicao; texto: string };

type ItemBase = {
  itemId: number;
  textoOriginal: string;
  quantidade: number | null;
  valorUnitario: number | null;
  valorTotal: number | null;
  produtoSugerido: ProdutoSugerido | null;
  confianca: Confianca | null;
};

export type Item = ItemBase & (
  | { status: "PENDENTE" | "VALIDO" | "CONFIRMADO"; motivoRejeicao: null }
  | { status: "INVALIDO" | "REJEITADO"; motivoRejeicao: Rejeicao | null }
);

export type ItemConfirmado = {
  itemId: number;
  produtoId: number;
  quantidade: number;
  custoUnitario: number;
};
export type ItemRejeitado = { itemId: number; motivo: MotivoRejeicao };
export type ProdutoAfetado = {
  id: number;
  estoqueAtual: number;
  ultimoCusto: number;
  valorVenda: number | null;
};
export type ResumoConfirmacao = {
  notaId: number;
  status: "CONFIRMADA";
  itensConfirmados: ItemConfirmado[];
  itensRejeitados: ItemRejeitado[];
  produtosAfetados: ProdutoAfetado[];
};

type NotaBase = {
  notaId: number;
  fornecedor: Fornecedor | null;
  dataEmissao: string | null; // ISO date: AAAA-MM-DD
  totalNota: number | null;
  chaveAcesso: string | null;
  avisos: string[];
  itens: Item[];
};

export type NotaResposta = NotaBase & (
  | { status: "PROCESSANDO" | "EM_REVISAO" | "DESCARTADA"; codigoFalha: null; resumoConfirmacao: null }
  | { status: "FALHA"; codigoFalha: CodigoFalha; resumoConfirmacao: null }
  | { status: "CONFIRMADA"; codigoFalha: null; resumoConfirmacao: ResumoConfirmacao }
);

type DecisaoBase = { itemId: number };
type DecisaoAprovada = { quantidade: number; valorUnitario: number };

export type DecisaoItem = DecisaoBase & (
  | (DecisaoAprovada & { acao: "ASSOCIAR"; produtoId: number; criarNovo: false; nomeNovo: null })
  | (DecisaoAprovada & { acao: "CRIAR_NOVO"; produtoId: null; criarNovo: true; nomeNovo: string })
  | { acao: "REJEITAR"; produtoId: null; criarNovo: false; nomeNovo: null; quantidade: null; valorUnitario: null }
);

export type ConfirmarRequest = { itens: [DecisaoItem, ...DecisaoItem[]] };
export type ErroNota = {
  codigo: CodigoErro;
  mensagem: string;
  notaId: number | null;
  statusAtual: EstadoNota | null;
};
export type ProdutoCatalogo = { id: number; nome: string };
