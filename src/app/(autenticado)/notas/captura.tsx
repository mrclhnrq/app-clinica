import { useLayoutEffect, useRef, useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { criarControleCopiaNota, navegarParaNotaAceita as navegarControlado } from "@/components/notas/controleCopiaNota";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { enviarUmaVez, validarIdNota, type ResultadoEnvio } from "@/services/fluxoNota";
import { descartarImagemTemporaria, ErroImagemNota, selecionarImagem, type ImagemNota, type OrigemImagem } from "@/services/notaFiscalImagem";
import { enviarImagem } from "@/services/notaFiscalService";

export function permissaoBloqueada(resposta: unknown): boolean {
  return typeof resposta === "object" && resposta !== null && "granted" in resposta && resposta.granted === false &&
    "canAskAgain" in resposta && resposta.canAskAgain === false;
}

export function criarGuardaDaCaptura(usuarioId: number) {
  let ativa = true;
  return {
    validaPara(origemUsuarioId: number): boolean { return ativa && origemUsuarioId === usuarioId; },
    ativar(): void { ativa = true; },
    desativar(): void { ativa = false; },
  };
}

export default function CapturaNota() {
  const { user } = useAuth();
  if (!user) return null;
  return <CapturaAutorizada key={user.userId} usuarioId={user.userId} />;
}

function CapturaAutorizada({ usuarioId }: { usuarioId: number }) {
  const { showToast } = useToast();
  const [imagem, setImagem] = useState<ImagemNota | null>(null);
  const [idManual, setIdManual] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [incerto, setIncerto] = useState(false);
  const [limpezaPendente, setLimpezaPendente] = useState(false);
  const [idAceito, setIdAceito] = useState<number | null>(null);
  const [confirmarPendencia, setConfirmarPendencia] = useState(false);
  const [permissao, setPermissao] = useState<{ origem: OrigemImagem; bloqueada: boolean } | null>(null);
  const trava = useRef(false);
  const [guarda] = useState(() => criarGuardaDaCaptura(usuarioId));
  const [controle] = useState(() => criarControleCopiaNota(descartarImagemTemporaria, () => {
    if (!guarda.validaPara(usuarioId)) console.warn("Falha ao limpar cópia temporária da nota após sair da captura.");
  }));

  useLayoutEffect(() => {
    guarda.ativar();
    controle.ativar();
    return () => {
      const falhaAnterior = controle.pendente;
      guarda.desativar();
      controle.encerrar();
      if (falhaAnterior && controle.pendente) console.warn("Cópia temporária da nota permanece pendente de limpeza após sair da captura.");
    };
  }, [guarda, controle, usuarioId]);

  async function verificarPermissaoNegada(origem: OrigemImagem) {
    try {
      const resposta = origem === "camera" ? await ImagePicker.getCameraPermissionsAsync() : await ImagePicker.getMediaLibraryPermissionsAsync();
      if (guarda.validaPara(usuarioId) && resposta.granted === false) setPermissao({ origem, bloqueada: permissaoBloqueada(resposta) });
    } catch {
      if (guarda.validaPara(usuarioId)) setPermissao({ origem, bloqueada: false });
    }
  }

  async function abrirAjustes() {
    if (!permissao?.bloqueada || !guarda.validaPara(usuarioId)) return;
    try { await Linking.openSettings(); }
    catch { if (guarda.validaPara(usuarioId)) showToast("Não foi possível abrir os ajustes. Abra as permissões deste aplicativo manualmente.", "error"); }
  }

  async function selecionar(origem: OrigemImagem) {
    if (trava.current || controle.idAceito !== null || !guarda.validaPara(usuarioId)) return;
    trava.current = true;
    setOcupado(true);
    try {
      const selecionada = await selecionarImagem(origem);
      if (selecionada) {
        const substituida = controle.receber(selecionada);
        if (guarda.validaPara(usuarioId)) {
          setImagem(controle.imagem);
          setLimpezaPendente(controle.pendente);
          if (substituida) setIncerto(false);
          else showToast("Não foi possível apagar uma cópia temporária. Tente limpar antes de escolher outra foto.", "error");
        }
      }
      if (guarda.validaPara(usuarioId)) setPermissao(null);
    } catch (erro) {
      if (erro instanceof ErroImagemNota && erro.tipo === "PERMISSAO") await verificarPermissaoNegada(origem);
      if (guarda.validaPara(usuarioId)) showToast(erro instanceof Error ? erro.message : "Não foi possível selecionar a imagem.", "error");
    } finally {
      trava.current = false;
      if (guarda.validaPara(usuarioId)) setOcupado(false);
    }
  }

  async function enviar() {
    if (!imagem || trava.current || incerto || limpezaPendente || controle.idAceito !== null || !guarda.validaPara(usuarioId)) return;
    const copia = controle.iniciarEnvio();
    if (!copia) return;
    trava.current = true;
    setOcupado(true);
    let resultado: ResultadoEnvio;
    try { resultado = await enviarUmaVez(copia, enviarImagem); }
    catch { resultado = { tipo: "erro", mensagem: "Não foi possível determinar o envio. Consulte a nota antes de uma nova tentativa.", respostaIncerta: true }; }
    finally { controle.finalizarEnvio(); trava.current = false; }
    if (guarda.validaPara(usuarioId)) {
      setImagem(controle.imagem);
      setLimpezaPendente(controle.pendente);
      if (controle.pendente) showToast("Não foi possível apagar a cópia temporária. Tente limpar novamente.", "error");
      if (resultado.tipo === "acompanhar") {
        controle.registrarAceite(resultado.id);
        setIdAceito(resultado.id);
        if (!controle.pendente) navegarParaNotaAceita();
      } else {
        setIncerto(resultado.respostaIncerta);
        showToast(resultado.mensagem, "error");
      }
      setOcupado(false);
    }
  }

  function navegarParaNotaAceita(cienteDaPendencia = false) {
    if (!guarda.validaPara(usuarioId)) return;
    const resultado = navegarControlado(controle, (id) => router.replace(`/notas/${id}`), cienteDaPendencia);
    if (resultado === "falhou") {
      showToast("Não foi possível abrir a nota aceita. Use o botão para tentar abrir novamente; a imagem não será reenviada.", "error");
    }
  }

  function tentarLimpar() {
    if (trava.current || !guarda.validaPara(usuarioId)) return;
    const apagada = controle.tentarNovamente();
    setImagem(controle.imagem);
    setLimpezaPendente(controle.pendente);
    if (!apagada) showToast("Não foi possível apagar a cópia temporária. Tente novamente antes de selecionar outra foto.", "error");
    else if (controle.idAceito !== null) navegarParaNotaAceita();
  }

  function consultarManualmente() {
    if (trava.current || controle.idAceito !== null || !guarda.validaPara(usuarioId)) return;
    const id = validarIdNota(idManual);
    if (id === null) { showToast("Informe um ID válido da sua nota.", "error"); return; }
    const apagada = controle.limparPreview();
    setImagem(controle.imagem);
    setLimpezaPendente(controle.pendente);
    if (!apagada || controle.pendente) {
      showToast("Não foi possível apagar a cópia temporária. Tente limpar novamente antes de consultar a nota.", "error");
      return;
    }
    router.push(`/notas/${id}`);
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Importar nota fiscal" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.text}>Fotografe uma única nota inteira, legível e bem iluminada, ou escolha uma foto da galeria. Confira a prévia antes de enviar.</Text>
        <View style={styles.row}>
          <Button title="Câmera" variant="secondary" disabled={ocupado || limpezaPendente || idAceito !== null} onPress={() => void selecionar("camera")} style={styles.flex} />
          <Button title="Galeria" variant="secondary" disabled={ocupado || limpezaPendente || idAceito !== null} onPress={() => void selecionar("galeria")} style={styles.flex} />
        </View>
        {permissao && <Text accessibilityRole="alert" style={styles.warning}>Permissão de {permissao.origem === "camera" ? "câmera" : "fotos"} negada. {permissao.bloqueada ? "Habilite-a nos ajustes deste aplicativo e volte para tentar novamente." : "Permita o acesso quando solicitado; se não houver novo pedido, habilite-o nos ajustes do aplicativo."}</Text>}
        {permissao?.bloqueada && <Button title="Abrir ajustes do aplicativo" variant="secondary" disabled={ocupado} onPress={() => { void abrirAjustes(); }} />}
        {imagem && <Image source={{ uri: imagem.uri }} style={styles.preview} resizeMode="contain" accessibilityLabel="Prévia da nota selecionada" />}
        {idAceito !== null && <Text accessibilityRole="alert" style={styles.text}>Nota #{idAceito} aceita pelo servidor. Não envie a imagem novamente. Se sair desta tela antes de abrir a nota, anote o número ou consulte-a depois pelo ID.</Text>}
        {idAceito !== null && !limpezaPendente && <Button title={`Abrir nota #${idAceito}`} disabled={ocupado} onPress={() => navegarParaNotaAceita()} />}
        {limpezaPendente && <><Text accessibilityRole="alert" style={styles.warning}>Uma cópia temporária não foi apagada. Não selecione nem envie outra imagem antes de tentar limpar novamente.</Text>
          <Button title="Tentar apagar cópia temporária" variant="secondary" disabled={ocupado} onPress={tentarLimpar} /></>}
        {idAceito !== null && limpezaPendente && <Button title="Continuar ciente da cópia não apagada" variant="secondary" disabled={ocupado} onPress={() => setConfirmarPendencia(true)} />}
        <ConfirmModal visible={confirmarPendencia} title="Continuar sem apagar a cópia?"
          message="A nota já foi aceita. A cópia temporária pode permanecer no aparelho. Você pode tentar apagar novamente antes de continuar."
          confirmLabel="Continuar mesmo assim" cancelLabel="Tentar apagar" onCancel={() => setConfirmarPendencia(false)}
          onConfirm={() => { setConfirmarPendencia(false); navegarParaNotaAceita(true); }} />
        <Button title="Enviar imagem" loading={ocupado} disabled={!imagem || incerto || limpezaPendente || idAceito !== null} onPress={() => void enviar()} />
        {incerto && <Text style={styles.warning}>A resposta do envio não foi confirmada. Consulte a nota pelo ID antes de decidir se deseja enviar novamente. Escolher outra imagem exige uma nova ação explícita.</Text>}
        <Text style={styles.text}>Já tem um ID de nota? Consulte o andamento da sua nota sem reenviar a imagem.</Text>
        <TextInput style={styles.input} value={idManual} onChangeText={setIdManual} keyboardType="number-pad" placeholder="ID da nota" accessibilityLabel="ID da nota" maxLength={16} />
        <Button title="Consultar ID" variant="secondary" disabled={ocupado || idAceito !== null} onPress={consultarManualmente} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  row: { flexDirection: "row", gap: spacing.sm },
  text: { ...typography.body, color: colors.text },
  warning: { ...typography.body, color: colors.danger },
  preview: { height: 260, backgroundColor: colors.white, borderRadius: radius.sm },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: radius.sm, padding: spacing.md, ...typography.body },
});
