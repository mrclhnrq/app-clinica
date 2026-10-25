import * as backend from "@/services/servicoProdutoApi";
import { Produto, ProdutoInput } from "@/types/produto";

function fromDto(dto: backend.ServicoProdutoDto): Produto {
  return {
    id: String(dto.idProdutoServico),
    nome: dto.nome ?? "",
    descricao: dto.descricao ?? "",
    marca: dto.marca ?? "",
    categoria: dto.categoria ?? "",
    estoque: dto.estoque ?? 0,
    valorCusto: dto.despesa ?? 0,
    valorVenda: dto.valorVenda ?? 0,
    ativo: dto.ativo ?? true,
  };
}

function toDto(input: ProdutoInput, usuarioId?: number): backend.ServicoProdutoDto {
  return {
    nome: input.nome,
    descricao: input.descricao,
    marca: input.marca,
    categoria: input.categoria,
    estoque: input.estoque,
    despesa: input.valorCusto,
    valorVenda: input.valorVenda,
    produto: true,
    isProduto: true,
    ...(usuarioId ? { usuario: { id: usuarioId } } : {}),
  };
}

export async function listar(): Promise<Produto[]> {
  const dtos = await backend.listarTodos();
  return dtos.filter(backend.ehProduto).map(fromDto);
}

export async function criar(input: ProdutoInput, usuarioId?: number): Promise<Produto> {
  return fromDto(await backend.criar(toDto(input, usuarioId)));
}

export async function atualizar(id: string, input: ProdutoInput): Promise<Produto> {
  return fromDto(await backend.atualizar(id, toDto(input)));
}

export const inativar = backend.inativar;

export async function reativar(id: string): Promise<Produto> {
  return fromDto(await backend.reativar(id));
}