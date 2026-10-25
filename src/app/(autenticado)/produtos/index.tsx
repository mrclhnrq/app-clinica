import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { ItemCard } from "@/components/ItemCard";
import { ListagemCadastro } from "@/components/ListagemCadastro";
import { StatusTag } from "@/components/StatusTag";
import { EstoqueTag } from "@/components/produtos/EstoqueTag";
import { colors, typography } from "@/constants/theme";
import { useProdutos } from "@/context/ProdutosContext";
import { nivelEstoque } from "@/utils/estoque";
import { formatCurrency } from "@/utils/format";

export default function ProdutosListagem() {
  const { produtos, carregando, erro, recarregar } = useProdutos();

  return (
    <ListagemCadastro
      titulo="Produtos"
      placeholderBusca="Buscar produtos..."
      rotuloPlural="produtos"
      itens={produtos}
      carregando={carregando}
      erro={erro}
      onRecarregar={recarregar}
      onAdicionar={() => router.push("/produtos/novo")}
      renderCard={(p) => {
        const emAlerta = p.ativo && nivelEstoque(p.estoque) !== "ok";
        return (
          <ItemCard
            title={p.nome}
            subtitle={p.categoria}
            description={p.descricao}
            badge={p.ativo ? <EstoqueTag estoque={p.estoque} /> : <StatusTag ativo={false} />}
            tag={<Text style={[styles.quantidade, emAlerta && styles.alerta]}>{p.estoque} un</Text>}
            alert={emAlerta}
            dimmed={!p.ativo}
            details={[
              { label: "Custo:", value: formatCurrency(p.valorCusto) },
              { label: "Venda:", value: formatCurrency(p.valorVenda), highlight: true },
            ]}
            onPress={() => router.push(`/produtos/${p.id}`)}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  quantidade: { ...typography.small, fontWeight: "700", color: colors.text },
  alerta: { color: colors.danger },
});