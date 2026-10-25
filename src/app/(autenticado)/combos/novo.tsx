import { View } from "react-native";
import { router } from "expo-router";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { ComboForm } from "@/components/combos/ComboForm";
import { useCombos } from "@/context/CombosContext";

export default function NovoCombo() {
  const { adicionarCombo } = useCombos();
  const { showToast } = useToast();

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Novo Combo" onBack={() => router.back()} />
      <ComboForm
        submitLabel="Salvar Combo"
        onSubmit={async (input) => {
          await adicionarCombo(input);
          showToast("Combo adicionado com sucesso");
          router.back();
        }}
      />
    </View>
  );
}