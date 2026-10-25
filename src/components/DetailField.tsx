import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

export function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md },
  label: { fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: colors.textLight },
  value: { ...typography.body, color: colors.text, marginTop: 2 },
});