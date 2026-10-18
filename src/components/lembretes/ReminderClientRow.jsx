import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../constants/theme";
export function ReminderClientRow({ reminder, kind, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{reminder.initials}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{reminder.name}</Text>
        <Text style={styles.service}>{reminder.service}</Text>
        <View style={styles.detail}>
          <Ionicons
            name={kind === "horario" ? "calendar-outline" : "refresh-outline"}
            size={15}
            color={colors.primary}
          />
          <Text style={styles.detailText}>
            {kind === "horario"
              ? `${reminder.appointmentDate} - ${reminder.appointmentTime}`
              : `Atendimento em ${reminder.appointmentDate}`}
          </Text>
        </View>
        {kind === "retorno" && (
          <Text style={styles.returnDate}>Recomendado para {reminder.returnDate}</Text>
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
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  service: { color: colors.textMuted, fontSize: 13 },
  detail: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  detailText: { color: colors.textMuted, fontSize: 12 },
  returnDate: { color: colors.primary, fontSize: 12, marginTop: 2 },
});
