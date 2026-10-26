import { expect, jest, test } from "@jest/globals";
import { criarGuardaDaCaptura } from "@/app/(autenticado)/notas/captura";
import { criarControleCopiaNota, navegarParaNotaAceita } from "./controleCopiaNota";
import { enviarUmaVez } from "@/services/fluxoNota";
import { descartarImagemTemporaria, type ImagemNota } from "@/services/notaFiscalImagem";
import { ErroNotaFiscal } from "@/services/notaFiscalService";

function pendente<T>() {
  let resolver!: (valor: T) => void;
  const promessa = new Promise<T>((resolve) => { resolver = resolve; });
  return { promessa, resolver };
}

const copia: ImagemNota = {
  uri: "file:///cache/ImageManipulator/00000000-0000-4000-8000-000000000001.jpg",
  origemUri: "file:///cache/foto-da-galeria.png", name: "nota-fiscal.jpg", type: "image/jpeg", width: 800, height: 600,
};
const outra: ImagemNota = { ...copia, uri: "file:///cache/ImageManipulator/00000000-0000-4000-8000-000000000002.jpg" };

function ambienteLimpeza() {
  const excluir = jest.fn<(uri: string) => void>();
  const falha = jest.fn();
  const arquivos = { cacheUri: () => "file:///cache/", excluir };
  const controle = criarControleCopiaNota((imagem) => descartarImagemTemporaria(imagem, arquivos), falha);
  return { controle, excluir, falha };
}

test("logout durante seleção descarta imagem tardia antes de mostrar prévia", async () => {
  const guarda = criarGuardaDaCaptura(10);
  const selecao = pendente<boolean>();
  const mostrarPrevia = jest.fn();
  const resposta = selecao.promessa.then((selecionada) => {
    if (selecionada && guarda.validaPara(10)) mostrarPrevia();
  });
  guarda.desativar();
  selecao.resolver(true);
  await resposta;
  expect(mostrarPrevia).not.toHaveBeenCalled();
  expect(guarda.validaPara(10)).toBe(false);
});

test("troca de conta na mesma rota ignora resposta do upload anterior e mantém novo estado independente", async () => {
  const anterior = criarGuardaDaCaptura(10);
  const envio = pendente<number>();
  const navegar = jest.fn<(id: number) => void>();
  const resposta = envio.promessa.then((id) => {
    if (anterior.validaPara(10)) navegar(id);
  });
  anterior.desativar();
  const atual = criarGuardaDaCaptura(20);
  expect(atual.validaPara(20)).toBe(true);
  expect(atual.validaPara(10)).toBe(false);
  envio.resolver(42);
  await resposta;
  expect(navegar).not.toHaveBeenCalled();
  expect(anterior.validaPara(10)).toBe(false);
  expect(atual.validaPara(20)).toBe(true);
});

test("troca da prévia apaga só a cópia anterior, nunca a foto original", () => {
  const { controle, excluir, falha } = ambienteLimpeza();
  expect(controle.receber(copia)).toBe(true);
  expect(controle.receber(outra)).toBe(true);
  expect(controle.imagem).toBe(outra);
  expect(excluir).toHaveBeenCalledTimes(1);
  expect(excluir).toHaveBeenCalledWith(copia.uri);
  expect(excluir).not.toHaveBeenCalledWith(copia.origemUri);
  expect(falha).not.toHaveBeenCalled();
});

test("logout durante upload aguarda ACK 202 antes de limpar e mantém ID aceito", async () => {
  const { controle, excluir } = ambienteLimpeza();
  const envio = pendente<{ notaId: number; status: "PROCESSANDO" }>();
  controle.receber(copia);
  const emEnvio = controle.iniciarEnvio();
  if (!emEnvio) throw new Error("Cópia não disponível para envio");
  const resposta = enviarUmaVez(emEnvio, () => envio.promessa);
  controle.encerrar();
  expect(excluir).not.toHaveBeenCalled();
  envio.resolver({ notaId: 42, status: "PROCESSANDO" });
  expect(await resposta).toEqual({ tipo: "acompanhar", id: 42 });
  controle.finalizarEnvio();
  expect(excluir).toHaveBeenCalledWith(copia.uri);
});

test("duplicata própria 409 mantém ID conhecido mesmo ao limpar a cópia", async () => {
  const { controle, excluir } = ambienteLimpeza();
  controle.receber(copia);
  const emEnvio = controle.iniciarEnvio();
  if (!emEnvio) throw new Error("Cópia não disponível para envio");
  const resposta = await enviarUmaVez(emEnvio, async () => { throw new ErroNotaFiscal("HTTP", 409, "DUPLICADA", 42); });
  expect(resposta).toEqual({ tipo: "acompanhar", id: 42 });
  expect(controle.finalizarEnvio()).toBe(true);
  expect(excluir).toHaveBeenCalledWith(copia.uri);
});

