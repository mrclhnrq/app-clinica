import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Card } from "../../components/Card";
import { colors, spacing, radius } from "../../constants/theme";

const menuItems = [
  { title: "Clientes", subtitle: "Gerenciar", icon: "people-outline" },
  { title: "Serviços", subtitle: "Gerenciar", icon: "cut-outline" },
  { title: "Produtos", subtitle: "Gerenciar", icon: "bag-outline" },
  { title: "Combos", subtitle: "Gerenciar", icon: "gift-outline" },
  { title: "Ordens de Serv.", subtitle: "Gerenciar", icon: "document-text-outline" },
  { title: "Dashboard", subtitle: "Gerenciar", icon: "trending-up-outline" },
  { title: "Funcionários", subtitle: "Gerenciar", icon: "person-outline" },
  { title: "Custos", subtitle: "Gerenciar", icon: "cash-outline" },
  { title: "Lembretes", subtitle: "Gerenciar", icon: "time-outline" },
] as const;

export default function Home() {
  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Ionicons name="flower-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.headerTitulo}>Fernanda Lima</Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            <View style={styles.notifDot} />
          </Pressable>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={colors.white} />
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        {menuItems.map((item) => (
          <Card key={item.title} title={item.title} subtitle={item.subtitle} icon={item.icon} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: spacing.xl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.circle,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitulo: { fontSize: 17, fontWeight: "700", color: colors.primary },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  notifButton: {
    width: 38,
    height: 38,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.circle,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
});