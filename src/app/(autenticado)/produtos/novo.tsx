import { View } from "react-native";
import { router } from "expo-router";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { ProdutoForm } from "@/components/produtos/ProdutoForm";
import { useProdutos } from "@/context/ProdutosContext";

export default function NovoProduto() {
  const { adicionarProduto } = useProdutos();
  const { showToast } = useToast();

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Novo Produto" onBack={() => router.back()} />
      <ProdutoForm
        submitLabel="Salvar Produto"
        onSubmit={async (input) => {
          await adicionarProduto(input);
          showToast("Produto adicionado com sucesso");
          router.back();
        }}
      />
    </View>
  );
}