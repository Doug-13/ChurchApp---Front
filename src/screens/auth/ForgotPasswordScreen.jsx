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

export default function ForgotPasswordScreen({ navigation }) {
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // mensagens “genéricas” (segurança)
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

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

      // ✅ Aqui você chama seu fluxo real:
      // await resetPassword(e);
      // Ex: firebase.auth().sendPasswordResetEmail(e)

      // Mensagem genérica (boa prática)
      setInfo("Se o e-mail existir, enviaremos um link de recuperação.");
    } catch (err) {
      // também mantém genérico
      setInfo("Se o e-mail existir, enviaremos um link de recuperação.");
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
              Recuperar senha 🔐
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Enviaremos um link se o e-mail existir.
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
              Informe seu e-mail
            </Text>

            <TextInput
              mode="outlined"
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
            />

            {!!error && (
              <Text style={[styles.msg, { color: theme.colors.error }]}>{error}</Text>
            )}

            {!!info && (
              <Text style={[styles.msg, { color: theme.colors.primary }]}>{info}</Text>
            )}

            <Button
              mode="contained"
              onPress={handleSend}
              disabled={!canSubmit}
              loading={loading}
              style={styles.primaryBtn}
              contentStyle={styles.primaryBtnContent}
              labelStyle={styles.primaryBtnLabel}
            >
              Enviar link
            </Button>

            <Button
              mode="text"
              onPress={() => navigation?.goBack?.()}
              style={styles.linkBtn}
              labelStyle={{ opacity: 0.9 }}
            >
              Voltar para o login
            </Button>

            <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              Dica: verifique também sua caixa de spam/lixo eletrônico.
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

  card: { borderRadius: 22, padding: 18, borderWidth: 1 },

  input: { marginTop: 10 },

  msg: { marginTop: 10, fontSize: 13, lineHeight: 18 },

  primaryBtn: { marginTop: 14, borderRadius: 16 },
  primaryBtnContent: { height: 50 },
  primaryBtnLabel: { fontSize: 16, fontWeight: "700" },

  linkBtn: { marginTop: 6, alignSelf: "center" },

  hint: { marginTop: 10, fontSize: 12, lineHeight: 16, opacity: 0.95 },
});
