import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, spacing, typography } from "../../constants/theme";

// Cabeçalho padrão do app (ScreenHeader) com um subtítulo opcional abaixo.
export function ReminderHeader({ title, subtitle, fallbackRoute = "/home" }) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(fallbackRoute));
  return (
    <>
      <ScreenHeader title={title} onBack={goBack} />
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginHorizontal: spacing.lg, marginBottom: spacing.md },
});
