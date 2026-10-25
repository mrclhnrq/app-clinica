import { api } from "@/services/api";
import { Usuario, UsuarioInput, toRole } from "@/types/usuario";
import { decodeHtml } from "@/utils/cliente";

// UsuarioListarDto do backend
type UsuarioDto = {
  id?: number;
  nome?: string;
  nomeCompleto?: string;
  email?: string;
  telefone?: string | null;
  role?: string;
};

const BASE = "/usuarios";

function fromDto(dto: UsuarioDto): Usuario {
  return {
    id: Number(dto.id),
    nome: decodeHtml(dto.nomeCompleto ?? dto.nome ?? ""),
    email: dto.email ?? "",
    telefone: dto.telefone ?? "",
    role: toRole(dto.role),
  };
}

export async function buscar(id: number): Promise<Usuario> {
  const { data } = await api.get<UsuarioDto>(`${BASE}/${id}`);
  return fromDto(data);
}

export async function atualizar(id: number, input: UsuarioInput): Promise<Usuario> {
  const { data } = await api.put<UsuarioDto>(`${BASE}/${id}`, {
    nomeCompleto: input.nome,
    email: input.email,
    telefone: input.telefone,
    role: input.role,
  });
  return fromDto(data);
}

export async function alterarSenha(id: number, senhaAtual: string, novaSenha: string): Promise<void> {
  await api.post(`${BASE}/${id}/alterar-senha`, { senhaAtual, novaSenha });
}
