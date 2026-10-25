import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { LabeledInput } from "../components/LabeledInput";
import { PasswordInput } from "../components/PasswordInput";
import { colors, radius, spacing, typography } from "../constants/theme";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

const { signIn } = useAuth();
const { showToast } = useToast();
const [enviando, setEnviando] = useState(false);

async function handleLogin() {
  if (!email.trim() || !senha) {
    showToast("Informe e-mail e senha", "error");
    return;
  }

  const credenciaisInvalidas = "E-mail ou senha inválidos";
  try {
    setEnviando(true);
    await signIn(email.trim(), senha);
    router.replace("/(autenticado)/home");
  } catch (e) {
    showToast(
      getErrorMessage(e, { 400: credenciaisInvalidas, 401: credenciaisInvalidas, 403: credenciaisInvalidas }),
      "error"
    );
  } finally {
    setEnviando(false);
  }
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
                : Math.max(insets.bottom + spacing.xl, 150),
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="flower-outline"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={styles.nome}>Fernanda Lima</Text>
            <Text style={styles.beautyCare}>BEAUTY CARE</Text>
          </View>

          {/* Formulário */}
          <View style={styles.form}>
            <LabeledInput
              label="E-mail:"
              placeholder="Digite seu e-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ borderColor: colors.gold }}
            />

            <Text style={styles.label}>Senha:</Text>
            <PasswordInput
              placeholder="Digite sua senha"
              value={senha}
              onChangeText={setSenha}
            />

            <Pressable>
              <Text style={styles.esqueceuSenha}>Esqueceu a senha?</Text>
            </Pressable>
          </View>

          {/* Botão */}
          <View style={styles.bottomContainer}>
            <Button title="Entrar" pill loading={enviando} onPress={handleLogin} />

            <Text style={styles.cadastroTexto}>
              Não tem conta?{" "}
              <Text
                style={styles.cadastroLink}
                onPress={() => router.push("/cadastro")}
              >
                Cadastre-se
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
  container: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingTop: 150,
  },
  keyboardContainer: {
    justifyContent: "flex-start",
    paddingTop: spacing.xl,
    gap: spacing.xxl,
  },
  logoContainer: { alignItems: "center", margin: 0 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.circle,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nome: { fontSize: 20, fontWeight: "600", color: colors.gold, marginTop: 2 },
  beautyCare: {
    fontSize: 11,
    letterSpacing: 1,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  form: { gap: 4 },
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: 6,
    marginTop: spacing.md,
  },
  esqueceuSenha: {
    alignSelf: "flex-end",
    color: colors.primary,
    fontSize: 13,
    marginTop: 10,
  },
  bottomContainer: { gap: 10 },
  botao: {
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  textoBotao: { ...typography.button, color: colors.white },
  cadastroTexto: { textAlign: "center", color: colors.textMuted, fontSize: 14 },
  cadastroLink: { color: colors.primary, fontWeight: "600" },
});
