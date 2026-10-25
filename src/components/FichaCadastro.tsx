import { ReactNode, useState } from "react";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DetailField } from "@/components/DetailField";
import { ScreenFooter } from "@/components/ScreenFooter";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatusTag } from "@/components/StatusTag";
import { useToast } from "@/components/ToastProvider";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { getErrorMessage } from "@/services/api";
import { ScrollView, View, StyleSheet, Text } from "react-native";

type FichaCadastroProps = {
  titulo: string;        // "Ficha do Serviço"
  nomeEntidade: string;  // "serviço" / "produto"
  nome: string;
  ativo: boolean;
  children?: ReactNode; // seções extras abaixo do card (ex.: itens do combo)
  avatar?: ReactNode;   // opcional, à esquerda do nome (ex.: iniciais do cliente)
  avisoInativacao?: string; // texto extra do modal de inativação (padrão fala de vendas)
  campos: { label: string; value: string }[];
  onEditar: () => void;
  onInativar: () => Promise<void>;
  onReativar: () => Promise<void>;
};

export function FichaCadastro({
  titulo, nomeEntidade, nome, ativo, campos, onEditar, onInativar, onReativar, children, avatar,
  avisoInativacao = "Ele deixa de aparecer para novas vendas, mas o histórico e os relatórios são mantidos. Você pode reativá-lo depois.",
}: FichaCadastroProps) {
  const { showToast } = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [processando, setProcessando] = useState(false);

  const entidade = nomeEntidade.charAt(0).toUpperCase() + nomeEntidade.slice(1);

  async function executar(acao: () => Promise<void>, mensagemSucesso: string) {
    try {
      setProcessando(true);
      await acao();
      showToast(mensagemSucesso);
      router.dismissAll(); // volta direto pra listagem
    } catch (e) {
      setConfirmando(false);
      showToast(getErrorMessage(e), "error");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title={titulo} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cabecalho}>
            {avatar}
            <Text style={styles.titulo}>{nome}</Text>
            <StatusTag ativo={ativo} />
          </View>
          <View style={styles.divisor} />

          {campos.map((campo) => (
            <DetailField key={campo.label} label={campo.label} value={campo.value} />
          ))}
        </View>
        {children}
      </ScrollView>

      <ScreenFooter>
        <Button title="Editar Ficha" onPress={onEditar} disabled={processando} style={styles.grow2} />
        {ativo ? (
          <Button title="Inativar" variant="outlineDanger" onPress={() => setConfirmando(true)} style={styles.grow1} />
        ) : (
          <Button
            title="Reativar"
            variant="secondary"
            loading={processando}
            onPress={() => executar(onReativar, `${entidade} reativado com sucesso`)}
            style={styles.grow1}
          />
        )}
      </ScreenFooter>

      <ConfirmModal
        visible={confirmando}
        icon="eye-off-outline"
        title="Confirmar inativação"
        message={`Tem certeza que deseja inativar este ${nomeEntidade}?`}
        warning={avisoInativacao}
        confirmLabel="Inativar"
        loading={processando}
        onConfirm={() => executar(onInativar, `${entidade} inativado com sucesso`)}
        onCancel={() => setConfirmando(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  cabecalho: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  titulo: { ...typography.title, color: colors.primary, flex: 1 },
  divisor: { height: 1, backgroundColor: colors.borderLight, marginTop: spacing.md },
  grow1: { flex: 1 },
  grow2: { flex: 2 },
});