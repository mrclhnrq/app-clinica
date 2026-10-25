import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ClienteAvatar } from "@/components/clientes/ClienteAvatar";
import { FormLayout } from "@/components/FormLayout";
import { LabeledInput } from "@/components/LabeledInput";
import { SeletorCargo } from "@/components/perfil/SeletorCargo";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import * as usuarioService from "@/services/usuarioService";
import { Role, toRole } from "@/types/usuario";
import { emailValido, maskTelefone, telefoneValido } from "@/utils/cliente";

type Campos = { nome: string; email: string; telefone: string };
type Erros = Partial<Record<keyof Campos, string>>;

// mesmas regras do UsuarioAtualizacaoDto (nome 3–150, telefone 8–20, @Email)
function validar(v: Campos): Erros {
  const erros: Erros = {};
  const nome = v.nome.trim();
  if (nome.length < 3 || nome.length > 150) erros.nome = "Informe o nome completo (3 a 150 caracteres)";
  else if (/['";*]/.test(nome)) erros.nome = "O nome não pode conter aspas, ponto e vírgula ou *";
  if (!emailValido(v.email)) erros.email = "Informe um e-mail válido";
  if (!telefoneValido(v.telefone)) erros.telefone = "Informe DDD + número";
  return erros;
}

export default function EditarPerfil() {
  const { user, atualizarUsuario } = useAuth();
  const { showToast } = useToast();
  const ehAdmin = toRole(user?.role) === "ADMIN";

  const [carregando, setCarregando] = useState(true);
  const [valores, setValores] = useState<Campos>({ nome: "", email: "", telefone: "" });
  const [role, setRole] = useState<Role>(toRole(user?.role));
  const [erros, setErros] = useState<Erros>({});

  useEffect(() => {
    if (!user) return;
    usuarioService
      .buscar(user.userId)
      .then((u) => {
        setValores({ nome: u.nome, email: u.email, telefone: maskTelefone(u.telefone) });
        setRole(u.role);
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

  async function salvar() {
    if (!user) return;
    const encontrados = validar(valores);
    if (Object.keys(encontrados).length > 0) {
      setErros(encontrados);
      showToast("Preencha todos os campos corretamente", "error");
      return;
    }

    const enviado = {
      nome: valores.nome.trim().replace(/\s+/g, " "),
      email: valores.email.trim().toLowerCase(),
      telefone: valores.telefone,
      role,
    };
    const salvo = await usuarioService.atualizar(user.userId, enviado); // erro → toast do FormLayout
    atualizarUsuario({ nome: salvo.nome, email: salvo.email, role: salvo.role });

    // o servidor pode recusar mudanças de e-mail/cargo sem retornar erro
    const ignorados = [
      salvo.email.toLowerCase() !== enviado.email && "e-mail",
      salvo.role !== enviado.role && "cargo",
    ].filter(Boolean);
    if (ignorados.length > 0) {
      showToast(`Perfil salvo, mas o servidor não alterou: ${ignorados.join(" e ")}`, "error");
    } else {
      showToast("Perfil atualizado com sucesso");
    }
    router.back();
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Editar Perfil" onBack={() => router.back()} />

      {carregando ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <FormLayout submitLabel="Salvar" onSubmit={salvar} onCancel={() => router.back()}>
          <View style={styles.avatar}>
            <ClienteAvatar nome={valores.nome || user?.nome || ""} size={88} destaque />
          </View>

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
            value={valores.email}
            onChangeText={mudar("email")}
            error={erros.email}
          />
          <LabeledInput
            label="Telefone"
            placeholder="(11) 99999-0000"
            keyboardType="phone-pad"
            value={valores.telefone}
            onChangeText={mudar("telefone")}
            error={erros.telefone}
          />
          <SeletorCargo
            value={role}
            onChange={setRole}
            disabled={!ehAdmin}
            hint={ehAdmin ? undefined : "Somente administradores podem alterar o cargo."}
          />
        </FormLayout>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: spacing.xxl },
  avatar: { alignItems: "center", marginTop: spacing.sm },
});
