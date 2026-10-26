import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { LabeledInput } from "@/components/LabeledInput";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { confirmarComConsulta, criarTrava, descartarComConsulta } from "@/services/confirmacaoNota";
import { ErroNotaFiscal, listarProdutos } from "@/services/notaFiscalService";
import { exigeCienciaExplicita, LIMITE_NOME_NOVO_PRODUTO, prepararRevisao, type Escolha } from "@/services/revisaoNota";
import type { ConfirmarRequest, Item, NotaResposta, ProdutoCatalogo, ResumoConfirmacao } from "@/types/notaFiscal";

type Rascunho = { acao: "" | Escolha["acao"]; produtoId: number | null; nomeNovo: string; quantidade: string; valorUnitario: string };
const vazio: Rascunho = { acao: "", produtoId: null, nomeNovo: "", quantidade: "", valorUnitario: "" };

export function erroCorrigivelDeRevisao(erro: unknown): boolean {
  return erro instanceof ErroNotaFiscal && (erro.status === 422 || erro.tipo === "ENTRADA");
}

function escolhaDo(rascunho: Rascunho): Escolha | null {
  if (rascunho.acao === "REJEITAR") return { acao: "REJEITAR" };
  if (rascunho.acao === "CRIAR_NOVO") return { acao: "CRIAR_NOVO", nomeNovo: rascunho.nomeNovo, quantidade: rascunho.quantidade, valorUnitario: rascunho.valorUnitario };
  if (rascunho.acao === "ASSOCIAR" && rascunho.produtoId !== null) {
    return { acao: "ASSOCIAR", produtoId: rascunho.produtoId, quantidade: rascunho.quantidade, valorUnitario: rascunho.valorUnitario };
  }
  return null;
}

function AcaoItem({ titulo, escolhida, onPress, disabled }: { titulo: string; escolhida: boolean; onPress: () => void; disabled: boolean }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: escolhida, disabled }}
    onPress={onPress} disabled={disabled} style={[styles.acao, escolhida && styles.acaoEscolhida]}>
    <Text style={styles.acaoTexto}>{titulo}</Text>
  </Pressable>;
}

