import { afterEach, expect, jest, test } from "@jest/globals";
import type { AxiosAdapter, AxiosResponse } from "axios";
import { api } from "./api";
import { listar } from "./produtoService";

const original = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = original; });

test("preço de venda ausente permanece nulo no produto sem inventar zero", async () => {
  const adapter = jest.fn<AxiosAdapter>(async (config) => {
    expect(config.url).toBe("/servico-produto");
    const response: AxiosResponse = {
      data: [{ idProdutoServico: 7, nome: "Produto", isProduto: true, ativo: true, valorVenda: null }],
      status: 200, statusText: "OK", headers: {}, config,
    };
    return response;
  });
  api.defaults.adapter = adapter;
  expect((await listar())[0].valorVenda).toBeNull();
  expect(adapter).toHaveBeenCalledTimes(1);
});
