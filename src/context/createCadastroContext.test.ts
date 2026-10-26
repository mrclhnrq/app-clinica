import { expect, jest, test } from "@jest/globals";
import { criarRecargaOrdenada } from "./createCadastroContext";

function pendente<T>() {
  let resolver!: (valor: T) => void;
  let rejeitar!: (erro: Error) => void;
  const promise = new Promise<T>((resolve, reject) => { resolver = resolve; rejeitar = reject; });
  return { promise, resolver, rejeitar };
}

test("resposta antiga não sobrescreve catálogo pós-ACK mesmo chegando por último", async () => {
  const inicial = pendente<string[]>();
  const aposAck = pendente<string[]>();
  const listar = jest.fn<() => Promise<string[]>>().mockReturnValueOnce(inicial.promise).mockReturnValueOnce(aposAck.promise);
  const publicar = jest.fn<(itens: string[]) => void>();
  const iniciar = jest.fn();
  const terminar = jest.fn();
  const falhar = jest.fn<(erro: unknown) => void>();
  const recarregar = criarRecargaOrdenada(listar, iniciar, publicar, falhar, terminar);
  const primeira = recarregar();
  const segunda = recarregar();
  aposAck.resolver(["catálogo novo"]);
  await segunda;
  inicial.resolver(["catálogo antigo"]);
  await primeira;
  expect(publicar).toHaveBeenCalledTimes(1);
  expect(publicar).toHaveBeenCalledWith(["catálogo novo"]);
  expect(iniciar).toHaveBeenCalledTimes(2);
  expect(terminar).toHaveBeenCalledTimes(1);
  expect(falhar).not.toHaveBeenCalled();
});

test("recarga antiga aguarda a mais recente antes de afirmar conclusão", async () => {
  const inicial = pendente<string[]>();
  const nova = pendente<string[]>();
  const listar = jest.fn<() => Promise<string[]>>().mockReturnValueOnce(inicial.promise).mockReturnValueOnce(nova.promise);
  const publicar = jest.fn<(itens: string[]) => void>();
  const recarregar = criarRecargaOrdenada(listar, () => undefined, publicar, () => undefined, () => undefined);
  const primeira = recarregar();
  const segunda = recarregar();
  let primeiraConcluida = false;
  void primeira.then(() => { primeiraConcluida = true; });
  inicial.resolver(["antigo"]);
  await Promise.resolve();
  expect(primeiraConcluida).toBe(false);
  expect(publicar).not.toHaveBeenCalled();
  nova.resolver(["novo"]);
  await Promise.all([primeira, segunda]);
  expect(primeiraConcluida).toBe(true);
  expect(publicar).toHaveBeenCalledTimes(1);
});

test("falha antiga não apaga êxito novo; falha atual rejeita e informa erro", async () => {
  const antiga = pendente<string[]>();
  const nova = pendente<string[]>();
  const listar = jest.fn<() => Promise<string[]>>().mockReturnValueOnce(antiga.promise).mockReturnValueOnce(nova.promise);
  const publicar = jest.fn<(itens: string[]) => void>();
  const falhar = jest.fn<(erro: unknown) => void>();
  const recarregar = criarRecargaOrdenada(listar, () => undefined, publicar, falhar, () => undefined);
  const primeira = recarregar();
  const segunda = recarregar();
  antiga.rejeitar(new Error("falha antiga"));
  nova.resolver(["novo"]);
  await Promise.all([primeira, segunda]);
  expect(falhar).not.toHaveBeenCalled();
  const erroAtual = new Error("falha atual");
  listar.mockRejectedValueOnce(erroAtual);
  await expect(recarregar()).rejects.toBe(erroAtual);
  expect(falhar).toHaveBeenCalledWith(erroAtual);
});
