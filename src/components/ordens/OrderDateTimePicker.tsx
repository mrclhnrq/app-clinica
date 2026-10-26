import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, typography } from "@/constants/theme";

type Props = { value: string; dateOnly: boolean; onConfirm: (value: string) => void; onClose: () => void };
const pad = (value: number) => String(value).padStart(2, "0");
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function initialDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2})(?::\d{2})?)?$/.exec(value.trim());
  if (match) {
    const [, day, month, year, hour = "00", minute = "00"] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    if (Number(year) >= 1000 && Number(year) <= 9999 && parsed.getFullYear() === Number(year)
      && parsed.getMonth() === Number(month) - 1 && parsed.getDate() === Number(day)
      && Number(hour) < 24 && Number(minute) < 60) return parsed;
  }
  return new Date();
}

export function OrderDateTimePicker({ value, dateOnly, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState(() => initialDate(value));
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1, 12));
  const [hour, setHour] = useState(() => pad(selected.getHours()));
  const [minute, setMinute] = useState(() => pad(selected.getMinutes()));
  const offset = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12).getDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= days ? day : null;
  });
  const validTime = /^\d{1,2}$/.test(hour) && Number(hour) < 24 && /^\d{1,2}$/.test(minute) && Number(minute) < 60;
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  function moveMonth(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
    if (next.getFullYear() >= 1000 && next.getFullYear() <= 9999) setMonth(next);
  }
  function confirm() {
    if (!dateOnly && !validTime) return;
    const date = `${pad(selected.getDate())}/${pad(selected.getMonth() + 1)}/${selected.getFullYear()}`;
    onConfirm(dateOnly ? date : `${date} ${pad(Number(hour))}:${pad(Number(minute))}`);
    onClose();
  }
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar calendário" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.dialog} accessibilityViewIsModal>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={styles.title}>{dateOnly ? "Data do retorno" : "Data e horário"}</Text>
          <View style={styles.monthBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => moveMonth(-1)} style={styles.arrow}><Text style={styles.arrowText}>‹</Text></Pressable>
            <Text accessibilityRole="header" style={styles.month}>{monthLabel}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => moveMonth(1)} style={styles.arrow}><Text style={styles.arrowText}>›</Text></Pressable>
          </View>
          <View style={styles.grid}>
            {weekDays.map(day => <View key={day} style={styles.cell}><Text style={styles.weekDay}>{day}</Text></View>)}
            {cells.map((day, index) => {
              const active = day === selected.getDate() && month.getMonth() === selected.getMonth() && month.getFullYear() === selected.getFullYear();
              return <View key={index} style={styles.cell}>{day !== null && <Pressable accessibilityRole="button"
                accessibilityLabel={`${pad(day)}/${pad(month.getMonth() + 1)}/${month.getFullYear()}`}
                accessibilityState={{ selected: active }} onPress={() => setSelected(new Date(month.getFullYear(), month.getMonth(), day, 12))}
                style={[styles.day, active && styles.daySelected]}><Text style={[styles.dayText, active && styles.dayTextSelected]}>{day}</Text></Pressable>}</View>;
            })}
          </View>
          <Text style={styles.selectedDate}>{selected.toLocaleDateString("pt-BR")}</Text>
          {!dateOnly && <View style={styles.timeSection}>
            <Text style={styles.label}>Horário do atendimento</Text>
            <View style={styles.timeRow}>
              <TextInput accessibilityLabel="Hora" keyboardType="number-pad" maxLength={2} value={hour}
                onChangeText={text => setHour(text.replace(/\D/g, ""))} onBlur={() => { if (hour) setHour(pad(Number(hour))); }} style={styles.timeInput} />
              <Text style={styles.colon}>:</Text>
              <TextInput accessibilityLabel="Minutos" keyboardType="number-pad" maxLength={2} value={minute}
                onChangeText={text => setMinute(text.replace(/\D/g, ""))} onBlur={() => { if (minute) setMinute(pad(Number(minute))); }} style={styles.timeInput} />
            </View>
            {!validTime && <Text style={styles.error}>Informe um horário entre 00:00 e 23:59.</Text>}
          </View>}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={!dateOnly && !validTime} onPress={confirm} style={[styles.confirm, !dateOnly && !validTime && styles.disabled]}><Text style={styles.confirmText}>Confirmar</Text></Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 360, maxHeight: "90%", backgroundColor: colors.white, borderRadius: radius.md, padding: 20 },
  title: { ...typography.title, fontSize: 20, color: colors.primary, marginBottom: 16 },
  monthBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  arrow: { width: 40, height: 40, borderRadius: radius.circle, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  arrowText: { fontSize: 28, color: colors.primary },
  month: { fontSize: 15, fontWeight: "700", color: colors.textMuted, textTransform: "capitalize" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.285714%", height: 40, alignItems: "center", justifyContent: "center" },
  weekDay: { fontSize: 12, fontWeight: "600", color: colors.textLight },
  day: { width: 36, height: 36, borderRadius: radius.circle, alignItems: "center", justifyContent: "center" },
  daySelected: { backgroundColor: colors.primary },
  dayText: { fontSize: 14, color: colors.text },
  dayTextSelected: { color: colors.white, fontWeight: "700" },
  selectedDate: { fontSize: 13, color: colors.primary, textAlign: "center", marginTop: 8 },
  timeSection: { marginTop: 16 },
  label: { color: colors.textMuted, fontSize: 14, marginBottom: 8 },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  timeInput: { width: 64, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.primaryLight, color: colors.text, fontSize: 20, textAlign: "center", padding: 12 },
  colon: { fontSize: 20, fontWeight: "700", color: colors.primary },
  error: { color: colors.danger, fontSize: 12, textAlign: "center", marginTop: 8 },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancel: { flex: 1, paddingVertical: 14, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: "center" },
  cancelText: { ...typography.button, fontSize: 15, color: colors.primary },
  confirm: { flex: 1, paddingVertical: 14, borderRadius: radius.sm, backgroundColor: colors.primaryDark, alignItems: "center" },
  confirmText: { ...typography.button, fontSize: 15, color: colors.white },
  disabled: { opacity: 0.5 },
});
