import { isAxiosError } from "axios";
import { api } from "@/services/api";
import type {
  CodigoErro, ConfirmarRequest, ErroNota, EstadoNota, Item, NotaResposta,
  ProdutoCatalogo, ResumoConfirmacao, UploadResposta,
} from "@/types/notaFiscal";
import type { ImagemNota } from "@/services/notaFiscalImagem";
import { nomeNovoValido } from "@/services/revisaoNota";

const BASE = "/estoque/notas";
const UPLOAD_TIMEOUT = 60000;

// React Native aceita descritores de arquivo locais no FormData; lib.dom não declara essa sobrecarga.
declare global {
  interface FormData {
    append(name: string, value: { uri: string; name: string; type: string }): void;
  }
}

function objeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function campos(valor: unknown, nomes: string[]): valor is Record<string, unknown> {
  return objeto(valor) && Object.keys(valor).length === nomes.length &&
    nomes.every((nome) => Object.hasOwn(valor, nome));
}

function umDe<T extends string>(valor: unknown, opcoes: readonly T[]): valor is T {
  return typeof valor === "string" && opcoes.some((opcao) => opcao === valor);
}

const estados = ["PROCESSANDO", "EM_REVISAO", "CONFIRMADA", "FALHA", "DESCARTADA"] as const;
const falhas = ["IMAGEM_ILEGIVEL", "EXTRACAO_INVALIDA", "NOTA_INVALIDA", "PROVEDOR_INDISPONIVEL", "DUPLICADA", "PROCESSAMENTO_FALHOU"] as const;
const motivos = ["SEM_PRODUTO", "REJEITADO_PELA_USUARIA", "DADOS_INVALIDOS"] as const;
const erros = ["SOLICITACAO_INVALIDA", "IMAGEM_INVALIDA", "DUPLICADA", "NOTA_INVALIDA", "CONFLITO_ESTADO", "SEM_ACESSO", "LIMITE_EXCEDIDO", "SERVICO_INDISPONIVEL"] as const;

function texto(valor: unknown): valor is string { return typeof valor === "string"; }
function opcionalTexto(valor: unknown): valor is string | null { return valor === null || texto(valor); }
function numero(valor: unknown): valor is number { return typeof valor === "number" && Number.isFinite(valor); }
function inteiro(valor: unknown): valor is number { return numero(valor) && Number.isSafeInteger(valor) && valor > 0; }
function centavosExatos(valor: unknown): valor is number {
  return numero(valor) && valor >= 0.01 && valor <= 9999999.99 &&
    /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(valor.toString());
}
function naoNegativo(valor: unknown): valor is number { return numero(valor) && valor >= 0; }
function opcionalNumero(valor: unknown): valor is number | null { return valor === null || numero(valor); }
function lista<T>(valor: unknown, validar: (item: unknown) => item is T): valor is T[] {
  return Array.isArray(valor) && valor.every(validar);
}

function produto(valor: unknown): valor is ProdutoCatalogo {
  return campos(valor, ["id", "nome"]) && inteiro(valor.id) && texto(valor.nome);
}

function item(valor: unknown): valor is Item {
  if (!campos(valor, ["itemId", "textoOriginal", "quantidade", "valorUnitario", "valorTotal", "produtoSugerido", "confianca", "status", "motivoRejeicao"])) return false;
  const motivo = valor.motivoRejeicao;
  return inteiro(valor.itemId) && texto(valor.textoOriginal) &&
     (valor.quantidade === null || Number.isSafeInteger(valor.quantidade)) && opcionalNumero(valor.valorUnitario) &&
    opcionalNumero(valor.valorTotal) && (valor.produtoSugerido === null || produto(valor.produtoSugerido)) &&
    (valor.confianca === null || umDe(valor.confianca, ["ALTA", "MEDIA", "BAIXA"])) &&
    (umDe(valor.status, ["INVALIDO", "REJEITADO"])
      ? motivo === null || (campos(motivo, ["codigo", "texto"]) && umDe(motivo.codigo, motivos) && texto(motivo.texto) && motivo.texto.length <= 160)
      : umDe(valor.status, ["PENDENTE", "VALIDO", "CONFIRMADO"]) && motivo === null);
}

