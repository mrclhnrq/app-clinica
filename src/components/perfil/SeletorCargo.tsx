import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { Role, ROLE_OPTIONS } from "@/types/usuario";

type SeletorCargoProps = {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  hint?: string;
};

// só as duas opções do enum Role do banco: ADMIN e USER
export function SeletorCargo({ value, onChange, disabled, hint }: SeletorCargoProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Cargo</Text>
      <View style={[styles.opcoes, disabled && styles.desabilitado]}>
        {ROLE_OPTIONS.map((o) => {
          const ativo = o.value === value;
          return (
            <Pressable
              key={o.value}
              disabled={disabled}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo, disabled }}
              style={[styles.opcao, ativo && styles.opcaoAtiva]}
            >
              <Text style={[styles.texto, ativo && styles.textoAtivo]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.sm - 2 },
  opcoes: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 4,
    gap: 4,
  },
  desabilitado: { opacity: 0.6 },
  opcao: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.sm - 3, alignItems: "center" },
  opcaoAtiva: { backgroundColor: colors.primary },
  texto: { ...typography.body, color: colors.textMuted },
  textoAtivo: { color: colors.white, fontWeight: "600" },
  hint: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
});
