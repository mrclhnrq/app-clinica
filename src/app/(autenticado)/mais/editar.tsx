import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/BottomSheet";
import { FormLayout } from "@/components/FormLayout";
import { LabeledInput } from "@/components/LabeledInput";
import { AvatarUsuario } from "@/components/perfil/AvatarUsuario";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import * as usuarioService from "@/services/usuarioService";
import { emailValido, maskTelefone, telefoneValido } from "@/utils/cliente";
import { escolherFotoDaGaleria } from "@/utils/fotoPerfil";

type Campos = { nome: string; email: string; telefone: string };
type Erros = Partial<Record<keyof Campos, string>>;

// mesmas regras do UsuarioAtualizacaoDto (nome 3–150, telefone 8–20, @Email até 255)
function validar(v: Campos): Erros {
  const erros: Erros = {};
  const nome = v.nome.trim();
  if (nome.length < 3 || nome.length > 150) erros.nome = "Informe o nome completo (3 a 150 caracteres)";
  else if (/['";*]/.test(nome)) erros.nome = "O nome não pode conter aspas, ponto e vírgula ou *";
  if (!emailValido(v.email) || v.email.trim().length > 255) erros.email = "Informe um e-mail válido";
  if (!telefoneValido(v.telefone)) erros.telefone = "Informe DDD + número";
  return erros;
}

export default function EditarPerfil() {
  const { user, atualizarUsuario, trocarToken } = useAuth();
  const { showToast } = useToast();

  const [carregando, setCarregando] = useState(true);
  const [valores, setValores] = useState<Campos>({ nome: "", email: "", telefone: "" });
  const [erros, setErros] = useState<Erros>({});
  // foto exibida na tela; só vai pro backend se mudou
  const [foto, setFoto] = useState<string | null>(user?.fotoPerfil ?? null);
  const [fotoAlterada, setFotoAlterada] = useState(false);
  const [opcoesFoto, setOpcoesFoto] = useState(false);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  useEffect(() => {
    if (!user) return;
    usuarioService
      .buscar(user.userId)
      .then((u) => {
        setValores({ nome: u.nome, email: u.email, telefone: maskTelefone(u.telefone) });
        setFoto(u.fotoPerfil);
      })
      .catch((e) => {
        showToast(getErrorMessage(e), "error");
        router.back();
      })
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  const mudar = (campo: keyof Campos) => (texto: string) => {
    setValores((v) => ({ ...v, [campo]: campo === "telefone" ? maskTelefone(texto) : texto }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  async function escolherFoto() {
    setOpcoesFoto(false);
    try {
      setProcessandoFoto(true);
      const nova = await escolherFotoDaGaleria();
      if (nova) {
        setFoto(nova);
        setFotoAlterada(true);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível abrir a galeria", "error");
    } finally {
      setProcessandoFoto(false);
    }
  }

  function removerFoto() {
    setOpcoesFoto(false);
    setFoto(null);
    setFotoAlterada(true);
  }

  async function salvar() {
    if (!user) return;
    const encontrados = validar(valores);
    if (Object.keys(encontrados).length > 0) {
      setErros(encontrados);
      showToast("Preencha todos os campos corretamente", "error");
      return;
    }

    const email = valores.email.trim().toLowerCase();
    try {
      const { usuario, novoToken } = await usuarioService.atualizar(user.userId, {
        nome: valores.nome.trim().replace(/\s+/g, " "),
        email,
        telefone: valores.telefone,
        fotoPerfil: fotoAlterada ? foto ?? "" : undefined,
      });
      if (novoToken) trocarToken(novoToken); // o token antigo deixa de valer com o e-mail novo
      atualizarUsuario({ nome: usuario.nome, email: usuario.email, fotoPerfil: usuario.fotoPerfil });
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) setErros({ email: "Este e-mail já está em uso" });
      throw e; // FormLayout mostra a mensagem do servidor e mantém o que foi digitado
    }

    showToast("Perfil atualizado com sucesso");
    router.back();
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Editar Perfil" onBack={() => router.back()} />

      {carregando ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <FormLayout submitLabel="Salvar" onSubmit={salvar} onCancel={() => router.back()}>
          <Pressable
            style={styles.avatar}
            onPress={() => setOpcoesFoto(true)}
            disabled={processandoFoto}
            accessibilityRole="button"
            accessibilityLabel="Alterar foto de perfil"
          >
            <AvatarUsuario nome={valores.nome || user?.nome || ""} foto={foto} size={96} />
            <View style={styles.camera}>
              {processandoFoto ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="camera" size={16} color={colors.white} />
              )}
            </View>
          </Pressable>

          <LabeledInput
            label="Nome completo"
            autoCapitalize="words"
            maxLength={150}
            value={valores.nome}
            onChangeText={mudar("nome")}
            error={erros.nome}
          />
          <LabeledInput
            label="E-mail funcional"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={255}
            value={valores.email}
            onChangeText={mudar("email")}
            error={erros.email}
          />
          {valores.email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase() && !erros.email && (
            <Text style={styles.aviso}>Você passará a entrar no app com este novo e-mail.</Text>
          )}
          <LabeledInput
            label="Telefone"
            placeholder="(11) 99999-0000"
            keyboardType="phone-pad"
            value={valores.telefone}
            onChangeText={mudar("telefone")}
            error={erros.telefone}
          />
        </FormLayout>
      )}

      <BottomSheet visible={opcoesFoto} onClose={() => setOpcoesFoto(false)}>
        <Text style={styles.sheetTitulo}>Foto de perfil</Text>
        <OpcaoFoto icone="images-outline" texto="Escolher da galeria" onPress={escolherFoto} />
        {!!foto && <OpcaoFoto icone="trash-outline" texto="Remover foto" onPress={removerFoto} perigo />}
      </BottomSheet>
    </View>
  );
}

function OpcaoFoto({
  icone,
  texto,
  onPress,
  perigo,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  texto: string;
  onPress: () => void;
  perigo?: boolean;
}) {
  const cor = perigo ? colors.danger : colors.primary;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.opcao, pressed && styles.opcaoPressionada]}>
      <Ionicons name={icone} size={20} color={cor} />
      <Text style={[styles.opcaoTexto, { color: perigo ? colors.danger : colors.text }]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: spacing.xxl },
  avatar: { alignSelf: "center", marginTop: spacing.sm },
  camera: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  aviso: { ...typography.small, color: colors.primary, marginTop: spacing.xs },
  sheetTitulo: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  opcao: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderRadius: radius.sm },
  opcaoPressionada: { backgroundColor: colors.primaryLight },
  opcaoTexto: { ...typography.body },
});
