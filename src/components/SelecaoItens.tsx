import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants/theme";

type SelecaoItensProps = {
  titulo: string;
  rotuloAdicionar: string;
  itens: { id: string; label: string }[];
  onRemover: (id: string) => void;
  onAdicionar: () => void;
  erro?: string;
};

export function SelecaoItens({ titulo, rotuloAdicionar, itens, onRemover, onAdicionar, erro }: SelecaoItensProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{titulo}</Text>

      <View style={[styles.caixa, !!erro && styles.caixaErro]}>
        {itens.map((item) => (
          <View key={item.id} style={styles.chip}>
            <Text style={styles.chipTexto} numberOfLines={1}>{item.label}</Text>
            <Pressable onPress={() => onRemover(item.id)} hitSlop={8}>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.adicionar} onPress={onAdicionar}>
          <Text style={styles.adicionarTexto}>{rotuloAdicionar}</Text>
        </Pressable>
      </View>

      {!!erro && <Text style={styles.erro}>{erro}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md },
  titulo: { ...typography.label, color: colors.text, marginBottom: spacing.sm - 2 },
  caixa: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
  },
  caixaErro: { borderColor: colors.danger },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    maxWidth: "100%",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipTexto: { ...typography.small, color: colors.primary, fontWeight: "600", flexShrink: 1 },
  adicionar: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  adicionarTexto: { ...typography.small, color: colors.gold, fontWeight: "700" },
  erro: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
});