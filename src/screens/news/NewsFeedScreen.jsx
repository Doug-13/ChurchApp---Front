// src/screens/news/NewsFeedScreen.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Divider,
  Icon,
  Surface,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { useTerms } from "../../context/TerminologyContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND       = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const BG          = "#F5F6FA";
const SURFACE     = "#FFFFFF";
const BORDER      = "#E4E6F0";
const MUTED       = "#9198B5";
const DANGER      = "#E84D4D";
const DANGER_BG   = "#FEECEC";

// ─── Constantes ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const NEWS_TYPE_META = {
  GENERAL:       { icon: "bullhorn-outline",        color: "#2DBF8A", bg: "#E8F9F3", label: "Geral" },
  URGENT:        { icon: "alert-circle",            color: "#E84D4D", bg: "#FEECEC", label: "Urgente" },
  IMPORTANT:     { icon: "information",             color: "#4158D0", bg: "#EEF0FA", label: "Importante" },
  WARNING:       { icon: "alert",                   color: "#F5A623", bg: "#FEF5E7", label: "Atenção" },
  INFO:          { icon: "information-outline",     color: "#2E8AE5", bg: "#E6F4FF", label: "Informativo" },
  EVENT:         { icon: "calendar-star",           color: "#7C3AED", bg: "#F1EAFE", label: "Evento" },
  SOCIAL_ACTION: { icon: "hand-heart",              color: "#E85D75", bg: "#FDECEF", label: "Ação social" },
  MEETING:       { icon: "account-group",           color: "#0EA5E9", bg: "#E7F6FE", label: "Reunião" },
  LEADERSHIP:    { icon: "account-tie",             color: "#6246EA", bg: "#EFECFF", label: "Liderança" },
  PRAYER:        { icon: "hands-pray",              color: "#14B8A6", bg: "#E6FFFA", label: "Oração" },
  WORSHIP:       { icon: "music-clef-treble",       color: "#EC4899", bg: "#FCE7F3", label: "Louvor" },
  SCALE:         { icon: "clipboard-list-outline",  color: "#F97316", bg: "#FFF3E8", label: "Escala" },
  TRAINING:      { icon: "school-outline",          color: "#2563EB", bg: "#EAF0FF", label: "Treinamento" },
  CHILDREN:      { icon: "baby-face-outline",       color: "#06B6D4", bg: "#E6FAFD", label: "Infantil" },
  YOUTH:         { icon: "account-star-outline",    color: "#8B5CF6", bg: "#F3EFFF", label: "Jovens" },
  WOMEN:         { icon: "human-female",            color: "#EC4899", bg: "#FCE7F3", label: "Mulheres" },
  MEN:           { icon: "human-male",              color: "#2563EB", bg: "#EAF0FF", label: "Homens" },
  FINANCE:       { icon: "cash-multiple",           color: "#16A34A", bg: "#EAFBF0", label: "Financeiro" },
  VOLUNTEERS:    { icon: "account-heart-outline",   color: "#22C55E", bg: "#EAFBF0", label: "Voluntários" },
};