function ItemRevisao({ item, produtos, rascunho, alterar, ocupado }: {
  item: Item; produtos: ProdutoCatalogo[]; rascunho: Rascunho; alterar: (proximo: Rascunho) => void; ocupado: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Item #{item.itemId}: {item.textoOriginal}</Text>
      <Text style={styles.text}>Estado: {item.status} · Confiança: {item.confianca ?? "não informada"}</Text>
      {item.motivoRejeicao && <Text style={styles.warning}>Motivo: {item.motivoRejeicao.codigo} — {item.motivoRejeicao.texto}</Text>}
      <Text style={styles.text}>Extraído: {item.quantidade ?? "—"} un · custo {item.valorUnitario ?? "—"} · total {item.valorTotal ?? "—"}</Text>
      <Text style={styles.text}>Sugestão (não selecionada): {item.produtoSugerido?.nome ?? "nenhuma"}</Text>
      <View style={styles.row}>
        <AcaoItem titulo={`Associar item ${item.itemId}`} escolhida={rascunho.acao === "ASSOCIAR"} disabled={ocupado} onPress={() => alterar({ ...rascunho, acao: "ASSOCIAR", produtoId: null })} />
        <AcaoItem titulo={`Criar novo para item ${item.itemId}`} escolhida={rascunho.acao === "CRIAR_NOVO"} disabled={ocupado} onPress={() => alterar({ ...rascunho, acao: "CRIAR_NOVO", produtoId: null })} />
        <AcaoItem titulo={`Rejeitar item ${item.itemId}`} escolhida={rascunho.acao === "REJEITAR"} disabled={ocupado} onPress={() => alterar({ ...vazio, acao: "REJEITAR" })} />
      </View>
      <Text style={styles.text}>Ação escolhida: {rascunho.acao || "nenhuma"}</Text>
      {rascunho.acao === "ASSOCIAR" && (
        <View>
          <Text style={styles.text}>Selecione manualmente um produto ativo desta conta:</Text>
          {produtos.length === 0 && <Text style={styles.warning}>Nenhum produto disponível.</Text>}
          {produtos.map((produto) => (
            <Pressable key={produto.id} accessibilityRole="radio" accessibilityLabel={`${produto.nome}, produto ${produto.id}, item ${item.itemId}`}
              accessibilityState={{ checked: rascunho.produtoId === produto.id, disabled: ocupado }} disabled={ocupado}
              onPress={() => alterar({ ...rascunho, produtoId: produto.id })} style={styles.option}>
              <Text style={styles.text}>{rascunho.produtoId === produto.id ? "◉" : "○"} {produto.nome} (#{produto.id})</Text>
            </Pressable>
          ))}
        </View>
      )}
      {rascunho.acao === "CRIAR_NOVO" && <LabeledInput label="Nome do novo produto" accessibilityLabel={`Nome do novo produto, item ${item.itemId}`} editable={!ocupado} value={rascunho.nomeNovo} onChangeText={(nomeNovo) => alterar({ ...rascunho, nomeNovo })} maxLength={LIMITE_NOME_NOVO_PRODUTO} />}
      {(rascunho.acao === "ASSOCIAR" || rascunho.acao === "CRIAR_NOVO") && (
        <View>
          <LabeledInput label="Quantidade inteira (confirme ou corrija)" accessibilityLabel={`Quantidade inteira, item ${item.itemId}`} editable={!ocupado} keyboardType="number-pad" value={rascunho.quantidade} onChangeText={(quantidade) => alterar({ ...rascunho, quantidade })} />
          <LabeledInput label="Custo unitário (R$, ex.: 12,30)" accessibilityLabel={`Custo unitário em reais, item ${item.itemId}`} editable={!ocupado} keyboardType="decimal-pad" value={rascunho.valorUnitario} onChangeText={(valorUnitario) => alterar({ ...rascunho, valorUnitario })} />
        </View>
      )}
    </View>
  );
}

export function RevisaoNota({ nota, onConfirmada, onEstado, onConsultar }: {
  nota: NotaResposta; onConfirmada: (resumo: ResumoConfirmacao) => void; onEstado: (nota: NotaResposta) => void; onConsultar: () => void;
}) {
  const [produtos, setProdutos] = useState<ProdutoCatalogo[] | null>(null);
  const [erroCatalogo, setErroCatalogo] = useState<string | null>(null);
  const [rascunhos, setRascunhos] = useState<Record<number, Rascunho>>({});
  const [resultado, setResultado] = useState<string | null>(null);
  const [pedido, setPedido] = useState<ConfirmarRequest | null>(null);
  const [consentiu, setConsentiu] = useState(false);
  const [abrirDescarte, setAbrirDescarte] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [incerto, setIncerto] = useState(false);
  const trava = useRef(criarTrava());

  useEffect(() => {
    let ativo = true;
    listarProdutos().then((lista) => { if (ativo) { setProdutos(lista); setErroCatalogo(null); } })
      .catch(() => { if (ativo) { setProdutos(null); setErroCatalogo("Não foi possível carregar produtos desta conta. Tente novamente."); } });
    return () => { ativo = false; };
  }, [nota.notaId]);

  function conferir() {
    if (incerto) return;
    if (!produtos) { setResultado("Carregue o catálogo antes de conferir as decisões."); return; }
    const escolhas: Record<number, Escolha> = {};
    for (const item of nota.itens) {
      const escolha = escolhaDo(rascunhos[item.itemId] ?? vazio);
      if (escolha) escolhas[item.itemId] = escolha;
    }
    try {
      const pedido = prepararRevisao(nota.itens, escolhas, produtos);
      setPedido(pedido);
      setConsentiu(false);
      setResultado(null);
    } catch (erro) { setPedido(null); setResultado(erro instanceof Error ? erro.message : "Não foi possível conferir as decisões."); }
  }

  async function enviarConfirmacao() {
    if (!pedido || incerto || (exigeCienciaExplicita(pedido) && !consentiu)) return;
    await trava.current.executar(async () => {
    setOcupado(true);
    try {
      const resposta = await confirmarComConsulta(nota.notaId, pedido);
      setPedido(null);
      if (resposta.tipo === "confirmada") onConfirmada(resposta.resumo);
      else {
        onEstado(resposta.nota);
        setRascunhos({});
        setResultado(`O servidor informa ${resposta.nota.status}. Refaça cada decisão antes de uma nova confirmação; nada foi reenviado.`);
      }
    } catch (erro) {
      setPedido(null);
      if (erroCorrigivelDeRevisao(erro)) {
        setConsentiu(false);
        setResultado("Decisões recusadas pelo servidor. Corrija os itens e confira novamente antes de confirmar.");
      } else {
        setIncerto(true);
        setResultado("Não foi possível determinar se a nota foi confirmada. Consulte novamente o estado da nota antes de repetir a ação.");
      }
    } finally { setOcupado(false); }
    });
  }

  async function enviarDescarte() {
    await trava.current.executar(async () => {
    setOcupado(true);
    try {
      const resposta = await descartarComConsulta(nota.notaId);
      setAbrirDescarte(false);
      if (resposta.tipo === "descartada") onEstado({ ...nota, status: "DESCARTADA", codigoFalha: null, resumoConfirmacao: null });
      else if (resposta.tipo === "outroEstado") onEstado(resposta.nota);
      else setResultado("Nota não encontrada nesta conta. Nenhum descarte foi confirmado.");
    } catch {
      setAbrirDescarte(false);
      setIncerto(true);
      setResultado("Não foi possível determinar o descarte. Consulte novamente o estado da nota.");
    } finally { setOcupado(false); }
    });
  }

  const aprovados = pedido?.itens.filter((item) => item.acao !== "REJEITAR").length ?? 0;
  const rejeitados = pedido?.itens.filter((item) => item.acao === "REJEITAR").length ?? 0;
  const novos = pedido?.itens.filter((item) => item.acao === "CRIAR_NOVO").length ?? 0;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Revisão manual — nota #{nota.notaId}</Text>
      <Text style={styles.text}>Fornecedor: {nota.fornecedor?.razaoSocial ?? "não informado"} · CNPJ: {nota.fornecedor?.cnpj ?? "não informado"}</Text>
      <Text style={styles.text}>Emissão: {nota.dataEmissao ?? "não informada"} · Total: {nota.totalNota === null ? "não informado" : `R$ ${nota.totalNota.toFixed(2).replace(".", ",")}`}</Text>
      {nota.avisos.map((aviso, indice) => <Text key={indice} style={styles.warning}>Aviso: {aviso}</Text>)}
      {erroCatalogo && <Text style={styles.warning}>{erroCatalogo}</Text>}
      {!produtos && !erroCatalogo && <Text style={styles.text}>Carregando produtos da conta...</Text>}
      {erroCatalogo && <Button title="Tentar carregar novamente" variant="secondary" onPress={() => {
        setErroCatalogo(null);
        listarProdutos().then(setProdutos).catch(() => setErroCatalogo("Não foi possível carregar produtos desta conta. Tente novamente."));
      }} />}
      {nota.itens.map((item) => <ItemRevisao key={item.itemId} item={item} produtos={produtos ?? []} ocupado={ocupado}
        rascunho={rascunhos[item.itemId] ?? vazio} alterar={(proximo) => {
          if (trava.current.ocupado) return;
          setResultado(null);
          setPedido(null);
          setConsentiu(false);
          setRascunhos((atuais) => ({ ...atuais, [item.itemId]: proximo }));
        }} />)}
      <Button title="Conferir todas as decisões" disabled={!produtos || ocupado || incerto} onPress={conferir} />
      {resultado && <Text accessibilityRole="alert" style={styles.warning}>{resultado}</Text>}
      {incerto && <Button title="Consultar estado no servidor" variant="secondary" onPress={onConsultar} />}
      <Button title="Descartar nota" variant="outlineDanger" disabled={ocupado || incerto} onPress={() => setAbrirDescarte(true)} />
      <ConfirmModal visible={abrirDescarte} title="Descartar nota?" message="A revisão será descartada no servidor. Nenhum estoque será alterado." confirmLabel="Descartar" loading={ocupado} onCancel={() => setAbrirDescarte(false)} onConfirm={() => { void enviarDescarte(); }} />
      <BottomSheet visible={pedido !== null} dismissable={!ocupado} onClose={() => setPedido(null)}>
        <Text style={styles.title}>Confirmar nota no servidor?</Text>
        <Text style={styles.text}>Aprovar {aprovados} item(ns), rejeitar {rejeitados} item(ns). {novos} novo(s) produto(s).</Text>
        {pedido?.itens.filter((item) => item.acao === "CRIAR_NOVO").map((item) => <Text key={item.itemId} style={styles.text}>Criar: {item.nomeNovo} (item #{item.itemId}, {item.quantidade} un).</Text>)}
        {aprovados === 0 && <Text style={styles.warning}>Todos os itens serão rejeitados; nenhum estoque será acrescido.</Text>}
        {(novos > 0 || aprovados === 0) && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consentiu, disabled: ocupado }} disabled={ocupado} onPress={() => setConsentiu(!consentiu)} style={styles.option}>
          <Text style={styles.text}>{consentiu ? "☑" : "□"} {aprovados === 0 ? "Estou ciente de que todos os itens serão rejeitados e nenhum estoque será acrescido." : `Autorizo criar ${novos} produto(s) sem valor de venda cadastrado.`}</Text>
        </Pressable>}
        <Button title="Confirmar alterações" disabled={ocupado || (pedido !== null && exigeCienciaExplicita(pedido) && !consentiu)} loading={ocupado} onPress={() => { void enviarConfirmacao(); }} />
        <Button title="Voltar à revisão" variant="secondary" disabled={ocupado} onPress={() => setPedido(null)} />
      </BottomSheet>
      <Text style={styles.text}>Conferir este rascunho não altera o estoque. Somente a confirmação aceita pelo servidor adiciona os itens aprovados ao estoque. Este fluxo não define o valor de venda dos produtos.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  card: { backgroundColor: colors.white, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, gap: spacing.sm },
  title: { ...typography.subtitle, color: colors.text },
  text: { ...typography.body, color: colors.text },
  warning: { ...typography.body, color: colors.danger },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  acao: { flexGrow: 1, minHeight: 44, alignItems: "center", justifyContent: "center", padding: spacing.sm, backgroundColor: colors.primaryLight, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.sm },
  acaoEscolhida: { borderColor: colors.primary, borderWidth: 2 },
  acaoTexto: { ...typography.body, color: colors.text },
  option: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.borderLight },
});
