import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { ServicoForm } from "@/components/servicos/ServicoForm";
import { useServicos } from "@/context/ServicosContext";

export default function EditarServico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getServico, editarServico } = useServicos();
  const { showToast } = useToast();

  const servico = getServico(id);
  if (!servico) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Editar Serviço" onBack={() => router.back()} />
      <ServicoForm
        initialValue={servico}
        submitLabel="Salvar Alterações"
        onCancel={() => router.back()}
        onSubmit={async (input) => {
          await editarServico(servico.id, input);
          showToast("Serviço atualizado com sucesso");
          router.dismissAll(); // pula a ficha e volta pra listagem
        }}
      />
    </View>
  );
}