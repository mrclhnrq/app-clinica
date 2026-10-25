import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

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
  overlay: { flex: 1, backgroundColor: "rgba(26,26,46,0.4)", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 360, maxHeight: "90%", backgroundColor: "white", borderRadius: 20, padding: 20 },
  title: { color: "#5b2d8e", fontSize: 20, fontWeight: "800", marginBottom: 16 },
  monthBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  arrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f0eef8", alignItems: "center", justifyContent: "center" },
  arrowText: { fontSize: 28, color: "#6a3db8" },
  month: { fontSize: 15, fontWeight: "700", color: "#4a4a6a", textTransform: "capitalize" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.285714%", height: 40, alignItems: "center", justifyContent: "center" },
  weekDay: { fontSize: 12, fontWeight: "600", color: "#9a98b0" },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  daySelected: { backgroundColor: "#6a3db8" },
  dayText: { fontSize: 14, color: "#1a1a2e" },
  dayTextSelected: { color: "white", fontWeight: "700" },
  selectedDate: { fontSize: 13, color: "#6a3db8", textAlign: "center", marginTop: 8 },
  timeSection: { marginTop: 16 },
  label: { color: "#4a4a6a", fontSize: 14, marginBottom: 8 },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  timeInput: { width: 64, borderWidth: 1.5, borderColor: "#e0dff0", borderRadius: 14, backgroundColor: "#f0eef8", color: "#1a1a2e", fontSize: 20, textAlign: "center", padding: 12 },
  colon: { fontSize: 20, fontWeight: "700", color: "#5b2d8e" },
  error: { color: "#e03535", fontSize: 12, textAlign: "center", marginTop: 8 },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancel: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: "#f0eef8", alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#5b2d8e" },
  confirm: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: "#6a3db8", alignItems: "center" },
  confirmText: { fontSize: 14, fontWeight: "700", color: "white" },
  disabled: { opacity: 0.5 },
});
