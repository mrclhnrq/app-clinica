import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/constants/theme";

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
};

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  back: { marginRight: spacing.xs },
  title: { ...typography.title, color: colors.primary, flex: 1 },
});