function resumo(valor: unknown): valor is ResumoConfirmacao {
  return campos(valor, ["notaId", "status", "itensConfirmados", "itensRejeitados", "produtosAfetados"]) &&
    inteiro(valor.notaId) && valor.status === "CONFIRMADA" &&
    lista(valor.itensConfirmados, (v): v is ResumoConfirmacao["itensConfirmados"][number] =>
      campos(v, ["itemId", "produtoId", "quantidade", "custoUnitario"]) && inteiro(v.itemId) && inteiro(v.produtoId) && inteiro(v.quantidade) && naoNegativo(v.custoUnitario)) &&
    lista(valor.itensRejeitados, (v): v is ResumoConfirmacao["itensRejeitados"][number] =>
      campos(v, ["itemId", "motivo"]) && inteiro(v.itemId) && umDe(v.motivo, motivos)) &&
    lista(valor.produtosAfetados, (v): v is ResumoConfirmacao["produtosAfetados"][number] =>
      campos(v, ["id", "estoqueAtual", "ultimoCusto", "valorVenda"]) && inteiro(v.id) &&
      Number.isSafeInteger(v.estoqueAtual) && naoNegativo(v.estoqueAtual) && naoNegativo(v.ultimoCusto) && opcionalNumero(v.valorVenda));
}

function nota(valor: unknown): valor is NotaResposta {
  if (!campos(valor, ["notaId", "status", "fornecedor", "dataEmissao", "totalNota", "chaveAcesso", "avisos", "codigoFalha", "itens", "resumoConfirmacao"])) return false;
  const fornecedor = valor.fornecedor;
  return inteiro(valor.notaId) && umDe(valor.status, estados) &&
    (fornecedor === null || (campos(fornecedor, ["cnpj", "razaoSocial"]) && opcionalTexto(fornecedor.cnpj) && opcionalTexto(fornecedor.razaoSocial))) &&
    (valor.dataEmissao === null || (texto(valor.dataEmissao) && /^\d{4}-\d{2}-\d{2}$/.test(valor.dataEmissao))) &&
    opcionalNumero(valor.totalNota) && opcionalTexto(valor.chaveAcesso) && lista(valor.avisos, texto) && lista(valor.itens, item) &&
    (valor.status === "FALHA" ? umDe(valor.codigoFalha, falhas) && valor.resumoConfirmacao === null
      : valor.status === "CONFIRMADA" ? valor.codigoFalha === null && resumo(valor.resumoConfirmacao) && valor.resumoConfirmacao.notaId === valor.notaId
        : valor.codigoFalha === null && valor.resumoConfirmacao === null);
}

function uploadResposta(valor: unknown): valor is UploadResposta {
  return campos(valor, ["notaId", "status"]) && inteiro(valor.notaId) && valor.status === "PROCESSANDO";
}

function erroNota(valor: unknown): valor is ErroNota {
  return campos(valor, ["codigo", "mensagem", "notaId", "statusAtual"]) && umDe(valor.codigo, erros) && texto(valor.mensagem) &&
    (valor.notaId === null || (valor.codigo === "DUPLICADA" && inteiro(valor.notaId))) &&
    (valor.statusAtual === null || (valor.codigo === "CONFLITO_ESTADO" && umDe(valor.statusAtual, estados)));
}

export class ErroNotaFiscal extends Error {
  constructor(readonly tipo: "HTTP" | "REDE" | "TIMEOUT" | "CONTRATO" | "ENTRADA", readonly status: number | null = null,
    readonly codigo: CodigoErro | null = null, readonly notaId: number | null = null, readonly statusAtual: EstadoNota | null = null) {
    super(tipo === "TIMEOUT" ? "Resposta demorada. Consulte a nota antes de tentar novamente." :
      tipo === "REDE" ? "Não foi possível confirmar a resposta. Consulte o estado antes de repetir a ação." :
        tipo === "CONTRATO" ? "Resposta inesperada do servidor." :
          tipo === "ENTRADA" ? "Dados inválidos para a nota fiscal." : "Não foi possível concluir a operação.");
    this.name = "ErroNotaFiscal";
  }
}

function validar<T>(valor: unknown, verificar: (v: unknown) => v is T): T {
  if (!verificar(valor)) throw new ErroNotaFiscal("CONTRATO");
  return valor;
}

