import { createCadastroContext } from "@/context/createCadastroContext";
import * as servicoService from "@/services/servicoService";
import { Servico, ServicoInput } from "@/types/servico";

const { Provider, useCadastro } = createCadastroContext<Servico, ServicoInput>(servicoService, "serviços");

export const ServicosProvider = Provider;

export function useServicos() {
  const c = useCadastro();
  return {
    servicos: c.itens,
    carregando: c.carregando,
    erro: c.erro,
    recarregar: c.recarregar,
    getServico: c.getItem,
    adicionarServico: c.adicionar,
    editarServico: c.editar,
    inativarServico: c.inativar,
    reativarServico: c.reativar,
  };
}