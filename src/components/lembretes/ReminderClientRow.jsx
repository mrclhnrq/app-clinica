import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../constants/theme";
import { reminderColors } from "./lembretesTheme";

export function SentBadge() {
  return (
    <View style={styles.sentBadge}>
      <Ionicons name="checkmark-done" size={13} color={reminderColors.sentText} />
      <Text style={styles.sentText}>Enviado</Text>
    </View>
  );
}

export function ReminderClientRow({ reminder, kind, onPress }) {
  const sent = reminder.status === "ENVIADO";
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{reminder.initials}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{reminder.name}</Text>
          {sent && <SentBadge />}
        </View>
        {kind === "horario" ? (
          <>
            <Text style={styles.service}>{reminder.service}</Text>
            <Text style={styles.detailText}>
              {reminder.appointmentDate}  •  <Text style={styles.time}>{reminder.appointmentTime}</Text>
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.lastLabel}>
              Último: <Text style={styles.lastService}>{reminder.service}</Text>
            </Text>
            <Text style={styles.detailText}>
              {reminder.historyDate ? `Atendimento em ${reminder.historyDate}` : `Retorno em ${reminder.returnDate}`}
            </Text>
          </>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.75 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.circle,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  initials: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  content: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { color: colors.text, fontSize: 15, fontWeight: "700", flexShrink: 1 },
  service: { color: reminderColors.gold, fontSize: 13, fontWeight: "500" },
  detailText: { color: colors.textMuted, fontSize: 12 },
  time: { color: colors.text, fontWeight: "700" },
  lastLabel: { color: colors.textMuted, fontSize: 13 },
  lastService: { color: colors.primary, fontWeight: "700" },
  sentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: reminderColors.sent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sentText: { color: reminderColors.sentText, fontSize: 11, fontWeight: "700" },
});
