import { createCadastroContext } from "@/context/createCadastroContext";
import * as produtoService from "@/services/produtoService";
import { Produto, ProdutoInput } from "@/types/produto";

const { Provider, useCadastro } = createCadastroContext<Produto, ProdutoInput>(produtoService, "produtos");

export const ProdutosProvider = Provider;

export function useProdutos() {
  const c = useCadastro();
  return {
    produtos: c.itens,
    carregando: c.carregando,
    erro: c.erro,
    recarregar: c.recarregar,
    getProduto: c.getItem,
    adicionarProduto: c.adicionar,
    editarProduto: c.editar,
    inativarProduto: c.inativar,
    reativarProduto: c.reativar,
  };
}