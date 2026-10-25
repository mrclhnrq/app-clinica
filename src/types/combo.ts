export type ItemCombo = {
  id: string;
  nome: string;
  valorVenda: number;
  ativo: boolean;
};

export type Combo = {
  id: string;
  nome: string;
  descricao: string;
  desconto: number; // percentual
  valorFinal: number;
  servicos: ItemCombo[];
  produtos: ItemCombo[];
  ativo: boolean;
};

export type ComboInput = {
  nome: string;
  descricao: string;
  desconto: number;
  valorFinal: number;
  servicoIds: string[];
  produtoIds: string[];
};