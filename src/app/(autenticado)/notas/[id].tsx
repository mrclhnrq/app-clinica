import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/Button";
import { RevisaoNota } from "@/components/notas/RevisaoNota";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useProdutos } from "@/context/ProdutosContext";
import { acompanharNota, validarIdNota, type EventoConsulta } from "@/services/fluxoNota";
import { consultar } from "@/services/notaFiscalService";
import type { NotaResposta, ResumoConfirmacao } from "@/types/notaFiscal";

const motivos = { SEM_PRODUTO: "Sem produto", REJEITADO_PELA_USUARIA: "Rejeitado na revisão", DADOS_INVALIDOS: "Dados inválidos" } as const;

type NotaDaConta = { usuarioId: number; nota: NotaResposta };

export function notaVisivel(usuarioId: number | null, id: number | null, registro: NotaDaConta | null): NotaResposta | null {
  return usuarioId !== null && id !== null && registro?.usuarioId === usuarioId && registro.nota.notaId === id ? registro.nota : null;
}

export function consultaPertenceAConta(usuarioId: number, id: number, origemUsuarioId: number, resposta: NotaResposta): boolean {
  return origemUsuarioId === usuarioId && resposta.notaId === id;
}

export function avaliarConsulta(anterior: NotaResposta | null, consultada: NotaResposta): "ignorar" | "manterRascunho" | "reiniciarRevisao" | "atualizar" {
  if (anterior?.notaId !== consultada.notaId) return "atualizar";
  if (anterior.status === "CONFIRMADA" && consultada.status === "EM_REVISAO") return "ignorar";
  if (anterior.status === "EM_REVISAO" && consultada.status === "EM_REVISAO") {
    return JSON.stringify(anterior) === JSON.stringify(consultada) ? "manterRascunho" : "reiniciarRevisao";
  }
  return "atualizar";
}

