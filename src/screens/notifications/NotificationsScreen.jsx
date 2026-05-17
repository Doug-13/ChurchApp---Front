// src/screens/notifications/NotificationsScreen.jsx
//
// Tela de notificações do ChurchApp
// Design: alinhado ao Design Manual (navy #1A2366, brand #4158D0)
// Back-end: GET /notifications  |  PATCH /notifications/:id/read  |  PATCH /notifications/read-all

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ─── Design tokens ────────────────────────────────────────────────────────────

const NAVY        = "#1A2366";
const BRAND       = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const MUTED       = "#9198B5";
const BORDER      = "#E4E6F0";
const BG          = "#F5F6FA";
const SURFACE     = "#FFFFFF";
const SUCCESS     = "#2DBF8A";
const SUCCESS_BG  = "#E8F9F3";

// ─── Metadados por tipo de notificação ───────────────────────────────────────

const TYPE_META = {
  NEWS:         { icon: "bullhorn-outline",         color: BRAND,    bg: BRAND_LIGHT, label: "Aviso"    },
  EVENT:        { icon: "calendar-star",             color: "#7C3AED",bg: "#F1EAFE",   label: "Evento"   },
  EVENT_INVITE: { icon: "clipboard-list-outline",    color: "#F97316",bg: "#FFF3E8",   label: "Escala"   },
  CELL_MEETING: { icon: "account-group",             color: "#0EA5E9",bg: "#E7F6FE",   label: "Célula"   },
  SCHEDULE:     { icon: "calendar-check-outline",    color: "#C84AB5",bg: "#FBE9F8",   label: "Escala"   },
  MEMBER_JOIN:  { icon: "account-plus-outline",      color: SUCCESS,  bg: SUCCESS_BG,  label: "Membro"   },
  SYSTEM:       { icon: "information-outline",       color: MUTED,    bg: "#F0F1F7",   label: "Sistema"  },
};

