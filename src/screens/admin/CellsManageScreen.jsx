import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import {
  Text,
  Searchbar,
  ActivityIndicator,
  Surface,
  TouchableRipple,
  Button,
  Divider,
} from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useIsFocused } from "@react-navigation/native";
import { getAuth } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ─── Design System (conforme manual) ────────────────────────────────────────
const NAVY       = "#1A2366";
const BRAND      = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const BG         = "#F5F6FA";
const SURFACE    = "#FFFFFF";
const BORDER     = "#E4E6F0";
const MUTED      = "#9198B5";
const SUCCESS    = "#2DBF8A";
const SUCCESS_LIGHT = "#E8F9F3";
const DANGER     = "#E84D4D";
const DANGER_LIGHT = "#FEECEC";

// ─── Rotas ───────────────────────────────────────────────────────────────────
const ROUTES = {
  create:  "CellCreate",
  details: "CellDetails",
};

// ─── Endpoints ────────────────────────────────────────────────────────────────
const ENDPOINTS = {
  listCells: (churchId) => `/cells?churchId=${encodeURIComponent(churchId)}`,
};

// ─── Fetch helper ─────────────────────────────────────────────────────────────
async function authedFetch(path, { method = "GET", body } = {}, authCtx) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Erro ${res.status}.`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// ─── Normalização ─────────────────────────────────────────────────────────────
function normalizeCell(raw) {
  const leaderName =
    raw?.leader?.fullName || raw?.leader?.name ||
    raw?.leader?.displayName || raw?.leaderName || null;

  const membersCount =
    raw?.membersCount ?? raw?._count?.members ??
    raw?._count?.participants ?? raw?.members?.length ?? 0;

  return {
    id:          raw?.id ?? String(Math.random()),
    name:        raw?.name || raw?.title || "Célula",
    neighborhood: raw?.neighborhood || raw?.bairro || raw?.region || null,
    address:     raw?.address || raw?.endereco || null,
    leaderName,
    membersCount,
    meetingDay:  raw?.meetingDay || raw?.day || null,
    meetingTime: raw?.meetingTime || raw?.time || null,
    isActive:    raw?.isActive ?? raw?.active ?? true,
    templateColor: raw?.templateColor || null,
  };
}

function formatMeeting(day, time) {
  if (!day && !time) return null;
  if (day && time) return `${day} às ${time}`;
  return day || time;
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

// Pill/badge (borderRadius 999, padrão do manual)
function Pill({ icon, label, bg, color }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {!!icon && (
        <MaterialCommunityIcons name={icon} size={11} color={color} style={{ marginRight: 4 }} />
      )}
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// Card de célula
function CellCard({ item, onPress }) {
  const accent = item.templateColor || BRAND;
  const accentLight = accent + "18";
  const meeting = formatMeeting(item.meetingDay, item.meetingTime);

  return (
    <TouchableRipple onPress={onPress} borderless style={styles.cellCard}>
      <View>
        {/* Faixa de acento (4px, padrão manual) */}
        <View style={[styles.cellStrip, { backgroundColor: accent }]} />

        <View style={styles.cellBody}>
          {/* Cabeçalho do card */}
          <View style={styles.cellHeader}>
            {/* Ícone do tipo */}
            <View style={[styles.cellIcon, { backgroundColor: accentLight }]}>
              <MaterialCommunityIcons
                name={item.isActive ? "home-group" : "home-off"}
                size={22}
                color={accent}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cellTitle} numberOfLines={1}>
                {item.name}
              </Text>
              {!!(item.neighborhood || item.address) && (
                <Text style={styles.cellLocation} numberOfLines={1}>
                  📍 {item.neighborhood || item.address}
                </Text>
              )}
            </View>

            {/* Seta de navegação */}
            <MaterialCommunityIcons name="chevron-right" size={20} color={MUTED} />
          </View>

          <Divider style={{ backgroundColor: BORDER, marginVertical: 10 }} />

          {/* Info rows: reunião, líder, membros */}
          <View style={styles.metaRow}>
            {!!meeting && (
              <Pill
                icon="calendar-clock"
                label={meeting}
                bg={BRAND_LIGHT}
                color={BRAND}
              />
            )}

            <Pill
              icon="account"
              label={item.leaderName ? item.leaderName : "Sem líder"}
              bg={BRAND_LIGHT}
              color={NAVY}
            />

            <Pill
              icon="account-multiple"
              label={`${item.membersCount} membros`}
              bg={BRAND_LIGHT}
              color={NAVY}
            />

            {!item.isActive && (
              <Pill
                icon="pause-circle"
                label="Inativa"
                bg={DANGER_LIGHT}
                color={DANGER}
              />
            )}
          </View>
        </View>
      </View>
    </TouchableRipple>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────
export default function CellsManageScreen({ navigation }) {
  const authCtx = useAuth();
  const isFocused = useIsFocused();

  const churchId =
    authCtx?.activeChurch?.id ||
    authCtx?.church?.id ||
    authCtx?.me?.activeChurchId ||
    authCtx?.user?.activeChurchId ||
    authCtx?.activeChurchId ||
    null;

  const [query, setQuery]       = useState("");
  const [cells, setCells]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState("");

  // tc centralizado (padrão do manual)
  const tc = useMemo(() => ({
    surface: SURFACE, bg: BG, outline: BORDER, text: NAVY, muted: MUTED, primary: BRAND,
  }), []);

  const load = useCallback(async () => {
    if (!churchId) {
      setCells([]);
      setLoading(false);
      setError("Nenhuma igreja ativa encontrada.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await authedFetch(ENDPOINTS.listCells(churchId), {}, authCtx);
      const list = Array.isArray(data) ? data : data?.items || data?.cells || [];
      const normalized = list.map(normalizeCell).sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return String(a.name).localeCompare(String(b.name));
      });
      setCells(normalized);
    } catch (e) {
      setError(e?.message || "Erro ao carregar células.");
    } finally {
      setLoading(false);
    }
  }, [churchId, authCtx]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return cells;
    return cells.filter((c) =>
      [c.name, c.neighborhood, c.address, c.leaderName, c.meetingDay, c.meetingTime]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [cells, query]);

  const totalActive   = cells.filter((c) => c.isActive).length;
  const totalInactive = cells.filter((c) => !c.isActive).length;

  // ── Header da lista ────────────────────────────────────────────────────────
  const ListHeader = (
    <View style={{ gap: 12 }}>
      {/* Hero card (fundo NAVY conforme manual) */}
      <Surface elevation={0} style={styles.heroCard}>
        {/* Blobs decorativos */}
        <View style={[styles.blob, { width: 180, height: 180, top: -60, right: -50 }]} />
        <View style={[styles.blob, { width: 120, height: 120, bottom: -50, left: -30 }]} />

        <View style={styles.heroTop}>
          <View style={[styles.heroAvatar, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
            <MaterialCommunityIcons name="account-group" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreet}>Gestão de</Text>
            <Text style={styles.heroTitle}>Células</Text>
            <Text style={styles.heroMeta}>
              {cells.length} células • {totalActive} ativas
            </Text>
          </View>
        </View>

        {/* Pills de estatísticas */}
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <View style={[styles.pillDot, { backgroundColor: "#7EFFD4" }]} />
            <Text style={styles.heroPillText}>{totalActive} ativas</Text>
          </View>
          {totalInactive > 0 && (
            <View style={styles.heroPill}>
              <View style={[styles.pillDot, { backgroundColor: "#FFD97D" }]} />
              <Text style={styles.heroPillText}>{totalInactive} inativas</Text>
            </View>
          )}
          <View style={styles.heroPill}>
            <View style={[styles.pillDot, { backgroundColor: "#A8BFFF" }]} />
            <Text style={styles.heroPillText}>
              {cells.reduce((s, c) => s + (c.membersCount || 0), 0)} membros
            </Text>
          </View>
        </View>
      </Surface>

      {/* Ações rápidas */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate(ROUTES.create)}
          style={[styles.btnContained, { flex: 1 }]}
          buttonColor={BRAND}
          textColor="#fff"
        >
          Nova célula
        </Button>
        <Button
          mode="outlined"
          icon="refresh"
          onPress={onRefresh}
          style={[styles.btnOutline, { flex: 1 }]}
          textColor={BRAND}
        >
          Atualizar
        </Button>
      </View>

      {/* Busca */}
      <Searchbar
        placeholder="Buscar célula, bairro, líder..."
        value={query}
        onChangeText={setQuery}
        style={styles.searchBar}
        inputStyle={{ color: NAVY }}
        iconColor={MUTED}
        placeholderTextColor={MUTED}
      />

      {/* Banner de erro */}
      {!!error && (
        <Surface elevation={0} style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={DANGER} />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Não foi possível carregar</Text>
            <Text style={[styles.mutedText, { marginTop: 2 }]}>{error}</Text>
          </View>
          <TouchableRipple onPress={load} borderless style={styles.retryBtn}>
            <MaterialCommunityIcons name="refresh" size={20} color={BRAND} />
          </TouchableRipple>
        </Surface>
      )}

      {/* Separador de seção */}
      {filtered.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {query ? `Resultados (${filtered.length})` : "Todas as células"}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: BRAND_LIGHT }]}>
            <Text style={[styles.countBadgeText, { color: BRAND }]}>{filtered.length}</Text>
          </View>
        </View>
      )}
    </View>
  );

  // ── Empty state ────────────────────────────────────────────────────────────
  const EmptyState = (
    <Surface elevation={0} style={styles.emptyCard}>
      <MaterialCommunityIcons
        name={query ? "text-search" : "home-search"}
        size={40}
        color={MUTED}
        style={{ marginBottom: 8 }}
      />
      <Text style={styles.emptyTitle}>
        {query ? "Nenhuma célula encontrada" : "Nenhuma célula cadastrada"}
      </Text>
      <Text style={styles.mutedText}>
        {query
          ? "Tente buscar por outro nome, bairro ou líder."
          : "Crie a primeira célula para começar a organizar líderes, membros e reuniões."}
      </Text>
      {!query && (
        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate(ROUTES.create)}
          style={[styles.btnContained, { marginTop: 16, alignSelf: "stretch" }]}
          buttonColor={BRAND}
          textColor="#fff"
        >
          Nova célula
        </Button>
      )}
    </Surface>
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={BRAND} size="large" />
        <Text style={[styles.mutedText, { marginTop: 12 }]}>Carregando células...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CellCard
            item={item}
            onPress={() => navigation?.navigate?.(ROUTES.details, { cellId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListHeaderComponentStyle={{ gap: 0 }}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  listContent: { padding: 16, paddingBottom: 32, gap: 12 },

  loadingWrap: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" },

  // ── Hero (fundo NAVY fixo, conforme manual) ────────────────────────────────
  heroCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 18,
    paddingTop: Platform.OS === "android" ? 20 : 18,
    overflow: "hidden",
    marginBottom: 0,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12, zIndex: 2 },
  heroAvatar: {
    width: 48, height: 48,
    borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  heroGreet: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.65)" },
  heroTitle: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: -0.6 },
  heroMeta:  { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  heroPills: { flexDirection: "row", gap: 8, marginTop: 14, zIndex: 2 },
  heroPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 11, paddingVertical: 5,
  },
  pillDot: { width: 6, height: 6, borderRadius: 999 },
  heroPillText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  // ── Botões ─────────────────────────────────────────────────────────────────
  btnContained: { borderRadius: 999 },
  btnOutline:   { borderRadius: 999, borderColor: BORDER },

  // ── Busca ──────────────────────────────────────────────────────────────────
  searchBar: {
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 0,
  },

  // ── Erro ───────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: DANGER_LIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DANGER,
    padding: 14,
  },
  errorTitle: { fontSize: 13, fontWeight: "900", color: NAVY },
  retryBtn: {
    width: 36, height: 36,
    borderRadius: 999,
    backgroundColor: BRAND_LIGHT,
    alignItems: "center", justifyContent: "center",
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6, marginBottom: 0,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },
  countBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  countBadgeText: { fontSize: 12, fontWeight: "800" },

  // ── Card de célula ─────────────────────────────────────────────────────────
  cellCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  cellStrip: { height: 4 },
  cellBody:  { padding: 14, gap: 0 },
  cellHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cellIcon: {
    width: 44, height: 44,
    borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  cellTitle:    { fontSize: 15, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },
  cellLocation: { fontSize: 12, color: MUTED, marginTop: 3 },

  // ── Meta row (pills) ───────────────────────────────────────────────────────
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  pillText: { fontSize: 10, fontWeight: "800" },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyCard: {
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: BORDER,
    borderRadius: 20,
    padding: 24,
    gap: 8,
    backgroundColor: SURFACE,
    marginTop: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: NAVY, textAlign: "center" },

  // ── Texto muted genérico ───────────────────────────────────────────────────
  mutedText: { fontSize: 13, color: MUTED, textAlign: "center", lineHeight: 20 },
});