import { AxiosError, type AxiosAdapter, type AxiosResponse } from "axios";
import { afterEach, expect, jest, test } from "@jest/globals";
import { api, setAuthToken, setUnauthorizedHandler } from "./api";
import { enviarUmaVez } from "./fluxoNota";
import { confirmar, consultar, descartar, enviarImagem, ErroNotaFiscal, listarProdutos } from "./notaFiscalService";
import type { ImagemNota } from "./notaFiscalImagem";
import type { ConfirmarRequest, NotaResposta } from "@/types/notaFiscal";

const original = api.defaults.adapter;
const imagem: ImagemNota = {
  uri: "file:///cache/ImageManipulator/00000000-0000-4000-8000-000000000004.jpg", origemUri: "file:///cache/galeria.png",
  name: "nota-fiscal.jpg", type: "image/jpeg", width: 800, height: 600,
};
const nota: NotaResposta = {
  notaId: 42, status: "EM_REVISAO", fornecedor: null, dataEmissao: null, totalNota: null,
  chaveAcesso: null, avisos: [], codigoFalha: null, itens: [], resumoConfirmacao: null,
};
const pedido: ConfirmarRequest = { itens: [{ itemId: 1, acao: "REJEITAR", produtoId: null, criarNovo: false, nomeNovo: null, quantidade: null, valorUnitario: null }] };
const resumo = { notaId: 42, status: "CONFIRMADA", itensConfirmados: [], itensRejeitados: [{ itemId: 1, motivo: "SEM_PRODUTO" }], produtosAfetados: [] };

function mockHttp(status: number, data: unknown, verificar?: (config: Parameters<AxiosAdapter>[0]) => void): jest.Mock<AxiosAdapter> {
  const adapter = jest.fn<AxiosAdapter>(async (config) => {
    verificar?.(config);
    const response: AxiosResponse = { data, status, statusText: "", headers: {}, config };
    if (status >= 400) throw new AxiosError("Falha HTTP", "ERR_BAD_RESPONSE", config, undefined, response);
    return response;
  });
  api.defaults.adapter = adapter;
  return adapter;
}

afterEach(() => {
  api.defaults.adapter = original;
  setAuthToken(null);
  setUnauthorizedHandler(null);
});

test("202 envia um JPEG multipart com JWT, timeout isolado e sem JSON no formulário", async () => {
  setAuthToken("token-de-teste");
  const adapter = mockHttp(202, { notaId: 42, status: "PROCESSANDO" }, (config) => {
    expect(config.url).toBe("/estoque/notas");
    expect(config.headers.get("Authorization")).toBe("Bearer token-de-teste");
    expect(config.headers.get("Content-Type")).not.toContain("application/json");
    expect(config.headers.get("Content-Type")).toBe("multipart/form-data");
    expect(config.data).toBeInstanceOf(FormData);
    expect(config.timeout).toBe(60000);
  });
  expect(await enviarImagem(imagem)).toEqual({ notaId: 42, status: "PROCESSANDO" });
  expect(adapter).toHaveBeenCalledTimes(1);
  mockHttp(200, nota, (config) => {
    expect(config.timeout).toBe(10000);
    expect(config.headers.get("Content-Type")).toBe("application/json");
  });
  expect(await consultar(42)).toEqual(nota);
});

test("409 duplicata só expõe id próprio validado; 401 dispara interceptor", async () => {
  mockHttp(409, { codigo: "DUPLICADA", mensagem: "Duplicada", notaId: 42, statusAtual: null });
  await expect(enviarImagem(imagem)).rejects.toMatchObject({ tipo: "HTTP", status: 409, codigo: "DUPLICADA", notaId: 42 });
  const sair = jest.fn();
  setUnauthorizedHandler(sair);
  mockHttp(401, { codigo: "SEM_ACESSO", mensagem: "Privado", notaId: 111, statusAtual: null });
  await expect(consultar(42)).rejects.toMatchObject({ tipo: "HTTP", status: 401, notaId: null });
  expect(sair).toHaveBeenCalledTimes(1);
});

