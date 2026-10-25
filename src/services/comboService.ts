import { api } from "@/services/api";
import { Combo, ComboInput, ItemCombo } from "@/types/combo";

type ItemComboDto = {
  idProdutoServico: number;
  nome?: string;
  valorVenda?: number;
  ativo?: boolean;
};

type ComboDto = {
  idCombo?: number;
  nome?: string;
  descricao?: string | null;
  valorFinal?: number;
  desconto?: number | null;
  ativo?: boolean;
  servicos?: ItemComboDto[];
  produtos?: ItemComboDto[];
};

type ComboRequestDto = {
  nome: string;
  descricao: string;
  valorFinal: number;
  desconto: number;
  idsServicos: number[];
  idsProdutos: number[];
};

const BASE = "/combo";

function fromItemDto(dto: ItemComboDto): ItemCombo {
  return {
    id: String(dto.idProdutoServico),
    nome: dto.nome ?? "",
    valorVenda: dto.valorVenda ?? 0,
    ativo: dto.ativo ?? true,
  };
}

function fromDto(dto: ComboDto): Combo {
  return {
    id: String(dto.idCombo),
    nome: dto.nome ?? "",
    descricao: dto.descricao ?? "",
    desconto: dto.desconto ?? 0,
    valorFinal: dto.valorFinal ?? 0,
    servicos: (dto.servicos ?? []).map(fromItemDto),
    produtos: (dto.produtos ?? []).map(fromItemDto),
    ativo: dto.ativo ?? true,
  };
}

function toDto(input: ComboInput): ComboRequestDto {
  return {
    nome: input.nome,
    descricao: input.descricao,
    valorFinal: input.valorFinal,
    desconto: input.desconto,
    idsServicos: input.servicoIds.map(Number),
    idsProdutos: input.produtoIds.map(Number),
  };
}

export async function listar(): Promise<Combo[]> {
  const { data } = await api.get<ComboDto[]>(BASE, { params: { status: "TODOS" } });
  return Array.isArray(data) ? data.map(fromDto) : []; // 204 vem sem corpo
}

export async function criar(input: ComboInput): Promise<Combo> {
  const { data } = await api.post<ComboDto>(BASE, toDto(input));
  return fromDto(data);
}

export async function atualizar(id: string, input: ComboInput): Promise<Combo> {
  const { data } = await api.put<ComboDto>(`${BASE}/${id}`, toDto(input));
  return fromDto(data);
}

// DELETE inativa (exclusão lógica)
export async function inativar(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

export async function reativar(id: string): Promise<Combo> {
  const { data } = await api.patch<ComboDto>(`${BASE}/${id}/reativar`);
  return fromDto(data);
}