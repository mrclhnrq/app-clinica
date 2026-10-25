import { api } from "@/services/api";
import { Cliente, ClienteInput } from "@/types/cliente";
import { decodeHtml } from "@/utils/cliente";

type ClienteDto = {
  id?: number;
  nomeCompleto?: string;
  cpf?: string | null;
  email?: string;
  telefone?: string;
  dataNascimento?: string | null;
  ativo?: boolean | null;
};

const BASE = "/cliente";

function fromDto(dto: ClienteDto): Cliente {
  return {
    id: String(dto.id),
    nome: decodeHtml(dto.nomeCompleto ?? ""),
    email: dto.email ?? "",
    telefone: dto.telefone ?? "",
    cpf: dto.cpf ?? "",
    dataNascimento: dto.dataNascimento ?? null,
    ativo: dto.ativo ?? true,
  };
}

function toDto(input: ClienteInput): ClienteDto {
  return {
    nomeCompleto: input.nome,
    email: input.email,
    telefone: input.telefone,
    cpf: input.cpf,
    dataNascimento: input.dataNascimento,
  };
}

export async function listar(): Promise<Cliente[]> {
  const { data } = await api.get<ClienteDto[]>(BASE, { params: { status: "TODOS" } });
  return Array.isArray(data) ? data.map(fromDto) : [];
}

export async function criar(input: ClienteInput): Promise<Cliente> {
  const { data } = await api.post<ClienteDto>(BASE, toDto(input));
  return fromDto(data);
}

export async function atualizar(id: string, input: ClienteInput): Promise<Cliente> {
  const { data } = await api.put<ClienteDto>(`${BASE}/${id}`, toDto(input));
  return fromDto(data);
}

// DELETE inativa (exclusão lógica)
export async function inativar(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

export async function reativar(id: string): Promise<Cliente> {
  const { data } = await api.patch<ClienteDto>(`${BASE}/${id}/reativar`);
  return fromDto(data);
}
