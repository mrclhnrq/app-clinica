import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { ItemCard } from "@/components/ItemCard";
import { ListagemCadastro } from "@/components/ListagemCadastro";
import { StatusTag } from "@/components/StatusTag";
import { Tag } from "@/components/Tag";
import { colors, typography } from "@/constants/theme";
import { useCombos } from "@/context/CombosContext";
import { formatPercentual } from "@/utils/combo";
import { formatCurrency } from "@/utils/format";

export default function CombosListagem() {
  const { combos, carregando, erro, recarregar } = useCombos();

  return (
    <ListagemCadastro
      titulo="Combos"
      placeholderBusca="Buscar combos..."
      rotuloPlural="combos"
      itens={combos}
      carregando={carregando}
      erro={erro}
      onRecarregar={recarregar}
      onAdicionar={() => router.push("/combos/novo")}
      renderCard={(c) => {
        const totalItens = c.servicos.length + c.produtos.length;
        const selo = c.ativo
          ? c.desconto > 0
            ? <Tag label={`-${formatPercentual(c.desconto)} OFF`} tone="success" />
            : undefined
          : <StatusTag ativo={false} />;

        return (
          <ItemCard
            title={c.nome}
            badge={selo}
            tag={
              totalItens > 0 ? (
                <Text style={styles.itens}>{totalItens} {totalItens === 1 ? "item" : "itens"}</Text>
              ) : undefined
            }
            dimmed={!c.ativo}
            details={[{ label: "Valor Final:", value: formatCurrency(c.valorFinal), highlight: true }]}
            onPress={() => router.push(`/combos/${c.id}`)}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  itens: { ...typography.small, fontWeight: "600", color: colors.textMuted },
});