function tratarErro(erro: unknown): never {
  if (erro instanceof ErroNotaFiscal) throw erro;
  if (!isAxiosError(erro)) throw new ErroNotaFiscal("REDE");
  if (erro.code === "ECONNABORTED" || erro.code === "ETIMEDOUT") throw new ErroNotaFiscal("TIMEOUT");
  if (!erro.response) throw new ErroNotaFiscal("REDE");
  const corpo: unknown = erro.response.data;
  const seguro = erroNota(corpo) ? corpo : null;
  throw new ErroNotaFiscal("HTTP", erro.response.status, seguro?.codigo ?? null,
    erro.response.status === 409 && seguro?.codigo === "DUPLICADA" ? seguro.notaId : null,
    erro.response.status === 409 && seguro?.codigo === "CONFLITO_ESTADO" ? seguro.statusAtual : null);
}

function caminho(id: number): string {
  if (!inteiro(id)) throw new ErroNotaFiscal("ENTRADA");
  return `${BASE}/${id}`;
}

export async function enviarImagem(imagem: ImagemNota): Promise<UploadResposta> {
  if (!imagem || !/^file:\/\/\S+$/i.test(imagem.uri) || imagem.name !== "nota-fiscal.jpg" || imagem.type !== "image/jpeg") throw new ErroNotaFiscal("ENTRADA");
  const form = new FormData();
  form.append("imagem", { uri: imagem.uri, name: imagem.name, type: imagem.type });
  try {
    const resposta = await api.post<unknown>(BASE, form, { timeout: UPLOAD_TIMEOUT, headers: { "Content-Type": "multipart/form-data" } });
    if (resposta.status !== 202) throw new ErroNotaFiscal("CONTRATO");
    return validar(resposta.data, uploadResposta);
  } catch (erro) { return tratarErro(erro); }
}

export async function consultar(id: number): Promise<NotaResposta> {
  const url = caminho(id);
  try {
    const resposta = await api.get<unknown>(url);
    if (resposta.status !== 200) throw new ErroNotaFiscal("CONTRATO");
    const resultado = validar(resposta.data, nota);
    if (resultado.notaId !== id) throw new ErroNotaFiscal("CONTRATO");
    return resultado;
  } catch (erro) { return tratarErro(erro); }
}

export async function confirmar(id: number, pedido: ConfirmarRequest): Promise<ResumoConfirmacao> {
  const url = `${caminho(id)}/confirmar`;
  if (!validarDecisoes(pedido)) throw new ErroNotaFiscal("ENTRADA");
  try {
    const resposta = await api.post<unknown>(url, pedido);
    if (resposta.status !== 200) throw new ErroNotaFiscal("CONTRATO");
    const resultado = validar(resposta.data, resumo);
    if (resultado.notaId !== id) throw new ErroNotaFiscal("CONTRATO");
    return resultado;
  } catch (erro) { return tratarErro(erro); }
}

function validarDecisoes(valor: unknown): valor is ConfirmarRequest {
  if (!campos(valor, ["itens"]) || !Array.isArray(valor.itens) || valor.itens.length === 0) return false;
  const ids = new Set<number>();
  return valor.itens.every((v: unknown) => {
    if (!campos(v, ["itemId", "acao", "produtoId", "criarNovo", "nomeNovo", "quantidade", "valorUnitario"]) || !inteiro(v.itemId) || ids.has(v.itemId)) return false;
    ids.add(v.itemId);
    if (v.acao === "REJEITAR") return v.produtoId === null && v.criarNovo === false && v.nomeNovo === null && v.quantidade === null && v.valorUnitario === null;
    if (!inteiro(v.quantidade) || !centavosExatos(v.valorUnitario)) {
      return false;
    }
    return v.acao === "ASSOCIAR" ? inteiro(v.produtoId) && v.criarNovo === false && v.nomeNovo === null :
      v.acao === "CRIAR_NOVO" && v.produtoId === null && v.criarNovo === true && texto(v.nomeNovo) && nomeNovoValido(v.nomeNovo);
  });
}

export async function descartar(id: number): Promise<void> {
  const url = `${caminho(id)}/descartar`;
  try {
    const resposta = await api.post<unknown>(url);
    if (resposta.status !== 204 || (resposta.data !== "" && resposta.data !== undefined && resposta.data !== null)) throw new ErroNotaFiscal("CONTRATO");
  } catch (erro) { return tratarErro(erro); }
}

export async function listarProdutos(): Promise<ProdutoCatalogo[]> {
  try {
    const resposta = await api.get<unknown>(`${BASE}/produtos`);
    if (resposta.status !== 200) throw new ErroNotaFiscal("CONTRATO");
    return validar(resposta.data, (v): v is ProdutoCatalogo[] => lista(v, produto));
  } catch (erro) { return tratarErro(erro); }
}