function getMeta(type) {
  return TYPE_META[type] ?? TYPE_META.SYSTEM;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authFetch(path, options = {}) {
  const fbUser = getAuth().currentUser;
  if (!fbUser) throw new Error("Não autenticado.");
  const token = await getIdToken(fbUser, true);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept:         "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

function toArray(val) {
  if (Array.isArray(val))          return val;
  if (Array.isArray(val?.items))   return val.items;
  if (Array.isArray(val?.data))    return val.data;
  return [];
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const now  = new Date();
  const date = new Date(dateStr);
  const diffMs  = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMin / 60);
  const diffD   = Math.floor(diffH / 24);
  if (diffMin < 1)  return "Agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffH < 24)   return `${diffH}h atrás`;
  if (diffD === 1)  return "Ontem";
  if (diffD < 7)    return `${diffD} dias atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function groupByDate(items) {
  const today     = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const fmt = (d) => new Date(d).toDateString();
  const groups = {};
  for (const item of items) {
    const d = new Date(item.createdAt);
    let label;
    if      (fmt(d) === fmt(today))     label = "Hoje";
    else if (fmt(d) === fmt(yesterday)) label = "Ontem";
    else label = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  const result = [];
  for (const [label, data] of Object.entries(groups)) {
    result.push({ type: "header", label, key: `h_${label}` });
    for (const n of data) result.push({ type: "item", data: n, key: n.id });
  }
  return result;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function DateHeader({ label }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{label}</Text>
    </View>
  );
}

function NotificationRow({ item, onPress, onMarkRead }) {
  const meta      = getMeta(item.type);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 30 }).start();
  }
  function handlePressOut() {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableRipple
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        rippleColor={`${meta.color}18`}
        style={[styles.notifRow, !item.read && styles.notifRowUnread]}
      >
        <View style={styles.notifInner}>
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}

          <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
            <Icon source={meta.icon} size={20} color={meta.color} />
          </View>

          <View style={styles.notifContent}>
            <View style={styles.notifTitleRow}>
              <Text
                style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.notifTime}>{formatRelativeTime(item.createdAt)}</Text>
            </View>
            {!!item.body && (
              <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
            )}
            <View style={styles.notifMeta}>
              <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              {!item.read && (
                <TouchableOpacity
                  onPress={() => onMarkRead(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.markReadBtn, { color: meta.color }]}>Marcar como lido</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableRipple>
    </Animated.View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Icon source="bell-outline" size={40} color={MUTED} />
      </View>
      <Text style={styles.emptyTitle}>Tudo em dia!</Text>
      <Text style={styles.emptyDesc}>
        Você não tem notificações no momento.{"\n"}As novidades vão aparecer aqui.
      </Text>
    </View>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function NotificationsScreen({ navigation }) {
  const insets      = useSafeAreaInsets();
  const { user }    = useAuth();

  const [items,      setItems]    = useState([]);
  const [loading,    setLoading]  = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [filter,     setFilter]   = useState("ALL");

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  const displayed = useMemo(() => {
    const list = filter === "UNREAD" ? items.filter((n) => !n.read) : items;
    return groupByDate(list);
  }, [items, filter]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await authFetch("/notifications?limit=60");
      setItems(toArray(data));
    } catch (e) {
      console.warn("Notifications fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // ── Ações ──────────────────────────────────────────────────────────────────

  async function markRead(id) {
    setItems((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
    );
    try {
      await authFetch(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: false, readAt: null } : n));
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
    try {
      await authFetch("/notifications/read-all", { method: "PATCH" });
    } catch (e) {
      console.warn("markAllRead error:", e.message);
      fetchNotifications(true);
    }
  }

  function handlePress(notif) {
    if (!notif.read) markRead(notif.id);
    if (notif.refType && notif.refId) {
      const parent = navigation.getParent?.();
      const nav    = parent || navigation;
      const routes = {
        news:         () => nav.navigate("NewsTab",       { screen: "NewsDetails",     params: { id: notif.refId } }),
        event:        () => nav.navigate("Events",        { screen: "EventDetails",    params: { id: notif.refId } }),
        cell_meeting: () => nav.navigate("CellsTab",      { screen: "CellMeeting",     params: { id: notif.refId } }),
        schedule:     () => nav.navigate("SchedulesTab",  { screen: "ScheduleDetails", params: { id: notif.refId } }),
      };
      routes[notif.refType]?.();
    }
  }

  function renderItem({ item }) {
    if (item.type === "header") return <DateHeader label={item.label} />;
    return (
      <NotificationRow
        item={item.data}
        onPress={handlePress}
        onMarkRead={markRead}
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>

      {/* ── Header com botão de voltar ── */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "android" ? 16 : 12) }]}>

        {/* Botão voltar */}
        <TouchableRipple
          onPress={() => navigation.goBack()}
          borderless
          style={styles.backBtn}
        >
          <View style={styles.backBtnInner}>
            <Icon source="arrow-left" size={20} color={NAVY} />
          </View>
        </TouchableRipple>

        {/* Título + subtítulo */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notificações</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>
              {unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}
            </Text>
          )}
        </View>

        {/* Marcar todas como lidas */}
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.readAllBtn}>
            <Icon source="check-all" size={16} color={BRAND} />
            <Text style={styles.readAllText}>Marcar todas</Text>
          </TouchableOpacity>
        ) : (
          // Espaçador para manter título centralizado quando não há botão
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* ── Filter chips ── */}
      <View style={styles.filterRow}>
        {[
          { value: "ALL",    label: "Todas" },
          { value: "UNREAD", label: `Não lidas${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
        ].map((f) => {
          const active = filter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Lista ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={BRAND} size="large" />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            displayed.length === 0 && styles.listEmpty,
            { paddingBottom: insets.bottom + 24 },
          ]}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefresh(true); fetchNotifications(true); }}
              colors={[BRAND]}
              tintColor={BRAND}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection:   "row",
    alignItems:      "center",
    paddingHorizontal: 12,
    paddingBottom:   12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 8,
  },

  // Botão voltar
  backBtn:      { borderRadius: 12, overflow: "hidden" },
  backBtnInner: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: "#F0F1F7",
    alignItems:      "center",
    justifyContent:  "center",
  },

  // Título central
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 20, fontWeight: "900", color: NAVY, letterSpacing: -0.4 },
  headerSub:    { fontSize: 12, color: MUTED, marginTop: 1, fontWeight: "500" },

  // Botão marcar todas / espaçador
  readAllBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            4,
    paddingVertical:   6,
    paddingHorizontal: 10,
    backgroundColor:   BRAND_LIGHT,
    borderRadius:   20,
  },
  readAllText:   { fontSize: 12, fontWeight: "700", color: BRAND },
  headerSpacer:  { width: 40 },

  // ── Filtros ─────────────────────────────────────────────────────────────────
  filterRow: {
    flexDirection:    "row",
    paddingHorizontal: 16,
    paddingVertical:   10,
    gap:              8,
    backgroundColor:  SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  chip:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F0F1F7" },
  chipActive:     { backgroundColor: BRAND_LIGHT },
  chipText:       { fontSize: 13, fontWeight: "600", color: MUTED },
  chipTextActive: { color: BRAND, fontWeight: "700" },

  // ── Lista ───────────────────────────────────────────────────────────────────
  list:      { paddingTop: 8, paddingHorizontal: 12 },
  listEmpty: { flexGrow: 1, justifyContent: "center" },

  sectionHeader:     { paddingHorizontal: 8, paddingTop: 16, paddingBottom: 6 },
  sectionHeaderText: { fontSize: 11, fontWeight: "800", color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 },

  // ── Notificação ─────────────────────────────────────────────────────────────
  notifRow:       { backgroundColor: SURFACE, borderRadius: 16, marginBottom: 6, overflow: "hidden" },
  notifRowUnread: { backgroundColor: "#FAFBFF", borderWidth: 1, borderColor: `${BRAND}22` },
  notifInner:     { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  unreadDot:      { position: "absolute", top: 16, left: 6, width: 7, height: 7, borderRadius: 4 },
  iconWrap:       { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 6 },

  notifContent:     { flex: 1, gap: 4 },
  notifTitleRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
  notifTitle:       { flex: 1, fontSize: 14, fontWeight: "600", color: NAVY, lineHeight: 19 },
  notifTitleUnread: { fontWeight: "800" },
  notifTime:        { fontSize: 11, color: MUTED, flexShrink: 0 },
  notifBody:        { fontSize: 13, color: MUTED, lineHeight: 18 },
  notifMeta:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  typeBadge:        { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText:    { fontSize: 11, fontWeight: "700" },
  markReadBtn:      { fontSize: 12, fontWeight: "600" },

  // ── Estados ─────────────────────────────────────────────────────────────────
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap:   { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyIcon:   { width: 72, height: 72, borderRadius: 24, backgroundColor: "#F0F1F7", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:  { fontSize: 18, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },
  emptyDesc:   { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 20, maxWidth: 260 },
});