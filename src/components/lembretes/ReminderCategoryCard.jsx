import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../constants/theme";

export function ReminderCategoryCard({ title, description, activeCount, icon, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeCount}</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Gerenciar lembretes</Text>
        <Ionicons name="arrow-forward" size={17} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: "#32153f",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  pressed: { opacity: 0.85 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "#E6F6EC",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#27834A", fontWeight: "700", fontSize: 13 },
  title: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: spacing.lg },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  footer: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg, gap: spacing.sm },
  footerText: { color: colors.primary, fontSize: 13, fontWeight: "600", flex: 1 },
});