test("upload rejeita ID de duplicata em status diferente de 409 e mantém JWT no POST", async () => {
  setAuthToken("token-de-teste");
  mockHttp(401, { codigo: "DUPLICADA", mensagem: "Negado", notaId: 42, statusAtual: null }, (config) => {
    expect(config.headers.get("Authorization")).toBe("Bearer token-de-teste");
  });
  await expect(enviarImagem(imagem)).rejects.toMatchObject({ status: 401, notaId: null });
  mockHttp(409, { codigo: "DUPLICADA", mensagem: "Duplicada", notaId: 42, statusAtual: null });
  await expect(enviarImagem(imagem)).rejects.toMatchObject({ status: 409, notaId: 42 });
});

test("timeout e rede não reenvia automaticamente", async () => {
  const adapter = jest.fn<AxiosAdapter>(async (config) => { throw new AxiosError("timeout", "ECONNABORTED", config); });
  api.defaults.adapter = adapter;
  await expect(enviarImagem(imagem)).rejects.toMatchObject({ tipo: "TIMEOUT" });
  expect(adapter).toHaveBeenCalledTimes(1);
});

test("status 503 e resposta 202 incompleta nunca indicam sucesso", async () => {
  mockHttp(503, { codigo: "SERVICO_INDISPONIVEL", mensagem: "Indisponível", notaId: null, statusAtual: null });
  await expect(enviarImagem(imagem)).rejects.toMatchObject({ tipo: "HTTP", status: 503, codigo: "SERVICO_INDISPONIVEL" });
  mockHttp(202, { notaId: 42 });
  await expect(enviarImagem(imagem)).rejects.toMatchObject({ tipo: "CONTRATO" });
});

const errosImagem: readonly { status: number; mensagem: string }[] = [
  { status: 422, mensagem: "Não foi possível ler a imagem. Escolha outra foto nítida da nota antes de enviar novamente." },
  { status: 413, mensagem: "Imagem grande demais. Escolha outra foto menor antes de enviar novamente." },
];

test.each(errosImagem)("upload HTTP $status é definitivo e orienta nova imagem sem reenviar", async ({ status, mensagem }) => {
  const adapter = mockHttp(status, { codigo: "IMAGEM_INVALIDA", mensagem: "Detalhes internos não devem ser exibidos.", notaId: null, statusAtual: null });
  expect(await enviarUmaVez(imagem, enviarImagem)).toEqual({ tipo: "erro", mensagem, respostaIncerta: false });
  expect(adapter).toHaveBeenCalledTimes(1);
});

test("GET rejeita shape parcial, enum inválido e campos privados", async () => {
  for (const body of [{ ...nota, status: "X" }, { ...nota, notaId: 43 }, { ...nota, itens: [{}] }, { ...nota, usuarioId: 9 }, { ...nota, resumoConfirmacao: {} }]) {
    mockHttp(200, body);
    await expect(consultar(42)).rejects.toBeInstanceOf(ErroNotaFiscal);
    await expect(consultar(42)).rejects.toMatchObject({ tipo: "CONTRATO" });
  }
  await expect(consultar(0)).rejects.toMatchObject({ tipo: "ENTRADA" });
});

test("GET aceita nulos explícitos e arrays vazios mas rejeita campo nullable omitido", async () => {
  mockHttp(200, nota);
  await expect(consultar(42)).resolves.toEqual(nota);
  const { fornecedor: _fornecedor, ...incompleta } = nota;
  mockHttp(200, incompleta);
  await expect(consultar(42)).rejects.toMatchObject({ tipo: "CONTRATO" });
});

test("item extraído inválido pode carregar quantidade zero sem autorizar aprovação", async () => {
  const extraido = { itemId: 1, textoOriginal: "Item", quantidade: 0, valorUnitario: null, valorTotal: null,
    produtoSugerido: null, confianca: null, status: "INVALIDO", motivoRejeicao: { codigo: "DADOS_INVALIDOS", texto: "Quantidade inválida" } };
  mockHttp(200, { ...nota, itens: [extraido] });
  await expect(consultar(42)).resolves.toMatchObject({ itens: [extraido] });
});

