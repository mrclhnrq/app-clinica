
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { colors, spacing } from "@/constants/theme";
import { getErrorMessage } from "@/services/api";
import {
    excluirCustoExtra,
    excluirCustoFixo,
    listarCustosExtras,
    listarCustosFixos,
} from "@/services/custoService";
import { CustoExtra, CustoFixo } from "@/types/custo";

export default function DetalheCusto() {
  const params = useLocalSearchParams<{
    tipo?: string;
    id?: string;
  }>();

  const tipo = params.tipo === "extra" ? "extra" : "fixo";
  const id = params.id;

  const { showToast } = useToast();

  const [custoFixo, setCustoFixo] = useState<CustoFixo | null>(null);
  const [custoExtra, setCustoExtra] = useState<CustoExtra | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    async function carregarDetalhe() {
      if (!id) {
        showToast("Identificador do custo não informado.", "error");
        router.back();
        return;
      }

      try {
        if (tipo === "fixo") {
          const lista = await listarCustosFixos();
          const encontrado = lista.find(
            (item) => item.idCustoFixo === id
          );

          if (!encontrado) {
            showToast("Custo fixo não encontrado.", "error");
            router.back();
            return;
          }

          setCustoFixo(encontrado);
        } else {
          const lista = await listarCustosExtras();
          const encontrado = lista.find(
            (item) => item.idCustoExtra === id
          );

          if (!encontrado) {
            showToast("Custo extra não encontrado.", "error");
            router.back();
            return;
          }

          setCustoExtra(encontrado);
        }
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      } finally {
        setCarregando(false);
      }
    }

    carregarDetalhe();
  }, [id, tipo]);

  const custo = tipo === "fixo" ? custoFixo : custoExtra;

  function formatarValor(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function editar() {
    if (!id) return;

    router.push({
      pathname: "/custos/formulario",
      params: {
        tipo,
        id,
      },
    });
  }

  function confirmarExclusao() {
    Alert.alert(
      "Excluir custo",
      "Tem certeza de que deseja excluir este custo? Essa ação não pode ser desfeita.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: excluir,
        },
      ]
    );
  }

  async function excluir() {
    if (!id || excluindo) return;

    setExcluindo(true);

    try {
      if (tipo === "fixo") {
        await excluirCustoFixo(id);
      } else {
        await excluirCustoExtra(id);
      }

      showToast("Custo excluído com sucesso.");
      router.replace("/custos");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!custo) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Detalhes do custo"
          onBack={() => router.back()}
        />
        <Text style={styles.mensagem}>
          Não foi possível carregar os dados deste custo.
        </Text>
      </View>
    );
  }

  const valor =
    tipo === "fixo"
      ? (custo as CustoFixo).valorMensal
      : (custo as CustoExtra).valor;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Detalhes do custo"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.card}>
          <View style={styles.icone}>
            <Ionicons
              name="cash-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <Text style={styles.tipo}>
            {tipo === "fixo" ? "CUSTO FIXO" : "CUSTO EXTRA"}
          </Text>

          <Text style={styles.nome}>{custo.nome}</Text>

          <Text style={styles.valor}>{formatarValor(valor)}</Text>

          {tipo === "fixo" && (
            <Text style={styles.periodo}>por mês</Text>
          )}

          <View style={styles.divisor} />

          <Text style={styles.label}>Descrição</Text>
          <Text style={styles.descricao}>
            {custo.descricao || "Nenhuma descrição informada."}
          </Text>

          {tipo === "extra" && (
            <>
              <Text style={styles.label}>Data</Text>
              <Text style={styles.descricao}>
                {(custo as CustoExtra).data}
              </Text>
            </>
          )}
        </View>

        <Pressable style={styles.botaoEditar} onPress={editar}>
          <Ionicons name="create-outline" size={20} color={colors.white} />
          <Text style={styles.textoBotaoEditar}>Editar custo</Text>
        </Pressable>

        <Pressable
          style={[
            styles.botaoExcluir,
            excluindo && styles.botaoDesabilitado,
          ]}
          onPress={confirmarExclusao}
          disabled={excluindo}
        >
          {excluindo ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <>
              <Ionicons
                name="trash-outline"
                size={20}
                color={colors.danger}
              />
              <Text style={styles.textoBotaoExcluir}>Excluir custo</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centralizado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  conteudo: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  icone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  tipo: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 1,
  },
  nome: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: spacing.sm,
  },
  valor: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginTop: spacing.md,
  },
  periodo: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 2,
  },
  divisor: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.lg,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  descricao: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  botaoEditar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    marginTop: spacing.lg,
  },
  textoBotaoEditar: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  botaoExcluir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    borderRadius: 10,
    marginTop: spacing.md,
  },
  textoBotaoExcluir: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 16,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  mensagem: {
    color: colors.textMuted,
    textAlign: "center",
    margin: spacing.lg,
  },
});
