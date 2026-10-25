import { useCallback, useState } from "react";
import { Href, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ClienteAvatar } from "@/components/clientes/ClienteAvatar";
import { useToast } from "@/components/ToastProvider";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import * as usuarioService from "@/services/usuarioService";
import { roleLabel } from "@/types/usuario";
import { maskTelefone } from "@/utils/cliente";

type ItemMenu = {
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  href?: Href;
  onPress?: () => void;
  perigo?: boolean;
};

export default function MeuPerfil() {
  const { user, signOut, atualizarUsuario } = useAuth();
  const { showToast } = useToast();
  const [telefone, setTelefone] = useState("");

  // recarrega do backend sempre que a tela volta ao foco (ex.: depois de editar)
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let ativo = true;
      usuarioService
        .buscar(user.userId)
        .then((u) => {
          if (!ativo) return;
          setTelefone(maskTelefone(u.telefone));
          atualizarUsuario({ nome: u.nome, email: u.email, role: u.role });
        })
        .catch((e) => ativo && showToast(getErrorMessage(e), "error"));
      return () => {
        ativo = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.userId])
  );

  function sair() {
    signOut();
    router.replace("/"); // tela de Login
  }

  if (!user) return null;

  const itens: ItemMenu[] = [
    { titulo: "Editar Perfil", icone: "create-outline", href: "/mais/editar" },
    { titulo: "Alterar Senha", icone: "lock-closed-outline", href: "/mais/alterar-senha" },
    { titulo: "Notificações", icone: "notifications-outline", onPress: () => showToast("Em breve") },
    { titulo: "Sobre o App", icone: "information-circle-outline", href: "/mais/sobre" },
    { titulo: "Sair", icone: "log-out-outline", onPress: sair, perigo: true },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Meu Perfil</Text>

      <View style={styles.identidade}>
        <View style={styles.avatarBorda}>
          <ClienteAvatar nome={user.nome} size={88} destaque />
        </View>
        <Text style={styles.nome}>{user.nome}</Text>
        <View style={styles.cargo}>
          <Text style={styles.cargoTexto}>{roleLabel(user.role).toUpperCase()}</Text>
        </View>
        <Text style={styles.email}>{user.email}</Text>
        {!!telefone && <Text style={styles.email}>{telefone}</Text>}
      </View>

      <View style={styles.menu}>
        {itens.map((item, i) => (
          <Pressable
            key={item.titulo}
            onPress={item.onPress ?? (() => item.href && router.push(item.href))}
            style={({ pressed }) => [styles.item, i > 0 && styles.itemDivisor, pressed && styles.itemPressionado]}
          >
            <View style={[styles.icone, item.perigo && styles.iconePerigo]}>
              <Ionicons name={item.icone} size={18} color={item.perigo ? colors.danger : colors.primary} />
            </View>
            <Text style={[styles.itemTexto, item.perigo && { color: colors.danger }]}>{item.titulo}</Text>
            {!item.perigo && <Ionicons name="chevron-forward" size={18} color={colors.textLight} />}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  titulo: { ...typography.title, color: colors.primary },
  identidade: { alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.xl, gap: spacing.xs },
  avatarBorda: { borderWidth: 3, borderColor: colors.gold, borderRadius: radius.circle, padding: 3 },
  nome: { ...typography.title, color: colors.primary, marginTop: spacing.sm },
  cargo: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  cargoTexto: { fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.5 },
  email: { ...typography.label, color: colors.textMuted },
  menu: { backgroundColor: colors.white, borderRadius: radius.md, overflow: "hidden" },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  itemDivisor: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  itemPressionado: { backgroundColor: colors.primaryLight },
  icone: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconePerigo: { backgroundColor: colors.dangerLight },
  itemTexto: { ...typography.body, color: colors.text, flex: 1 },
});
