// src/screens/news/NewsFeedScreen.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Card,
  Chip,
  FAB,
  Icon,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const FILTERS = [
  { value: "Todos", label: "Todos" },
  { value: "GENERAL", label: "Geral" },
  { value: "URGENT", label: "Urgente" },
  { value: "IMPORTANT", label: "Importante" },
  { value: "WARNING", label: "Atenção" },
  { value: "INFO", label: "Informativo" },
  { value: "EVENT", label: "Evento" },
  { value: "SOCIAL_ACTION", label: "Ação social" },
  { value: "MEETING", label: "Reunião" },
  { value: "LEADERSHIP", label: "Liderança" },
  { value: "PRAYER", label: "Oração" },
  { value: "WORSHIP", label: "Louvor" },
  { value: "SCALE", label: "Escala" },
  { value: "TRAINING", label: "Treinamento" },
  { value: "CHILDREN", label: "Infantil" },
  { value: "YOUTH", label: "Jovens" },
  { value: "WOMEN", label: "Mulheres" },
  { value: "MEN", label: "Homens" },
  { value: "FINANCE", label: "Financeiro" },
  { value: "VOLUNTEERS", label: "Voluntários" },
];

const NEWS_TYPE_META = {
  GENERAL: { icon: "bullhorn-outline", color: "#2DBF8A", bg: "#E8F9F3", label: "Geral" },
  URGENT: { icon: "alert-circle", color: "#E84D4D", bg: "#FEECEC", label: "Urgente" },
  IMPORTANT: { icon: "information", color: "#4158D0", bg: "#EEF0FA", label: "Importante" },
  WARNING: { icon: "alert", color: "#F5A623", bg: "#FEF5E7", label: "Atenção" },
  INFO: { icon: "information-outline", color: "#2E8AE5", bg: "#E6F4FF", label: "Informativo" },
  EVENT: { icon: "calendar-star", color: "#7C3AED", bg: "#F1EAFE", label: "Evento" },
  SOCIAL_ACTION: { icon: "hand-heart", color: "#E85D75", bg: "#FDECEF", label: "Ação social" },
  MEETING: { icon: "account-group", color: "#0EA5E9", bg: "#E7F6FE", label: "Reunião" },
  LEADERSHIP: { icon: "account-tie", color: "#6246EA", bg: "#EFECFF", label: "Liderança" },
  PRAYER: { icon: "hands-pray", color: "#14B8A6", bg: "#E6FFFA", label: "Oração" },
  WORSHIP: { icon: "music-clef-treble", color: "#EC4899", bg: "#FCE7F3", label: "Louvor" },
  SCALE: { icon: "clipboard-list-outline", color: "#F97316", bg: "#FFF3E8", label: "Escala" },
  TRAINING: { icon: "school-outline", color: "#2563EB", bg: "#EAF0FF", label: "Treinamento" },
  CHILDREN: { icon: "baby-face-outline", color: "#06B6D4", bg: "#E6FAFD", label: "Infantil" },
  YOUTH: { icon: "account-star-outline", color: "#8B5CF6", bg: "#F3EFFF", label: "Jovens" },
  WOMEN: { icon: "human-female", color: "#EC4899", bg: "#FCE7F3", label: "Mulheres" },
  MEN: { icon: "human-male", color: "#2563EB", bg: "#EAF0FF", label: "Homens" },
  FINANCE: { icon: "cash-multiple", color: "#16A34A", bg: "#EAFBF0", label: "Financeiro" },
  VOLUNTEERS: { icon: "account-heart-outline", color: "#22C55E", bg: "#EAFBF0", label: "Voluntários" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function dedupeById(list) {
  const map = new Map();
  for (const item of list) {
    if (item?.id != null) map.set(String(item.id), item);
  }
  return Array.from(map.values());
}

function safeUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function getNewsMeta(item) {
  const key = safeUpper(item?.type || item?.category);
  return NEWS_TYPE_META[key] || NEWS_TYPE_META.GENERAL;
}

function isExpired(rawDate) {
  if (!rawDate) return false;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function formatDate(raw) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatExpiresAt(raw) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function collectUserMinistryIds(me) {
  const ids = new Set();
  const possibleLists = [
    me?.ministries, me?.ministryIds, me?.departments, me?.departmentIds,
    me?.member?.ministries, me?.member?.ministryIds,
    me?.churchMember?.ministries, me?.churchMember?.ministryIds,
  ];
  for (const list of possibleLists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item) continue;
      if (typeof item === "string") { ids.add(item); continue; }
      if (item.id) ids.add(item.id);
      if (item.ministryId) ids.add(item.ministryId);
      if (item.departmentId) ids.add(item.departmentId);
    }
  }
  return ids;
}

function canUserSeePost(post, isAdmin, userMinistryIds) {
  if (!post) return false;
  if (isAdmin) return true;
  if (post.active === false) return false;

  const status = safeUpper(post.status);
  if (status && status !== "ACTIVE" && status !== "PUBLISHED") return false;
  if (isExpired(post.expiresAt)) return false;

  const targetDepartmentId = post.targetDepartmentId || post.departmentId || null;
  if (!targetDepartmentId) return true;
  if (!userMinistryIds || userMinistryIds.size === 0) return false;

  return userMinistryIds.has(targetDepartmentId);
}

function sortPostsByDate(a, b) {
  const da = new Date(a?.publishedAt || a?.createdAt || 0).getTime();
  const db = new Date(b?.publishedAt || b?.createdAt || 0).getTime();
  return db - da;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NewsFeedScreen({ navigation }) {
  const theme = useTheme();
  const { apiFetchAuth, activeChurchId, isAdmin, meLoading, me } = useAuth();

  const rawPostsRef = useRef([]);

  const [posts, setPosts] = useState([]);
  const [rawPosts, setRawPosts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [visibleTotal, setVisibleTotal] = useState(0);
  const [error, setError] = useState(null);

  const [activeFilter, setActiveFilter] = useState("Todos");

  // ─── Acumula tipos vistos — nunca apaga ao trocar filtro ─────────────────
  const [availableTypes, setAvailableTypes] = useState(new Set());

  const userMinistryIds = useMemo(() => collectUserMinistryIds(me), [me]);

  // ─── Filtros dinâmicos baseados nos tipos acumulados ─────────────────────
  const availableFilters = useMemo(() => {
    if (availableTypes.size <= 1) return [];
    return FILTERS.filter(
      (f) => f.value === "Todos" || availableTypes.has(f.value)
    );
  }, [availableTypes]);

  const normalizeResponse = useCallback((res) => {
    const list = toArray(res);
    const pagination = res?.pagination || { total: list.length };
    return { list, total: Number(pagination.total ?? list.length) };
  }, []);

  const applyLocalVisibility = useCallback(
    (list) =>
      list
        .filter((post) => canUserSeePost(post, isAdmin, userMinistryIds))
        .sort(sortPostsByDate),
    [isAdmin, userMinistryIds],
  );

  const applyLocalVisibilityRef = useRef(applyLocalVisibility);
  useEffect(() => {
    applyLocalVisibilityRef.current = applyLocalVisibility;
  }, [applyLocalVisibility]);

  const fetchPosts = useCallback(
    async ({ skip = 0, replace = true } = {}) => {
      if (!activeChurchId) {
        rawPostsRef.current = [];
        setRawPosts([]);
        setPosts([]);
        setTotal(0);
        setVisibleTotal(0);
        setHasMore(false);
        return;
      }

      try {
        setError(null);

        const qs = new URLSearchParams({
          churchId: activeChurchId,
          take: String(PAGE_SIZE),
          skip: String(skip),
        });

        if (activeFilter !== "Todos") qs.set("type", activeFilter);

        const res = await apiFetchAuth(`/news?${qs.toString()}`);
        const { list, total: serverTotal } = normalizeResponse(res);

        const mergedRaw = replace
          ? dedupeById(list)
          : dedupeById([...rawPostsRef.current, ...list]);

        rawPostsRef.current = mergedRaw;

        const visible = applyLocalVisibilityRef.current(mergedRaw);

        setRawPosts(mergedRaw);
        setPosts(visible);
        setTotal(serverTotal);
        setVisibleTotal(visible.length);
        setHasMore(skip + list.length < serverTotal);

        // Acumula tipos encontrados — nunca sobrescreve, só adiciona
        if (list.length > 0) {
          setAvailableTypes((prev) => {
            const next = new Set(prev);
            list.forEach((p) => {
              const t = safeUpper(p?.type || p?.category);
              if (t) next.add(t);
            });
            return next;
          });
        }
      } catch (err) {
        setError(err?.message ?? "Erro ao carregar avisos.");
      }
    },
    [activeChurchId, activeFilter, apiFetchAuth, normalizeResponse],
  );

  useEffect(() => {
    if (meLoading) return undefined;

    let alive = true;

    async function load() {
      setLoading(true);
      rawPostsRef.current = [];
      setRawPosts([]);
      setPosts([]);
      setHasMore(true);

      try {
        await fetchPosts({ skip: 0, replace: true });
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, [meLoading, fetchPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    rawPostsRef.current = [];
    setRawPosts([]);
    setPosts([]);
    setHasMore(true);
    setAvailableTypes(new Set()); // reseta tipos ao fazer pull-to-refresh
    try {
      await fetchPosts({ skip: 0, replace: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchPosts]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchPosts({ skip: rawPostsRef.current.length, replace: false });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchPosts]);

  const handleDelete = useCallback(
    (post) => {
      Alert.alert("Excluir aviso", `Deseja excluir "${post.title}"?`, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetchAuth(`/news/${post.id}`, { method: "DELETE" });

              const nextRaw = rawPostsRef.current.filter((item) => item.id !== post.id);
              rawPostsRef.current = nextRaw;
              const nextVisible = applyLocalVisibilityRef.current(nextRaw);

              setRawPosts(nextRaw);
              setPosts(nextVisible);
              setTotal((prev) => Math.max(0, prev - 1));
              setVisibleTotal(nextVisible.length);
            } catch (err) {
              Alert.alert("Erro", err?.message ?? "Não foi possível excluir.");
            }
          },
        },
      ]);
    },
    [apiFetchAuth],
  );

  const renderStatusChips = useCallback(
    (item) => {
      const expired = isExpired(item?.expiresAt);
      const inactive = item?.active === false;

      if (!isAdmin && !expired && !inactive) return null;

      return (
        <View style={styles.statusRow}>
          {inactive ? (
            <View style={[styles.statusChip, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="eye-off-outline" size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "700" }}>
                Rascunho
              </Text>
            </View>
          ) : null}

          {expired ? (
            <View style={[styles.statusChip, { backgroundColor: theme.colors.errorContainer }]}>
              <Icon source="timer-off-outline" size={12} color={theme.colors.error} />
              <Text variant="labelSmall" style={{ color: theme.colors.error, fontWeight: "700" }}>
                Expirado
              </Text>
            </View>
          ) : null}
        </View>
      );
    },
    [isAdmin, theme],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const meta = getNewsMeta(item);
      const dateLabel = formatDate(item.publishedAt ?? item.createdAt);
      const expiresLabel = formatExpiresAt(item.expiresAt);
      const targetDepartmentName = item.targetDepartmentName || item.departmentName || "";
      const expired = isExpired(item.expiresAt);
      const inactive = item.active === false;
      const opacity = expired || inactive ? 0.62 : 1;

      return (
        <Card
          mode="outlined"
          style={[styles.card, { borderColor: theme.colors.outlineVariant, opacity }]}
          onPress={() => navigation.navigate("NewsDetails", { id: item.id })}
        >
          {item.coverUrl ? (
            <Card.Cover source={{ uri: item.coverUrl }} style={styles.cover} />
          ) : null}

          <Card.Content style={{ gap: 10, paddingTop: item.coverUrl ? 12 : 16 }}>
            <View style={styles.topRow}>
              <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                <Icon source={meta.icon} size={14} color={meta.color} />
                <Text variant="labelSmall" style={{ color: meta.color, fontWeight: "800" }}>
                  {meta.label}
                </Text>
              </View>

              {!!dateLabel && (
                <View style={styles.dateRow}>
                  <Icon source="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {dateLabel}
                  </Text>
                </View>
              )}
            </View>

            {renderStatusChips(item)}

            <Text variant="titleMedium" style={styles.title}>
              {item.title}
            </Text>

            {!!item.content && (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}
                numberOfLines={3}
              >
                {item.content}
              </Text>
            )}

            <View style={styles.metaList}>
              {!!targetDepartmentName ? (
                <View style={styles.metaItem}>
                  <Icon source="account-group-outline" size={15} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                    {targetDepartmentName}
                  </Text>
                </View>
              ) : (
                <View style={styles.metaItem}>
                  <Icon source="earth" size={15} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                    Toda a igreja
                  </Text>
                </View>
              )}

              {!!expiresLabel && (
                <View style={styles.metaItem}>
                  <Icon
                    source={expired ? "timer-off-outline" : "timer-outline"}
                    size={15}
                    color={expired ? theme.colors.error : theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodySmall"
                    style={{ color: expired ? theme.colors.error : theme.colors.onSurfaceVariant, flex: 1 }}
                    numberOfLines={1}
                  >
                    {expired ? "Expirou em" : "Visível até"} {expiresLabel}
                  </Text>
                </View>
              )}

              {!!item.createdByName && (
                <View style={styles.metaItem}>
                  <Icon source="account-outline" size={15} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                    Por {item.createdByName}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.footerRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Toque para ver detalhes
              </Text>

              <View style={styles.footerActions}>
                {isAdmin && (
                  <>
                    <IconButton
                      icon="pencil-outline"
                      size={18}
                      iconColor={theme.colors.primary}
                      style={styles.iconBtn}
                      onPress={() => navigation.navigate("NewsForm", { post: item })}
                    />
                    <IconButton
                      icon="trash-can-outline"
                      size={18}
                      iconColor={theme.colors.error}
                      style={styles.iconBtn}
                      onPress={() => handleDelete(item)}
                    />
                  </>
                )}
                <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            </View>
          </Card.Content>
        </Card>
      );
    },
    [theme, isAdmin, navigation, handleDelete, renderStatusChips],
  );

  // ─── Loading inicial ───────────────────────────────────────────────────────
  if (meLoading || (loading && posts.length === 0 && !error)) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            Carregando avisos...
          </Text>
        </View>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
          Avisos
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {visibleTotal > 0
            ? `${visibleTotal} aviso${visibleTotal !== 1 ? "s" : ""}`
            : isAdmin
              ? "Gerencie avisos, eventos e comunicados"
              : "Avisos, eventos e comunicados"}
        </Text>
      </View>

      {/* Filtros dinâmicos — só aparece se houver 2+ tipos distintos */}
      {availableFilters.length > 0 && (
        <FlatList
          horizontal
          data={availableFilters}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          alwaysBounceVertical={false}
          style={{ flexGrow: 0, height: 54 }}        // ← altura fixa no container
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => {
            const selected = activeFilter === item.value;
            const meta = item.value === "Todos" ? null : NEWS_TYPE_META[item.value];
            const accentColor = meta?.color ?? theme.colors.primary;

            return (
              <TouchableOpacity
                onPress={() => {
                  rawPostsRef.current = [];
                  setRawPosts([]);
                  setPosts([]);
                  setHasMore(true);
                  setActiveFilter(item.value);
                }}
                style={[
                  styles.filterChip,
                  selected
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : { backgroundColor: "transparent", borderColor: theme.colors.outlineVariant },
                ]}
                activeOpacity={0.75}
              >
                {selected && (
                  <Icon
                    source={meta ? meta.icon : "check"}
                    size={13}
                    color="#fff"
                  />
                )}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: selected ? "#fff" : theme.colors.onSurfaceVariant,
                    marginLeft: selected ? 4 : 0,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Banner de erro */}
      {error ? (
        <Surface
          style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
          elevation={0}
        >
          <Icon source="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={{ color: theme.colors.onErrorContainer, flex: 1, marginLeft: 8 }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => {
              rawPostsRef.current = [];
              setRawPosts([]);
              setPosts([]);
              fetchPosts({ skip: 0, replace: true });
            }}
          >
            <Text style={{ color: theme.colors.error, fontWeight: "700" }}>
              Tentar novamente
            </Text>
          </TouchableOpacity>
        </Surface>
      ) : null}

      {/* Lista de avisos */}
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 96 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <Surface
              style={[
                styles.empty,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              elevation={0}
            >
              <Icon source="text-search" size={32} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleMedium" style={{ marginTop: 12, fontWeight: "800" }}>
                Nada por aqui
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 4,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                Não encontramos avisos com esse filtro.
              </Text>
            </Surface>
          ) : null
        }
        renderItem={renderItem}
      />

      {/* FAB — apenas admin */}
      {isAdmin && (
        <FAB
          icon="plus"
          label="Novo aviso"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => navigation.navigate("NewsForm", { post: null })}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  header: {
    marginBottom: 12,
  },

  search: {
    marginTop: 4,
  },

  chipsRow: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },

  chip: {
    borderRadius: 999,
    marginRight: 8,
  },

  chipsRow: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 0,
    alignItems: "center",
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 38,
  },

  card: {
    borderRadius: 18,
    overflow: "hidden",
  },

  cover: {
    borderRadius: 0,
    height: 170,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  pill: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  statusChip: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },

  title: {
    fontWeight: "900",
    lineHeight: 23,
    letterSpacing: -0.2,
  },

  metaList: {
    gap: 6,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  footerRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  footerActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBtn: {
    margin: 0,
    padding: 0,
  },

  empty: {
    marginTop: 32,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    borderRadius: 999,
  },
});