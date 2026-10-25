import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../constants/theme";
import { reminderColors } from "./lembretesTheme";

export function ReminderCategoryCard({ title, description, activeCount, icon, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={22} color={colors.white} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeCount} {activeCount === 1 ? "Ativo" : "Ativos"}</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: reminderColors.cardPurple,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#32153f",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pressed: { opacity: 0.9 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: reminderColors.goldBadge,
  },
  badgeText: { color: colors.white, fontWeight: "700", fontSize: 12 },
  title: { color: colors.white, fontSize: 18, fontWeight: "700", marginTop: spacing.lg },
  description: { color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
});
