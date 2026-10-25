import { router } from "expo-router";
import { ItemCard } from "@/components/ItemCard";
import { ListagemCadastro } from "@/components/ListagemCadastro";
import { StatusTag } from "@/components/StatusTag";
import { useServicos } from "@/context/ServicosContext";
import { formatCurrency } from "@/utils/format";

export default function ServicosListagem() {
  const { servicos, carregando, erro, recarregar } = useServicos();

  return (
    <ListagemCadastro
      titulo="Serviços"
      placeholderBusca="Buscar serviços..."
      rotuloPlural="serviços"
      itens={servicos}
      carregando={carregando}
      erro={erro}
      onRecarregar={recarregar}
      onAdicionar={() => router.push("/servicos/novo")}
      renderCard={(s) => (
        <ItemCard
          title={s.nome}
          tag={<StatusTag ativo={s.ativo} />}
          dimmed={!s.ativo}
          details={[
            { label: "Custo:", value: formatCurrency(s.valorCusto) },
            { label: "Venda:", value: formatCurrency(s.valorVenda), highlight: true },
          ]}
          onPress={() => router.push(`/servicos/${s.id}`)}
        />
      )}
    />
  );
}