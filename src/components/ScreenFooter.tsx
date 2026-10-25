import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/constants/theme";

export function ScreenFooter({ children }: { children: ReactNode }) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});