export type Servico = {
  id: string;
  nome: string;
  descricao: string;
  valorCusto: number;
  valorVenda: number;
  ativo: boolean;
};

export type ServicoInput = Omit<Servico, "id" | "ativo">;