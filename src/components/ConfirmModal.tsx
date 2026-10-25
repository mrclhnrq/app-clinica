import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { colors, radius, spacing, typography } from "@/constants/theme";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  warning,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  icon = "close",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} dismissable={!loading} style={styles.sheet}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={26} color={colors.danger} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {!!warning && <Text style={styles.warning}>{warning}</Text>}

      <View style={styles.actions}>
        <Button title={cancelLabel} variant="secondary" onPress={onCancel} disabled={loading} style={styles.action} />
        <Button title={confirmLabel} variant="danger" onPress={onConfirm} loading={loading} style={styles.action} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { alignItems: "center" },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.circle,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  message: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  warning: { ...typography.small, color: colors.textLight, marginTop: spacing.sm, textAlign: "center" },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  action: { flex: 1 },
});