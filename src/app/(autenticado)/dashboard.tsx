import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ScreenHeader } from "@/components/ScreenHeader";
import { FilterChips } from "@/components/FilterChips";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { listarOrdensServico, OrdemServico } from "@/services/ordemServicoService";
import { listar as listarServicos } from "@/services/servicoService";
import { Servico } from "@/types/servico";
import { useClientes } from "@/context/ClientesContext";
import { getErrorMessage } from "@/services/api";

type Periodo = "hoje" | "semana" | "mes" | "ano";
type PontoGrafico = { label: string; valor: number };

const opcoesPeriodo = [
  { value: "hoje" as Periodo, label: "Hoje" },
  { value: "semana" as Periodo, label: "Semana" },
  { value: "mes" as Periodo, label: "Mês" },
  { value: "ano" as Periodo, label: "Ano" },
];

function dataLocal(data: string) {
  var partes = data.split("-").map(Number);
  return new Date(partes[0], partes[1] - 1, partes[2]);
}

function inicioDaSemana(data: Date) {
  var inicio = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  inicio.setDate(inicio.getDate() - inicio.getDay());
  return inicio;
}

function mesmaData(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dentroDoPeriodo(dataTexto: string, periodo: Periodo, hoje: Date) {
  if (!dataTexto) return false;
  var data = dataLocal(dataTexto);
  if (periodo === "hoje") return mesmaData(data, hoje);
  if (periodo === "semana") return data >= inicioDaSemana(hoje) && data <= hoje;
  if (periodo === "mes") return data.getFullYear() === hoje.getFullYear() && data.getMonth() === hoje.getMonth() && data <= hoje;
  return data.getFullYear() === hoje.getFullYear() && data <= hoje;
}

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function montarGrafico(ordens: OrdemServico[], periodo: Periodo, hoje: Date): PontoGrafico[] {
  var pontos: PontoGrafico[] = [];
  var inicioSemana = inicioDaSemana(hoje);

  if (periodo === "hoje") {
    pontos.push({ label: "Hoje", valor: ordens.filter((o) => mesmaData(dataLocal(o.dataCriacao), hoje)).reduce((s, o) => s + o.valorFinal, 0) });
  } else if (periodo === "semana") {
    var dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (var i = 0; i < 7; i++) {
      var dia = new Date(inicioSemana);
      dia.setDate(inicioSemana.getDate() + i);
      pontos.push({ label: dias[dia.getDay()], valor: ordens.filter((o) => mesmaData(dataLocal(o.dataCriacao), dia)).reduce((s, o) => s + o.valorFinal, 0) });
    }
  } else if (periodo === "mes") {
    var semanasNoMes = Math.ceil(hoje.getDate() / 7);
    for (var j = 0; j < semanasNoMes; j++) {
      var numeroSemana = j + 1;
      pontos.push({ label: "Sem " + numeroSemana, valor: ordens.filter((o) => {
        var d = dataLocal(o.dataCriacao);
        return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth() && Math.ceil(d.getDate() / 7) === numeroSemana;
      }).reduce((s, o) => s + o.valorFinal, 0) });
    }
  } else {
    var meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (var k = 0; k <= hoje.getMonth(); k++) {
      pontos.push({ label: meses[k], valor: ordens.filter((o) => {
        var d = dataLocal(o.dataCriacao);
        return d.getFullYear() === hoje.getFullYear() && d.getMonth() === k;
      }).reduce((s, o) => s + o.valorFinal, 0) });
    }
  }
  return pontos;
}

export default function Dashboard() {
  var [periodo, setPeriodo] = useState<Periodo>("mes");
  var [ordens, setOrdens] = useState<OrdemServico[]>([]);
  var [servicos, setServicos] = useState<Servico[]>([]);
  var [carregando, setCarregando] = useState(true);
  var [erro, setErro] = useState("");
  var { clientes } = useClientes();

  async function carregarDados() {
    setCarregando(true);
    setErro("");
    try {
      var resultados = await Promise.all([listarOrdensServico(), listarServicos()]);
      setOrdens(resultados[0]);
      setServicos(resultados[1]);
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setCarregando(false);
    }
  }

  useFocusEffect(useCallback(() => {
    carregarDados();
  }, []));

  var hoje = useMemo(() => new Date(), [carregando]);
  var ordensFiltradas = useMemo(() => ordens.filter((o) => dentroDoPeriodo(o.dataCriacao, periodo, hoje)), [ordens, periodo, hoje]);
  var valorPeriodo = ordensFiltradas.reduce((s, o) => s + (Number(o.valorFinal) || 0), 0);
  var ticketMedio = ordensFiltradas.length ? valorPeriodo / ordensFiltradas.length : 0;
  var grafico = useMemo(() => montarGrafico(ordens, periodo, hoje), [ordens, periodo, hoje]);
  var maiorBarra = Math.max(1, ...grafico.map((p) => p.valor));


  var ranking = useMemo(() => {
    var mapa = new Map<string, {
      nome: string;
      valor: number;
      quantidade: number;
    }>();

    ordensFiltradas.forEach((ordem) => {
      var nome = (ordem.observacao || "").trim();

      if (!nome) return;

      var chave = nome.toLocaleLowerCase("pt-BR");
      var valor = Number(ordem.valorFinal) || 0;

      if (valor <= 0) return;

      var atual = mapa.get(chave);

      if (atual) {
        atual.valor += valor;
        atual.quantidade += 1;
      } else {
        mapa.set(chave, {
          nome: nome,
          valor: valor,
          quantidade: 1,
        });
      }
    });

    return Array.from(mapa.values())
      .filter((item) => item.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  }, [ordensFiltradas]);



  return (
    <View style={styles.container}>
      <ScreenHeader title="Dashboard" onBack={() => router.back()} right={
        <Pressable onPress={carregarDados} style={styles.atualizar} accessibilityLabel="Atualizar dashboard">
          <Ionicons name="refresh-outline" size={21} color={colors.primary} />
        </Pressable>
      } />
      <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        <Text style={styles.introducao}>Acompanhe os indicadores da clínica</Text>
        <FilterChips options={opcoesPeriodo} value={periodo} onChange={setPeriodo} />

        {carregando ? (
          <View style={styles.estado}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.textoEstado}>Carregando dados...</Text></View>
        ) : erro ? (
          <View style={styles.estado}>
            <Ionicons name="cloud-offline-outline" size={34} color={colors.danger} />
            <Text style={styles.textoEstado}>{erro}</Text>
            <Pressable style={styles.botaoTentar} onPress={carregarDados}><Text style={styles.textoBotao}>Tentar novamente</Text></Pressable>
          </View>
        ) : (
          <>
            <View style={styles.gradeIndicadores}>
              <Indicador titulo="Valor das ordens" valor={dinheiro(valorPeriodo)} icone="cash-outline" cor={colors.primary} legenda="No período selecionado" />
              <Indicador titulo="Ordens" valor={String(ordensFiltradas.length)} icone="document-text-outline" cor={colors.gold} legenda="Criadas no período" />
              <Indicador titulo="Clientes cadastrados" valor={String(clientes.length)} icone="people-outline" cor="#558B7D" legenda="Total no cadastro" />
              <Indicador titulo="Ticket médio" valor={dinheiro(ticketMedio)} icone="stats-chart-outline" cor="#7C78B8" legenda="Valor médio por ordem" />
            </View>

            <View style={styles.cardSecao}>
              <View style={styles.tituloSecaoLinha}>
                <View><Text style={styles.tituloSecao}>Valor das ordens</Text><Text style={styles.subtituloSecao}>Distribuição por {periodo === "hoje" ? "dia" : periodo === "semana" ? "dia da semana" : periodo === "mes" ? "semana do mês" : "mês"}</Text></View>
                <Ionicons name="bar-chart-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.grafico}>
                {grafico.map((ponto, index) => (
                  <View key={ponto.label + index} style={styles.colunaGrafico}>
                    <Text style={styles.valorBarra} numberOfLines={1}>{ponto.valor > 0 ? formatarCompacto(ponto.valor) : ""}</Text>
                    <View style={styles.areaBarra}>
                      <View style={[styles.barra, { height: Math.max(ponto.valor > 0 ? 5 : 2, (ponto.valor / maiorBarra) * 115), opacity: ponto.valor > 0 ? 1 : 0.2 }]} />
                    </View>
                    <Text style={styles.rotuloBarra}>{ponto.label}</Text>
                  </View>
                ))}
              </View>
              {ordensFiltradas.length === 0 && <Text style={styles.avisoSemDados}>Nenhuma ordem encontrada neste período.</Text>}
            </View>

            <View style={styles.cardSecao}>
              <View style={styles.tituloSecaoLinha}>
                <View><Text style={styles.tituloSecao}>Serviços em destaque</Text><Text style={styles.subtituloSecao}>Todos os serviços cadastrados, ordenados pelo valor</Text></View>
                <Ionicons name="trophy-outline" size={22} color={colors.gold} />
              </View>
              {ranking.length === 0 ? (
                <Text style={styles.avisoSemDados}>Nenhum serviço cadastrado.</Text>
              ) : ranking.map((item, index) => (
                <View key={item.nome + index} style={styles.linhaRanking}>
                  <View style={styles.posicao}><Text style={styles.posicaoTexto}>{index + 1}</Text></View>
                  <View style={styles.infoRanking}><Text style={styles.nomeServico} numberOfLines={1}>{item.nome}</Text><Text style={styles.qtdServico}>{item.quantidade} {item.quantidade === 1 ? "unidade" : "unidades"} no período</Text></View>
                  <Text style={styles.valorRanking}>{dinheiro(item.valor)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.nota}><Ionicons name="information-circle-outline" size={18} color={colors.textMuted} /><Text style={styles.notaTexto}>A API não informa o status de conclusão das ordens. Por isso, os valores acima consideram todas as ordens criadas no período, e não apenas as concluídas. O ranking usa os preços atuais dos serviços.</Text></View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function formatarCompacto(valor: number) {
  if (valor >= 1000) return "R$" + (valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil";
  return "R$" + Math.round(valor).toLocaleString("pt-BR");
}

function Indicador({ titulo, valor, icone, cor, legenda }: { titulo: string; valor: string; icone: keyof typeof Ionicons.glyphMap; cor: string; legenda: string }) {
  return (
    <View style={styles.indicador}>
      <View style={[styles.iconeIndicador, { backgroundColor: cor + "18" }]}><Ionicons name={icone} size={21} color={cor} /></View>
      <Text style={styles.tituloIndicador}>{titulo}</Text>
      <Text style={styles.valorIndicador} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
      <Text style={styles.legendaIndicador}>{legenda}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conteudo: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  introducao: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.xs },
  atualizar: { width: 38, height: 38, borderRadius: radius.circle, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryLight },
  gradeIndicadores: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.md, marginTop: spacing.xs },
  indicador: { width: "48%", minHeight: 142, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.md, gap: 5 },
  iconeIndicador: { width: 38, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  tituloIndicador: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  valorIndicador: { fontSize: 19, fontWeight: "700", color: colors.text },
  legendaIndicador: { fontSize: 11, color: colors.textLight },
  cardSecao: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg, marginTop: spacing.xs },
  tituloSecaoLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  tituloSecao: { fontSize: 16, fontWeight: "700", color: colors.text },
  subtituloSecao: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  grafico: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", gap: 5, minHeight: 155 },
  colunaGrafico: { flex: 1, alignItems: "center", minWidth: 0 },
  valorBarra: { fontSize: 9, color: colors.textMuted, marginBottom: 4, height: 13 },
  areaBarra: { width: "100%", height: 115, justifyContent: "flex-end", alignItems: "center" },
  barra: { width: "68%", maxWidth: 26, minHeight: 2, backgroundColor: colors.primary, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  rotuloBarra: { fontSize: 10, color: colors.textMuted, marginTop: 7 },
  avisoSemDados: { fontSize: 13, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.md, lineHeight: 19 },
  linhaRanking: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: spacing.sm },
  posicao: { width: 30, height: 30, borderRadius: radius.circle, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  posicaoTexto: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  infoRanking: { flex: 1, gap: 3 },
  nomeServico: { color: colors.text, fontSize: 13, fontWeight: "600" },
  qtdServico: { color: colors.textMuted, fontSize: 11 },
  valorRanking: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  nota: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingHorizontal: spacing.xs, paddingTop: spacing.xs },
  notaTexto: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  estado: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  textoEstado: { textAlign: "center", color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  botaoTentar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.primary, borderRadius: radius.pill },
  textoBotao: { color: colors.white, fontWeight: "700" },
});
