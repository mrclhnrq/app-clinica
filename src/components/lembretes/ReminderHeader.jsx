import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../constants/theme";

// Cabeçalho do Figma: botão voltar redondo, título roxo e subtítulo abaixo.
export function ReminderHeader({ title, subtitle, fallbackRoute = "/home" }) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(fallbackRoute));
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={goBack} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingTop: spacing.lg, paddingBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center" },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    shadowColor: "#32153f",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { flex: 1, color: colors.primary, fontSize: 22, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
});
