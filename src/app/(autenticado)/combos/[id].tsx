import { router, useLocalSearchParams } from "expo-router";
import { FichaCadastro } from "@/components/FichaCadastro";
import { SecaoLista } from "@/components/SecaoLista";
import { useCombos } from "@/context/CombosContext";
import { formatPercentual, rotuloItem } from "@/utils/combo";
import { formatCurrency } from "@/utils/format";

export default function ComboFicha() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCombo, inativarCombo, reativarCombo } = useCombos();

  const combo = getCombo(id);
  if (!combo) return null;

  return (
    <FichaCadastro
      titulo="Ficha do Combo"
      nomeEntidade="combo"
      nome={combo.nome}
      ativo={combo.ativo}
      campos={[
        { label: "Desconto", value: formatPercentual(combo.desconto) },
        { label: "Valor final", value: formatCurrency(combo.valorFinal) },
        { label: "Descrição", value: combo.descricao || "—" },
      ]}
      onEditar={() => router.push(`/combos/editar/${combo.id}`)}
      onInativar={() => inativarCombo(combo.id)}
      onReativar={() => reativarCombo(combo.id)}
    >
      <SecaoLista titulo="Serviços Inclusos" itens={combo.servicos.map(rotuloItem)} />
      <SecaoLista titulo="Produtos Inclusos" itens={combo.produtos.map(rotuloItem)} />
    </FichaCadastro>
  );
}