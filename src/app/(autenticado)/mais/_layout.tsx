import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

// aba "Mais": Meu Perfil → Editar Perfil / Alterar Senha / Sobre o App
export default function MaisLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
  );
}
