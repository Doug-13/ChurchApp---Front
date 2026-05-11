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
  Text as RNText,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

import { Icon, Text, TextInput } from "react-native-paper";

// ─── Design tokens (manual ChurchApp) ────────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND_BLUE  = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const MUTED       = "#9198B5";
const BG          = "#F5F6FA";
const BORDER      = "#E4E6F0";
const DANGER      = "#E84D4D";
const DANGER_BG   = "#FEECEC";

function getFirebaseAuthErrorMessage(err) {
  const code = err?.code;
  switch (code) {
    case "auth/invalid-email":           return "E-mail inválido.";
    case "auth/user-not-found":          return "Conta não encontrada para este e-mail.";
    case "auth/wrong-password":
    case "auth/invalid-credential":      return "E-mail ou senha incorretos.";
    case "auth/user-disabled":           return "Esta conta foi desativada.";
    case "auth/too-many-requests":       return "Muitas tentativas. Aguarde e tente novamente.";
    case "auth/network-request-failed":  return "Sem conexão. Verifique sua rede.";
    default:                             return "Não foi possível entrar. Verifique seus dados.";
  }
}

// ─── Blobs decorativos (padrão hero do manual) ────────────────────────────────
function Blobs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.blob1} />
      <View style={styles.blob2} />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();

  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [showPassword,  setShowPassword]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [focusedField,  setFocusedField]  = useState(null);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.length > 4 && e.includes("@") && password.length >= 6 && !loading;
  }, [email, password, loading]);

  async function handleSignIn() {
    if (loading) return;
    setError("");
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed.includes("@")) { setError("Informe um e-mail válido."); return; }
    if (password.length < 6)         { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    try {
      setLoading(true);
      await signIn(emailTrimmed, password);
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Hero NAVY ── */}
            <View style={styles.hero}>
              <Blobs />

              {/* Ícone */}
              <View style={styles.heroIconWrap}>
                <Icon source="church" size={28} color="#fff" />
              </View>

              {/* Badge */}
              <View style={styles.heroBadge}>
                <View style={[styles.heroBadgeDot, { backgroundColor: "#7EFFD4" }]} />
                <Text style={styles.heroBadgeText}>Acesso seguro</Text>
              </View>

              {/* Título */}
              <Text style={styles.heroTitle}>
                Bem-vindo{"\n"}de volta
              </Text>
              <Text style={styles.heroSubtitle}>
                Entre com sua conta para continuar
              </Text>
            </View>

            {/* ── Card de formulário ── */}
            <View style={styles.card}>

              {/* E-mail */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>E-MAIL</Text>
                <TextInput
                  mode="outlined"
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (error) setError(""); }}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="seuemail@dominio.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  left={
                    <TextInput.Icon
                      icon="email-outline"
                      color={focusedField === "email" ? BRAND_BLUE : MUTED}
                    />
                  }
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  outlineColor={BORDER}
                  activeOutlineColor={BRAND_BLUE}
                  returnKeyType="next"
                  theme={{ colors: { background: "transparent" } }}
                />
              </View>

              {/* Senha */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>SENHA</Text>
                <TextInput
                  mode="outlined"
                  value={password}
                  onChangeText={(t) => { setPassword(t); if (error) setError(""); }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  left={
                    <TextInput.Icon
                      icon="lock-outline"
                      color={focusedField === "password" ? BRAND_BLUE : MUTED}
                    />
                  }
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off-outline" : "eye-outline"}
                      color={MUTED}
                      onPress={() => setShowPassword((v) => !v)}
                    />
                  }
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  outlineColor={BORDER}
                  activeOutlineColor={BRAND_BLUE}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  theme={{ colors: { background: "transparent" } }}
                />
              </View>

              {/* Esqueceu a senha */}
              <Pressable
                style={styles.forgotWrap}
                onPress={() => navigation.navigate("ForgotPassword")}
                disabled={loading}
                hitSlop={8}
              >
                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
              </Pressable>

              {/* Erro */}
              {!!error && (
                <View style={styles.errorBox}>
                  <Icon source="alert-circle-outline" size={15} color={DANGER} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Botão primário */}
              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimary,
                  (!canSubmit || loading) && styles.btnPrimaryDisabled,
                  pressed && canSubmit && { backgroundColor: "#3347B0" },
                ]}
                onPress={handleSignIn}
                disabled={!canSubmit || loading}
              >
                <Text style={styles.btnPrimaryLabel}>
                  {loading ? "Entrando…" : "Entrar"}
                </Text>
              </Pressable>

              {/* Divisor */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Botão secundário */}
              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && { backgroundColor: BRAND_LIGHT },
                ]}
                onPress={() => navigation.navigate("Register")}
                disabled={loading}
              >
                <Text style={styles.btnOutlineLabel}>Criar nova conta</Text>
              </Pressable>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Precisa de ajuda? </Text>
              <Pressable hitSlop={8}>
                <Text style={styles.footerLink}>Fale conosco</Text>
              </Pressable>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Hero — sempre NAVY, sem tema
  hero: {
    backgroundColor: NAVY,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    marginBottom: 16,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios: { shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 4 },
    }),
  },

  blob1: {
    position: "absolute",
    width: 260,
    height: 260,
    top: -100,
    right: -80,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  blob2: {
    position: "absolute",
    width: 180,
    height: 180,
    bottom: -90,
    left: -60,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    zIndex: 2,
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.13)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 18,
    zIndex: 2,
  },

  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },

  heroBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.8,
    lineHeight: 34,
    zIndex: 2,
  },

  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 19,
    zIndex: 2,
  },

  // Card do formulário
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    ...Platform.select({
      ios: { shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },

  // Campos
  fieldGroup: {
    marginBottom: 16,
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 1,
    marginBottom: 7,
  },

  input: {
    backgroundColor: "#F5F6FA",
    fontSize: 14,
  },

  inputOutline: {
    borderRadius: 14,
    borderWidth: 1.5,
  },

  // Esqueceu
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 16,
    paddingVertical: 4,
  },

  forgotText: {
    fontSize: 13,
    fontWeight: "700",
    color: BRAND_BLUE,
  },

  // Erro
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: DANGER_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    marginBottom: 16,
  },

  errorText: {
    fontSize: 13,
    color: DANGER,
    flex: 1,
    lineHeight: 18,
    fontWeight: "600",
  },

  // Botão primário
  btnPrimary: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  btnPrimaryDisabled: {
    opacity: 0.45,
  },

  btnPrimaryLabel: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.2,
  },

  // Divisor
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },

  dividerText: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Botão outline
  btnOutline: {
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "transparent",
  },

  btnOutlineLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.1,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    flexWrap: "wrap",
  },

  footerText: {
    fontSize: 13,
    color: MUTED,
  },

  footerLink: {
    fontSize: 13,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
});