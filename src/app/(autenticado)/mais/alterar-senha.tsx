import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { FormLayout } from "@/components/FormLayout";
import { PasswordInput } from "@/components/PasswordInput";
import { ForcaSenha } from "@/components/perfil/ForcaSenha";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { colors, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import * as usuarioService from "@/services/usuarioService";
import { avaliarSenha, SENHA_MAX, SENHA_MIN } from "@/utils/senha";

type Campos = { atual: string; nova: string; confirmar: string };
type Erros = Partial<Record<keyof Campos, string>>;

function Campo({ label, erro, children }: { label: string; erro?: string; children: React.ReactNode }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!erro && <Text style={styles.erro}>{erro}</Text>}
    </View>
  );
}

export default function AlterarSenha() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [v, setV] = useState<Campos>({ atual: "", nova: "", confirmar: "" });
  const [erros, setErros] = useState<Erros>({});

  const mudar = (campo: keyof Campos) => (texto: string) => {
    setV((x) => ({ ...x, [campo]: texto }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  async function salvar() {
    if (!user) return;
    const e: Erros = {};
    if (!v.atual) e.atual = "Informe sua senha atual";
    if (!avaliarSenha(v.nova).valida) e.nova = "A nova senha não atende à política de senha";
    else if (v.nova === v.atual) e.nova = "A nova senha deve ser diferente da atual";
    if (v.confirmar !== v.nova) e.confirmar = "As senhas não coincidem";
    if (Object.keys(e).length > 0) {
      setErros(e);
      showToast("Confira os campos destacados", "error");
      return;
    }

    try {
      await usuarioService.alterarSenha(user.userId, v.atual, v.nova);
    } catch (err) {
      // backend responde 400 "Senha atual incorreta"
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400) setErros({ atual: "Senha atual incorreta" });
      throw err; // FormLayout mostra o toast
    }
    showToast("Senha alterada com sucesso");
    router.back();
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Alterar Senha" onBack={() => router.back()} />
      <FormLayout submitLabel="Salvar Nova Senha" onSubmit={salvar}>
        <Text style={styles.descricao}>
          Sua nova senha deve ter de {SENHA_MIN} a {SENHA_MAX} caracteres, com letra maiúscula, letra minúscula,
          número e caractere especial.
        </Text>

        <Campo label="Senha atual" erro={erros.atual}>
          <PasswordInput value={v.atual} onChangeText={mudar("atual")} error={!!erros.atual} autoCapitalize="none" />
        </Campo>

        <Campo label="Nova senha" erro={erros.nova}>
          <PasswordInput
            value={v.nova}
            onChangeText={mudar("nova")}
            error={!!erros.nova}
            maxLength={SENHA_MAX}
            autoCapitalize="none"
          />
          <ForcaSenha senha={v.nova} />
        </Campo>

        <Campo label="Confirmar nova senha" erro={erros.confirmar}>
          <PasswordInput
            value={v.confirmar}
            onChangeText={mudar("confirmar")}
            error={!!erros.confirmar}
            maxLength={SENHA_MAX}
            autoCapitalize="none"
          />
        </Campo>
      </FormLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  descricao: { ...typography.body, color: colors.textMuted, lineHeight: 21, marginTop: spacing.xs },
  campo: { marginTop: spacing.md },
  label: { ...typography.label, color: colors.text, marginBottom: spacing.sm - 2 },
  erro: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
});
