import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusTag } from "@/components/StatusTag";
import { ClienteAvatar } from "@/components/clientes/ClienteAvatar";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { Cliente } from "@/types/cliente";

// card em linha (1 coluna), mesmo visual dos cards de serviço/produto/combo
export function ClienteCard({ cliente, onPress }: { cliente: Cliente; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, !cliente.ativo && styles.dimmed, pressed && styles.pressed]}
    >
      <ClienteAvatar nome={cliente.nome} />

      <View style={styles.info}>
        <Text style={styles.nome} numberOfLines={1}>{cliente.nome}</Text>
        {!!cliente.email && <Text style={styles.meta} numberOfLines={1}>{cliente.email}</Text>}
        {!!cliente.telefone && <Text style={styles.meta} numberOfLines={1}>{cliente.telefone}</Text>}
      </View>

      <View style={styles.direita}>
        {!cliente.ativo && <StatusTag ativo={false} />}
        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dimmed: { opacity: 0.65 },
  pressed: { opacity: 0.8 },
  info: { flex: 1, gap: 2 },
  nome: { ...typography.body, fontWeight: "700", color: colors.text },
  meta: { ...typography.small, color: colors.textMuted },
  direita: { alignItems: "flex-end", gap: spacing.xs },
});
