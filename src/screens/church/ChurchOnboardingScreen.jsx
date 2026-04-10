import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
  useTheme,
  Snackbar,
} from "react-native-paper";

import {
  searchChurches,
  createChurch,
  joinChurch as joinChurchApi,
  // joinByInviteCode as joinByInviteCodeApi, // se você implementar no back
} from "../../services/churchService";

function slugify(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function ChurchOnboardingScreen({ navigation }) {
  const theme = useTheme();

  const [tab, setTab] = useState("search"); // search | code | create

  // SEARCH
  const [q, setQ] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [churches, setChurches] = useState([]);

  // CODE
  const [code, setCode] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);

  // CREATE
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [creating, setCreating] = useState(false);

  // UX
  const [snack, setSnack] = useState({ visible: false, text: "" });
  const showError = (text) => setSnack({ visible: true, text: String(text || "") });

  // 🔎 Busca no backend (debounce simples)
  useEffect(() => {
    let alive = true;
    const term = q.trim();

    const t = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const data = await searchChurches(term);
        if (!alive) return;
        setChurches(Array.isArray(data) ? data : []);
      } catch (e) {
        showError("Erro ao buscar igrejas. Verifique sua conexão.");
      } finally {
        if (alive) setLoadingSearch(false);
      }
    }, 350);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  function goToHomeTab() {
    const parent = navigation.getParent?.();
    if (parent?.reset) {
      parent.reset({ index: 0, routes: [{ name: "HomeTab" }] });
      return;
    }
    navigation.navigate("HomeTab");
  }

  async function handleOpenChurch(church) {
    navigation.navigate("ChurchPublicProfile", { church });
  }

  // ✅ Placeholder (não quebra build)
  async function handleJoinByCode() {
    if (!code.trim()) return;
    try {
      setLoadingCode(true);

      // Se implementar no backend:
      // const result = await joinByInviteCodeApi(code.trim());
      // if (result.status === "PENDING") return navigation.replace("PendingApproval", { churchId: result.churchId });
      // goToHomeTab();

      showError("Fluxo por código ainda não implementado no backend.");
    } catch (e) {
      showError(e?.message || "Erro ao entrar com código.");
    } finally {
      setLoadingCode(false);
    }
  }

  async function handleCreateChurch() {
    const name = newName.trim();
    const city = newCity.trim();
    const uf = newState.trim().toUpperCase();

    if (!name) return showError("Informe o nome da igreja.");
    if (!city) return showError("Informe a cidade.");
    if (!uf || uf.length !== 2) return showError("Informe a UF (2 letras).");

    try {
      setCreating(true);

      const baseSlug = slugify(name);

      const basePayload = {
        name,
        city,
        state: uf,
        isPublic: true,
      };

      // tenta criar com slug único (até 3 tentativas)
      let lastErr = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const slug =
          attempt === 0 ? baseSlug : `${baseSlug}-${Math.floor(Math.random() * 1000)}`;

        const payload = { ...basePayload, slug };

        console.log("🟦 CREATE CHURCH payload =>", payload);

        try {
          const church = await createChurch(payload);
          console.log("✅ CREATE CHURCH result =>", church);

          // ✅ normalmente o backend já cria membership OWNER
          // (se você quiser garantir e seu endpoint for idempotente, pode habilitar)
          // await joinChurchApi(church.id);

          goToHomeTab();
          return;
        } catch (e) {
          lastErr = e;
          const msg = String(e?.message || e);

          // slug em uso -> tenta outro
          if (msg.includes("Slug já em uso") || msg.includes("409")) {
            continue;
          }

          throw e;
        }
      }

      throw lastErr || new Error("Não foi possível gerar um slug único.");
    } catch (e) {
      console.log("🔥 handleCreateChurch error =>", e);
      showError(e?.message || "Erro ao criar igreja.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={{ gap: 6 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
            Vincule sua igreja
          </Text>
          <Text style={{ opacity: 0.7 }}>
            Para continuar, entre em uma igreja existente ou crie uma.
          </Text>
        </View>

        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: "search", label: "Buscar", icon: "magnify" },
            { value: "code", label: "Código", icon: "qrcode" },
            { value: "create", label: "Criar", icon: "plus-circle-outline" },
          ]}
          style={{ marginTop: 14 }}
        />
      </Surface>

      {tab === "search" && (
        <View style={{ flex: 1 }}>
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <TextInput
              mode="outlined"
              label="Buscar igreja"
              placeholder="Nome, cidade, estado..."
              value={q}
              onChangeText={setQ}
              left={<TextInput.Icon icon="magnify" />}
              right={q ? <TextInput.Icon icon="close" onPress={() => setQ("")} /> : null}
            />

            <View style={styles.filtersRow}>
              <Chip icon="map-marker" compact>
                Perto de mim
              </Chip>
              <Chip icon="filter-variant" compact>
                Filtros
              </Chip>
              <Chip icon="information-outline" compact>
                Como funciona
              </Chip>
            </View>
          </Surface>

          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, flex: 1 }}>
            {loadingSearch ? (
              <View style={styles.center}>
                <ActivityIndicator />
                <Text style={{ marginTop: 10, opacity: 0.7 }}>Buscando igrejas...</Text>
              </View>
            ) : (
              <FlatList
                data={churches}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                renderItem={({ item }) => (
                  <Card mode="elevated" style={styles.churchCard} onPress={() => handleOpenChurch(item)}>
                    <Card.Content style={{ gap: 12 }}>
                      <View style={styles.rowBetween}>
                        <View style={styles.row}>
                          {item.photoUrl ? (
                            <Avatar.Image size={44} source={{ uri: item.photoUrl }} />
                          ) : (
                            <Avatar.Icon size={44} icon="church" />
                          )}
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ fontWeight: "900" }} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={{ opacity: 0.7 }} numberOfLines={1}>
                              {item.city ?? "-"} • {item.state ?? "-"}
                            </Text>
                          </View>
                        </View>

                        <Icon source="chevron-right" size={22} />
                      </View>

                      <View style={styles.rowWrap}>
                        <Chip compact icon="eye">
                          {item.isPublic ? "Pública" : "Privada"}
                        </Chip>
                        <Chip compact icon={item.requiresApproval ? "shield-check" : "check-circle"}>
                          {item.requiresApproval ? "Aprovação" : "Entrada direta"}
                        </Chip>
                      </View>
                    </Card.Content>
                  </Card>
                )}
                ListEmptyComponent={() => (
                  <Surface style={[styles.empty, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <Text style={{ fontWeight: "900" }}>Nenhuma igreja encontrada</Text>
                    <Text style={{ opacity: 0.7, marginTop: 6 }}>
                      Tente outro termo, use “Código” ou crie uma nova igreja.
                    </Text>
                    <Button mode="contained" style={{ marginTop: 12 }} onPress={() => setTab("create")}>
                      Criar igreja
                    </Button>
                  </Surface>
                )}
              />
            )}
          </View>
        </View>
      )}

      {tab === "code" && (
        <View style={{ padding: 16, gap: 12 }}>
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleMedium" style={{ fontWeight: "900" }}>
              Entrar com código
            </Text>
            <Text style={{ opacity: 0.7, marginTop: 4 }}>
              Digite o código de convite fornecido pela sua igreja.
            </Text>

            <Divider style={{ marginVertical: 12 }} />

            <TextInput
              mode="outlined"
              label="Código"
              placeholder="Ex: ABCD-1234"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              left={<TextInput.Icon icon="qrcode" />}
            />

            <Button
              mode="contained"
              onPress={handleJoinByCode}
              loading={loadingCode}
              disabled={!code.trim() || loadingCode}
              style={{ marginTop: 12 }}
            >
              Entrar
            </Button>

            <Button mode="text" onPress={() => setTab("search")} style={{ marginTop: 6 }}>
              Buscar pelo nome
            </Button>
          </Surface>
        </View>
      )}

      {tab === "create" && (
        <View style={{ padding: 16, gap: 12 }}>
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleMedium" style={{ fontWeight: "900" }}>
              Criar igreja
            </Text>
            <Text style={{ opacity: 0.7, marginTop: 4 }}>
              Você ficará como responsável (owner) e poderá aprovar membros.
            </Text>

            <Divider style={{ marginVertical: 12 }} />

            <TextInput
              mode="outlined"
              label="Nome da igreja"
              value={newName}
              onChangeText={setNewName}
              left={<TextInput.Icon icon="church" />}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  mode="outlined"
                  label="Cidade"
                  value={newCity}
                  onChangeText={setNewCity}
                  left={<TextInput.Icon icon="map-marker" />}
                />
              </View>

              <View style={{ width: 90 }}>
                <TextInput
                  mode="outlined"
                  label="UF"
                  value={newState}
                  onChangeText={setNewState}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleCreateChurch}
              loading={creating}
              disabled={creating || !newName.trim() || !newCity.trim() || !newState.trim()}
              style={{ marginTop: 12 }}
            >
              Criar e continuar
            </Button>

            <Button mode="text" onPress={() => setTab("search")} style={{ marginTop: 6 }}>
              Já existe? Buscar igreja
            </Button>
          </Surface>
        </View>
      )}

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({ visible: false, text: "" })}
        duration={3000}
      >
        {snack.text}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  section: { padding: 14, borderRadius: 18 },
  filtersRow: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
  churchCard: { borderRadius: 18 },
  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 16, borderRadius: 18, marginTop: 10 },
});
