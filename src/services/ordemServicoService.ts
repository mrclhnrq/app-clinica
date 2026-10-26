import { ordemServicoApi } from "./api";

export interface ItemOrdemServico {
  servicoProdutoId: number | null;
  comboId: number | null;
  produtoId: number | null;
  quantidade: number;
  desconto: number;
}

export interface OrdemServico {
  id: number;
  clienteId: number;
  usuarioId: number;
  valorFinal: number;
  dataCriacao: string;
  observacao: string;
  itens: ItemOrdemServico[];
}

interface RespostaOrdensServico {
  content: OrdemServico[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function listarOrdensServico(): Promise<OrdemServico[]> {
  var pagina = 0;
  var ordens: OrdemServico[] = [];
  var totalPaginas = 1;

  while (pagina < totalPaginas) {
    var resposta = await ordemServicoApi.get<RespostaOrdensServico>(
      "/ordens-servico?page=" + pagina
    );

    ordens = ordens.concat(resposta.data.content);
    totalPaginas = resposta.data.totalPages;
    pagina++;
  }

  return ordens;
}