test("ACK conhecido não se perde diante de falha de limpeza; cópia permanece pendente", async () => {
  const { controle, excluir, falha } = ambienteLimpeza();
  excluir.mockImplementation(() => { throw new Error("falha nativa"); });
  controle.receber(copia);
  const emEnvio = controle.iniciarEnvio();
  if (!emEnvio) throw new Error("Cópia não disponível para envio");
  const resposta = await enviarUmaVez(emEnvio, async () => ({ notaId: 42, status: "PROCESSANDO" }));
  expect(resposta).toEqual({ tipo: "acompanhar", id: 42 });
  expect(controle.finalizarEnvio()).toBe(false);
  if (resposta.tipo !== "acompanhar") throw new Error("ACK esperado");
  controle.registrarAceite(resposta.id);
  expect(controle.idAceito).toBe(42);
  expect(controle.solicitarNavegacao()).toBeNull();
  expect(controle.iniciarEnvio()).toBeNull();
  expect(controle.imagem).toBe(copia);
  expect(controle.pendente).toBe(true);
  controle.encerrar();
  expect(excluir).toHaveBeenCalledTimes(2);
  expect(falha).toHaveBeenCalledTimes(2);
});

test("200 aceito e falha de limpeza exigem retry antes de navegar uma vez, sem reenviar", async () => {
  const { controle, excluir } = ambienteLimpeza();
  const enviar = jest.fn(async () => ({ notaId: 42, status: "PROCESSANDO" as const }));
  excluir.mockImplementationOnce(() => { throw new Error("falha nativa"); });
  controle.receber(copia);
  const emEnvio = controle.iniciarEnvio();
  if (!emEnvio) throw new Error("Cópia não disponível para envio");
  const resposta = await enviarUmaVez(emEnvio, enviar);
  controle.finalizarEnvio();
  if (resposta.tipo !== "acompanhar") throw new Error("ACK esperado");
  controle.registrarAceite(resposta.id);
  expect(controle.solicitarNavegacao()).toBeNull();
  expect(controle.tentarNovamente()).toBe(true);
  expect(controle.imagem).toBeNull();
  expect(controle.solicitarNavegacao()).toBe(42);
  expect(controle.solicitarNavegacao()).toBeNull();
  expect(controle.iniciarEnvio()).toBeNull();
  expect(enviar).toHaveBeenCalledTimes(1);
  expect(excluir).toHaveBeenCalledTimes(2);
});

test("409 próprio pendente admite somente continuação explicitamente ciente", async () => {
  const { controle, excluir } = ambienteLimpeza();
  excluir.mockImplementation(() => { throw new Error("falha nativa"); });
  controle.receber(copia);
  const emEnvio = controle.iniciarEnvio();
  if (!emEnvio) throw new Error("Cópia não disponível para envio");
  const resposta = await enviarUmaVez(emEnvio, async () => { throw new ErroNotaFiscal("HTTP", 409, "DUPLICADA", 42); });
  controle.finalizarEnvio();
  if (resposta.tipo !== "acompanhar") throw new Error("ID de duplicata esperado");
  controle.registrarAceite(resposta.id);
  expect(controle.solicitarNavegacao()).toBeNull();
  expect(controle.tentarNovamente()).toBe(false);
  expect(controle.solicitarNavegacao()).toBeNull();
  expect(controle.solicitarNavegacao(true)).toBe(42);
  expect(controle.solicitarNavegacao(true)).toBeNull();
});

test("logout durante ACK impede navegação e reintenta limpeza só após upload terminar", async () => {
  const { controle, excluir } = ambienteLimpeza();
  const guarda = criarGuardaDaCaptura(10);
  const envio = pendente<{ notaId: number; status: "PROCESSANDO" }>();
  const navegar = jest.fn<(id: number) => void>();
  excluir.mockImplementationOnce(() => { throw new Error("falha nativa"); });
  controle.receber(copia);
  const emEnvio = controle.iniciarEnvio();
  if (!emEnvio) throw new Error("Cópia não disponível para envio");
  const resposta = enviarUmaVez(emEnvio, () => envio.promessa);
  guarda.desativar();
  controle.encerrar();
  expect(excluir).not.toHaveBeenCalled();
  envio.resolver({ notaId: 42, status: "PROCESSANDO" });
  const aceite = await resposta;
  controle.finalizarEnvio();
  if (aceite.tipo === "acompanhar" && guarda.validaPara(10)) navegar(aceite.id);
  expect(navegar).not.toHaveBeenCalled();
  expect(excluir).toHaveBeenCalledTimes(2);
  expect(controle.pendente).toBe(false);
});