test("confirmação, descarte e catálogo conferem status e contrato sem reenvio", async () => {
  mockHttp(200, resumo, (config) => expect(config.headers.get("Content-Type")).toBe("application/json"));
  expect(await confirmar(42, pedido)).toEqual(resumo);
  mockHttp(204, "");
  await expect(descartar(42)).resolves.toBeUndefined();
  mockHttp(200, [{ id: 3, nome: "Produto" }]);
  expect(await listarProdutos()).toEqual([{ id: 3, nome: "Produto" }]);
  mockHttp(200, [{ id: 3, nome: "Produto", usuario: 9 }]);
  await expect(listarProdutos()).rejects.toMatchObject({ tipo: "CONTRATO" });
  mockHttp(200, resumo);
  await expect(descartar(42)).rejects.toMatchObject({ tipo: "CONTRATO" });
  const adapter = mockHttp(200, resumo);
  await expect(confirmar(42, { itens: [pedido.itens[0], pedido.itens[0]] })).rejects.toMatchObject({ tipo: "ENTRADA" });
  expect(adapter).not.toHaveBeenCalled();
});

function criarNovoRequest(nomeNovo: string): ConfirmarRequest {
  return { itens: [{ itemId: 1, acao: "CRIAR_NOVO", produtoId: null, criarNovo: true, nomeNovo, quantidade: 1, valorUnitario: 1 }] };
}

test("confirmar direto aceita nome novo com 200 caracteres e envia o POST", async () => {
  const adapter = mockHttp(200, resumo);
  const nome = "a".repeat(200);
  await expect(confirmar(42, criarNovoRequest(nome))).resolves.toEqual(resumo);
  expect(adapter).toHaveBeenCalledTimes(1);
});

test("confirmar direto rejeita nome novo inválido sem enviar HTTP", async () => {
  const invalidos = ["a".repeat(201), "", "   ", "Nome\u0000", "Nome\n", "Nome\t", "Nome\u007f", "Nome\u0085"];
  for (const nome of invalidos) {
    const adapter = mockHttp(200, resumo);
    await expect(confirmar(42, criarNovoRequest(nome))).rejects.toMatchObject({ tipo: "ENTRADA" });
    expect(adapter).not.toHaveBeenCalled();
  }
});

test("confirmação valida centavos e recupera resumo somente via GET", async () => {
  const invalido: ConfirmarRequest = { itens: [{ itemId: 1, acao: "ASSOCIAR", produtoId: 2, criarNovo: false, nomeNovo: null, quantidade: 1, valorUnitario: 0.001 }] };
  const adapter = mockHttp(200, resumo);
  await expect(confirmar(42, invalido)).rejects.toMatchObject({ tipo: "ENTRADA" });
  expect(adapter).not.toHaveBeenCalled();
  const confirmado: NotaResposta = { ...nota, status: "CONFIRMADA", resumoConfirmacao: { notaId: 42, status: "CONFIRMADA", itensConfirmados: [], itensRejeitados: [{ itemId: 1, motivo: "SEM_PRODUTO" }], produtosAfetados: [] } };
  mockHttp(200, confirmado);
  expect((await consultar(42)).resumoConfirmacao).toEqual(resumo);
  mockHttp(200, { ...confirmado, resumoConfirmacao: { ...resumo, notaId: 99 } });
  await expect(consultar(42)).rejects.toMatchObject({ tipo: "CONTRATO" });
});

test("confirmar só envia valores cuja representação JSON tem até duas casas decimais", async () => {
  function associar(valorUnitario: number): ConfirmarRequest {
    return { itens: [{ itemId: 1, acao: "ASSOCIAR", produtoId: 2, criarNovo: false, nomeNovo: null, quantidade: 1, valorUnitario }] };
  }
  for (const valor of [0.0100000001, 0.30000000000000004, 1.234, 0, 10000000]) {
    const adapter = mockHttp(200, resumo);
    await expect(confirmar(42, associar(valor))).rejects.toMatchObject({ tipo: "ENTRADA" });
    expect(adapter).not.toHaveBeenCalled();
  }
  for (const valor of [0.01, 0.1, 0.3, 1.23, 9999999.99]) {
    const adapter = mockHttp(200, resumo, (config) => {
      expect(config.data).toBe(JSON.stringify(associar(valor)));
    });
    await expect(confirmar(42, associar(valor))).resolves.toEqual(resumo);
    expect(adapter).toHaveBeenCalledTimes(1);
  }
});
