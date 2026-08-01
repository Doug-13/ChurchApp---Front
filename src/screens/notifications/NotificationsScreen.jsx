import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";

const NAVY       = "#1A2366";
const BRAND_BLUE = "#4158D0";

function toArray(value) {
  if (Array.isArray(value))                return value;
  if (Array.isArray(value?.items))         return value.items;
  if (Array.isArray(value?.data))          return value.data;
  if (Array.isArray(value?.notifications)) return value.notifications;
  if (Array.isArray(value?.results))       return value.results;
  return [];
}

function normalizeNotification(item) {
  return {
    id:        item?.id || item?._id || item?.notificationId || String(Math.random()),
    title:     item?.title   || item?.subject  || item?.name    || "Notificação",
    body:      item?.body    || item?.message  || item?.content || item?.description || "",
    read:      item?.read === true || item?.isRead === true ||
               (item?.readAt !== null && item?.readAt !== undefined),
    createdAt: item?.createdAt || item?.publishedAt || item?.date || item?.sentAt || null,
    type:      item?.type || item?.category || "INFO",
    raw:       item,
  };
}

function formatDate(raw) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getNotificationMeta(type) {
  const v = String(type || "").toUpperCase();
  if (v.includes("EVENT") && !v.includes("INVITE")) return { icon: "calendar-star-outline",  color: "#7C3AED", bg: "#F3EFFF", label: "Evento"  };
  if (v.includes("EVENT_INVITE"))                    return { icon: "clipboard-list-outline", color: "#F97316", bg: "#FFF3E8", label: "Escala"  };
  if (v.includes("NEWS") || v.includes("NOTICE"))   return { icon: "bullhorn-outline",        color: "#4158D0", bg: "#EEF0FA", label: "Aviso"   };
  if (v.includes("URGENT") || v.includes("ALERT"))  return { icon: "alert-circle-outline",    color: "#E84D4D", bg: "#FEECEC", label: "Urgente" };
  if (v.includes("CELL"))                            return { icon: "account-group-outline",   color: "#2DBF8A", bg: "#E8F9F3", label: "Célula"  };
  if (v.includes("SCHEDULE"))                        return { icon: "calendar-check-outline",  color: "#C84AB5", bg: "#FBE9F8", label: "Escala"  };
  if (v.includes("MEMBER"))                          return { icon: "account-plus-outline",    color: "#2DBF8A", bg: "#E8F9F3", label: "Membro"  };
  return { icon: "bell-outline", color: BRAND_BLUE, bg: "#EEF0FA", label: "Info" };
}

async function authFetch(path, opts = {}) {
  const { method = "GET", body } = opts;
  const fbUser = getAuth().currentUser;
  if (!fbUser) throw new Error("Usuário não autenticado.");
  const token = await getIdToken(fbUser, true);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept:         "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) throw new Error(data?.message || data?.error || `Erro HTTP ${res.status}`);
  return data;
}

