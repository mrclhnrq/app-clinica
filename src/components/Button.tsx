import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "danger" | "outlineDanger";

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  pill?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = "primary", pill, disabled, loading, style }: ButtonProps) {
  const v = variants[variant];
  const inativo = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border, borderRadius: pill ? radius.pill : radius.sm },
        pressed && { opacity: 0.85 },
        inativo && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const variants = {
  primary: { bg: colors.primaryDark, text: colors.white, border: colors.primaryDark },
  secondary: { bg: colors.primaryLight, text: colors.primary, border: colors.primaryLight },
  danger: { bg: colors.danger, text: colors.white, border: colors.danger },
  outlineDanger: { bg: "transparent", text: colors.danger, border: colors.danger },
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.lg - 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  text: { ...typography.button, fontSize: 15 },
});