const FILTERS = [
  { value: "Todos",         label: "Todos" },
  { value: "GENERAL",       label: "Geral" },
  { value: "URGENT",        label: "Urgente" },
  { value: "IMPORTANT",     label: "Importante" },
  { value: "WARNING",       label: "Atenção" },
  { value: "INFO",          label: "Informativo" },
  { value: "EVENT",         label: "Evento" },
  { value: "SOCIAL_ACTION", label: "Ação social" },
  { value: "MEETING",       label: "Reunião" },
  { value: "LEADERSHIP",    label: "Liderança" },
  { value: "PRAYER",        label: "Oração" },
  { value: "WORSHIP",       label: "Louvor" },
  { value: "SCALE",         label: "Escala" },
  { value: "TRAINING",      label: "Treinamento" },
  { value: "CHILDREN",      label: "Infantil" },
  { value: "YOUTH",         label: "Jovens" },
  { value: "WOMEN",         label: "Mulheres" },
  { value: "MEN",           label: "Homens" },
  { value: "FINANCE",       label: "Financeiro" },
  { value: "VOLUNTEERS",    label: "Voluntários" },
];

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
    if (item?.id != null) {
      map.set(String(item.id), item);
    }
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

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function collectUserMinistryIds(me) {
  const ids = new Set();

  const possibleLists = [
    me?.ministries,
    me?.ministryIds,
    me?.departments,
    me?.departmentIds,
    me?.member?.ministries,
    me?.member?.ministryIds,
    me?.churchMember?.ministries,
    me?.churchMember?.ministryIds,
  ];

  for (const list of possibleLists) {
    if (!Array.isArray(list)) continue;

    for (const item of list) {
      if (!item) continue;

      if (typeof item === "string") {
        ids.add(item);
        continue;
      }

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

// Resolve URL de imagem do aviso.
// Prioriza coverUrl, mas mantém compatibilidade com outros nomes.
function resolveImageUrl(obj, ...fields) {
  if (!obj) return null;

  for (const field of fields) {
    const value = obj[field];

    if (
      value &&
      typeof value === "string" &&
      (value.startsWith("http://") || value.startsWith("https://"))
    ) {
      return value;
    }
  }

  return null;
}

// ─── NewsCard ────────────────────────────────────────────────────────────────
// Agora mostra imagem do aviso quando existir coverUrl.
// Fallback: mantém o ícone antigo.
function NewsCard({ item, isAdmin, onPress, onEdit, onDelete, last }) {
  const meta = getNewsMeta(item);
  const dateLabel = formatDate(item.publishedAt ?? item.createdAt);
  const expired = isExpired(item.expiresAt);
  const inactive = item.active === false;
  const faded = expired || inactive;

  const coverUrl = resolveImageUrl(
    item,
    "coverUrl",
    "coverImageUrl",
    "imageUrl",
    "image",
    "photoUrl"
  );

  return (
    <>
      <TouchableRipple
        onPress={onPress}
        style={[s.newsRow, faded && { opacity: 0.62 }]}
      >
        <View style={s.newsRowInner}>
          {/* Faixa lateral colorida */}
          <View style={[s.newsBar, { backgroundColor: meta.color }]} />

          {/* Imagem do aviso OU ícone */}
          {coverUrl ? (
            <View style={s.newsThumbWrap}>
              <Image
                source={{ uri: coverUrl }}
                style={s.newsThumbImage}
                resizeMode="cover"
              />

              <View style={s.newsThumbOverlay} />

              <View style={[s.newsThumbBadge, { backgroundColor: meta.color }]}>
                <Icon source={meta.icon} size={11} color="#FFFFFF" />
              </View>
            </View>
          ) : (
            <View style={[s.newsIcon, { backgroundColor: meta.bg }]}>
              <Icon source={meta.icon} size={18} color={meta.color} />
            </View>
          )}

          {/* Conteúdo */}
          <View style={s.newsContent}>
            {/* Badge tipo + data */}
            <View style={s.newsBadgeRow}>
              <View style={[s.newsBadge, { backgroundColor: meta.bg }]}>
                <Text style={[s.newsBadgeText, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>

              {!!dateLabel && <Text style={s.newsDate}>{dateLabel}</Text>}

              {inactive && (
                <View style={[s.statusChip, { backgroundColor: "#F0F1F5" }]}>
                  <Text style={[s.statusChipText, { color: MUTED }]}>
                    Rascunho
                  </Text>
                </View>
              )}

              {expired && (
                <View style={[s.statusChip, { backgroundColor: DANGER_BG }]}>
                  <Text style={[s.statusChipText, { color: DANGER }]}>
                    Expirado
                  </Text>
                </View>
              )}
            </View>

            {/* Título */}
            <Text style={s.newsTitle} numberOfLines={2}>
              {item.title || "Aviso"}
            </Text>

            {/* Prévia do conteúdo */}
            {!!item.content && (
              <Text style={s.newsBody} numberOfLines={2}>
                {item.content}
              </Text>
            )}

            {/* Meta: departamento ou toda a igreja */}
            <View style={s.newsMetaRow}>
              <Icon
                source={item.targetDepartmentName ? "account-group-outline" : "earth"}
                size={12}
                color={MUTED}
              />
              <Text style={s.newsMeta} numberOfLines={1}>
                {item.targetDepartmentName || "Toda a igreja"}
              </Text>
            </View>
          </View>

          {/* Ações admin + chevron */}
          <View style={s.newsActions}>
            {isAdmin && (
              <>
                <TouchableRipple
                  onPress={onEdit}
                  borderless
                  style={s.actionBtn}
                  hitSlop={8}
                >
                  <Icon source="pencil-outline" size={16} color={BRAND} />
                </TouchableRipple>

                <TouchableRipple
                  onPress={onDelete}
                  borderless
                  style={s.actionBtn}
                  hitSlop={8}
                >
                  <Icon source="trash-can-outline" size={16} color={DANGER} />
                </TouchableRipple>
              </>
            )}

            <Icon source="chevron-right" size={18} color={MUTED} />
          </View>
        </View>
      </TouchableRipple>

      {!last && <Divider style={{ backgroundColor: BORDER, marginLeft: 64 }} />}
    </>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({ filter, selected, onPress }) {
  const meta = filter.value === "Todos" ? null : NEWS_TYPE_META[filter.value];
  const accentColor = meta?.color ?? BRAND;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        s.filterChip,
        selected
          ? { backgroundColor: accentColor, borderColor: accentColor }
          : { backgroundColor: BG, borderColor: BORDER },
      ]}
    >
      {selected && meta && <Icon source={meta.icon} size={12} color="#fff" />}

      <Text style={[s.filterChipText, { color: selected ? "#fff" : MUTED }]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function NewsFeedScreen({ navigation }) {
  const { apiFetchAuth, activeChurchId, isAdmin, meLoading, me } = useAuth();
  const { t } = useTerms();

  const rawPostsRef = useRef([]);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [visibleTotal, setVisibleTotal] = useState(0);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [availableTypes, setAvailableTypes] = useState(new Set());

  const userMinistryIds = useMemo(() => collectUserMinistryIds(me), [me]);

  const availableFilters = useMemo(() => {
    if (availableTypes.size <= 1) return [];

    return FILTERS.filter(
      (filter) => filter.value === "Todos" || availableTypes.has(filter.value)
    );
  }, [availableTypes]);

  const normalizeResponse = useCallback((res) => {
    const list = toArray(res);
    const pagination = res?.pagination || { total: list.length };

    return {
      list,
      total: Number(pagination.total ?? list.length),
    };
  }, []);

  const applyLocalVisibility = useCallback(
    (list) =>
      list
        .filter((post) => canUserSeePost(post, isAdmin, userMinistryIds))
        .sort(sortPostsByDate),
    [isAdmin, userMinistryIds]
  );

  const applyLocalVisibilityRef = useRef(applyLocalVisibility);

  useEffect(() => {
    applyLocalVisibilityRef.current = applyLocalVisibility;
  }, [applyLocalVisibility]);

  const fetchPosts = useCallback(
    async ({ skip = 0, replace = true } = {}) => {
      if (!activeChurchId) {
        rawPostsRef.current = [];
        setPosts([]);
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

        if (activeFilter !== "Todos") {
          qs.set("type", activeFilter);
        }

        const res = await apiFetchAuth(`/news?${qs.toString()}`);
        const { list, total: serverTotal } = normalizeResponse(res);

        const mergedRaw = replace
          ? dedupeById(list)
          : dedupeById([...rawPostsRef.current, ...list]);

        rawPostsRef.current = mergedRaw;

        const visible = applyLocalVisibilityRef.current(mergedRaw);

        setPosts(visible);
        setVisibleTotal(visible.length);
        setHasMore(skip + list.length < serverTotal);

        if (list.length > 0) {
          setAvailableTypes((prev) => {
            const next = new Set(prev);

            list.forEach((post) => {
              const type = safeUpper(post?.type || post?.category);
              if (type) next.add(type);
            });

            return next;
          });
        }
      } catch (err) {
        setError(err?.message ?? "Erro ao carregar avisos.");
      }
    },
    [activeChurchId, activeFilter, apiFetchAuth, normalizeResponse]
  );

  useEffect(() => {
    if (meLoading) return undefined;

    let alive = true;

    async function load() {
      setLoading(true);
      rawPostsRef.current = [];
      setPosts([]);
      setHasMore(true);

      try {
        await fetchPosts({ skip: 0, replace: true });
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [meLoading, fetchPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    rawPostsRef.current = [];
    setPosts([]);
    setHasMore(true);
    setAvailableTypes(new Set());

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
      await fetchPosts({
        skip: rawPostsRef.current.length,
        replace: false,
      });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchPosts]);

  const handleDelete = useCallback(
    (post) => {
      Alert.alert("Excluir aviso", `Deseja excluir "${post.title}"?`, [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetchAuth(`/news/${post.id}`, {
                method: "DELETE",
              });

              const nextRaw = rawPostsRef.current.filter(
                (item) => item.id !== post.id
              );

              rawPostsRef.current = nextRaw;

              const nextVisible = applyLocalVisibilityRef.current(nextRaw);

              setPosts(nextVisible);
              setVisibleTotal(nextVisible.length);
            } catch (err) {
              Alert.alert("Erro", err?.message ?? "Não foi possível excluir.");
            }
          },
        },
      ]);
    },
    [apiFetchAuth]
  );

  // ── Loading inicial ────────────────────────────────────────────────────────
  if (meLoading || (loading && posts.length === 0 && !error)) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={BRAND} size="large" />
        <Text style={s.loadingText}>
          Carregando {t.news.toLowerCase()}...
        </Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View style={s.listHeader}>
            {/* Hero */}
            <View style={s.hero}>
              <View
                style={[
                  s.blob,
                  {
                    width: 200,
                    height: 200,
                    top: -60,
                    right: -50,
                  },
                ]}
              />

              <View
                style={[
                  s.blob,
                  {
                    width: 120,
                    height: 120,
                    bottom: -50,
                    left: -30,
                    opacity: 0.05,
                  },
                ]}
              />

              <View style={s.heroTop}>
                <View style={s.heroIcon}>
                  <Icon source="bullhorn-outline" size={20} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.heroGreet}>Painel de</Text>
                  <Text style={s.heroTitle}>{t.news}</Text>
                </View>

                {isAdmin && (
                  <TouchableRipple
                    onPress={() => navigation.navigate("NewsForm", { post: null })}
                    borderless
                    style={s.heroAddBtn}
                  >
                    <View style={s.heroAddBtnInner}>
                      <Icon source="plus" size={16} color="#fff" />
                      <Text style={s.heroAddBtnText}>Novo</Text>
                    </View>
                  </TouchableRipple>
                )}
              </View>

              <Text style={s.heroSubtitle}>
                {visibleTotal > 0
                  ? `${visibleTotal} ${t.news.toLowerCase()} disponíve${
                      visibleTotal === 1 ? "l" : "is"
                    }`
                  : "Comunicados e informes da comunidade"}
              </Text>
            </View>

            {/* Filtros — só aparece se houver 2+ tipos */}
            {availableFilters.length > 0 && (
              <FlatList
                horizontal
                data={availableFilters}
                keyExtractor={(filter) => filter.value}
                showsHorizontalScrollIndicator={false}
                style={s.filterList}
                contentContainerStyle={s.filterListContent}
                renderItem={({ item: filter }) => (
                  <FilterChip
                    filter={filter}
                    selected={activeFilter === filter.value}
                    onPress={() => {
                      rawPostsRef.current = [];
                      setPosts([]);
                      setHasMore(true);
                      setActiveFilter(filter.value);
                    }}
                  />
                )}
              />
            )}

            {/* Banner de erro */}
            {!!error && (
              <View style={s.errorBanner}>
                <Icon source="alert-circle-outline" size={16} color={DANGER} />

                <Text style={s.errorText}>{error}</Text>

                <TouchableRipple
                  onPress={() => {
                    rawPostsRef.current = [];
                    setPosts([]);
                    fetchPosts({ skip: 0, replace: true });
                  }}
                  borderless
                  style={s.retryBtn}
                >
                  <Text style={s.retryText}>Tentar</Text>
                </TouchableRipple>
              </View>
            )}

            {/* Label da lista */}
            {posts.length > 0 && (
              <View style={s.sectionLabelRow}>
                <Text style={s.sectionLabel}>
                  {activeFilter === "Todos"
                    ? `TODOS OS ${t.news.toUpperCase()}`
                    : NEWS_TYPE_META[activeFilter]?.label?.toUpperCase() ??
                      t.news.toUpperCase()}
                </Text>

                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{visibleTotal}</Text>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Surface
            elevation={0}
            style={index === 0 ? s.newsCardFirst : s.newsCard}
          >
            <NewsCard
              item={item}
              isAdmin={isAdmin}
              last={index === posts.length - 1}
              onPress={() => navigation.navigate("NewsDetails", { id: item.id })}
              onEdit={() => navigation.navigate("NewsForm", { post: item })}
              onDelete={() => handleDelete(item)}
            />
          </Surface>
        )}
        ItemSeparatorComponent={() => null}
        ListFooterComponent={
          loadingMore ? (
            <View style={s.loadingMore}>
              <ActivityIndicator color={BRAND} size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <Surface elevation={0} style={s.emptyCard}>
              <Icon source="text-search" size={40} color={MUTED} />

              <Text style={s.emptyTitle}>Nenhum aviso</Text>

              <Text style={s.emptyDesc}>
                {activeFilter !== "Todos"
                  ? `Não há ${t.news.toLowerCase()} com esse filtro.`
                  : isAdmin
                    ? `Publique o primeiro ${t.news
                        .toLowerCase()
                        .replace(/s$/, "")} para sua comunidade.`
                    : `Nenhum ${t.news
                        .toLowerCase()
                        .replace(/s$/, "")} disponível no momento.`}
              </Text>

              {isAdmin && activeFilter === "Todos" && (
                <TouchableRipple
                  onPress={() => navigation.navigate("NewsForm", { post: null })}
                  borderless
                  style={s.emptyBtn}
                >
                  <View style={s.emptyBtnInner}>
                    <Icon source="plus" size={16} color="#fff" />
                    <Text style={s.emptyBtnText}>
                      Publicar {t.news.toLowerCase().replace(/s$/, "")}
                    </Text>
                  </View>
                </TouchableRipple>
              )}
            </Surface>
          ) : null
        }
      />

      {/* FAB — apenas admin, aparece sobre a lista */}
      {isAdmin && posts.length > 0 && (
        <TouchableRipple
          onPress={() => navigation.navigate("NewsForm", { post: null })}
          borderless
          style={s.fab}
        >
          <View style={s.fabInner}>
            <Icon source="plus" size={20} color="#fff" />
            <Text style={s.fabText}>
              Novo {t.news.toLowerCase().replace(/s$/, "")}
            </Text>
          </View>
        </TouchableRipple>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: MUTED,
    fontWeight: "600",
  },

  listContent: {
    paddingBottom: 100,
  },

  listHeader: {
    gap: 0,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 20 : 16,
    paddingBottom: 20,
    overflow: "hidden",
    position: "relative",
  },

  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 2,
    marginBottom: 8,
  },

  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroGreet: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.60)",
  },

  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },

  heroSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.58)",
    zIndex: 2,
  },

  heroAddBtn: {
    borderRadius: 999,
    overflow: "hidden",
  },

  heroAddBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  heroAddBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },

  // ── Filtros ───────────────────────────────────────────────────────────────
  filterList: {
    flexGrow: 0,
    maxHeight: 52,
  },

  filterListContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 36,
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Erro ──────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: DANGER_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DANGER,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    color: DANGER,
    fontWeight: "600",
  },

  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  retryText: {
    fontSize: 12,
    fontWeight: "800",
    color: DANGER,
  },

  // ── Section label ─────────────────────────────────────────────────────────
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: MUTED,
    textTransform: "uppercase",
  },

  countBadge: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },

  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: BRAND,
  },

  // ── News card / grupo de cards ────────────────────────────────────────────
  newsCardFirst: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 2,
      },
    }),
  },

  newsCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    overflow: "hidden",
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // ── News row ──────────────────────────────────────────────────────────────
  newsRow: {
    paddingRight: 12,
    paddingVertical: 0,
  },

  newsRowInner: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 82,
  },

  newsBar: {
    width: 3,
    alignSelf: "stretch",
    flexShrink: 0,
  },

  newsIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    marginVertical: 16,
    flexShrink: 0,
  },

  // Miniatura da imagem do aviso
  newsThumbWrap: {
    width: 58,
    height: 58,
    borderRadius: 16,
    overflow: "hidden",
    marginLeft: 12,
    marginVertical: 12,
    backgroundColor: BRAND_LIGHT,
    flexShrink: 0,
    position: "relative",
  },

  newsThumbImage: {
    width: "100%",
    height: "100%",
  },

  newsThumbOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  newsThumbBadge: {
    position: "absolute",
    right: 5,
    bottom: 5,
    width: 22,
    height: 22,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  newsContent: {
    flex: 1,
    paddingLeft: 10,
    paddingVertical: 13,
    gap: 4,
  },

  newsBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  newsBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  newsBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  newsDate: {
    fontSize: 10,
    color: MUTED,
    fontWeight: "600",
  },

  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  statusChipText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  newsTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.2,
    lineHeight: 18,
  },

  newsBody: {
    fontSize: 11,
    color: MUTED,
    lineHeight: 16,
  },

  newsMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },

  newsMeta: {
    fontSize: 10,
    color: MUTED,
    flex: 1,
  },

  newsActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    paddingLeft: 4,
  },

  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Loading more ──────────────────────────────────────────────────────────
  loadingMore: {
    paddingVertical: 20,
    alignItems: "center",
  },

  // ── Empty ─────────────────────────────────────────────────────────────────
  emptyCard: {
    margin: 16,
    marginTop: 8,
    alignItems: "center",
    gap: 10,
    padding: 28,
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: BORDER,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: NAVY,
  },

  emptyDesc: {
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
    lineHeight: 19,
  },

  emptyBtn: {
    marginTop: 8,
    borderRadius: 999,
    overflow: "hidden",
  },

  emptyBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },

  emptyBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    borderRadius: 999,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 6,
      },
    }),
  },

  fabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
  },

  fabText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
});