export default function NotificationsScreen({ navigation }) {
  const theme = useTheme();

  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [filter,        setFilter]        = useState("ALL");
  const [notifications, setNotifications] = useState([]);
  const [error,         setError]         = useState(null);

  const colors = useMemo(() => ({
    bg:        theme.colors.background,
    surface:   theme.colors.surface,
    text:      theme.colors.onSurface,
    muted:     theme.colors.onSurfaceVariant,
    outline:   theme.colors.outlineVariant,
    primary:   theme.colors.primary,
    errorBg:   theme.colors.errorContainer,
    errorText: theme.colors.onErrorContainer,
  }), [theme]);

  const filteredNotifications = useMemo(() =>
    filter === "UNREAD" ? notifications.filter((n) => !n.read) : notifications,
    [notifications, filter]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    setError(null);
    try {
      const data = await authFetch("/notifications");
      setNotifications(toArray(data).map(normalizeNotification));
    } catch (err) {
      setNotifications([]);
      setError(err?.message || "Erro ao carregar notificações.");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { setLoading(true); await loadNotifications(); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    try { setRefreshing(true); await loadNotifications(); }
    finally { setRefreshing(false); }
  }, [loadNotifications]);

  const markAsRead = useCallback(async (notification) => {
    if (!notification?.id || notification.read) return;
    const prev = notifications;
    try {
      setNotifications((cur) => cur.map((n) => n.id === notification.id ? { ...n, read: true } : n));
      await authFetch(`/notifications/${notification.id}/read`, { method: "PATCH" });
    } catch { setNotifications(prev); }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    if (unreadCount <= 0) return;
    const prev = notifications;
    try {
      setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
      await authFetch("/notifications/read-all", { method: "PATCH" });
    } catch (err) {
      setNotifications(prev);
      setError(err?.message || "Erro ao marcar notificações como lidas.");
    }
  }, [notifications, unreadCount]);

  const renderNotification = useCallback(({ item }) => {
    const meta = getNotificationMeta(item.type);
    return (
      <TouchableRipple borderless onPress={() => markAsRead(item)} style={styles.notificationPress}>
        <Surface
          elevation={0}
          style={[
            styles.notificationCard,
            { backgroundColor: colors.surface, borderColor: item.read ? colors.outline : meta.color },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
            <Icon source={meta.icon} size={22} color={meta.color} />
          </View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationTop}>
              <Text
                style={[styles.notificationTitle, { color: colors.text }, !item.read && styles.notificationTitleUnread]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
            </View>
            {!!item.body && (
              <Text style={[styles.notificationBody, { color: colors.muted }]} numberOfLines={3}>
                {item.body}
              </Text>
            )}
            <View style={styles.notificationFooter}>
              <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              {!!item.createdAt && (
                <Text style={[styles.dateText, { color: colors.muted }]}>{formatDate(item.createdAt)}</Text>
              )}
            </View>
          </View>
        </Surface>
      </TouchableRipple>
    );
  }, [colors, markAsRead]);

  const HeaderBar = (
    <View style={[styles.header, { borderBottomColor: colors.outline }]}>
      <TouchableRipple borderless onPress={() => navigation.goBack()} style={styles.backButton}>
        <View style={styles.backButtonInner}>
          <Icon source="arrow-left" size={20} color={NAVY} />
        </View>
      </TouchableRipple>
      <View style={styles.headerTextWrap}>
        <Text style={styles.headerTitle}>Notificações</Text>
        {unreadCount > 0 && (
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}
          </Text>
        )}
      </View>
      {unreadCount > 0 && (
        <Button mode="text" compact onPress={markAllAsRead} textColor={BRAND_BLUE}>
          Marcar todas
        </Button>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
        {HeaderBar}
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.centerText, { color: colors.muted }]}>Carregando notificações...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      {HeaderBar}

      <View style={[styles.filters, { borderBottomColor: colors.outline }]}>
        <Chip selected={filter === "ALL"} onPress={() => setFilter("ALL")} style={styles.chip} textStyle={styles.chipText}>
          Todas
        </Chip>
        <Chip selected={filter === "UNREAD"} onPress={() => setFilter("UNREAD")} style={styles.chip} textStyle={styles.chipText}>
          Não lidas{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </Chip>
      </View>

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: colors.errorBg, margin: 12 }]}>
          <Icon source="alert-circle-outline" size={16} color={colors.errorText} />
          <Text style={[styles.errorText, { color: colors.errorText }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item, index) => String(item?.id || index)}
        renderItem={renderNotification}
        contentContainerStyle={[
          styles.listContent,
          filteredNotifications.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND_BLUE]} tintColor={BRAND_BLUE} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={[styles.emptyIcon, { backgroundColor: "#EEF0FA" }]}>
              <Icon source="bell-off-outline" size={34} color={BRAND_BLUE} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma notificação</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Quando houver novos avisos, eventos ou atualizações, eles aparecerão aqui.
            </Text>
            <Button mode="contained" onPress={onRefresh} style={styles.emptyButton} buttonColor={NAVY} textColor="#fff">
              Atualizar
            </Button>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  center:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  centerText: { fontSize: 14, marginTop: 4 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, gap: 8,
    paddingVertical: 10,
    paddingTop: Platform.OS === "android" ? 16 : 10,
    borderBottomWidth: 1,
  },
  backButton:      { borderRadius: 12, overflow: "hidden" },
  backButtonInner: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F0F1F7", alignItems: "center", justifyContent: "center" },
  headerTextWrap:  { flex: 1 },
  headerTitle:     { fontSize: 20, fontWeight: "900", color: NAVY, letterSpacing: -0.4 },
  headerSubtitle:  { fontSize: 12, marginTop: 1, fontWeight: "500" },

  filters:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1 },
  chip:     { borderRadius: 20 },
  chipText: { fontSize: 13 },

  errorBox:  { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12 },
  errorText: { flex: 1, fontSize: 13 },

  listContent:      { padding: 12, gap: 8 },
  emptyListContent: { flexGrow: 1, justifyContent: "center" },

  notificationPress: { borderRadius: 16, overflow: "hidden" },
  notificationCard: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 12, padding: 14, borderRadius: 16, borderWidth: 1,
  },
  iconWrap:                { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notificationContent:     { flex: 1, gap: 5 },
  notificationTop:         { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  notificationTitle:       { flex: 1, fontSize: 14, fontWeight: "600", color: NAVY, lineHeight: 20 },
  notificationTitleUnread: { fontWeight: "800" },
  notificationBody:        { fontSize: 13, lineHeight: 18 },
  notificationFooter:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  unreadDot:               { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  typeBadge:               { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typeBadgeText:           { fontSize: 11, fontWeight: "700" },
  dateText:                { fontSize: 11 },

  emptyBox:    { alignItems: "center", padding: 32, gap: 12 },
  emptyIcon:   { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  emptyText:   { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 260 },
  emptyButton: { borderRadius: 16, marginTop: 4 },
});