
import { api } from "@/services/api";
import {
    CustoExtra,
    CustoExtraInput,
    CustoFixo,
    CustoFixoInput,
} from "@/types/custo";

type CustoFixoDto = {
  idCustoFixo: number;
  nome: string;
  descricao: string;
  valorMensal: number;
};

type CustoExtraDto = {
  idCustoExtra: number;
  nome: string;
  descricao: string;
  valor: number;
  data: string;
};

function fromCustoFixo(dto: CustoFixoDto): CustoFixo {
  return {
    ...dto,
    idCustoFixo: String(dto.idCustoFixo),
  };
}

function fromCustoExtra(dto: CustoExtraDto): CustoExtra {
  return {
    ...dto,
    idCustoExtra: String(dto.idCustoExtra),
  };
}

// CUSTOS FIXOS

export async function listarCustosFixos(): Promise<CustoFixo[]> {
  const { data } = await api.get<CustoFixoDto[]>("/custos-fixos");

  return Array.isArray(data) ? data.map(fromCustoFixo) : [];
}

export async function criarCustoFixo(
  input: CustoFixoInput
): Promise<CustoFixo> {
  const { data } = await api.post<CustoFixoDto>(
    "/custos-fixos",
    input
  );

  return fromCustoFixo(data);
}

export async function atualizarCustoFixo(
  id: string,
  input: CustoFixoInput
): Promise<CustoFixo> {
  const { data } = await api.put<CustoFixoDto>(
    `/custos-fixos/${id}`,
    input
  );

  return fromCustoFixo(data);
}

export async function excluirCustoFixo(id: string): Promise<void> {
  await api.delete(`/custos-fixos/${id}`);
}

// CUSTOS EXTRAS

export async function listarCustosExtras(): Promise<CustoExtra[]> {
  const { data } = await api.get<CustoExtraDto[]>("/custos-extras");

  return Array.isArray(data) ? data.map(fromCustoExtra) : [];
}

export async function criarCustoExtra(
  input: CustoExtraInput
): Promise<CustoExtra> {
  const { data } = await api.post<CustoExtraDto>(
    "/custos-extras",
    input
  );

  return fromCustoExtra(data);
}

export async function atualizarCustoExtra(
  id: string,
  input: CustoExtraInput
): Promise<CustoExtra> {
  const { data } = await api.put<CustoExtraDto>(
    `/custos-extras/${id}`,
    input
  );

  return fromCustoExtra(data);
}

export async function excluirCustoExtra(id: string): Promise<void> {
  await api.delete(`/custos-extras/${id}`);
}
