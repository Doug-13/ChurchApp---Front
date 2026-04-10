import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  ScrollView,
  Pressable,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";

function getFirebaseAuthErrorMessage(err) {
  const code = err?.code;

  switch (code) {
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/user-not-found":
      return "Conta não encontrada para este e-mail.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde um pouco e tente novamente.";
    case "auth/network-request-failed":
      return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
    default:
      return "Não foi possível entrar. Verifique seus dados e tente novamente.";
  }
}

/**
 * Tokens do Manual (grid 8px + paleta + radius + tipografia)
 * (Aplicados localmente nesta tela para garantir consistência visual)
 */
const DS = {
  colors: {
    primary: "#1CA7D1",
    primaryDark: "#177E9C",
    accent: "#46BCB1",
    tint: "#E3F7FC",
    error: "#F95F5C",
    background: "#F5F7FB",
    backgroundAlt: "#F7FEFE",
    surface: "#FFFFFF",
    text: "#333F42",
    textMuted: "#707D80",
    outline: "#DFE1E1",
    disabled: "#99ABB0",
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 24,
  },
  t: {
    h1: 28,
    h2: 24,
    h3: 20,
    body: 16,
    body2: 14,
    caption: 12,
  },
  space: (n) => n * 8,
};

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.length > 4 && e.includes("@") && password.length >= 6 && !loading;
  }, [email, password, loading]);

  async function handleSignIn() {
    if (loading) return;
    setError("");

    const emailTrimmed = email.trim().toLowerCase();
    const pass = password;

    if (!emailTrimmed || !emailTrimmed.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (!pass || pass.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      await signIn(emailTrimmed, pass);
      // navigation.replace("Home");
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: DS.colors.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Background (tint + accent) */}
            <View style={styles.backgroundContainer} pointerEvents="none">
              <View
                style={[
                  styles.blob,
                  styles.blobTop,
                  { backgroundColor: DS.colors.tint },
                ]}
              />
              <View
                style={[
                  styles.blob,
                  styles.blobBottom,
                  { backgroundColor: DS.colors.accent },
                ]}
              />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View
                style={[
                  styles.logoCard,
                  {
                    backgroundColor: DS.colors.surface,
                    borderColor: DS.colors.outline,
                  },
                ]}
              >
                <View style={[styles.logoMark, { backgroundColor: DS.colors.primary }]}>
                  <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900" }}>C</Text>
                </View>
              </View>

              <Text style={[styles.title, { color: DS.colors.text }]}>Bem-vindo de volta</Text>
              <Text style={[styles.subtitle, { color: DS.colors.textMuted }]}>
                Entre com sua conta para continuar
              </Text>
            </View>

            {/* Form Card */}
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: DS.colors.surface,
                  borderColor: DS.colors.outline,
                },
              ]}
            >
              {/* Email */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: DS.colors.text }]}>E-mail</Text>
                <TextInput
                  mode="outlined"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError("");
                  }}
                  placeholder="seuemail@dominio.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  left={<TextInput.Icon icon="email-outline" color={DS.colors.textMuted} />}
                  style={[styles.input, { backgroundColor: DS.colors.backgroundAlt }]}
                  outlineStyle={[styles.inputOutline, { borderRadius: DS.radius.sm }]}
                  outlineColor={DS.colors.outline}
                  activeOutlineColor={DS.colors.primary}
                  textColor={DS.colors.text}
                  placeholderTextColor={DS.colors.textMuted}
                  returnKeyType="next"
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: DS.colors.text }]}>Senha</Text>
                <TextInput
                  mode="outlined"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError("");
                  }}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  left={<TextInput.Icon icon="lock-outline" color={DS.colors.textMuted} />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off-outline" : "eye-outline"}
                      color={DS.colors.textMuted}
                      onPress={() => setShowPassword((v) => !v)}
                    />
                  }
                  style={[styles.input, { backgroundColor: DS.colors.backgroundAlt }]}
                  outlineStyle={[styles.inputOutline, { borderRadius: DS.radius.sm }]}
                  outlineColor={DS.colors.outline}
                  activeOutlineColor={DS.colors.primary}
                  textColor={DS.colors.text}
                  placeholderTextColor={DS.colors.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />
              </View>

              {/* Forgot */}
              <View style={styles.forgotPasswordContainer}>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate("ForgotPassword")}
                  labelStyle={[styles.linkText, { color: DS.colors.primary }]}
                  compact
                  disabled={loading}
                >
                  Esqueceu a senha?
                </Button>
              </View>

              {/* Error */}
              {!!error && (
                <View style={[styles.errorContainer, { borderColor: DS.colors.error }]}>
                  <Text style={[styles.errorText, { color: DS.colors.error }]}>{error}</Text>
                </View>
              )}

              {/* Primary CTA */}
              <Button
                mode="contained"
                onPress={handleSignIn}
                disabled={!canSubmit}
                loading={loading}
                style={[styles.primaryButton, { backgroundColor: DS.colors.primary }]}
                contentStyle={styles.primaryButtonContent}
                labelStyle={styles.primaryButtonLabel}
              >
                Entrar
              </Button>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: DS.colors.outline }]} />
                <Text style={[styles.dividerText, { color: DS.colors.textMuted }]}>ou</Text>
                <View style={[styles.dividerLine, { backgroundColor: DS.colors.outline }]} />
              </View>

              {/* Secondary */}
              <Button
                mode="outlined"
                icon="account-plus-outline"
                onPress={() => navigation.navigate("Register")}
                style={[
                  styles.outlinedButton,
                  {
                    borderColor: DS.colors.primary,
                  },
                ]}
                contentStyle={styles.outlinedButtonContent}
                labelStyle={[styles.outlinedButtonLabel, { color: DS.colors.primary }]}
                disabled={loading}
              >
                Criar nova conta
              </Button>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: DS.colors.textMuted }]}>
                Precisa de ajuda?{" "}
              </Text>

              <Pressable
                onPress={() => {
                  // ajuste para sua rota/tela de suporte
                  // navigation.navigate("Support");
                }}
                hitSlop={8}
              >
                <Text style={[styles.footerLink, { color: DS.colors.primary }]}>
                  Fale conosco
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: DS.space(3), // 24
    paddingTop: DS.space(3), // 24
    paddingBottom: DS.space(4), // 32
  },

  // Background blobs (clean/tinted)
  backgroundContainer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.35,
  },
  blobTop: {
    width: 420,
    height: 420,
    top: -220,
    right: -160,
  },
  blobBottom: {
    width: 320,
    height: 320,
    bottom: -160,
    left: -140,
    opacity: 0.18,
  },

  // Header
  header: {
    alignItems: "center",
    marginTop: DS.space(5), // 40
    marginBottom: DS.space(4), // 32
  },
  logoCard: {
    width: 88,
    height: 88,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: DS.space(3),
    // sombra suave
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: DS.t.h1, // 28
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
    marginBottom: DS.space(1),
  },
  subtitle: {
    fontSize: DS.t.body2, // 14
    textAlign: "center",
    lineHeight: 20,
  },

  // Card
  formCard: {
    borderRadius: DS.radius.lg, // 24
    padding: DS.space(3), // 24
    borderWidth: 1,
    // sombra suave
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2,
  },

  // Inputs
  inputContainer: { marginBottom: DS.space(2) }, // 16
  label: {
    fontSize: DS.t.caption, // 12
    fontWeight: "600",
    marginBottom: DS.space(1), // 8
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: "transparent",
  },
  inputOutline: {
    borderWidth: 1.5,
  },

  // Links
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: -DS.space(1), // -8
    marginBottom: DS.space(1), // 8
  },
  linkText: { fontSize: DS.t.body2, fontWeight: "700" },

  // Error
  errorContainer: {
    borderRadius: DS.radius.sm,
    borderWidth: 1,
    padding: DS.space(2), // 16
    marginBottom: DS.space(2),
    backgroundColor: "#FFF7F7",
  },
  errorText: { fontSize: DS.t.caption, lineHeight: 18, fontWeight: "600" },

  // Buttons
  primaryButton: {
    marginTop: DS.space(1), // 8
    borderRadius: DS.radius.sm,
  },
  primaryButtonContent: { height: 54 },
  primaryButtonLabel: {
    fontSize: DS.t.body, // 16
    fontWeight: "800",
    letterSpacing: 0.3,
    color: "#fff",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: DS.space(3), // 24
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: {
    paddingHorizontal: DS.space(2),
    fontSize: DS.t.caption,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  outlinedButton: {
    borderRadius: DS.radius.sm,
    borderWidth: 1.5,
  },
  outlinedButtonContent: { height: 54 },
  outlinedButtonLabel: { fontSize: DS.t.body2, fontWeight: "800" },

  // Footer
  footer: {
    marginTop: DS.space(4), // 32
    alignItems: "center",
    gap: 4,
  },
  footerText: { fontSize: DS.t.body2, textAlign: "center" },
  footerLink: { fontSize: DS.t.body2, fontWeight: "800" },
});