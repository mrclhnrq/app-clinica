import { Pressable, Text, View, StyleSheet, GestureResponderEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "../constants/theme";

type CardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: (event: GestureResponderEvent) => void;
};

export function Card({ title, subtitle, icon, onPress }: CardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={22} color={colors.white} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 110,
    justifyContent: "space-between",
    gap: 0,
    margin: 0,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.circle,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl - 4,
  },
  title: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    ...typography.small,
    marginTop: 2,
  },
});