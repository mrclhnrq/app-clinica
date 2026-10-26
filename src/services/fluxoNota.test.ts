import { afterEach, expect, jest, test } from "@jest/globals";
import { acompanharNota, enviarUmaVez, validarIdNota, type EventoConsulta } from "./fluxoNota";
import { ErroNotaFiscal } from "./notaFiscalService";
import type { ImagemNota } from "./notaFiscalImagem";
import type { NotaResposta } from "@/types/notaFiscal";

const imagem: ImagemNota = {
  uri: "file:///cache/ImageManipulator/00000000-0000-4000-8000-000000000003.jpg", origemUri: "file:///cache/galeria.png",
  name: "nota-fiscal.jpg", type: "image/jpeg", width: 600, height: 800,
};
const processando: NotaResposta = {
  notaId: 42, status: "PROCESSANDO", fornecedor: null, dataEmissao: null, totalNota: null,
  chaveAcesso: null, avisos: [], codigoFalha: null, itens: [], resumoConfirmacao: null,
};
const revisar: NotaResposta = { ...processando, status: "EM_REVISAO" };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

afterEach(() => { jest.useRealTimers(); });

test("navega apenas após aceite 202 validado; duplicata própria permite consultar sem reenvio", async () => {
  const enviar = jest.fn(async () => ({ notaId: 42, status: "PROCESSANDO" as const }));
  expect(await enviarUmaVez(imagem, enviar)).toEqual({ tipo: "acompanhar", id: 42 });
  expect(enviar).toHaveBeenCalledTimes(1);
  expect(await enviarUmaVez(imagem, async () => { throw new ErroNotaFiscal("HTTP", 409, "DUPLICADA", 42); }))
    .toEqual({ tipo: "acompanhar", id: 42 });
  expect(await enviarUmaVez(imagem, async () => { throw new ErroNotaFiscal("HTTP", 409, "DUPLICADA"); }))
    .toMatchObject({ tipo: "erro" });
  expect(await enviarUmaVez(imagem, async () => { throw new ErroNotaFiscal("TIMEOUT"); }))
    .toMatchObject({ tipo: "erro", respostaIncerta: true });
  expect(await enviarUmaVez(imagem, async () => { throw new ErroNotaFiscal("HTTP", 429); }))
    .toMatchObject({ tipo: "erro", respostaIncerta: false });
  expect(await enviarUmaVez(imagem, async () => { throw new ErroNotaFiscal("HTTP", 401); }))
    .toMatchObject({ tipo: "erro", respostaIncerta: false });
  expect(await enviarUmaVez(imagem, async () => { throw new ErroNotaFiscal("HTTP", 409, "DUPLICADA"); }))
    .toMatchObject({ tipo: "erro", respostaIncerta: false });
  expect(validarIdNota("42")).toBe(42);
  expect(validarIdNota("9007199254740992")).toBeNull();
  expect(validarIdNota("42/confirmar")).toBeNull();
});

test("poll limita oito consultas a cada três segundos com jitter, sem intervalo residual", async () => {
  jest.useFakeTimers();
  const consultar = jest.fn(async () => processando);
  const eventos: EventoConsulta[] = [];
  const parar = acompanharNota(42, consultar, (evento) => eventos.push(evento), setTimeout, clearTimeout, () => 0.5);
  await flush();
  expect(consultar).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(3250);
  expect(consultar).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(120000);
  expect(consultar).toHaveBeenCalledTimes(8);
  expect(eventos.at(-1)).toEqual({ tipo: "limite" });
  parar();
  expect(jest.getTimerCount()).toBe(0);
});

test("blur/background/logout cancela timer e ignora GET ainda pendente", async () => {
  jest.useFakeTimers();
  const consultar = jest.fn(async () => processando);
  const eventos: EventoConsulta[] = [];
  const parar = acompanharNota(42, consultar, (evento) => eventos.push(evento));
  await flush();
  parar();
  await jest.advanceTimersByTimeAsync(120000);
  expect(consultar).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);

  let resolver!: (nota: NotaResposta) => void;
  const pendente = new Promise<NotaResposta>((resolve) => { resolver = resolve; });
  const pararPendente = acompanharNota(42, () => pendente, (evento) => eventos.push(evento));
  pararPendente();
  resolver(processando);
  await flush();
  expect(eventos).toHaveLength(1);
  expect(jest.getTimerCount()).toBe(0);
});

test("revisão termina consultas; 401, 429 e id divergente param sem repetição", async () => {
  jest.useFakeTimers();
  const eventos: EventoConsulta[] = [];
  const consultar = jest.fn(async () => revisar);
  acompanharNota(42, consultar, (evento) => eventos.push(evento));
  await flush();
  expect(eventos).toEqual([{ tipo: "nota", nota: revisar }]);
  expect(jest.getTimerCount()).toBe(0);
  for (const resposta of [new ErroNotaFiscal("HTTP", 401), new ErroNotaFiscal("HTTP", 429), { ...processando, notaId: 99 }]) {
    const resultados: EventoConsulta[] = [];
    acompanharNota(42, async () => { if (resposta instanceof Error) throw resposta; return resposta; }, (evento) => resultados.push(evento));
    await flush();
    expect(resultados).toHaveLength(1);
    expect(resultados[0].tipo).toBe("erro");
    expect(jest.getTimerCount()).toBe(0);
  }
});

test("background durante GET pendente ignora resposta; retomada cria só um novo ciclo", async () => {
  jest.useFakeTimers();
  let resolver!: (nota: NotaResposta) => void;
  const pendente = new Promise<NotaResposta>((resolve) => { resolver = resolve; });
  const consultar = jest.fn(async () => pendente);
  const eventos: EventoConsulta[] = [];
  const suspender = acompanharNota(42, consultar, (evento) => eventos.push(evento));
  suspender();
  resolver(processando);
  await flush();
  expect(eventos).toEqual([]);
  expect(jest.getTimerCount()).toBe(0);
  const pararRetomada = acompanharNota(42, consultar, (evento) => eventos.push(evento));
  await flush();
  expect(consultar).toHaveBeenCalledTimes(2);
  expect(eventos).toEqual([{ tipo: "nota", nota: processando }]);
  pararRetomada();
  expect(jest.getTimerCount()).toBe(0);
});
