
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { colors, spacing } from "@/constants/theme";
import { getErrorMessage } from "@/services/api";
import {
    atualizarCustoExtra,
    atualizarCustoFixo,
    criarCustoExtra,
    criarCustoFixo,
    listarCustosExtras,
    listarCustosFixos,
} from "@/services/custoService";

function formatarDataDigitada(texto: string) {
  var numeros = texto.replace(/\D/g, "").slice(0, 8);

  if (numeros.length > 4) {
    return (
      numeros.slice(0, 2) +
      "-" +
      numeros.slice(2, 4) +
      "-" +
      numeros.slice(4)
    );
  }

  if (numeros.length > 2) {
    return numeros.slice(0, 2) + "-" + numeros.slice(2);
  }

  return numeros;
}

function dataParaExibicao(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;

  var partes = data.split("-");
  return partes[2] + "-" + partes[1] + "-" + partes[0];
}

function dataParaApi(data: string) {
  var partes = data.split("-");

  if (partes.length !== 3) return "";

  return partes[2] + "-" + partes[1] + "-" + partes[0];
}

export default function FormularioCusto() {
  const params = useLocalSearchParams<{
    tipo?: string;
    id?: string;
  }>();

  const tipo = params.tipo === "extra" ? "extra" : "fixo";
  const id = params.id;
  const editando = !!id;

  const { showToast } = useToast();

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [carregando, setCarregando] = useState(!!id);
  const [salvando, setSalvando] = useState(false);

  function limparFormulario() {
    setNome("");
    setDescricao("");
    setValor("");
    setData("");
  }

  function cancelar() {
    if (salvando) return;

    limparFormulario();
    router.back();
  }

  useEffect(() => {
    if (!id) {
      limparFormulario();
      setCarregando(false);
      return;
    }

    async function carregarCusto() {
      setCarregando(true);

      try {
        if (tipo === "fixo") {
          const custos = await listarCustosFixos();
          const custo = custos.find(
            (item) => item.idCustoFixo === id
          );

          if (!custo) {
            showToast("Custo fixo não encontrado.", "error");
            router.back();
            return;
          }

          setNome(custo.nome);
          setDescricao(custo.descricao || "");
          setValor(String(custo.valorMensal));
          setData("");
        } else {
          const custos = await listarCustosExtras();
          const custo = custos.find(
            (item) => item.idCustoExtra === id
          );

          if (!custo) {
            showToast("Custo extra não encontrado.", "error");
            router.back();
            return;
          }

          setNome(custo.nome);
          setDescricao(custo.descricao || "");
          setValor(String(custo.valor));
          setData(dataParaExibicao(custo.data));
        }
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      } finally {
        setCarregando(false);
      }
    }

    carregarCusto();
  }, [id, tipo]);

  async function salvar() {
    if (salvando) return;

    if (!nome.trim()) {
      showToast("Informe o nome do custo.", "error");
      return;
    }

    if (!valor.trim()) {
      showToast("Informe o valor do custo.", "error");
      return;
    }

    const valorNumerico = Number(valor.trim().replace(",", "."));

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      showToast("Informe um valor maior que zero.", "error");
      return;
    }

    var dataISO = "";

    if (tipo === "extra") {
      if (!/^\d{2}-\d{2}-\d{4}$/.test(data)) {
        showToast("Informe a data no formato DD-MM-AAAA.", "error");
        return;
      }

      dataISO = dataParaApi(data);
      var partes = dataISO.split("-");

      var ano = Number(partes[0]);
      var mes = Number(partes[1]);
      var dia = Number(partes[2]);
      var dataValida = new Date(ano, mes - 1, dia);

      if (
        dataValida.getFullYear() !== ano ||
        dataValida.getMonth() !== mes - 1 ||
        dataValida.getDate() !== dia
      ) {
        showToast("Informe uma data válida.", "error");
        return;
      }
    }

    setSalvando(true);

    try {
      if (tipo === "fixo") {
        const input = {
          nome: nome.trim(),
          descricao: descricao.trim(),
          valorMensal: valorNumerico,
        };

        if (id) {
          await atualizarCustoFixo(id, input);
          showToast("Custo fixo atualizado com sucesso.");
        } else {
          await criarCustoFixo(input);
          showToast("Custo fixo cadastrado com sucesso.");
        }
      } else {
        const input = {
          nome: nome.trim(),
          descricao: descricao.trim(),
          valor: valorNumerico,
          data: dataISO,
        };

        if (id) {
          await atualizarCustoExtra(id, input);
          showToast("Custo extra atualizado com sucesso.");
        } else {
          await criarCustoExtra(input);
          showToast("Custo extra cadastrado com sucesso.");
        }
      }

      limparFormulario();
      router.replace("/custos");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`${editando ? "Editar" : "Novo"} custo ${
          tipo === "fixo" ? "fixo" : "extra"
        }`}
        onBack={cancelar}
      />

      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: Aluguel"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Descreva o custo"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />

        <Text style={styles.label}>
          {tipo === "fixo" ? "Valor mensal (R$) *" : "Valor (R$) *"}
        </Text>
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={setValor}
          placeholder="0,00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />

        {tipo === "extra" && (
          <>
            <Text style={styles.label}>Data *</Text>
            <TextInput
              style={styles.input}
              value={data}
              onChangeText={(texto) =>
                setData(formatarDataDigitada(texto))
              }
              placeholder="DD-MM-AAAA"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={10}
            />
            <Text style={styles.ajuda}>
              Digite dia, mês e ano. Os hífens são preenchidos automaticamente.
            </Text>
          </>
        )}

        <Pressable
          style={[styles.botao, salvando && styles.botaoDesabilitado]}
          onPress={salvar}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.textoBotao}>
              {editando ? "Salvar alterações" : "Cadastrar custo"}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.botaoCancelar}
          onPress={cancelar}
          disabled={salvando}
        >
          <Text style={styles.textoCancelar}>Cancelar</Text>
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
  label: {
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
  },
  ajuda: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  botao: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  textoBotao: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  botaoCancelar: {
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  textoCancelar: {
    color: colors.textMuted,
    fontWeight: "600",
  },
});
