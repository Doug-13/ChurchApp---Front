import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Image } from "react-native";
import {
  Card,
  Text,
  Button,
  Avatar,
  Chip,
  IconButton,
  ActivityIndicator,
  Portal,
  Modal,
  Searchbar,
  Snackbar,
  Divider,
  Surface,
  Icon,
} from "react-native-paper";
import { getAuth } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

const DS = {
  colors: {
    primary: "#1CA7D1",
    primaryDark: "#177E9C",
    accent: "#46BCB1",
    bg: "#F5F7FB",
    card: "#FFFFFF",
    surface: "#FFFFFF",
    backgroundAlt: "#F1F4FA",
    text: "#333F42",
    textMuted: "#707D80",
    border: "#DFE1E1",
    outline: "#DFE1E1",
    tint: "#E3F7FC",
    danger: "#F95F5C",
  },
  radius: { sm: 12, md: 14, lg: 18, card: 18, pill: 999 },
  space: (n) => n * 8,
};

function withAlpha(hex, alphaHex = "14") {
  const h = String(hex || "").trim();
  if (!/^#?[0-9a-fA-F]{6}$/.test(h)) return hex;
  const clean = h.startsWith("#") ? h.slice(1) : h;
  return `#${clean}${alphaHex}`;
}
function isHttpUrl(u) {
  const s = String(u || "").trim();
  return /^https?:\/\/\S+/i.test(s);
}
function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

// ✅ authedFetch com timeout + AbortController
async function authedFetch(path, { method = "GET", body, signal } = {}, authCtx) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE_URL}${path}`;

  console.log("🌐 [authedFetch] =>", { method, url, body });

  const res = await fetch(url, {
    method,
    headers,
    signal,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  console.log("🌐 [authedFetch] <=", { status: res.status, ok: res.ok, data });

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `Erro ao comunicar com o servidor (${res.status}).`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

function MemberCascadeModal({ visible, onDismiss, title, items, loading, selectedIds = [], onPick }) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!visible) setQ("");
  }, [visible]);

  const filtered = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    const base = Array.isArray(items) ? items : [];
    const available = base.filter((m) => !selectedIds.includes(m.id));
    if (!term) return available;
    return available.filter((m) => {
      const hay = [m.fullName, m.phone].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [items, q, selectedIds]);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalCard}>
        <View style={{ gap: 12 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <IconButton icon="close" onPress={onDismiss} style={{ margin: 0 }} />
          </View>

          <Searchbar
            placeholder="Buscar membro..."
            value={q}
            onChangeText={setQ}
            style={styles.modalSearch}
            inputStyle={{ color: DS.colors.text }}
            iconColor={DS.colors.textMuted}
            placeholderTextColor={DS.colors.textMuted}
          />

          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10 }}>
              <ActivityIndicator />
              <Text style={{ color: DS.colors.textMuted }}>Carregando membros...</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {filtered.length === 0 ? (
                <View style={{ padding: 14 }}>
                  <Text style={{ color: DS.colors.textMuted }}>Nenhum membro disponível.</Text>
                </View>
              ) : (
                filtered.map((m) => (
                  <Card key={m.id} mode="outlined" style={styles.pickRow} onPress={() => onPick(m)}>
                    <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Avatar.Text
                        size={40}
                        label={initials(m.fullName)}
                        color="#fff"
                        style={{ backgroundColor: DS.colors.primary }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "900", color: DS.colors.text }} numberOfLines={1}>
                          {m.fullName || "Membro"}
                        </Text>
                        <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                          {m.phone || "Sem telefone"}
                        </Text>
                      </View>
                      <IconButton icon="plus" iconColor={DS.colors.primaryDark} onPress={() => onPick(m)} />
                    </Card.Content>
                  </Card>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

export default function CellDetailsScreen({ navigation, route }) {
  const authCtx = useAuth();

  // ✅ aceita diferentes formatos
  const cellId =
    route?.params?.id ||
    route?.params?.cellId ||
    route?.params?.cell?.id ||
    null;

  const [cell, setCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [churchMembers, setChurchMembers] = useState([]);
  const [churchMembersLoading, setChurchMembersLoading] = useState(false);

  const [snack, setSnack] = useState({ visible: false, text: "" });

  useEffect(() => {
    console.log("🧩 [CellDetails] route.params =>", route?.params);
    console.log("🧩 [CellDetails] cellId =>", cellId);
  }, [route?.params, cellId]);

  const loadCell = useCallback(
    async (mode = "load") => {
      // ✅ CORREÇÃO: se não tem id, não fica travado no loading
      if (!cellId) {
        setError("ID da célula não foi enviado na navegação (route.params).");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      setError("");

      // ✅ timeout pra não travar
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);

      try {
        const data = await authedFetch(`/cells/${cellId}`, { signal: controller.signal }, authCtx);
        setCell(data);
      } catch (e) {
        const msg =
          e?.name === "AbortError"
            ? "Tempo esgotado ao carregar a célula (timeout)."
            : e?.message || "Erro ao carregar célula.";
        setError(msg);
      } finally {
        clearTimeout(t);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cellId, authCtx]
  );

  useEffect(() => {
    loadCell("load");
  }, [loadCell]);

  const churchId = cell?.churchId || authCtx?.activeChurch?.id || null;

  const memberIdsInCell = useMemo(() => {
    const arr = Array.isArray(cell?.members) ? cell.members : [];
    return arr.map((m) => m.id).filter(Boolean);
  }, [cell]);

  const loadChurchMembers = useCallback(async () => {
    if (!churchId) {
      setChurchMembers([]);
      return;
    }
    setChurchMembersLoading(true);
    try {
      const data = await authedFetch(`/members?churchId=${encodeURIComponent(churchId)}`, {}, authCtx);
      const list = Array.isArray(data) ? data : data?.items || data?.members || [];
      const normalized = (list || [])
        .map((x) => ({
          id: x.id,
          fullName: x.fullName || x.name || "Membro",
          phone: x.phone || null,
          photoUrl: x.photoUrl || null,
          userId: x.userId || null,
        }))
        .filter((m) => !!m.id);

      normalized.sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));
      setChurchMembers(normalized);
    } catch (e) {
      setChurchMembers([]);
      setSnack({ visible: true, text: e?.message || "Erro ao carregar membros da igreja." });
    } finally {
      setChurchMembersLoading(false);
    }
  }, [churchId, authCtx]);

  useEffect(() => {
    if (addOpen) loadChurchMembers();
  }, [addOpen, loadChurchMembers]);

  const addMemberToCell = useCallback(
    async (member) => {
      if (!cellId || !member?.id) return;

      try {
        await authedFetch(`/cells/${cellId}/members`, { method: "POST", body: { memberId: member.id } }, authCtx);
        setSnack({ visible: true, text: "Membro adicionado à célula!" });
        setAddOpen(false);
        await loadCell("refresh");
      } catch (e) {
        setSnack({ visible: true, text: e?.message || "Erro ao adicionar membro." });
      }
    },
    [cellId, authCtx, loadCell]
  );

  const headerColor = cell?.templateColor || DS.colors.primary;
  const headerTint = withAlpha(headerColor, "12");
  const hasPhoto = isHttpUrl(cell?.photoUrl);

  const meetingLabel = useMemo(() => {
    const d = cell?.meetingDay ? String(cell.meetingDay) : "";
    const t = cell?.meetingTime ? String(cell.meetingTime) : "";
    if (d && t) return `${d} • ${t}`;
    return d || t || "Reunião não definida";
  }, [cell]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: DS.colors.textMuted }}>Carregando célula...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCell("refresh")} />}
      >
        {!!error && (
          <Card mode="outlined" style={[styles.card, { borderColor: "#FFD6D6", backgroundColor: "#FFF7F7" }]}>
            <Card.Content>
              <Text style={{ fontWeight: "900", color: DS.colors.text }}>Não foi possível abrir</Text>
              <Text style={{ color: DS.colors.textMuted, marginTop: 6 }}>{error}</Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Button mode="outlined" onPress={() => navigation.goBack()} style={{ borderRadius: DS.radius.pill }}>
                  Voltar
                </Button>
                <Button mode="contained" onPress={() => loadCell("load")} style={{ borderRadius: DS.radius.pill }}>
                  Tentar novamente
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {!!cell && (
          <Card style={styles.heroCard} mode="elevated">
            <View style={[styles.heroAccent, { backgroundColor: headerColor }]} />
            <Card.Content style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Surface elevation={0} style={[styles.avatarCircle, { backgroundColor: headerTint, borderColor: headerColor }]}>
                  {hasPhoto ? (
                    <Image source={{ uri: cell.photoUrl.trim() }} style={styles.avatarImg} />
                  ) : (
                    <Icon source="account-group-outline" size={22} color={DS.colors.textMuted} />
                  )}
                </Surface>

                <View style={{ flex: 1 }}>
                  <Text variant="titleLarge" style={{ fontWeight: "900", color: DS.colors.text }}>
                    {cell?.name || "Célula"}
                  </Text>
                  <Text style={{ color: DS.colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                    {meetingLabel}
                  </Text>
                </View>

                <IconButton icon="account-plus-outline" onPress={() => setAddOpen(true)} iconColor={DS.colors.primaryDark} />
              </View>

              {!!cell?.description && (
                <Text style={{ color: DS.colors.textMuted, lineHeight: 18 }}>
                  {cell.description}
                </Text>
              )}

              <Divider style={{ backgroundColor: DS.colors.border }} />

              <Text style={{ color: DS.colors.textMuted }}>
                Líder: <Text style={{ color: DS.colors.text, fontWeight: "900" }}>{cell?.leader?.fullName || "Não definido"}</Text>
              </Text>
              <Text style={{ color: DS.colors.textMuted }}>
                Vice-líder: <Text style={{ color: DS.colors.text, fontWeight: "900" }}>{cell?.viceLeader?.fullName || "Não definido"}</Text>
              </Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button
                  mode="outlined"
                  textColor={DS.colors.primaryDark}
                  style={{
                    flex: 1,
                    borderRadius: DS.radius.pill,
                    borderColor: DS.colors.border,
                  }}
                  icon="file-document-outline"
                  onPress={() => navigation.navigate("CellReports", { id: cellId })}
                >
                  Relatórios
                </Button>

                <Button
                  mode="contained"
                  buttonColor={DS.colors.primary}
                  textColor="#fff"
                  style={{ flex: 1, borderRadius: DS.radius.pill }}
                  icon="calendar-check-outline"
                  onPress={() => navigation.navigate("CellMeeting", { id: cellId })}
                >
                  Criar Relatório
                </Button>
              </View>

            </Card.Content>
          </Card>
        )}

        {!!cell && (
          <View style={{ marginTop: 8 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Membros</Text>
              <Chip
                style={{ backgroundColor: DS.colors.backgroundAlt, borderRadius: DS.radius.pill }}
                textStyle={{ color: DS.colors.textMuted, fontWeight: "900" }}
                icon="account-multiple"
              >
                {(cell?._count?.members ?? cell?.members?.length ?? 0) || 0}
              </Chip>
            </View>

            <Card mode="outlined" style={styles.card}>
              <Card.Content style={{ gap: 10 }}>
                {Array.isArray(cell?.members) && cell.members.length > 0 ? (
                  cell.members.map((m) => (
                    <Surface key={m.id} elevation={0} style={styles.memberRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                        {isHttpUrl(m.photoUrl) ? (
                          <Avatar.Image size={42} source={{ uri: m.photoUrl }} />
                        ) : (
                          <Avatar.Text size={42} label={initials(m.fullName)} color="#fff" style={{ backgroundColor: DS.colors.primary }} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "900", color: DS.colors.text }} numberOfLines={1}>
                            {m.fullName || "Membro"}
                          </Text>
                          <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                            {m.phone || "Sem telefone"}
                          </Text>
                        </View>
                      </View>
                    </Surface>
                  ))
                ) : (
                  <Text style={{ color: DS.colors.textMuted }}>Nenhum membro na célula ainda.</Text>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        <View style={{ height: DS.space(4) }} />
      </ScrollView>

      <MemberCascadeModal
        visible={addOpen}
        onDismiss={() => setAddOpen(false)}
        title="Adicionar membro"
        items={churchMembers}
        loading={churchMembersLoading}
        selectedIds={memberIdsInCell}
        onPick={addMemberToCell}
      />

      <Snackbar visible={snack.visible} onDismiss={() => setSnack({ visible: false, text: "" })} duration={2400}>
        {snack.text}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.colors.bg },
  content: { padding: DS.space(2), paddingBottom: DS.space(2), gap: DS.space(1.5) },

  heroCard: { borderRadius: DS.radius.card, backgroundColor: DS.colors.card, overflow: "hidden" },
  heroAccent: { height: 8, opacity: 0.9 },

  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 10 },
  sectionTitle: { fontWeight: "900", color: DS.colors.text, fontSize: 16 },

  card: { borderRadius: DS.radius.card, backgroundColor: DS.colors.card, borderColor: DS.colors.outline },

  memberRow: {
    padding: 12,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.outline,
    backgroundColor: DS.colors.surface,
  },

  modalCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: DS.radius.card,
    backgroundColor: DS.colors.card,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  modalTitle: { fontWeight: "900", color: DS.colors.text, fontSize: 16 },
  modalSearch: { borderRadius: DS.radius.card, backgroundColor: DS.colors.card, borderWidth: 1, borderColor: DS.colors.border },
  pickRow: { marginBottom: 10, borderRadius: DS.radius.card, backgroundColor: DS.colors.card, borderWidth: 1, borderColor: DS.colors.border },
});
