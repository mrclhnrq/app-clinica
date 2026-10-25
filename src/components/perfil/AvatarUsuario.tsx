import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";
import { iniciais } from "@/utils/cliente";

type AvatarUsuarioProps = {
  nome: string;
  foto?: string | null;
  size?: number;
  borda?: boolean; // anel dourado (Meu Perfil)
  fundo?: string;
};

// foto de perfil quando existir; senão as iniciais
export function AvatarUsuario({ nome, foto, size = 40, borda, fundo = colors.primary }: AvatarUsuarioProps) {
  const circulo = { width: size, height: size, borderRadius: size / 2 };

  const conteudo = foto ? (
    <Image source={{ uri: foto }} style={[circulo, styles.foto]} accessibilityLabel={`Foto de ${nome}`} />
  ) : (
    <View style={[circulo, styles.centro, { backgroundColor: fundo }]}>
      <Text style={[styles.iniciais, { fontSize: size * 0.36 }]}>{iniciais(nome)}</Text>
    </View>
  );

  if (!borda) return conteudo;
  return <View style={styles.borda}>{conteudo}</View>;
}

const styles = StyleSheet.create({
  foto: { backgroundColor: colors.primaryLight },
  centro: { alignItems: "center", justifyContent: "center" },
  iniciais: { color: colors.white, fontWeight: "700" },
  borda: { borderWidth: 3, borderColor: colors.gold, borderRadius: radius.circle, padding: 3 },
});
