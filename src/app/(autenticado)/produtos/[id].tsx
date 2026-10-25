import { router, useLocalSearchParams } from "expo-router";
import { FichaCadastro } from "@/components/FichaCadastro";
import { useProdutos } from "@/context/ProdutosContext";
import { formatUnidades } from "@/utils/estoque";
import { formatCurrency } from "@/utils/format";

export default function ProdutoFicha() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProduto, inativarProduto, reativarProduto } = useProdutos();

  const produto = getProduto(id);
  if (!produto) return null;

  return (
    <FichaCadastro
      titulo="Ficha do Produto"
      nomeEntidade="produto"
      nome={produto.nome}
      ativo={produto.ativo}
      campos={[
        { label: "Marca", value: produto.marca },
        { label: "Categoria", value: produto.categoria },
        { label: "Qtd. em estoque", value: formatUnidades(produto.estoque) },
        { label: "Valor de custo", value: formatCurrency(produto.valorCusto) },
        { label: "Valor de venda", value: formatCurrency(produto.valorVenda) },
        { label: "Descrição", value: produto.descricao || "—" },
      ]}
      onEditar={() => router.push(`/produtos/editar/${produto.id}`)}
      onInativar={() => inativarProduto(produto.id)}
      onReativar={() => reativarProduto(produto.id)}
    />
  );
}