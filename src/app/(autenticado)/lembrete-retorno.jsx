import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SearchInput } from "@/components/SearchInput";
import { ReminderClientRow } from "../../components/lembretes/ReminderClientRow";
import { ReminderSheet } from "../../components/lembretes/ReminderSheet";
import { ReminderHeader } from "../../components/lembretes/ReminderHeader";
import { colors, spacing } from "../../constants/theme";
import { listReminders } from "@/services/lembretesApi";
import { mapReminder } from "../../data/reminderMapper";

export default function LembreteRetorno() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    listReminders()
      .then((response) => setReminders((response?.content || [])
        .map(mapReminder)
        .filter((item) => item.kind === "retorno" && item.status !== "CANCELADO")))
      .catch((requestError) => {
        console.error("Falha ao carregar lembretes de retorno", requestError);
        setError(requestError.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => reminders.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())), [reminders, search]);

  return (
    <View style={styles.screen}>
      <ReminderHeader title="Lembrete de Retorno" subtitle="Selecione um cliente com recomendação de retorno para oferecer um novo agendamento." fallbackRoute="/lembretes" />
      <SearchInput containerStyle={styles.search} value={search} onChangeText={setSearch} placeholder="Buscar cliente..." />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReminderClientRow reminder={item} kind="retorno" onPress={() => setSelected(item)} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={loading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : error ? <Pressable onPress={load}><Text style={styles.error}>{error} Toque para tentar novamente.</Text></Pressable> : null}
        ListEmptyComponent={!loading ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="refresh-outline" size={38} color={colors.primary} /></View><Text style={styles.emptyTitle}>Nenhum lembrete encontrado</Text><Text style={styles.emptyText}>Não há retornos recomendados pendentes.</Text></View> : null}
      />
      <ReminderSheet key={selected?.id ?? "closed"} visible={selected !== null} kind="retorno" reminder={selected} onClose={() => setSelected(null)} onSent={load} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  search: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  empty: { alignItems: "center", paddingTop: 90, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: colors.primary, fontSize: 16, fontWeight: "700", marginTop: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  loading: { marginTop: spacing.xl },
  error: { color: colors.danger, textAlign: "center", padding: spacing.md },
});