function ResumoNota({ resumo }: { resumo: ResumoConfirmacao }) {
  return <View style={styles.summary} accessibilityLiveRegion="polite">
    <Text style={styles.title}>Confirmada no servidor</Text>
    <Text style={styles.text}>{resumo.itensConfirmados.length} aceito(s) · {resumo.itensRejeitados.length} rejeitado(s).</Text>
    {resumo.itensConfirmados.length === 0 && <Text style={styles.warning}>Todos os itens foram rejeitados. Nenhum item foi acrescido ao estoque.</Text>}
    {resumo.itensConfirmados.map((item) => <Text key={item.itemId} style={styles.text}>Item #{item.itemId}: aceito, produto #{item.produtoId}, {item.quantidade} un.</Text>)}
    {resumo.itensRejeitados.map((item) => <Text key={item.itemId} style={styles.text}>Item #{item.itemId}: {motivos[item.motivo]}.</Text>)}
  </View>;
}

export default function ProcessoNota() {
  const { id: parametro } = useLocalSearchParams<{ id: string }>();
  const id = typeof parametro === "string" ? validarIdNota(parametro) : null;
  const { user } = useAuth();
  if (!user) return null;
  if (id === null) return <View style={styles.flex}>
    <ScreenHeader title="Andamento da nota" onBack={() => router.back()} />
    <Text style={styles.warning}>ID inválido. Volte e informe o ID da nota.</Text>
  </View>;
  return <ProcessoNotaAutorizado key={`${user.userId}:${id}`} id={id} usuarioId={user.userId} />;
}

function ProcessoNotaAutorizado({ id, usuarioId }: { id: number; usuarioId: number }) {
  const { recarregar } = useProdutos();
  const [registro, setRegistro] = useState<NotaDaConta | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [rodada, setRodada] = useState(0);
  const [catalogo, setCatalogo] = useState<{ chave: string; estado: "sincronizando" | "atualizado" | "falhou" } | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [versaoRevisao, setVersaoRevisao] = useState(0);
  const finalizado = useRef<number | null>(null);
  const notaAtual = useRef<NotaDaConta | null>(null);
  const sincronizado = useRef<string | null>(null);
  const atual = notaVisivel(usuarioId, id, registro);
  const chaveCatalogo = atual && usuarioId ? `${usuarioId}:${atual.notaId}:${tentativa}` : null;
  const catalogoAtual = catalogo?.chave === chaveCatalogo ? catalogo.estado : null;

  const registrarConsulta = useCallback((consultada: NotaResposta, origemUsuarioId: number) => {
    if (!consultaPertenceAConta(usuarioId, id, origemUsuarioId, consultada)) return;
    const decisao = avaliarConsulta(notaVisivel(usuarioId, id, notaAtual.current), consultada);
    if (decisao === "ignorar" || decisao === "manterRascunho") return;
    if (decisao === "reiniciarRevisao") setVersaoRevisao((versao) => versao + 1);
    notaAtual.current = { usuarioId, nota: consultada };
    setRegistro({ usuarioId, nota: consultada });
  }, [id, usuarioId]);

  useEffect(() => {
    if (!atual || atual.status !== "CONFIRMADA") return;
    const chave = `${usuarioId}:${atual.notaId}:${tentativa}`;
    if (sincronizado.current === chave) return;
    sincronizado.current = chave;
    let ativo = true;
    setCatalogo({ chave, estado: "sincronizando" });
    void recarregar().then(() => { if (ativo) setCatalogo({ chave, estado: "atualizado" }); })
      .catch(() => { if (ativo) setCatalogo({ chave, estado: "falhou" }); });
    return () => { ativo = false; };
  }, [usuarioId, atual, recarregar, tentativa]);

  useFocusEffect(useCallback(() => {
    const origemUsuarioId = usuarioId;
    let parar: (() => void) | null = null;
    let encerrado = false;
    function iniciar() {
      if (parar || AppState.currentState !== "active" ||
        (finalizado.current === id && notaVisivel(usuarioId, id, notaAtual.current)?.status !== "EM_REVISAO")) return;
      encerrado = false;
      if (rodada > 0) setAviso(null);
      parar = acompanharNota(id, consultar, (evento: EventoConsulta) => {
        if (encerrado) return;
        if (evento.tipo === "nota") {
          if (!consultaPertenceAConta(usuarioId, id, origemUsuarioId, evento.nota)) return;
          setAviso(null);
          registrarConsulta(evento.nota, origemUsuarioId);
          if (evento.nota.status !== "PROCESSANDO") { finalizado.current = id; encerrado = true; parar?.(); parar = null; }
        } else {
          setAviso(evento.tipo === "limite" ? "Consulta pausada após oito tentativas. Consulte novamente quando desejar." : evento.mensagem);
          encerrado = true;
          parar?.();
          parar = null;
        }
      });
    }
    function suspender() { encerrado = true; parar?.(); parar = null; }
    if (AppState.currentState === "active") iniciar();
    const subscription = AppState.addEventListener("change", (estado) => {
      if (estado === "active") iniciar(); else suspender();
    });
    return () => { encerrado = true; suspender(); subscription.remove(); };
  }, [id, usuarioId, rodada, registrarConsulta]));

  function consultarNovamente() { finalizado.current = null; notaAtual.current = null; setRegistro(null); setAviso(null); setRodada((anterior) => anterior + 1); }

  function registrarConfirmacao(resumo: ResumoConfirmacao) {
    if (!atual || atual.notaId !== resumo.notaId) return;
    finalizado.current = resumo.notaId;
    registrarConsulta({ ...atual, status: "CONFIRMADA", codigoFalha: null, resumoConfirmacao: resumo }, usuarioId);
  }

  function registrarEstado(estado: NotaResposta) {
    if (estado.notaId !== id) return;
    finalizado.current = estado.status === "PROCESSANDO" ? null : id;
    registrarConsulta(estado, usuarioId);
    if (estado.status === "PROCESSANDO") setRodada((anterior) => anterior + 1);
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Andamento da nota" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
          <>
            <Text style={styles.text}>Nota #{id}</Text>
            {atual && <Text style={styles.text}>Estado: {atual.status === "PROCESSANDO" ? "Processando" :
              atual.status === "EM_REVISAO" ? "Aguardando revisão dos itens" :
                atual.status === "FALHA" ? "Falha na leitura da nota" :
                  atual.status === "DESCARTADA" ? "Descartada" : "Confirmada"}</Text>}
            {atual?.status === "EM_REVISAO" && <RevisaoNota key={`${atual.notaId}:${rodada}:${versaoRevisao}`} nota={atual} onConfirmada={registrarConfirmacao} onEstado={registrarEstado} onConsultar={consultarNovamente} />}
            {atual?.status === "FALHA" && <Text style={styles.warning}>Falha: {atual.codigoFalha}. Nenhum estoque foi alterado nesta tela.</Text>}
            {atual?.status === "CONFIRMADA" && <>
              <ResumoNota resumo={atual.resumoConfirmacao} />
              {(catalogoAtual === null || catalogoAtual === "sincronizando") && <Text style={styles.text}>Atualizando catálogo de produtos...</Text>}
              {catalogoAtual === "atualizado" && <><Text style={styles.text}>Catálogo atualizado após confirmação.</Text><Button title="Ver produtos" onPress={() => router.push("/(autenticado)/produtos")} /></>}
              {catalogoAtual === "falhou" && <><Text accessibilityRole="alert" style={styles.warning}>Confirmada no servidor, mas não foi possível atualizar o catálogo. Não use valores antigos para decidir estoque.</Text><Button title="Atualizar catálogo" onPress={() => setTentativa((n) => n + 1)} /></>}
            </>}
            {atual?.status === "PROCESSANDO" && !aviso && <Text style={styles.text}>Aguardando processamento. A consulta será interrompida ao sair desta tela.</Text>}
            {aviso && <Text style={styles.warning}>{aviso}</Text>}
            {aviso && <Button title="Consultar novamente" variant="secondary" onPress={consultarNovamente} />}
          </>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  text: { ...typography.body, color: colors.text },
  warning: { ...typography.body, color: colors.danger },
  title: { ...typography.subtitle, color: colors.text },
  summary: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.white },
});
