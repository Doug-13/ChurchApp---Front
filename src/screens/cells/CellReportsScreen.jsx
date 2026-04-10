// CellReportsScreen.js

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import {
  Card,
  Text,
  Button,
  Chip,
  IconButton,
  ActivityIndicator,
  Searchbar,
  Snackbar,
  Divider,
  Surface,
  Portal,
  Modal,
  Icon,
} from "react-native-paper";
import { getAuth } from "@react-native-firebase/auth";

import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ============================================================================
// Design Tokens (igual seu padrão)
// ============================================================================
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

// ============================================================================
// Helpers
// ============================================================================
function pad2(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "00";
  return String(v).padStart(2, "0");
}

function formatBRDate(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function safeStr(v) {
  return String(v ?? "").trim();
}

// ============================================================================
// authedFetch (igual você usa)
// ============================================================================
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

// ============================================================================
// CONFIG: endpoint de relatórios
// ============================================================================
const REPORTS_ENDPOINT = (cellId) => `/cells/${encodeURIComponent(cellId)}/meetings`;

export default function CellReportsScreen({ route, navigation }) {
  const authCtx = useAuth();
  const cellId = route?.params?.id || route?.params?.cellId || null;

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [items, setItems] = useState([]); // relatórios
  const [q, setQ] = useState("");

  const [snack, setSnack] = useState({ visible: false, text: "" });

  // ✅ Modal do relatório completo
  const [reportOpen, setReportOpen] = useState(false);
  const [activeReport, setActiveReport] = useState(null);

  const openReport = useCallback((it) => {
    setActiveReport(it);
    setReportOpen(true);
  }, []);

  const closeReport = useCallback(() => {
    setReportOpen(false);
    setActiveReport(null);
  }, []);

  const normalizeItems = (data) => {
    const arr = Array.isArray(data) ? data : data?.items || data?.meetings || data?.reports || [];
    return (arr || []).map((x) => {
      // ✅ pega summary do backend quando existir (total e visitantes)
      const total =
        x?.summary?.total ??
        x?.total ??
        (Array.isArray(x?.presences) ? x.presences.filter((p) => p?.present !== false).length : 0) +
          (Array.isArray(x?.visitors) ? x.visitors.filter((v) => v?.present !== false).length : 0);

      const visitantes =
        x?.summary?.visitantes ??
        x?.visitorsCount ??
        (Array.isArray(x?.visitors) ? x.visitors.filter((v) => v?.present !== false).length : 0);

      return {
        id: x.id || x._id || `${x.meetingDate || x.createdAt || ""}_${Math.random()}`,
        meetingDate: x.meetingDate || x.date || x.createdAt || null,
        meetingTime: x.meetingTime || x.time || null,
        notes: x.notes || x.note || x.description || null,

        // ✅ summary padronizado
        summary: {
          total: Number(total || 0),
          visitantes: Number(visitantes || 0),
        },

        createdAt: x.createdAt || null,
        raw: x,
      };
    });
  };

  const load = useCallback(
    async (mode = "load") => {
      if (!cellId) {
        setError("ID da célula não foi enviado na navegação (route.params).");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      setError("");

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);

      try {
        const data = await authedFetch(REPORTS_ENDPOINT(cellId), { signal: controller.signal }, authCtx);
        if (!mountedRef.current) return;

        const normalized = normalizeItems(data);

        normalized.sort((a, b) => {
          const da = new Date(a.meetingDate || a.createdAt || 0).getTime();
          const db = new Date(b.meetingDate || b.createdAt || 0).getTime();
          return db - da;
        });

        setItems(normalized);
      } catch (e) {
        if (!mountedRef.current) return;
        const msg =
          e?.name === "AbortError"
            ? "Tempo esgotado ao carregar relatórios (timeout)."
            : e?.message || "Erro ao carregar relatórios.";
        setError(msg);
      } finally {
        clearTimeout(t);
        if (!mountedRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cellId, authCtx]
  );

  useEffect(() => {
    load("load");
  }, [load]);

  const filtered = useMemo(() => {
    const term = safeStr(q).toLowerCase();
    if (!term) return items;

    return items.filter((it) => {
      const d = formatBRDate(it.meetingDate || it.createdAt);
      const t = safeStr(it.meetingTime);
      const n = safeStr(it.notes);
      const hay = `${d} ${t} ${n} total ${it?.summary?.total ?? ""} visitantes ${it?.summary?.visitantes ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [items, q]);

  const totalReports = items.length;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: DS.colors.textMuted }}>Carregando relatórios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} />}
      >
        {/* Header */}
        <Card style={styles.heroCard} mode="elevated">
          <Card.Content style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
              <View style={{ flex: 1 }}>
                <Text variant="titleLarge" style={{ fontWeight: "900", color: DS.colors.text }}>
                  Relatórios
                </Text>
                <Text style={{ color: DS.colors.textMuted }}>
                  {cellId ? `Célula: ${cellId}` : "Célula"}
                </Text>
              </View>

              <Chip
                style={{ backgroundColor: DS.colors.tint, borderRadius: DS.radius.pill }}
                textStyle={{ color: DS.colors.primaryDark, fontWeight: "900" }}
                icon="file-document-outline"
              >
                {totalReports}
              </Chip>
            </View>

            {!!error && (
              <Card mode="outlined" style={[styles.card, { borderColor: "#FFD6D6", backgroundColor: "#FFF7F7" }]}>
                <Card.Content>
                  <Text style={{ fontWeight: "900", color: DS.colors.text }}>Não foi possível carregar</Text>
                  <Text style={{ color: DS.colors.textMuted, marginTop: 6 }}>{error}</Text>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                    <Button
                      mode="outlined"
                      onPress={() => navigation.goBack()}
                      style={{ borderRadius: DS.radius.pill, flex: 1 }}
                    >
                      Voltar
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => load("load")}
                      style={{ borderRadius: DS.radius.pill, flex: 1 }}
                    >
                      Tentar novamente
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            )}

            <Searchbar
              placeholder="Buscar por data, hora ou texto..."
              value={q}
              onChangeText={setQ}
              style={styles.search}
              inputStyle={{ color: DS.colors.text }}
              iconColor={DS.colors.textMuted}
              placeholderTextColor={DS.colors.textMuted}
            />
          </Card.Content>
        </Card>

        {/* Lista */}
        <View style={{ marginTop: 4 }}>
          {filtered.length === 0 ? (
            <Card mode="outlined" style={styles.card}>
              <Card.Content style={{ gap: 8 }}>
                <Text style={{ fontWeight: "900", color: DS.colors.text }}>Nenhum relatório</Text>
                <Text style={{ color: DS.colors.textMuted }}>
                  Ainda não há relatórios salvos para esta célula.
                </Text>

                <Button
                  mode="contained"
                  buttonColor={DS.colors.primary}
                  textColor="#fff"
                  style={{ borderRadius: DS.radius.pill, marginTop: 8 }}
                  onPress={() => navigation.navigate("CellMeeting", { id: cellId })}
                >
                  Criar relatório agora
                </Button>
              </Card.Content>
            </Card>
          ) : (
            filtered.map((it) => {
              const dateLabel = formatBRDate(it.meetingDate || it.createdAt) || "Data não informada";
              const timeLabel = safeStr(it.meetingTime) || "";
              const header = timeLabel ? `${dateLabel} • ${timeLabel}` : dateLabel;

              const total = Number(it?.summary?.total ?? 0);
              const visitantes = Number(it?.summary?.visitantes ?? 0);

              return (
                <Card
                  key={it.id}
                  mode="outlined"
                  style={styles.reportCard}
                  onPress={() => openReport(it)}
                >
                  <Card.Content style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "900", color: DS.colors.text }} numberOfLines={1}>
                          {header}
                        </Text>
                        <Text style={{ color: DS.colors.textMuted }} numberOfLines={2}>
                          {it.notes ? it.notes : "Sem observações"}
                        </Text>
                      </View>

                      <IconButton
                        icon="chevron-right"
                        iconColor={DS.colors.primaryDark}
                        onPress={() => openReport(it)}
                      />
                    </View>

                    <Divider style={{ backgroundColor: DS.colors.border }} />

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <Surface elevation={0} style={styles.metaChip}>
                        <Icon source="account-multiple" size={14} color={DS.colors.textMuted} />
                        <Text style={styles.metaChipTxt}>Total: {total}</Text>
                      </Surface>

                      <Surface elevation={0} style={styles.metaChip}>
                        <Icon source="account-plus" size={14} color={DS.colors.textMuted} />
                        <Text style={styles.metaChipTxt}>Visitantes: {visitantes}</Text>
                      </Surface>
                    </View>
                  </Card.Content>
                </Card>
              );
            })
          )}
        </View>

        <View style={{ height: DS.space(3) }} />
      </ScrollView>

      {/* ===========================
          MODAL: Relatório completo
         =========================== */}
      <Portal>
        <Modal visible={reportOpen} onDismiss={closeReport} contentContainerStyle={styles.modalCard}>
          <View style={{ gap: 12 }}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Relatório</Text>
                <Text style={styles.modalSub}>
                  {activeReport
                    ? (() => {
                        const d = formatBRDate(activeReport.meetingDate || activeReport.createdAt) || "Data não informada";
                        const t = safeStr(activeReport.meetingTime);
                        return t ? `${d} • ${t}` : d;
                      })()
                    : ""}
                </Text>
              </View>

              <IconButton icon="close" onPress={closeReport} style={{ margin: 0 }} />
            </View>

            {/* Resumo */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Surface elevation={0} style={styles.metaChip}>
                <Icon source="account-group" size={14} color={DS.colors.textMuted} />
                <Text style={styles.metaChipTxt}>Total: {Number(activeReport?.summary?.total ?? 0)}</Text>
              </Surface>

              <Surface elevation={0} style={styles.metaChip}>
                <Icon source="account-plus" size={14} color={DS.colors.textMuted} />
                <Text style={styles.metaChipTxt}>Visitantes: {Number(activeReport?.summary?.visitantes ?? 0)}</Text>
              </Surface>
            </View>

            <Divider style={{ backgroundColor: DS.colors.border }} />

            {/* Notas */}
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Observações</Text>
              <Text style={styles.blockText}>
                {safeStr(activeReport?.notes) ? activeReport.notes : "Sem observações"}
              </Text>
            </View>

            {/* Se backend enviar listas (opcional), mostra também */}
            {Array.isArray(activeReport?.raw?.presences) && activeReport.raw.presences.length > 0 ? (
              <>
                <Divider style={{ backgroundColor: DS.colors.border }} />
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Membros presentes</Text>
                  <ScrollView style={{ maxHeight: 220 }}>
                    {activeReport.raw.presences
                      .filter((p) => p?.present !== false)
                      .map((p) => (
                        <View key={p.memberId} style={styles.listRow}>
                          <Text style={styles.listName} numberOfLines={1}>
                            {p?.member?.fullName || "Membro"}
                          </Text>
                          <Text style={styles.listMeta} numberOfLines={1}>
                            {p?.member?.phone || ""}
                          </Text>
                        </View>
                      ))}
                  </ScrollView>
                </View>
              </>
            ) : null}

            {Array.isArray(activeReport?.raw?.visitors) && activeReport.raw.visitors.length > 0 ? (
              <>
                <Divider style={{ backgroundColor: DS.colors.border }} />
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Visitantes</Text>
                  <ScrollView style={{ maxHeight: 220 }}>
                    {activeReport.raw.visitors.map((v) => (
                      <View key={v.id || `${v.name}_${v.phone || ""}`} style={styles.listRow}>
                        <Text style={styles.listName} numberOfLines={1}>
                          {v?.name || "Visitante"}
                        </Text>
                        <Text style={styles.listMeta} numberOfLines={1}>
                          {(v?.phone || "Sem telefone") + (v?.present === false ? " • Ausente" : "")}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </>
            ) : null}

            <Button
              mode="contained"
              buttonColor={DS.colors.primary}
              textColor="#fff"
              style={{ borderRadius: DS.radius.pill, marginTop: 4 }}
              onPress={closeReport}
            >
              Fechar
            </Button>
          </View>
        </Modal>
      </Portal>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({ visible: false, text: "" })}
        duration={2400}
      >
        {snack.text}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.colors.bg },
  content: { padding: DS.space(2), paddingBottom: DS.space(2) },

  heroCard: { borderRadius: DS.radius.card, backgroundColor: DS.colors.card, overflow: "hidden" },

  card: { borderRadius: DS.radius.card, backgroundColor: DS.colors.card, borderColor: DS.colors.outline },

  reportCard: {
    marginTop: 10,
    borderRadius: DS.radius.card,
    backgroundColor: DS.colors.card,
    borderColor: DS.colors.outline,
  },

  search: {
    borderRadius: DS.radius.card,
    backgroundColor: DS.colors.card,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },

  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: DS.radius.pill,
    borderWidth: 1,
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.backgroundAlt,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaChipTxt: { color: DS.colors.textMuted, fontWeight: "900" },

  // =======================
  // Modal styles
  // =======================
  modalCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: DS.radius.card,
    backgroundColor: DS.colors.card,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modalTitle: { fontWeight: "900", color: DS.colors.text, fontSize: 16 },
  modalSub: { color: DS.colors.textMuted, fontWeight: "700", marginTop: 2 },

  block: {
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.outline,
    backgroundColor: DS.colors.surface,
    padding: 12,
  },
  blockTitle: { fontWeight: "900", color: DS.colors.text, marginBottom: 6 },
  blockText: { color: DS.colors.textMuted, fontWeight: "700", lineHeight: 18 },

  listRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
  },
  listName: { fontWeight: "900", color: DS.colors.text },
  listMeta: { color: DS.colors.textMuted, fontWeight: "700", marginTop: 2 },
});
