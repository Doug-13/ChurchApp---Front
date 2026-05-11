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
import auth from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND_BLUE  = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const MUTED       = "#9198B5";
const BG          = "#F5F6FA";
const BORDER      = "#E4E6F0";
const DANGER      = "#E84D4D";
const DANGER_BG   = "#FEECEC";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFirebaseAuthErrorMessage(err) {
  const code = err?.code;
  switch (code) {
    case "auth/email-already-in-use":   return "Esse e-mail já está em uso.";
    case "auth/invalid-email":           return "E-mail inválido.";
    case "auth/weak-password":           return "Senha fraca. Use pelo menos 6 caracteres.";
    case "auth/network-request-failed":  return "Sem conexão. Verifique sua rede.";
    case "auth/too-many-requests":       return "Muitas tentativas. Aguarde e tente novamente.";
    case "auth/operation-not-allowed":   return "Login por e-mail/senha não está habilitado.";
    default: return `Não foi possível criar sua conta. (${code || "sem-código"})`;
  }
}

async function syncUserInNeonWithBackend(idToken) {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao sincronizar (${res.status}). ${txt}`);
  }
  return res.json();
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [pass,         setPass]         = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const canSubmit = useMemo(() => {
    const e = email.trim().toLowerCase();
    const n = name.trim();
    return (
      n.length >= 2 &&
      e.length > 4 &&
      e.includes("@") &&
      pass.length >= 6 &&
      pass === confirm &&
      !loading
    );
  }, [name, email, pass, confirm, loading]);

  // Feedback de força da senha
  const passStrength = useMemo(() => {
    if (!pass) return null;
    if (pass.length < 6)  return { label: "Muito curta", color: DANGER };
    if (pass.length < 10) return { label: "Razoável",    color: "#F5A623" };
    return                       { label: "Forte",        color: "#2DBF8A" };
  }, [pass]);

  const passwordsMatch = confirm.length > 0 && pass === confirm;
  const passwordsMismatch = confirm.length > 0 && pass !== confirm;

  async function handleRegister() {
    if (loading) return;
    setError("");

    const n = name.trim();
    const e = email.trim().toLowerCase();

    if (n.length < 2)           return setError("Informe seu nome completo.");
    if (!e.includes("@"))       return setError("Informe um e-mail válido.");
    if (pass.length < 6)        return setError("A senha deve ter pelo menos 6 caracteres.");
    if (pass !== confirm)       return setError("As senhas não conferem.");

    try {
      setLoading(true);
      const cred  = await auth().createUserWithEmailAndPassword(e, pass);
      await cred.user.updateProfile({ displayName: n });
      const token = await cred.user.getIdToken(true);
      await syncUserInNeonWithBackend(token);
      navigation.goBack();
    } catch (err) {
      const msg = err?.code
        ? getFirebaseAuthErrorMessage(err)
        : String(err?.message || err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function field(name) {
    return {
      onFocus: () => setFocusedField(name),
      onBlur:  () => setFocusedField(null),
    };
  }

  function iconColor(name) {
    return focusedField === name ? BRAND_BLUE : MUTED;
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

              <View style={styles.heroIconWrap}>
                <Icon source="account-plus-outline" size={28} color="#fff" />
              </View>

              <View style={styles.heroBadge}>
                <View style={[styles.heroBadgeDot, { backgroundColor: "#7EFFD4" }]} />
                <Text style={styles.heroBadgeText}>Cadastro gratuito</Text>
              </View>

              <Text style={styles.heroTitle}>Criar conta</Text>
              <Text style={styles.heroSubtitle}>
                Acesse escalas, células e novidades da sua igreja.
              </Text>
            </View>

            {/* ── Card de formulário ── */}
            <View style={styles.card}>

              {/* Nome */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NOME COMPLETO</Text>
                <TextInput
                  mode="outlined"
                  value={name}
                  onChangeText={(t) => { setName(t); if (error) setError(""); }}
                  {...field("name")}
                  placeholder="Seu nome"
                  autoCapitalize="words"
                  left={<TextInput.Icon icon="account-outline" color={iconColor("name")} />}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  outlineColor={BORDER}
                  activeOutlineColor={BRAND_BLUE}
                  returnKeyType="next"
                  theme={{ colors: { background: "transparent" } }}
                />
              </View>

              {/* E-mail */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>E-MAIL</Text>
                <TextInput
                  mode="outlined"
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (error) setError(""); }}
                  {...field("email")}
                  placeholder="seuemail@dominio.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  left={<TextInput.Icon icon="email-outline" color={iconColor("email")} />}
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
                  value={pass}
                  onChangeText={(t) => { setPass(t); if (error) setError(""); }}
                  {...field("pass")}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry={!showPass}
                  left={<TextInput.Icon icon="lock-outline" color={iconColor("pass")} />}
                  right={
                    <TextInput.Icon
                      icon={showPass ? "eye-off-outline" : "eye-outline"}
                      color={MUTED}
                      onPress={() => setShowPass((v) => !v)}
                    />
                  }
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  outlineColor={BORDER}
                  activeOutlineColor={BRAND_BLUE}
                  returnKeyType="next"
                  theme={{ colors: { background: "transparent" } }}
                />
                {/* Força da senha */}
                {passStrength && (
                  <View style={styles.strengthRow}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor:
                                (passStrength.color === DANGER  && i <= 1) ||
                                (passStrength.color === "#F5A623" && i <= 2) ||
                                (passStrength.color === "#2DBF8A" && i <= 3)
                                  ? passStrength.color
                                  : BORDER,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: passStrength.color }]}>
                      {passStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirmar senha */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CONFIRMAR SENHA</Text>
                <TextInput
                  mode="outlined"
                  value={confirm}
                  onChangeText={(t) => { setConfirm(t); if (error) setError(""); }}
                  {...field("confirm")}
                  placeholder="Repita a senha"
                  secureTextEntry={!showConfirm}
                  left={
                    <TextInput.Icon
                      icon={
                        passwordsMatch    ? "check-circle-outline" :
                        passwordsMismatch ? "alert-circle-outline"  :
                        "lock-check-outline"
                      }
                      color={
                        passwordsMatch    ? "#2DBF8A" :
                        passwordsMismatch ? DANGER    :
                        iconColor("confirm")
                      }
                    />
                  }
                  right={
                    <TextInput.Icon
                      icon={showConfirm ? "eye-off-outline" : "eye-outline"}
                      color={MUTED}
                      onPress={() => setShowConfirm((v) => !v)}
                    />
                  }
                  style={styles.input}
                  outlineStyle={[
                    styles.inputOutline,
                    passwordsMismatch && { borderColor: DANGER },
                    passwordsMatch    && { borderColor: "#2DBF8A" },
                  ]}
                  outlineColor={
                    passwordsMismatch ? DANGER    :
                    passwordsMatch    ? "#2DBF8A" :
                    BORDER
                  }
                  activeOutlineColor={
                    passwordsMismatch ? DANGER    :
                    passwordsMatch    ? "#2DBF8A" :
                    BRAND_BLUE
                  }
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  theme={{ colors: { background: "transparent" } }}
                />
                {passwordsMismatch && (
                  <Text style={styles.mismatchText}>As senhas não conferem</Text>
                )}
              </View>

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
                onPress={handleRegister}
                disabled={!canSubmit || loading}
              >
                <Text style={styles.btnPrimaryLabel}>
                  {loading ? "Criando conta…" : "Criar conta"}
                </Text>
              </Pressable>

              {/* Divisor */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Já tenho conta */}
              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  pressed && { backgroundColor: BRAND_LIGHT },
                ]}
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <Icon source="arrow-left" size={16} color={NAVY} />
                <Text style={styles.btnOutlineLabel}>Já tenho conta • Entrar</Text>
              </Pressable>

              {/* Hint */}
              <Text style={styles.hint}>
                Ao criar uma conta, você poderá acessar escalas, células e novidades.
              </Text>

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

  // Campos
  fieldGroup: {
    marginBottom: 14,
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

  // Força da senha
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },

  strengthBars: {
    flexDirection: "row",
    gap: 4,
  },

  strengthBar: {
    width: 32,
    height: 4,
    borderRadius: 999,
  },

  strengthLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Mismatch
  mismatchText: {
    fontSize: 11,
    color: DANGER,
    fontWeight: "600",
    marginTop: 5,
    marginLeft: 4,
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

  btnPrimaryDisabled: { opacity: 0.45 },

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

  // Hint
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
    lineHeight: 17,
  },
});