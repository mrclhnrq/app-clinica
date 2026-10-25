import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { ComboForm } from "@/components/combos/ComboForm";
import { useCombos } from "@/context/CombosContext";

export default function EditarCombo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCombo, editarCombo } = useCombos();
  const { showToast } = useToast();

  const combo = getCombo(id);
  if (!combo) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Editar Combo" onBack={() => router.back()} />
      <ComboForm
        initialValue={combo}
        submitLabel="Salvar Alterações"
        onCancel={() => router.back()}
        onSubmit={async (input) => {
          await editarCombo(combo.id, input);
          showToast("Combo atualizado com sucesso");
          router.dismissAll();
        }}
      />
    </View>
  );
}