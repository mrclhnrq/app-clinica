import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { ProdutoForm } from "@/components/produtos/ProdutoForm";
import { useProdutos } from "@/context/ProdutosContext";

export default function EditarProduto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProduto, editarProduto } = useProdutos();
  const { showToast } = useToast();

  const produto = getProduto(id);
  if (!produto) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Editar Produto" onBack={() => router.back()} />
      <ProdutoForm
        initialValue={produto}
        submitLabel="Salvar Alterações"
        onCancel={() => router.back()}
        onSubmit={async (input) => {
          await editarProduto(produto.id, input);
          showToast("Produto atualizado com sucesso");
          router.dismissAll();
        }}
      />
    </View>
  );
}