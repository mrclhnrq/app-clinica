import { router, useLocalSearchParams } from "expo-router";
import { FichaCadastro } from "@/components/FichaCadastro";
import { useServicos } from "@/context/ServicosContext";
import { formatCurrency } from "@/utils/format";

export default function ServicoFicha() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getServico, inativarServico, reativarServico } = useServicos();

  const servico = getServico(id);
  if (!servico) return null;

  return (
    <FichaCadastro
      titulo="Ficha do Serviço"
      nomeEntidade="serviço"
      nome={servico.nome}
      ativo={servico.ativo}
      campos={[
        { label: "Valor de custo", value: formatCurrency(servico.valorCusto) },
        { label: "Valor de venda", value: formatCurrency(servico.valorVenda) },
        { label: "Descrição", value: servico.descricao },
      ]}
      onEditar={() => router.push(`/servicos/editar/${servico.id}`)}
      onInativar={() => inativarServico(servico.id)}
      onReativar={() => reativarServico(servico.id)}
    />
  );
}