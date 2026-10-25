import * as backend from "@/services/servicoProdutoApi";
import { Servico, ServicoInput } from "@/types/servico";

function fromDto(dto: backend.ServicoProdutoDto): Servico {
  return {
    id: String(dto.idProdutoServico),
    nome: dto.nome ?? "",
    descricao: dto.descricao ?? "",
    valorCusto: dto.despesa ?? 0,
    valorVenda: dto.valorVenda ?? 0,
    ativo: dto.ativo ?? true,
  };
}

function toDto(input: ServicoInput, usuarioId?: number): backend.ServicoProdutoDto {
  return {
    nome: input.nome,
    descricao: input.descricao,
    despesa: input.valorCusto,
    valorVenda: input.valorVenda,
    produto: false,
    isProduto: false,
    ...(usuarioId ? { usuario: { id: usuarioId } } : {}),
  };
}

export async function listar(): Promise<Servico[]> {
  const dtos = await backend.listarTodos();
  return dtos.filter((dto) => !backend.ehProduto(dto)).map(fromDto);
}

export async function criar(input: ServicoInput, usuarioId?: number): Promise<Servico> {
  return fromDto(await backend.criar(toDto(input, usuarioId)));
}

export async function atualizar(id: string, input: ServicoInput): Promise<Servico> {
  return fromDto(await backend.atualizar(id, toDto(input)));
}

export const inativar = backend.inativar;

export async function reativar(id: string): Promise<Servico> {
  return fromDto(await backend.reativar(id));
}