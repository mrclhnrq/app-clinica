import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ReminderClientRow } from "../../components/lembretes/ReminderClientRow";
import { ReminderSheet } from "../../components/lembretes/ReminderSheet";
import { ReminderHeader } from "../../components/lembretes/ReminderHeader";
import { reminderColors } from "../../components/lembretes/lembretesTheme";
import { colors, radius, spacing } from "../../constants/theme";
import { listReminders } from "@/services/lembretesApi";
import { mapReminder, parseLocalDate } from "../../data/reminderMapper";

const filters = ["Hoje", "Amanhã", "Próximos 7 dias"];

export default function LembreteHorario() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Hoje");
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
        .filter((item) => item.kind === "horario" && item.status !== "CANCELADO")))
      .catch((requestError) => {
        console.error("Falha ao carregar lembretes de horário", requestError);
        setError(requestError.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => reminders.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const date = parseLocalDate(item.raw.dataHora) || new Date(NaN);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const sameDay = (first, second) => first.toDateString() === second.toDateString();
    const matchesFilter = filter === "Hoje"
      ? sameDay(date, today)
      : filter === "Amanhã"
        ? sameDay(date, tomorrow)
        : date >= today && date <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return matchesSearch && matchesFilter;
  }), [filter, reminders, search]);

  return (
    <View style={styles.screen}>
      <ReminderHeader title="Lembrete de Horário" subtitle="Selecione um cliente para enviar um lembrete personalizado sobre o seu agendamento futuro." fallbackRoute="/lembretes" />
      <View style={styles.searchBox}><Ionicons name="search-outline" size={19} color={colors.textLight} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar cliente..." placeholderTextColor={colors.textLight} style={styles.searchInput} /></View>
      <View style={styles.filters}>{filters.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.activeFilter]}><Text style={[styles.filterText, filter === item && styles.activeFilterText]}>{item}</Text></Pressable>)}</View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReminderClientRow reminder={item} kind="horario" onPress={() => setSelected(item)} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={loading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : error ? <Pressable onPress={() => Alert.alert("Erro ao carregar lembretes", error)}><Text style={styles.error}>{error}</Text></Pressable> : null}
        ListEmptyComponent={!loading ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="calendar-clear-outline" size={38} color={colors.primary} /></View><Text style={styles.emptyTitle}>Nenhum lembrete encontrado</Text><Text style={styles.emptyText}>Não há clientes com atendimentos futuros correspondentes à sua busca ou filtro selecionado.</Text></View> : null}
      />
      <ReminderSheet key={selected?.id ?? "closed"} visible={selected !== null} kind="horario" reminder={selected} onClose={() => setSelected(null)} onSent={load} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  searchBox: { height: 48, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, marginLeft: spacing.sm },
  filters: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md },
  filter: { borderRadius: radius.pill, backgroundColor: reminderColors.chip, paddingHorizontal: spacing.md, paddingVertical: 8 },
  activeFilter: { backgroundColor: colors.primary },
  filterText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  activeFilterText: { color: colors.white },
  list: { paddingBottom: spacing.xl },
  empty: { alignItems: "center", paddingTop: 70, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: colors.primary, fontSize: 16, fontWeight: "700", marginTop: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  loading: { marginTop: spacing.md },
  error: { color: colors.danger, textAlign: "center", padding: spacing.md },
});
