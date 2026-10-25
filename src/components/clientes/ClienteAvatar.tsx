import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";
import { iniciais } from "@/utils/cliente";

type ClienteAvatarProps = {
  nome: string;
  size?: number;
  destaque?: boolean; // fundo roxo cheio (ficha) em vez do lilás claro (lista)
};

export function ClienteAvatar({ nome, size = 44, destaque }: ClienteAvatarProps) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, backgroundColor: destaque ? colors.primary : colors.primaryLight },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.34, color: destaque ? colors.white : colors.primary }]}>
        {iniciais(nome)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: radius.circle, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  text: { fontWeight: "700" },
});
