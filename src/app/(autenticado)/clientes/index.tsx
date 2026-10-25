import { router } from "expo-router";
import { ListagemCadastro } from "@/components/ListagemCadastro";
import { ClienteCard } from "@/components/clientes/ClienteCard";
import { useClientes } from "@/context/ClientesContext";
import { Cliente } from "@/types/cliente";
import { somenteDigitos } from "@/utils/cliente";

// busca por nome, e-mail, telefone ou CPF (com ou sem pontuação)
const textoBusca = (c: Cliente) =>
  [c.nome, c.email, c.telefone, c.cpf, somenteDigitos(c.telefone), somenteDigitos(c.cpf)].join(" ");

export default function ClientesListagem() {
  const { clientes, carregando, erro, recarregar } = useClientes();

  return (
    <ListagemCadastro
      titulo="Clientes"
      placeholderBusca="Buscar por nome, e-mail, telefone ou CPF..."
      rotuloPlural="clientes"
      itens={clientes}
      carregando={carregando}
      erro={erro}
      onRecarregar={recarregar}
      onAdicionar={() => router.push("/clientes/novo")}
      colunas={1}
      textoBusca={textoBusca}
      renderCard={(c) => <ClienteCard cliente={c} onPress={() => router.push(`/clientes/${c.id}`)} />}
    />
  );
}
