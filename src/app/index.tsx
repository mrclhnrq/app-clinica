import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { LabeledInput } from "@/components/LabeledInput";
import { PasswordInput } from "@/components/PasswordInput";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import { emailValido } from "@/utils/cliente";

// o backend responde igual para senha errada, e-mail inexistente e conta bloqueada
// (não revela se o e-mail existe), então a mensagem cobre os três casos
const CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos";

export default function Login() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const senhaRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  async function handleLogin() {
    if (enviando) return;
    const emailLimpo = email.trim();

    if (!emailLimpo || !senha) {
      setErro("Informe e-mail e senha");
      return;
    }
    if (!emailValido(emailLimpo)) {
      setErro("Informe um e-mail válido");
      return;
    }

    try {
      setErro(null);
      setEnviando(true);
      Keyboard.dismiss();
      await signIn(emailLimpo, senha);
      router.replace("/(autenticado)/home");
    } catch (e) {
      const mensagem = getErrorMessage(e, {
        400: CREDENCIAIS_INVALIDAS,
        401: CREDENCIAIS_INVALIDAS,
        403: CREDENCIAIS_INVALIDAS,
      });
      setErro(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  const credencialInvalida = erro === CREDENCIAIS_INVALIDAS;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.container,
            keyboardVisible && styles.keyboardContainer,
            { paddingBottom: keyboardVisible ? spacing.xl : Math.max(insets.bottom + spacing.xl, 150) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="flower-outline" size={32} color={colors.primary} />
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
              onChangeText={(t) => {
                setEmail(t);
                setErro(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              keyboardType="email-address"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => senhaRef.current?.focus()}
              style={{ borderColor: erro ? colors.danger : colors.gold }}
            />

            <Text style={styles.label}>Senha:</Text>
            <PasswordInput
              ref={senhaRef}
              placeholder="Digite sua senha"
              value={senha}
              onChangeText={(t) => {
                setSenha(t);
                setErro(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              error={!!erro}
            />

            {!!erro && (
              <View style={styles.erroBox} accessibilityLiveRegion="polite">
                <Text style={styles.erroTexto}>{erro}</Text>
                {credencialInvalida && (
                  <Text style={styles.erroDica}>
                    Após 5 tentativas incorretas o acesso fica bloqueado por 5 minutos. Se precisar redefinir sua
                    senha, fale com o administrador.
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Botão */}
          <View style={styles.bottomContainer}>
            <Button title="Entrar" pill loading={enviando} onPress={handleLogin} />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  beautyCare: { fontSize: 11, letterSpacing: 1, color: colors.primary, marginTop: spacing.xs },
  form: { gap: 4 },
  label: { ...typography.label, color: colors.text, marginBottom: 6, marginTop: spacing.md },
  erroBox: { marginTop: spacing.sm, gap: spacing.xs },
  erroTexto: { ...typography.label, color: colors.danger, fontWeight: "600" },
  erroDica: { ...typography.small, color: colors.textMuted, lineHeight: 17 },
  bottomContainer: { gap: 10 },
});
