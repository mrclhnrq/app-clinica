import { View } from "react-native";
import { router } from "expo-router";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { ServicoForm } from "@/components/servicos/ServicoForm";
import { useServicos } from "@/context/ServicosContext";

export default function NovoServico() {
  const { adicionarServico } = useServicos();
  const { showToast } = useToast();

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Novo Serviço" onBack={() => router.back()} />
      <ServicoForm
        submitLabel="Salvar Serviço"
        onSubmit={async (input) => {
          await adicionarServico(input);
          showToast("Serviço adicionado com sucesso");
          router.back();
        }}
      />
    </View>
  );
}