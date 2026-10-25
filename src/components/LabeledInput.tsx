import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { colors, spacing, radius, typography } from "../constants/theme";

type LabeledInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function LabeledInput({ label, error, style, ...rest }: LabeledInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style, !!error && styles.inputError]}
        placeholderTextColor={colors.textLight}
        {...rest}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.sm - 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.danger },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
});