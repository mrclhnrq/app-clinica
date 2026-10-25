import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/constants/theme";
import { avaliarSenha, NivelSenha } from "@/utils/senha";

const CORES: Record<NivelSenha, string> = {
  0: colors.border,
  1: colors.danger,
  2: "#EF8A17",
  3: "#C9A227",
  4: colors.success,
};

// barra de força + checklist da política, atualizados a cada tecla
export function ForcaSenha({ senha }: { senha: string }) {
  const { nivel, rotulo, regras } = avaliarSenha(senha);
  const cor = CORES[nivel];

  return (
    <View style={styles.container}>
      <View style={styles.topo}>
        <Text style={styles.titulo}>Força da senha</Text>
        <Text style={[styles.rotulo, { color: cor }]}>{rotulo}</Text>
      </View>

      <View style={styles.barras}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.barra, { backgroundColor: i <= nivel ? cor : colors.borderLight }]} />
        ))}
      </View>

      <View style={styles.regras}>
        {regras.map((r) => (
          <View key={r.id} style={styles.regra}>
            <Ionicons
              name={r.ok ? "checkmark-circle" : "ellipse-outline"}
              size={14}
              color={r.ok ? colors.success : colors.textLight}
            />
            <Text style={[styles.regraTexto, r.ok && { color: colors.success }]}>{r.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  topo: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs },
  titulo: { fontSize: 11, color: colors.textMuted },
  rotulo: { fontSize: 11, fontWeight: "700" },
  barras: { flexDirection: "row", gap: spacing.xs },
  barra: { flex: 1, height: 4, borderRadius: 2 },
  regras: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.md, rowGap: 2, marginTop: spacing.sm },
  regra: { flexDirection: "row", alignItems: "center", gap: 4 },
  regraTexto: { fontSize: 11, color: colors.textMuted },
});
