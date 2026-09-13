import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { colors, spacing, radius, typography } from "../constants/theme";

type LabeledInputProps = TextInputProps & {
  label: string;
};

export function LabeledInput({ label, style, ...rest }: LabeledInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textLight}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md },
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.sm - 2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    backgroundColor: colors.white,
  },
});