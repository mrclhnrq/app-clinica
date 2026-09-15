import { useState } from "react";
import { View, TextInput, Pressable, StyleSheet, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "../constants/theme";

type PasswordInputProps = Omit<TextInputProps, "secureTextEntry">;

export function PasswordInput({ style, ...rest }: PasswordInputProps) {
  const [visivel, setVisivel] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textLight}
        secureTextEntry={!visivel}
        {...rest}
      />
      <Pressable onPress={() => setVisivel(!visivel)} hitSlop={8}>
        <Ionicons
          name={visivel ? "eye-off-outline" : "eye-outline"}
          size={22}
          color={colors.textMuted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    ...typography.body,
  },
});