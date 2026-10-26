
export type CustoFixo = {
  idCustoFixo: string;
  nome: string;
  descricao: string;
  valorMensal: number;
};

export type CustoExtra = {
  idCustoExtra: string;
  nome: string;
  descricao: string;
  valor: number;
  data: string;
};

export type CustoFixoInput = {
  nome: string;
  descricao: string;
  valorMensal: number;
};

export type CustoExtraInput = {
  nome: string;
  descricao: string;
  valor: number;
  data: string;
};
