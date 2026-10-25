import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";

export function SecaoLista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{titulo}</Text>
      {itens.map((item, indice) => (
        <View key={`${item}-${indice}`} style={styles.linha}>
          <Text style={styles.texto}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.lg, gap: spacing.sm },
  titulo: { fontSize: 16, fontWeight: "700", color: colors.primary },
  linha: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  texto: { ...typography.body, fontWeight: "600", color: colors.text },
});