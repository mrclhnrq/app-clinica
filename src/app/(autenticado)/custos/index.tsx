
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { colors, spacing } from "@/constants/theme";
import { listarCustosExtras, listarCustosFixos } from "@/services/custoService";
import { CustoExtra, CustoFixo } from "@/types/custo";

export default function Custos() {
    var [aba, setAba] = useState("fixos");
    var [fixos, setFixos] = useState<CustoFixo[]>([]);
    var [extras, setExtras] = useState<CustoExtra[]>([]);
    var [carregando, setCarregando] = useState(true);
    var [erro, setErro] = useState("");

    var { showToast } = useToast();

    async function carregarCustos() {
        setCarregando(true);
        setErro("");

        try {
            var resultadoFixos = await listarCustosFixos();
            var resultadoExtras = await listarCustosExtras();

            setFixos(resultadoFixos);
            setExtras(resultadoExtras);
        } catch (error) {
            setErro("Não foi possível carregar os custos.");
            showToast("Não foi possível carregar os custos.", "error");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarCustos();
    }, []);

    var lista = aba === "fixos" ? fixos : extras;

    function formatarValor(valor: number) {
        return valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="Fluxo de Custos" />

            <View style={styles.abas}>
                <Text
                    onPress={() => setAba("fixos")}
                    style={[styles.aba, aba === "fixos" && styles.abaAtiva]}
                >
                    Custos Fixos
                </Text>

                <Text
                    onPress={() => setAba("extras")}
                    style={[styles.aba, aba === "extras" && styles.abaAtiva]}
                >
                    Custos Extras
                </Text>
            </View>

            {carregando ? (
                <ActivityIndicator size="large" color={colors.primary} />
            ) : erro ? (
                <Text style={styles.mensagem}>{erro}</Text>
            ) : (
                <FlatList
                    data={lista}
                    keyExtractor={(item) =>
                        aba === "fixos"
                            ? (item as CustoFixo).idCustoFixo
                            : (item as CustoExtra).idCustoExtra
                    }
                    contentContainerStyle={styles.lista}
                    ListEmptyComponent={
                        <Text style={styles.mensagem}>
                            Nenhum custo cadastrado nesta categoria.
                        </Text>
                    }
                    renderItem={({ item }) => {
                        var nome = item.nome;
                        var descricao = item.descricao;
                        var valor =
                            aba === "fixos"
                                ? (item as CustoFixo).valorMensal
                                : (item as CustoExtra).valor;

                        return (
                            <Pressable
                                style={styles.card}
                                onPress={() =>
                                    router.push({
                                        pathname: "/custos/detalhe",
                                        params: {
                                            tipo: aba === "fixos" ? "fixo" : "extra",
                                            id:
                                                aba === "fixos"
                                                    ? (item as CustoFixo).idCustoFixo
                                                    : (item as CustoExtra).idCustoExtra,
                                        },
                                    })
                                }
                            >
                                {<View style={styles.info}>
                                    <Text style={styles.nome}>{nome}</Text>

                                    <Text style={styles.descricao}>
                                        {descricao || "Sem descrição"}
                                    </Text>

                                    {aba === "extras" && (
                                        <Text style={styles.data}>
                                            {(item as CustoExtra).data}
                                        </Text>
                                    )}

                                    <Text style={styles.valor}>
                                        {formatarValor(valor)}
                                    </Text>
                                </View>}
                            </Pressable>
                        );
                    }}
                />
            )}

            <View style={styles.botaoContainer}>
                <Text
                    style={styles.botao}
                    onPress={() =>
                        router.push({
                            pathname: "/custos/formulario",
                            params: { tipo: aba === "fixos" ? "fixo" : "extra" },
                        })
                    }
                >
                    + Adicionar {aba === "fixos" ? "custo fixo" : "custo extra"}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.md,
    },
    abas: {
        flexDirection: "row",
        marginVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    aba: {
        flex: 1,
        textAlign: "center",
        paddingVertical: spacing.md,
        color: colors.textMuted,
        fontWeight: "600",
    },
    abaAtiva: {
        color: colors.primary,
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
    },
    lista: {
        gap: spacing.md,
        paddingBottom: spacing.xl,
    },
    card: {
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    info: {
        gap: 5,
    },
    nome: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
    },
    descricao: {
        fontSize: 14,
        color: colors.textMuted,
    },
    data: {
        fontSize: 13,
        color: colors.textMuted,
    },
    valor: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.primary,
        marginTop: 4,
    },
    mensagem: {
        textAlign: "center",
        color: colors.textMuted,
        marginTop: spacing.xl,
    },
    botaoContainer: {
        paddingTop: spacing.md,
    },
    botao: {
        backgroundColor: colors.primary,
        color: colors.white,
        textAlign: "center",
        padding: spacing.md,
        borderRadius: 10,
        overflow: "hidden",
        fontWeight: "700",
    },
});
