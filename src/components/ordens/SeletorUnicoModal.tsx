import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { SearchInput } from "@/components/SearchInput";
import { colors, spacing, typography } from "@/constants/theme";

export type OpcaoUnica = { id: number; label: string; detalhe?: string };

type Props = {
  visible: boolean;
  titulo: string;
  vazio: string;
  opcoes: OpcaoUnica[];
  selecionado: number;
  onSelecionar: (id: number) => void;
  onFechar: () => void;
};

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// lista de escolha única (cliente, responsável) com busca, no mesmo formato do seletor de itens dos combos
export function SeletorUnicoModal({ visible, titulo, vazio, opcoes, selecionado, onSelecionar, onFechar }: Props) {
  const [busca, setBusca] = useState("");
  useEffect(() => { if (visible) setBusca(""); }, [visible]);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    return termo ? opcoes.filter((o) => normalizar(`${o.label} ${o.detalhe ?? ""}`).includes(termo)) : opcoes;
  }, [busca, opcoes]);

  return (
    <BottomSheet visible={visible} onClose={onFechar} style={styles.sheet}>
      <Text style={styles.titulo}>{titulo}</Text>
      {opcoes.length > 6 && (
        <SearchInput placeholder="Buscar..." value={busca} onChangeText={setBusca} containerStyle={styles.busca} />
      )}
      <FlatList
        data={filtradas}
        keyExtractor={(opcao) => String(opcao.id)}
        style={styles.lista}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.vazio}>{busca.trim() ? "Nenhum resultado para a busca." : vazio}</Text>}
        renderItem={({ item }) => {
          const marcado = item.id === selecionado;
          return (
            <Pressable
              style={styles.linha}
              accessibilityRole="radio"
              accessibilityState={{ checked: marcado }}
              onPress={() => onSelecionar(item.id)}
            >
              <Ionicons
                name={marcado ? "radio-button-on" : "radio-button-off"}
                size={22}
                color={marcado ? colors.primary : colors.textLight}
              />
              <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
              {!!item.detalhe && <Text style={styles.detalhe} numberOfLines={1}>{item.detalhe}</Text>}
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { height: "70%" },
  titulo: { fontSize: 18, fontWeight: "700", color: colors.primary, marginBottom: spacing.md },
  busca: { marginBottom: spacing.sm },
  lista: { flex: 1 },
  linha: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  label: { ...typography.body, color: colors.text, flex: 1 },
  detalhe: { ...typography.small, color: colors.textMuted, maxWidth: "45%" },
  vazio: { ...typography.body, color: colors.textLight, textAlign: "center", marginTop: spacing.xl },
});
