import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { colors, spacing, typography } from "@/constants/theme";

export type OpcaoSeletor = { id: string; label: string; detalhe?: string };

type SeletorItensModalProps = {
  visible: boolean;
  titulo: string;
  vazio: string;
  opcoes: OpcaoSeletor[];
  selecionados: string[];
  onConfirmar: (ids: string[]) => void;
  onFechar: () => void;
};

export function SeletorItensModal({
  visible, titulo, vazio, opcoes, selecionados, onConfirmar, onFechar,
}: SeletorItensModalProps) {
  const [marcados, setMarcados] = useState<string[]>([]);

  // cada vez que abre, começa com o que já está no combo
  useEffect(() => {
    if (visible) setMarcados(selecionados);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const alternar = (id: string) =>
    setMarcados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <BottomSheet visible={visible} onClose={onFechar} style={styles.sheet}>
      <Text style={styles.titulo}>{titulo}</Text>

      <FlatList
        data={opcoes}
        keyExtractor={(opcao) => opcao.id}
        style={styles.lista}
        ListEmptyComponent={<Text style={styles.vazio}>{vazio}</Text>}
        renderItem={({ item }) => {
          const marcado = marcados.includes(item.id);
          return (
            <Pressable style={styles.linha} onPress={() => alternar(item.id)}>
              <Ionicons
                name={marcado ? "checkbox" : "square-outline"}
                size={22}
                color={marcado ? colors.primary : colors.textLight}
              />
              <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
              {!!item.detalhe && <Text style={styles.detalhe}>{item.detalhe}</Text>}
            </Pressable>
          );
        }}
      />

      <Button title="Confirmar" onPress={() => onConfirmar(marcados)} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { height: "70%" },
  titulo: { fontSize: 18, fontWeight: "700", color: colors.primary, marginBottom: spacing.md },
  lista: { flex: 1, marginBottom: spacing.md },
  linha: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  label: { ...typography.body, color: colors.text, flex: 1 },
  detalhe: { ...typography.small, color: colors.textMuted, fontWeight: "600" },
  vazio: { ...typography.body, color: colors.textLight, textAlign: "center", marginTop: spacing.xl },
});