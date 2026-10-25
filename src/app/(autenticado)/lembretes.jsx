import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { ReminderCategoryCard } from "../../components/lembretes/ReminderCategoryCard";
import { ReminderHeader } from "../../components/lembretes/ReminderHeader";
import { colors, spacing } from "../../constants/theme";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { listReminders } from "@/services/lembretesApi";
import { mapReminder } from "../../data/reminderMapper";

export default function Lembretes() {
  const [counts, setCounts] = useState({ horario: 0, retorno: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listReminders()
      .then((response) => {
        const reminders = (response?.content || []).map(mapReminder).filter((item) => item.status !== "CANCELADO");
        setCounts({
          horario: reminders.filter((item) => item.kind === "horario").length,
          retorno: reminders.filter((item) => item.kind === "retorno").length,
        });
      })
      .catch((error) => console.error("Falha ao carregar resumo de lembretes", error))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <ReminderHeader
        title="Envio de Mensagens"
        subtitle="Selecione uma categoria de lembrete para gerenciar o envio de notificações para seus pacientes."
      />
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
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  loading: { marginBottom: spacing.md },
});
