import { router } from "expo-router";
import { View } from "react-native";
import { ScreenHeader } from "@/components/ScreenHeader";

// conteúdo ainda não definido
export default function SobreApp() {
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Sobre o App" onBack={() => router.back()} />
    </View>
  );
}
