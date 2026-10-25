import { router, useLocalSearchParams } from "expo-router";
import { FichaCadastro } from "@/components/FichaCadastro";
import { ClienteAvatar } from "@/components/clientes/ClienteAvatar";
import { useClientes } from "@/context/ClientesContext";
import { idade, isoParaDataBr } from "@/utils/cliente";

export default function ClienteFicha() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCliente, inativarCliente, reativarCliente } = useClientes();

  const cliente = getCliente(id);
  if (!cliente) return null;

  const nascimento = cliente.dataNascimento
    ? `${isoParaDataBr(cliente.dataNascimento)} (${idade(cliente.dataNascimento)} anos)`
    : "—";

  return (
    <FichaCadastro
      titulo="Ficha do Cliente"
      nomeEntidade="cliente"
      nome={cliente.nome}
      ativo={cliente.ativo}
      avatar={<ClienteAvatar nome={cliente.nome} size={52} destaque />}
      campos={[
        { label: "E-mail", value: cliente.email || "—" },
        { label: "Telefone", value: cliente.telefone || "—" },
        { label: "CPF", value: cliente.cpf || "—" },
        { label: "Data de nascimento", value: nascimento },
      ]}
      avisoInativacao="Ele deixa de aparecer para novas ordens de serviço, mas o histórico e os relatórios são mantidos. Você pode reativá-lo depois."
      onEditar={() => router.push(`/clientes/editar/${cliente.id}`)}
      onInativar={() => inativarCliente(cliente.id)}
      onReativar={() => reativarCliente(cliente.id)}
    />
  );
}
