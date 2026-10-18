import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ReminderCategoryCard } from "../../components/lembretes/ReminderCategoryCard";
import { colors, spacing } from "../../constants/theme";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { listReminders } from "../../services/api";
import { isReturnReminder } from "../../data/reminderMapper";

export default function Lembretes() {
  const [counts, setCounts] = useState({ horario: 0, retorno: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listReminders()
      .then((response) => {
        const reminders = response?.content || [];
        setCounts({
          horario: reminders.filter((item) => !isReturnReminder(item) && item.status !== "CANCELADO").length,
          retorno: reminders.filter((item) => isReturnReminder(item) && item.status !== "CANCELADO").length,
        });
      })
      .catch((error) => console.error("Falha ao carregar resumo de lembretes", error))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="chatbubbles-outline" size={23} color={colors.primary} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Envio de Mensagens</Text>
          <Text style={styles.subtitle}>Selecione uma categoria de lembrete para gerenciar o envio de notificações para seus pacientes.</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Categorias de lembrete</Text>
      {loading && <ActivityIndicator color={colors.primary} style={styles.loading} />}
      <ReminderCategoryCard
        title="Lembrete de Horário"
        description="Clientes com OS registrada e atendimento futuro cadastrado."
        activeCount={counts.horario}
        icon="time-outline"
        onPress={() => router.push("/lembrete-horario")}
      />
      <ReminderCategoryCard
        title="Lembrete de Retorno"
        description="Clientes com retorno recomendado registrado em sua última OS."
        activeCount={counts.retorno}
        icon="refresh-outline"
        onPress={() => router.push("/lembrete-retorno")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.xxl },
  headerIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  headerCopy: { flex: 1 },
  title: { color: colors.primary, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing.md },
  loading: { marginBottom: spacing.md },
});
