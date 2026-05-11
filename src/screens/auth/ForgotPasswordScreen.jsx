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
import { Icon, Text, TextInput } from "react-native-paper";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND_BLUE  = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const MUTED       = "#9198B5";
const BG          = "#F5F6FA";
const BORDER      = "#E4E6F0";
const DANGER      = "#E84D4D";
const DANGER_BG   = "#FEECEC";
const SUCCESS     = "#2DBF8A";
const SUCCESS_BG  = "#E8F9F3";

export default function ForgotPasswordScreen({ navigation }) {
  const [email,       setEmail]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [info,        setInfo]        = useState("");
  const [error,       setError]       = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.length > 4 && e.includes("@") && !loading;
  }, [email, loading]);

  async function handleSend() {
    setError("");
    setInfo("");
    const e = email.trim();
    if (!e || !e.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    try {
      setLoading(true);
      // await resetPassword(e);
      setInfo("Se o e-mail existir, enviaremos um link de recuperação.");
    } catch {
      setInfo("Se o e-mail existir, enviaremos um link de recuperação.");
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
              <View style={[styles.blob, { width: 220, height: 220, top: -70, right: -60 }]} />
              <View style={[styles.blob, { width: 150, height: 150, bottom: -80, left: -40, opacity: 0.05 }]} />

              {/* Ícone */}
              <View style={styles.heroIconWrap}>
                <Icon source="lock-reset" size={28} color="#fff" />
              </View>

              {/* Badge */}
              <View style={styles.heroBadge}>
                <View style={[styles.heroBadgeDot, { backgroundColor: "#FFD97D" }]} />
                <Text style={styles.heroBadgeText}>Recuperação de senha</Text>
              </View>

              <Text style={styles.heroTitle}>Esqueceu sua senha?</Text>
              <Text style={styles.heroSubtitle}>
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
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
                  returnKeyType="done"
                  onSubmitEditing={handleSend}
                  theme={{ colors: { background: "transparent" } }}
                />
              </View>

              {/* Erro */}
              {!!error && (
                <View style={styles.errorBox}>
                  <Icon source="alert-circle-outline" size={15} color={DANGER} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Sucesso */}
              {!!info && (
                <View style={styles.infoBox}>
                  <Icon source="check-circle-outline" size={15} color={SUCCESS} />
                  <Text style={styles.infoText}>{info}</Text>
                </View>
              )}

              {/* Dica */}
              {!info && (
                <View style={styles.hintBox}>
                  <Icon source="information-outline" size={14} color={MUTED} />
                  <Text style={styles.hintText}>
                    Verifique também sua caixa de spam/lixo eletrônico.
                  </Text>
                </View>
              )}

              {/* Botão primário */}
              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimary,
                  (!canSubmit || loading) && styles.btnPrimaryDisabled,
                  pressed && canSubmit && { backgroundColor: "#3347B0" },
                ]}
                onPress={handleSend}
                disabled={!canSubmit || loading}
              >
                <Text style={styles.btnPrimaryLabel}>
                  {loading ? "Enviando…" : "Enviar link de recuperação"}
                </Text>
              </Pressable>

              {/* Divisor */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Voltar */}
              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && { backgroundColor: BRAND_LIGHT },
                ]}
                onPress={() => navigation?.goBack?.()}
                disabled={loading}
              >
                <Icon source="arrow-left" size={16} color={NAVY} />
                <Text style={styles.btnOutlineLabel}>Voltar para o login</Text>
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
    justifyContent: "center",
  },

  // Hero
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

  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
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
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.6,
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

  // Card
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

  // Campo
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

  // Sucesso
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: SUCCESS_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    marginBottom: 16,
  },

  infoText: {
    fontSize: 13,
    color: SUCCESS,
    flex: 1,
    lineHeight: 18,
    fontWeight: "600",
  },

  // Dica
  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginBottom: 16,
  },

  hintText: {
    fontSize: 12,
    color: MUTED,
    flex: 1,
    lineHeight: 17,
  },

  // Botão primário
  btnPrimary: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
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
  },

  // Botão outline
  btnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 16,
    height: 52,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "transparent",
  },

  btnOutlineLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: NAVY,
  },
});