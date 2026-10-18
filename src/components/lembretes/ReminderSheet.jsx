import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { colors, radius, spacing } from "../../constants/theme";
import { sendReminder } from "../../services/api";
function suggestedMessage(reminder, kind) {
  const firstName = reminder.name.split(" ")[0];
  if (kind === "horario") {
    return `Olá, ${firstName}! Passando para lembrar do seu agendamento de ${reminder.service} ${reminder.appointmentDate.toLowerCase()} às ${reminder.appointmentTime}. Esperamos você!`;
  }
  return `Olá, ${firstName}! Tudo bem? Notamos que está na hora de agendar seu retorno para acompanhar o resultado do seu ${reminder.service}. Podemos encontrar um melhor horário para você?`;
}

export function ReminderSheet({ visible, kind, reminder, onClose, onSent }) {
  const [message, setMessage] = useState(() => (reminder ? suggestedMessage(reminder, kind) : ""));
  const [sending, setSending] = useState(false);

  if (!reminder) return null;

  const regenerateMessage = () => {
    setMessage(
      kind === "horario"
        ? `Oi, ${reminder.name.split(" ")[0]}! Seu horário para ${reminder.service} está reservado para ${reminder.appointmentDate.toLowerCase()} às ${reminder.appointmentTime}. Contamos com você!`
        : `Olá, ${reminder.name.split(" ")[0]}! Que tal agendarmos seu retorno de ${reminder.service}? Estamos à disposição para encontrar o melhor horário.`,
    );
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await sendReminder(reminder.backendId);
      Alert.alert("Mensagem enviada", "O lembrete foi enviado pelo WhatsApp e registrado no histórico.");
      onSent?.();
      onClose();
    } catch (error) {
      console.error("Falha ao enviar lembrete", error);
      Alert.alert("Não foi possível enviar", error.message || "Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>
                  {kind === "horario" ? "Enviar lembrete de horário" : "Enviar lembrete de retorno"}
                </Text>
                <Text style={styles.subtitle}>Confirme as informações abaixo antes do envio.</Text>
              </View>
              <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.close}>
                <Ionicons name="close" size={21} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>PACIENTE</Text>
              <View style={styles.patientRow}>
                <View style={styles.avatar}><Text style={styles.initials}>{reminder.initials}</Text></View>
                <View>
                  <Text style={styles.patientName}>{reminder.name}</Text>
                  <Text style={styles.phone}>{reminder.phone}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.label}>
                {kind === "horario" ? "ATENDIMENTO" : "HISTÓRICO DO ATENDIMENTO"}
              </Text>
              <Text style={styles.detailStrong}>{reminder.service}</Text>
              {kind === "horario" ? (
                <Text style={styles.detailText}>{reminder.appointmentDate} às {reminder.appointmentTime}</Text>
              ) : (
                <>
                  <Text style={styles.detailText}>Atendimento em {reminder.historyDate}</Text>
                  <Text style={styles.detailText}>{reminder.historyNotes}</Text>
                  <Text style={styles.returnHighlight}>Retorno recomendado: {reminder.returnDate}</Text>
                </>
              )}
            </View>

            <Text style={styles.messageLabel}>Mensagem sugerida pela IA</Text>
            <TextInput
              multiline
              value={message}
              onChangeText={setMessage}
              style={styles.messageInput}
              textAlignVertical="top"
              placeholder="Digite a mensagem..."
              placeholderTextColor={colors.textLight}
            />
            <Pressable style={styles.regenerate} onPress={regenerateMessage}>
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
              <Text style={styles.regenerateText}>Gerar outra mensagem</Text>
            </Pressable>

            <Pressable style={[styles.sendButton, sending && styles.disabled]} onPress={handleSend} disabled={sending}>
              <Ionicons name="send-outline" size={18} color={colors.white} />
              <Text style={styles.sendText}>{sending ? "Enviando..." : "Enviar mensagem"}</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(24, 12, 30, 0.48)" },
  sheet: {
    maxHeight: "92%",
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: { alignSelf: "center", width: 42, height: 4, borderRadius: 4, backgroundColor: "#D4C5D9", marginTop: spacing.sm },
  body: { padding: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.lg },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 20, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 5 },
  close: { padding: 4, marginLeft: spacing.sm },
  infoCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  label: { color: colors.textLight, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: spacing.sm },
  patientRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 42, height: 42, borderRadius: radius.circle, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  initials: { color: colors.primary, fontWeight: "700" },
  patientName: { color: colors.text, fontWeight: "700", fontSize: 15 },
  phone: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  detailStrong: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  detailText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  returnHighlight: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: 6 },
  messageLabel: { color: colors.text, fontSize: 14, fontWeight: "700", marginBottom: spacing.sm },
  messageInput: { minHeight: 118, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 14, lineHeight: 21 },
  regenerate: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: spacing.md },
  regenerateText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  sendButton: { height: 50, borderRadius: radius.sm, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  disabled: { opacity: 0.6 },
  sendText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  cancelButton: { alignItems: "center", padding: spacing.md },
  cancelText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
});
