export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  marca: string;
  categoria: string;
  estoque: number;
  valorCusto: number;
  valorVenda: number | null;
  ativo: boolean;
};

export type ProdutoInput = Omit<Produto, "id" | "ativo" | "valorVenda"> & { valorVenda: number };
