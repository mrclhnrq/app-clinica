import { Children, ReactNode, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/Button";
import { ScreenFooter } from "@/components/ScreenFooter";
import { useToast } from "@/components/ToastProvider";
import { spacing } from "@/constants/theme";
import { getErrorMessage } from "@/services/api";

type FormLayoutProps = {
  children: ReactNode;
  submitLabel: string;
  onSubmit: () => Promise<void>;
  onCancel?: () => void;
};

export const textareaStyle = { height: 110, textAlignVertical: "top" as const };

// duas colunas lado a lado
export function FormRow({ children }: { children: ReactNode }) {
  return (
    <View style={styles.row}>
      {Children.map(children, (child) => (
        <View style={styles.col}>{child}</View>
      ))}
    </View>
  );
}

export function FormLayout({ children, submitLabel, onSubmit, onCancel }: FormLayoutProps) {
  const { showToast } = useToast();
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit() {
    try {
      setEnviando(true);
      await onSubmit();
    } catch (e) {
      showToast(getErrorMessage(e), "error"); // erro do backend: continua na tela com os dados digitados
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>

      <ScreenFooter>
        <Button
          title={submitLabel}
          onPress={handleSubmit}
          loading={enviando}
          style={onCancel ? styles.grow2 : styles.grow1}
        />
        {onCancel && (
          <Button title="Cancelar" variant="secondary" onPress={onCancel} disabled={enviando} style={styles.grow1} />
        )}
      </ScreenFooter>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: { flexDirection: "row", gap: spacing.md },
  col: { flex: 1 },
  grow1: { flex: 1 },
  grow2: { flex: 2 },
});