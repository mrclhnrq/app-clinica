import { api } from "@/services/api";
import { Usuario, UsuarioInput, toRole } from "@/types/usuario";
import { decodeHtml } from "@/utils/cliente";

// UsuarioListarDto / UsuarioAtualizadoDto do backend
type UsuarioDto = {
  id?: number;
  nome?: string;
  nomeCompleto?: string;
  email?: string;
  telefone?: string | null;
  role?: string;
  fotoPerfil?: string | null;
  token?: string; // só vem no PUT quando o próprio usuário troca o e-mail
};

const BASE = "/usuarios";

function fromDto(dto: UsuarioDto): Usuario {
  return {
    id: Number(dto.id),
    nome: decodeHtml(dto.nomeCompleto ?? dto.nome ?? ""),
    email: dto.email ?? "",
    telefone: dto.telefone ?? "",
    role: toRole(dto.role),
    fotoPerfil: dto.fotoPerfil || null,
  };
}

export async function buscar(id: number): Promise<Usuario> {
  const { data } = await api.get<UsuarioDto>(`${BASE}/${id}`);
  return fromDto(data);
}

export async function atualizar(
  id: number,
  input: UsuarioInput
): Promise<{ usuario: Usuario; novoToken: string | null }> {
  const { data } = await api.put<UsuarioDto>(`${BASE}/${id}`, {
    nomeCompleto: input.nome,
    email: input.email,
    telefone: input.telefone,
    ...(input.fotoPerfil !== undefined ? { fotoPerfil: input.fotoPerfil } : {}),
  });
  return { usuario: fromDto(data), novoToken: data.token ?? null };
}

export async function alterarSenha(id: number, senhaAtual: string, novaSenha: string): Promise<void> {
  await api.post(`${BASE}/${id}/alterar-senha`, { senhaAtual, novaSenha });
}
