import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";

type Detail = { label: string; value: string; highlight?: boolean };

type ItemCardProps = {
  title: string;
  subtitle?: string;      // ex.: categoria
  description?: string;
  details: Detail[];
  badge?: ReactNode;      // topo, esquerda
  tag?: ReactNode;        // topo, direita
  alert?: boolean;        // borda vermelha (ex.: estoque baixo)
  dimmed?: boolean;       // esmaecido (ex.: inativo)
  onPress?: () => void;
};

export function ItemCard({
  title, subtitle, description, details, badge, tag, alert, dimmed, onPress,
}: ItemCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        alert && styles.alert,
        dimmed && styles.dimmed,
        pressed && styles.pressed,
      ]}
    >
      {(!!badge || !!tag) && (
        <View style={styles.topRow}>
          <View>{badge}</View>
          <View>{tag}</View>
        </View>
      )}

      <View style={styles.titleBox}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        {!!description && <Text style={styles.description} numberOfLines={1}>{description}</Text>}
      </View>

      <View style={styles.details}>
        {details.map((d) => (
          <View key={d.label} style={styles.row}>
            <Text style={styles.label}>{d.label}</Text>
            <Text style={[styles.value, d.highlight && styles.highlight]}>{d.value}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, // preenche a célula: cards da mesma linha ficam com a mesma altura
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  alert: { borderColor: colors.danger },
  dimmed: { opacity: 0.65 },
  pressed: { opacity: 0.8 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleBox: { flex: 1, minHeight: 40 },
  title: { ...typography.body, fontWeight: "700", color: colors.text },
  subtitle: { ...typography.small, fontWeight: "600", color: colors.primary, marginTop: 2 },
  description: { ...typography.small, color: colors.textLight, marginTop: 2 },
  details: { gap: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { ...typography.small, color: colors.textLight },
  value: { ...typography.small, fontWeight: "600", color: colors.text },
  highlight: { color: colors.gold, fontWeight: "700" },
});