import { createCadastroContext } from "@/context/createCadastroContext";
import * as clienteService from "@/services/clienteService";
import { Cliente, ClienteInput } from "@/types/cliente";

const { Provider, useCadastro } = createCadastroContext<Cliente, ClienteInput>(clienteService, "clientes");

export const ClientesProvider = Provider;

export function useClientes() {
  const c = useCadastro();
  return {
    clientes: c.itens,
    carregando: c.carregando,
    erro: c.erro,
    recarregar: c.recarregar,
    getCliente: c.getItem,
    adicionarCliente: c.adicionar,
    editarCliente: c.editar,
    inativarCliente: c.inativar,
    reativarCliente: c.reativar,
  };
}
