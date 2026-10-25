import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export type TagTone = "success" | "neutral" | "info" | "danger";

const TONES: Record<TagTone, { bg: string; text: string }> = {
  success: { bg: colors.successLight, text: colors.success },
  neutral: { bg: colors.neutralLight, text: colors.textMuted },
  info: { bg: colors.primaryLight, text: colors.primary },
  danger: { bg: colors.dangerLight, text: colors.danger },
};

export function Tag({ label, tone = "neutral" }: { label: string; tone?: TagTone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: { fontSize: 11, fontWeight: "600" },
});