test("consulta manual só sai da captura depois de excluir a prévia", () => {
  const { controle, excluir } = ambienteLimpeza();
  controle.receber(copia);
  expect(controle.limparPreview()).toBe(true);
  expect(excluir).toHaveBeenCalledWith(copia.uri);
  expect(controle.imagem).toBeNull();
});

test("413, 422 e timeout encerram upload antes de excluir cópia, sem reenvio", async () => {
  for (const status of [413, 422, null]) {
    const { controle, excluir } = ambienteLimpeza();
    controle.receber(copia);
    const emEnvio = controle.iniciarEnvio();
    if (!emEnvio) throw new Error("Cópia não disponível para envio");
    const resposta = await enviarUmaVez(emEnvio, async () => {
      throw status === null ? new ErroNotaFiscal("TIMEOUT") : new ErroNotaFiscal("HTTP", status);
    });
    expect(resposta.tipo).toBe("erro");
    expect(excluir).not.toHaveBeenCalled();
    expect(controle.finalizarEnvio()).toBe(true);
    expect(excluir).toHaveBeenCalledWith(copia.uri);
    expect(controle.iniciarEnvio()).toBeNull();
  }
});

test("falha de exclusão mantém cópia pendente e permite tentativa manual", () => {
  const { controle, excluir, falha } = ambienteLimpeza();
  excluir.mockImplementationOnce(() => { throw new Error("falha nativa"); });
  controle.receber(copia);
  expect(controle.receber(outra)).toBe(false);
  expect(controle.imagem).toBe(copia);
  expect(controle.pendente).toBe(true);
  expect(falha).toHaveBeenCalledTimes(1);
  expect(controle.tentarNovamente()).toBe(true);
  expect(controle.pendente).toBe(false);
  expect(controle.imagem).toBeNull();
  expect(excluir).toHaveBeenCalledWith(outra.uri);
});

test("caminho inseguro falha fechado e não exclui original nem declara limpeza", () => {
  const { controle, excluir, falha } = ambienteLimpeza();
  const insegura: ImagemNota = { ...copia, uri: "file:///cache/ImageManipulator/../foto-da-galeria.png" };
  controle.receber(insegura);
  controle.encerrar();
  expect(controle.imagem).toBe(insegura);
  expect(controle.pendente).toBe(true);
  expect(falha).toHaveBeenCalledTimes(2);
  expect(excluir).not.toHaveBeenCalled();
});

test("aceito e limpo: replace falha, retry abre a nota uma única vez sem reenviar", async () => {
  const { controle } = ambienteLimpeza();
  const enviar = jest.fn(async () => ({ notaId: 42, status: "PROCESSANDO" as const }));
  controle.receber(copia);
  const emEnvio = controle.iniciarEnvio();
  if (!emEnvio) throw new Error("Cópia não disponível para envio");
  const resposta = await enviarUmaVez(emEnvio, enviar);
  expect(controle.finalizarEnvio()).toBe(true);
  if (resposta.tipo !== "acompanhar") throw new Error("ACK esperado");
  controle.registrarAceite(resposta.id);
  const substituir = jest.fn<(id: number) => void>().mockImplementationOnce(() => { throw new Error("falha de rota"); });
  expect(navegarParaNotaAceita(controle, substituir)).toBe("falhou");
  expect(controle.idAceito).toBe(42);
  expect(controle.imagem).toBeNull();
  expect(navegarParaNotaAceita(controle, substituir)).toBe("navegou");
  expect(navegarParaNotaAceita(controle, substituir)).toBe("ignorada");
  expect(substituir).toHaveBeenCalledTimes(2);
  expect(substituir).toHaveBeenNthCalledWith(2, 42);
  expect(enviar).toHaveBeenCalledTimes(1);
  expect(controle.iniciarEnvio()).toBeNull();
});

test("aceito com limpeza pendente não navega sem retry ou ciência explícita", () => {
  const { controle, excluir } = ambienteLimpeza();
  excluir.mockImplementation(() => { throw new Error("falha nativa"); });
  controle.receber(copia);
  controle.iniciarEnvio();
  controle.finalizarEnvio();
  controle.registrarAceite(42);
  const substituir = jest.fn<(id: number) => void>();
  expect(navegarParaNotaAceita(controle, substituir)).toBe("ignorada");
  expect(substituir).not.toHaveBeenCalled();
  expect(navegarParaNotaAceita(controle, substituir, true)).toBe("navegou");
  expect(substituir).toHaveBeenCalledWith(42);
});
