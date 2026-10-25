import { api } from "@/services/api";

export type ServicoProdutoDto = {
  idProdutoServico?: number;
  produto?: boolean;
  isProduto?: boolean;
  nome?: string;
  despesa?: number;
  valorVenda?: number;
  descricao?: string | null;
  marca?: string | null;
  categoria?: string | null;
  estoque?: number | null;
  ativo?: boolean;
  usuario?: { id?: number } | null;
};

const BASE = "/servico-produto";

export const ehProduto = (dto: ServicoProdutoDto) => Boolean(dto.isProduto ?? dto.produto);

export async function listarTodos(): Promise<ServicoProdutoDto[]> {
  const { data } = await api.get<ServicoProdutoDto[]>(BASE, { params: { status: "TODOS" } });
  return Array.isArray(data) ? data : []; // 204 vem sem corpo
}

export async function criar(dto: ServicoProdutoDto): Promise<ServicoProdutoDto> {
  const { data } = await api.post<ServicoProdutoDto>(BASE, dto);
  return data;
}

export async function atualizar(id: string, dto: ServicoProdutoDto): Promise<ServicoProdutoDto> {
  const { data } = await api.put<ServicoProdutoDto>(`${BASE}/${id}`, dto);
  return data;
}

// DELETE inativa (exclusão lógica)
export async function inativar(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

export async function reativar(id: string): Promise<ServicoProdutoDto> {
  const { data } = await api.patch<ServicoProdutoDto>(`${BASE}/${id}/reativar`);
  return data;
}