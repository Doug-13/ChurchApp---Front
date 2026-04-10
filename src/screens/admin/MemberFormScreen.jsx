import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const ROLES = ["Membro", "Obreiro", "Líder", "Admin"];
const STATUSES = ["Ativo", "Inativo"];
const CELLS = ["Célula Centro", "Célula Zona Sul", "Célula Norte"]; // 🔧 virá do Firestore
const MINISTRIES = ["Louvor", "Mídia", "Recepção", "Infantil", "Intercessão"];

function SelectChipRow({ label, options, value, onChange }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{label}</Text>
      <View style={styles.chipsWrap}>
        {options.map((opt) => (
          <Chip
            key={opt}
            selected={value === opt}
            onPress={() => onChange(opt)}
            mode={value === opt ? "flat" : "outlined"}
            style={{ borderRadius: 999 }}
          >
            {opt}
          </Chip>
        ))}
      </View>
    </View>
  );
}

export default function MemberFormScreen({ navigation, route }) {
  const theme = useTheme();
  const editingId = route.params?.id;

  // 🔧 se estiver editando, você preencheria com dados do Firestore
  const [photoUrl, setPhotoUrl] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cell, setCell] = useState("");
  const [role, setRole] = useState("Membro");
  const [status, setStatus] = useState("Ativo");

  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSave = useMemo(() => {
    const n = name.trim();
    const e = email.trim();
    const okName = n.length >= 2;
    const okEmail = !e || e.includes("@"); // opcional
    const okPhone = !phone || phone.length >= 8; // simples
    return okName && okEmail && okPhone && !loading;
  }, [name, email, phone, loading]);

  function toggleMinistry(m) {
    setMinistries((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function handlePickPhoto() {
    // ✅ Aqui você pluga um picker (react-native-image-picker, etc.)
    // Depois de fazer upload no Firebase Storage, setPhotoUrl(url)
    // setPhotoUrl("https://...");

    // placeholder:
    setError("Integre um image picker para selecionar a foto.");
  }

  async function handleSave() {
    setError("");

    const n = name.trim();
    const e = email.trim();

    if (n.length < 2) return setError("Informe o nome do membro.");
    if (e && !e.includes("@")) return setError("E-mail inválido.");

    try {
      setLoading(true);

      // ✅ Aqui você salva no Firestore/API:
      // await saveMember({
      //   id: editingId,
      //   name: n,
      //   email: e,
      //   phone,
      //   cell,
      //   role,
      //   status,
      //   ministries,
      //   photoUrl,
      // });

      navigation.goBack?.();
    } catch (err) {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
            {editingId ? "Editar membro" : "Novo membro"}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Dados do membro, célula e vínculos de ministério
          </Text>
        </View>

        {/* Foto + ações */}
        <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
          <Card.Content style={{ gap: 12 }}>
            <View style={styles.photoRow}>
              {photoUrl ? (
                <Avatar.Image size={72} source={{ uri: photoUrl }} />
              ) : (
                <Avatar.Icon
                  size={72}
                  icon="account"
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                  color={theme.colors.primary}
                />
              )}

              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                  Foto do membro
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Ajuda no diretório e nas escalas
                </Text>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <Button
                    mode="contained-tonal"
                    icon="camera-outline"
                    onPress={handlePickPhoto}
                    style={{ borderRadius: 14 }}
                  >
                    Alterar foto
                  </Button>
                  {photoUrl ? (
                    <Button
                      mode="outlined"
                      icon="trash-can-outline"
                      onPress={() => setPhotoUrl(null)}
                      style={{ borderRadius: 14 }}
                    >
                      Remover
                    </Button>
                  ) : null}
                </View>
              </View>
            </View>

            <Divider />

            {/* Campos principais */}
            <TextInput
              mode="outlined"
              label="Nome"
              value={name}
              onChangeText={setName}
              left={<TextInput.Icon icon="account-outline" />}
            />

            <TextInput
              mode="outlined"
              label="E-mail (opcional)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email-outline" />}
              style={{ marginTop: 12 }}
            />

            <TextInput
              mode="outlined"
              label="Telefone (opcional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone-outline" />}
              style={{ marginTop: 12 }}
            />

            <TextInput
              mode="outlined"
              label="Célula"
              value={cell}
              onChangeText={setCell}
              placeholder="Ex: Célula Centro"
              left={<TextInput.Icon icon="home-group" />}
              style={{ marginTop: 12 }}
              right={
                <TextInput.Icon
                  icon="chevron-down"
                  onPress={() => {
                    // 🔧 se quiser, aqui você abre um modal/picker com CELLS
                    setError("Sugestão: abrir modal de seleção de célula.");
                  }}
                />
              }
            />

            {/* Chips: Cargo/Status */}
            <SelectChipRow label="Cargo" options={ROLES} value={role} onChange={setRole} />
            <SelectChipRow label="Status" options={STATUSES} value={status} onChange={setStatus} />

            {/* Ministérios */}
            <View style={{ marginTop: 14 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                Ministérios
              </Text>
              <View style={styles.chipsWrap}>
                {MINISTRIES.map((m) => {
                  const selected = ministries.includes(m);
                  return (
                    <Chip
                      key={m}
                      selected={selected}
                      onPress={() => toggleMinistry(m)}
                      mode={selected ? "flat" : "outlined"}
                      icon={selected ? "check" : "tag-outline"}
                      style={{ borderRadius: 999 }}
                    >
                      {m}
                    </Chip>
                  );
                })}
              </View>
            </View>

            {!!error && (
              <Text style={{ color: theme.colors.error, marginTop: 12 }}>{error}</Text>
            )}

            {/* Ações */}
            <View style={styles.actionsRow}>
              <Button
                mode="outlined"
                onPress={() => navigation.goBack?.()}
                style={{ flex: 1, borderRadius: 16 }}
                contentStyle={{ height: 50 }}
              >
                Cancelar
              </Button>

              <Button
                mode="contained"
                onPress={handleSave}
                loading={loading}
                disabled={!canSave}
                style={{ flex: 1, borderRadius: 16 }}
                contentStyle={{ height: 50 }}
                icon="content-save-outline"
              >
                Salvar
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, paddingBottom: 28 },

  header: { marginBottom: 12 },

  card: { borderRadius: 18 },

  photoRow: { flexDirection: "row", alignItems: "center", gap: 14 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
});
