import { ReactNode, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { FilterChips } from "@/components/FilterChips";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchInput } from "@/components/SearchInput";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { normalizeText } from "@/utils/format";

type FiltroStatus = "todos" | "ativos" | "inativos";

const OPCOES_FILTRO: { value: FiltroStatus; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
];

type ItemBase = { id: string; nome: string; ativo: boolean };

type ListagemCadastroProps<T extends ItemBase> = {
  titulo: string;
  placeholderBusca: string;
  rotuloPlural: string; // usado em "Mostrando X de Y {rotuloPlural} cadastrados"
  itens: T[];
  carregando: boolean;
  erro: string | null;
  onRecarregar: () => void;
  onAdicionar: () => void;
  renderCard: (item: T) => ReactNode;
  colunas?: 1 | 2;                    // padrão 2 (grade); clientes usam lista de 1 coluna
  textoBusca?: (item: T) => string;   // padrão: busca só pelo nome
};

export function ListagemCadastro<T extends ItemBase>({
  titulo, placeholderBusca, rotuloPlural, itens, carregando, erro, onRecarregar, onAdicionar, renderCard,
  colunas = 2, textoBusca = (item) => item.nome,
}: ListagemCadastroProps<T>) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("ativos");

  const primeiraCarga = carregando && itens.length === 0;

  const filtrados = useMemo(() => {
    const termo = normalizeText(busca.trim());
    return itens.filter((i) => {
      if (filtro === "ativos" && !i.ativo) return false;
      if (filtro === "inativos" && i.ativo) return false;
      return !termo || normalizeText(textoBusca(i)).includes(termo);
    });
  }, [itens, busca, filtro, textoBusca]);

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title={titulo}
        onBack={() => router.back()}
        right={
          <Pressable style={styles.addButton} onPress={onAdicionar}>
            <Ionicons name="add" size={24} color={colors.white} />
          </Pressable>
        }
      />

      <SearchInput
        containerStyle={styles.search}
        placeholder={placeholderBusca}
        value={busca}
        onChangeText={setBusca}
      />

      <View style={styles.filtros}>
        <FilterChips options={OPCOES_FILTRO} value={filtro} onChange={setFiltro} />
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id}
        key={colunas} // numColumns não pode mudar sem remontar a lista
        numColumns={colunas}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={carregando && !primeiraCarga}
        onRefresh={onRecarregar}
        renderItem={({ item }) => <View style={colunas === 1 ? styles.cellFull : styles.cell}>{renderCard(item)}</View>}
        ListEmptyComponent={
          primeiraCarga ? (
            <ActivityIndicator style={styles.estado} color={colors.primary} />
          ) : erro ? (
            <View style={styles.estado}>
              <Text style={styles.vazio}>{erro}</Text>
              <Button title="Tentar novamente" variant="secondary" onPress={onRecarregar} />
            </View>
          ) : (
            <Text style={styles.vazio}>Nenhum resultado encontrado</Text>
          )
        }
        ListFooterComponent={
          filtrados.length > 0 ? (
            <Text style={styles.contagem}>
              Mostrando {filtrados.length} de {itens.length} {rotuloPlural} cadastrados
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  search: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  filtros: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  lista: { paddingHorizontal: spacing.lg - 6, paddingBottom: spacing.lg },
  cell: { width: "50%", padding: 6 },
  cellFull: { width: "100%", padding: 6 },
  estado: { marginTop: spacing.xxl, gap: spacing.md, paddingHorizontal: spacing.lg },
  vazio: { ...typography.body, color: colors.textLight, textAlign: "center", marginTop: spacing.xxl },
  contagem: { ...typography.small, color: colors.textLight, textAlign: "center", marginTop: spacing.lg },
});