import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LabeledInput } from "../components/LabeledInput";
import { PasswordInput } from "../components/PasswordInput";
import { colors, spacing, radius, typography } from "../constants/theme";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function handleCadastro() {
    console.log({ nome, email, telefone, senha, confirmarSenha });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.container,
            keyboardVisible && styles.keyboardContainer,
            {
              paddingBottom: keyboardVisible
                ? spacing.xl
                : Math.max(insets.bottom + spacing.xl, 60),
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.titulo}>Criar Conta</Text>

          <View style={styles.form}>
            <LabeledInput
              label="Nome Completo"
              placeholder="Digite seu nome completo"
              value={nome}
              onChangeText={setNome}
            />

            <LabeledInput
              label="E-mail"
              placeholder="Digite seu e-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <LabeledInput
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Senha</Text>
            <PasswordInput
              placeholder="Digite sua senha"
              value={senha}
              onChangeText={setSenha}
            />

            <Text style={styles.label}>Confirmar Senha</Text>
            <PasswordInput
              placeholder="Confirme sua senha"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
            />
          </View>

          <View style={styles.bottomContainer}>
            <Pressable style={styles.botao} onPress={handleCadastro}>
              <Text style={styles.textoBotao}>Cadastrar</Text>
            </Pressable>

            <Text style={styles.loginTexto}>
              Já tem conta?{" "}
              <Text style={styles.loginLink} onPress={() => router.back()}>
                Faça login
              </Text>
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20 },
  keyboardContainer: { paddingTop: spacing.xl, gap: spacing.xl },
  titulo: { ...typography.title, color: colors.primary, marginBottom: spacing.xl },
  form: { gap: 4 },
  label: { ...typography.label, color: colors.text, marginBottom: 6, marginTop: spacing.md },
  bottomContainer: { gap: 16, marginTop: spacing.xxl },
  botao: {
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  textoBotao: { ...typography.button, color: colors.white },
  loginTexto: { textAlign: "center", color: colors.textMuted, fontSize: 14 },
  loginLink: { color: colors.primary, fontWeight: "600" },
});