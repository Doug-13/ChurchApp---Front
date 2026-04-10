

import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
} from "react-native";
import { Button, Text, TextInput, Surface, useTheme } from "react-native-paper";
import auth from "@react-native-firebase/auth";
import { API_BASE_URL } from '../../config/api';

// 🔁 Troque pelo IP da sua máquina na rede (ou URL do deploy)

function getFirebaseAuthErrorMessage(err) {
  const code = err?.code;

  switch (code) {
    case "auth/email-already-in-use":
      return "Esse e-mail já está em uso.";
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/weak-password":
      return "Senha fraca. Use pelo menos 6 caracteres.";
    case "auth/network-request-failed":
      return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde um pouco e tente novamente.";
    case "auth/operation-not-allowed":
      return "Login por e-mail/senha não está habilitado no Firebase (Authentication > Sign-in method).";
    case "auth/invalid-api-key":
      return "Chave do Firebase inválida. Verifique o google-services.json do app.";
    case "auth/app-not-authorized":
      return "App não autorizado. Verifique o packageName e o google-services.json.";
    default:
      return `Não foi possível criar sua conta. (${code || "sem-código"})`;
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

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const e = email.trim().toLowerCase();
    const n = name.trim();
    const okEmail = e.length > 4 && e.includes("@");
    const okName = n.length >= 2;
    const okPass = pass.length >= 6 && pass === confirm;
    return okEmail && okName && okPass && !loading;
  }, [name, email, pass, confirm, loading]);

  async function handleRegister() {
    if (loading) return;
    setError("");

    const n = name.trim();
    const e = email.trim().toLowerCase();

    if (n.length < 2) return setError("Informe seu nome.");
    if (!e || !e.includes("@")) return setError("Informe um e-mail válido.");
    if (!pass || pass.length < 6) return setError("A senha deve ter pelo menos 6 caracteres.");
    if (pass !== confirm) return setError("As senhas não conferem.");

    try {
      setLoading(true);

      // 1) Cria no Firebase Auth
      const cred = await auth().createUserWithEmailAndPassword(e, pass);

      // 2) Salva o nome no Firebase (displayName)
      await cred.user.updateProfile({ displayName: n });

      // 3) Força refresh do token para trazer nome no token
      const token = await cred.user.getIdToken(true);

      // 4) Sincroniza no Neon via backend (upsert por firebaseUid)
      await syncUserInNeonWithBackend(token);

      // ✅ Sucesso: volta para login (ou vai para home)
      navigation.goBack();
    } catch (err) {
      console.log("🔥 REGISTER ERROR RAW =>", err);
      console.log("🔥 REGISTER ERROR code =>", err?.code);
      console.log("🔥 REGISTER ERROR message =>", err?.message);

      // Se o erro tiver code é do Firebase; senão é do backend/geral
      const msg = err?.code ? getFirebaseAuthErrorMessage(err) : String(err?.message || err);
      setError(msg);

      // (Opcional) Se quiser evitar “usuário no Firebase mas não no Neon”
      // se o erro foi no backend, pode deletar o user recém criado:
      //
      // if (!err?.code) {
      //   try { await auth().currentUser?.delete(); } catch (_) {}
      // }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Background decorativo */}
          <View style={styles.bg}>
            <View
              style={[
                styles.blob,
                styles.blob1,
                { backgroundColor: theme.colors.primary, opacity: 0.18 },
              ]}
            />
            <View
              style={[
                styles.blob,
                styles.blob2,
                { backgroundColor: theme.colors.secondary ?? theme.colors.primary, opacity: 0.14 },
              ]}
            />
            <View
              style={[
                styles.blob,
                styles.blob3,
                { backgroundColor: theme.colors.tertiary ?? theme.colors.primary, opacity: 0.1 },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineLarge" style={styles.title}>
              Criar conta ✨
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Crie seu acesso para participar da sua igreja
            </Text>
          </View>

          {/* Card */}
          <Surface
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            elevation={2}
          >
            <Text variant="titleMedium" style={{ marginBottom: 10 }}>
              Dados de cadastro
            </Text>

            <TextInput
              mode="outlined"
              label="Nome"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError("");
              }}
              autoCapitalize="words"
              left={<TextInput.Icon icon="account-outline" />}
              style={styles.input}
              returnKeyType="next"
            />

            <TextInput
              mode="outlined"
              label="E-mail"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
              returnKeyType="next"
            />

            <TextInput
              mode="outlined"
              label="Senha"
              value={pass}
              onChangeText={(t) => {
                setPass(t);
                if (error) setError("");
              }}
              secureTextEntry={!showPass}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPass ? "eye-off-outline" : "eye-outline"}
                  onPress={() => setShowPass((v) => !v)}
                />
              }
              style={styles.input}
              returnKeyType="next"
            />

            <TextInput
              mode="outlined"
              label="Confirmar senha"
              value={confirm}
              onChangeText={(t) => {
                setConfirm(t);
                if (error) setError("");
              }}
              secureTextEntry={!showConfirm}
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={
                <TextInput.Icon
                  icon={showConfirm ? "eye-off-outline" : "eye-outline"}
                  onPress={() => setShowConfirm((v) => !v)}
                />
              }
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            {!!error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}

            <Button
              mode="contained"
              onPress={handleRegister}
              disabled={!canSubmit}
              loading={loading}
              style={styles.primaryBtn}
              contentStyle={styles.primaryBtnContent}
              labelStyle={styles.primaryBtnLabel}
            >
              Criar conta
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              style={styles.linkBtn}
              labelStyle={{ opacity: 0.9 }}
              disabled={loading}
            >
              Já tenho conta • Entrar
            </Button>

            <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              Ao criar uma conta, você poderá acessar escalas, células e novidades.
            </Text>
          </Surface>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, justifyContent: "center" },

  bg: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  blob: { position: "absolute", borderRadius: 999 },
  blob1: { width: 280, height: 280, top: -70, left: -80 },
  blob2: { width: 220, height: 220, bottom: 40, right: -70 },
  blob3: { width: 160, height: 160, top: 110, right: -40 },

  header: { marginBottom: 18 },
  title: { fontWeight: "800" },
  subtitle: { marginTop: 6, fontSize: 14 },

  card: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },

  input: { marginTop: 10 },
  error: { marginTop: 10, fontSize: 13 },

  primaryBtn: { marginTop: 16, borderRadius: 16 },
  primaryBtnContent: { height: 50 },
  primaryBtnLabel: { fontSize: 16, fontWeight: "700" },

  linkBtn: { marginTop: 6, alignSelf: "center" },
  hint: { marginTop: 10, fontSize: 12, lineHeight: 16, opacity: 0.95 },
});
