import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Icon,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND_BLUE  = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const SUCCESS     = "#2DBF8A";
const SUCCESS_BG  = "#E8F9F3";
const DANGER      = "#E84D4D";
const DANGER_BG   = "#FEECEC";

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useChurchEvents({ churchId, enabled, q, apiGet }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const reqIdRef = useRef(0);

  const reload = useCallback(async () => {
    const rid = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    try {
      if (!enabled || !churchId) {
        setItems([]);
        return;
      }

      const qs   = new URLSearchParams();
      qs.set("take", "60");
      const term = (q || "").trim();
      if (term) qs.set("q", term);

      const json = await apiGet(`/churches/${churchId}/events?${qs.toString()}`);
      if (rid !== reqIdRef.current) return;

      const arr = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
          ? json
          : [];

      setItems(arr);
    } catch (e) {
      if (rid !== reqIdRef.current) return;
      setError(String(e?.message || e));
      setItems([]);
    } finally {
      if (rid === reqIdRef.current) setLoading(false);
    }
  }, [enabled, churchId, q, apiGet]);

  useEffect(() => { reload(); }, [enabled, churchId, reload]);

  useEffect(() => {
    if (!enabled) return undefined;
    const t = setTimeout(() => reload(), 300);
    return () => clearTimeout(t);
  }, [q, enabled, reload]);

  return { items, loading, error, reload };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRawEventDate(event) {
  return event?.dateLabel || event?.date || event?.startsAt || event?.startDate || event?.startAt || "";
}

function getRawEventTime(event) {
  return event?.timeLabel || event?.time || "";
}

function formatEventDate(raw) {
  if (!raw) return "";
  const value = String(raw);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatEventTime(raw) {
  if (!raw) return "";
  const value    = String(raw);
  const isoMatch = value.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    const h = isoMatch[1];
    const m = isoMatch[2];
    if (h === "00" && m === "00") return "";
    return `${h}:${m}`;
  }
  const hourMatch = value.match(/^(\d{2}):(\d{2})/);
  if (hourMatch) {
    const h = hourMatch[1];
    const m = hourMatch[2];
    if (h === "00" && m === "00") return "";
    return `${h}:${m}`;
  }
  return "";
}

function getEventDateParts(raw) {
  const value = String(raw || "");
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return { day: "--", month: "DATA" };

  const monthNames = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  return {
    day:   match[3],
    month: monthNames[Number(match[2]) - 1] || match[2],
  };
}

function getEventTimestamp(rawDate) {
  if (!rawDate) return null;
  const value      = String(rawDate);
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const time       = new Date(normalized).getTime();
  return Number.isNaN(time) ? null : time;
}

// ✅ Verifica se o usuário pode criar/editar eventos
function canManageEvents(role) {
  const r = String(role || "").toUpperCase();
  return r === "OWNER" || r === "ADMIN";
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ icon, title, description, onAction, tc }) {
  return (
    <View style={[styles.empty, { borderColor: tc.outline }]}>
      <View style={[styles.emptyIconWrap, { backgroundColor: tc.surface }]}>
        <Icon source={icon} size={28} color={tc.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: tc.muted }]}>{description}</Text>
      {onAction && (
        <TouchableRipple onPress={onAction} borderless style={styles.emptyBtn}>
          <View style={styles.emptyBtnInner}>
            <Icon source="plus" size={15} color="#fff" />
            <Text style={styles.emptyBtnText}>Novo evento</Text>
          </View>
        </TouchableRipple>
      )}
    </View>
  );
}

// ─── EventDateThumb ───────────────────────────────────────────────────────────
function EventDateThumb({ rawDate }) {
  const parts = getEventDateParts(rawDate);
  return (
    <View style={styles.eventDateThumb}>
      <Text style={styles.eventDateDay}>{parts.day}</Text>
      <Text style={styles.eventDateMonth}>{parts.month}</Text>
    </View>
  );
}

// ─── EventCard ────────────────────────────────────────────────────────────────
function EventCard({ event, onPress, tc }) {
  const cover     = event?.coverImageUrl || event?.coverUrl || event?.imageUrl || event?.image || null;
  const rawDate   = getRawEventDate(event);
  const rawTime   = getRawEventTime(event);
  const dateLabel = formatEventDate(rawDate);
  const timeLabel = formatEventTime(rawTime || rawDate);
  const where     = event?.location || event?.address || "";
  const price     = event?.priceLabel || (event?.isFree ? "Gratuito" : "");

  const now         = Date.now();
  const eventDate   = getEventTimestamp(rawDate);
  const isPast      = Boolean(eventDate && eventDate < now);
  const statusColor = isPast ? "#9198B5" : SUCCESS;
  const statusBg    = isPast ? "#F0F1F5" : SUCCESS_BG;
  const statusLabel = isPast ? "Realizado" : "Em breve";

  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={[styles.eventCard, { backgroundColor: tc.surface, borderColor: tc.outline }]}
    >
      <View style={styles.eventCardInner}>
        <View style={[styles.eventThumb, { backgroundColor: BRAND_LIGHT }]}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.eventThumbImg} resizeMode="cover" />
          ) : (
            <EventDateThumb rawDate={rawDate} />
          )}
        </View>

        <View style={styles.eventInfo}>
          <View style={styles.eventTopRow}>
            <View style={[styles.eventStatusPill, { backgroundColor: statusBg }]}>
              <View style={[styles.eventStatusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.eventStatusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <Text style={styles.eventTitle} numberOfLines={1}>
            {event?.title || "Evento"}
          </Text>

          <View style={styles.eventMeta}>
            {!!dateLabel && (
              <View style={styles.eventMetaRow}>
                <Icon source="calendar-outline" size={13} color={tc.muted} />
                <Text style={[styles.eventMetaText, { color: tc.muted }]} numberOfLines={1}>
                  {dateLabel}{timeLabel ? ` • ${timeLabel}` : ""}
                </Text>
              </View>
            )}
            {!!where && (
              <View style={styles.eventMetaRow}>
                <Icon source="map-marker-outline" size={13} color={tc.muted} />
                <Text style={[styles.eventMetaText, { color: tc.muted }]} numberOfLines={1}>{where}</Text>
              </View>
            )}
            {!!price && (
              <View style={styles.eventMetaRow}>
                <Icon source="ticket-outline" size={13} color={tc.muted} />
                <Text style={[styles.eventMetaText, { color: tc.muted }]} numberOfLines={1}>{price}</Text>
              </View>
            )}
          </View>
        </View>

        <Icon source="chevron-right" size={20} color={tc.muted} />
      </View>
    </TouchableRipple>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function EventsManageScreen({ navigation }) {
  const theme = useTheme();
  const { activeChurchId, activeChurch, apiFetchAuth, isAdmin } = useAuth();
  const churchId = activeChurchId || activeChurch?.id || null;

  // ✅ Usa isAdmin do AuthContext — só OWNER e ADMIN podem criar eventos
  const canCreate = isAdmin;

  const tc = useMemo(() => ({
    surface: theme.colors.surface,
    bg:      theme.colors.background,
    outline: theme.colors.outlineVariant,
    text:    theme.colors.onSurface,
    muted:   theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
  }), [theme]);

  const apiGet = useCallback(
    (path) => apiFetchAuth(path, { method: "GET" }),
    [apiFetchAuth],
  );

  const [query, setQuery] = useState("");

  const { items: events, loading, error, reload } = useChurchEvents({
    churchId,
    enabled: !!churchId,
    q: query,
    apiGet,
  });

  const filtered = useMemo(() => {
    const q      = query.trim().toLowerCase();
    const result = !q
      ? events
      : (events || []).filter((e) => {
          const t = String(e?.title    || "").toLowerCase();
          const l = String(e?.location || e?.address || "").toLowerCase();
          return t.includes(q) || l.includes(q);
        });

    return [...result].sort((a, b) => {
      const da = getEventTimestamp(getRawEventDate(a)) || 0;
      const db = getEventTimestamp(getRawEventDate(b)) || 0;
      return db - da;
    });
  }, [events, query]);

  const upcomingCount = useMemo(() => {
    const now = Date.now();
    return filtered.filter((e) => {
      const d = getEventTimestamp(getRawEventDate(e));
      return !d || d >= now;
    }).length;
  }, [filtered]);

  return (
    <View style={[styles.root, { backgroundColor: tc.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={[styles.blob, { width: 200, height: 200, top: -60,   right: -50  }]} />
          <View style={[styles.blob, { width: 130, height: 130, bottom: -70, left: -30, opacity: 0.05 }]} />

          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <Icon source="calendar-month-outline" size={23} color="#fff" />
            </View>

            {/* ✅ Botão "Novo evento" — visível apenas para ADMIN e OWNER */}
            {canCreate && (
              <TouchableRipple
                onPress={() => navigation.navigate("EventComposer")}
                borderless
                style={styles.heroActionBtn}
                disabled={!churchId}
              >
                <View style={styles.heroActionBtnInner}>
                  <Icon source="plus" size={14} color="#fff" />
                  <Text style={styles.heroActionBtnText}>Novo evento</Text>
                </View>
              </TouchableRipple>
            )}
          </View>

          <Text style={styles.heroTitle}>Eventos</Text>
          <Text style={styles.heroSubtitle}>
            {canCreate
              ? "Crie eventos e o app gera as escalas automaticamente."
              : "Confira os próximos eventos da igreja."}
          </Text>

          {filtered.length > 0 && (
            <View style={styles.heroPills}>
              <View style={styles.heroPill}>
                <View style={[styles.heroPillDot, { backgroundColor: "#7EFFD4" }]} />
                <Text style={styles.heroPillText}>
                  {filtered.length} evento{filtered.length !== 1 ? "s" : ""}
                </Text>
              </View>
              {upcomingCount > 0 && (
                <View style={styles.heroPill}>
                  <View style={[styles.heroPillDot, { backgroundColor: "#FFD97D" }]} />
                  <Text style={styles.heroPillText}>{upcomingCount} em breve</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Alerta sem igreja ──────────────────────────────────────────── */}
        {!churchId && (
          <Surface
            elevation={0}
            style={[styles.alertBanner, { backgroundColor: DANGER_BG, borderColor: DANGER }]}
          >
            <Icon source="alert-circle-outline" size={18} color={DANGER} />
            <Text style={[styles.alertText, { color: DANGER }]}>
              Nenhuma igreja ativa. Selecione uma igreja antes de continuar.
            </Text>
          </Surface>
        )}

        {/* ── Busca ─────────────────────────────────────────────────────── */}
        <TextInput
          mode="outlined"
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por título ou local..."
          left={<TextInput.Icon icon="magnify" />}
          right={query ? <TextInput.Icon icon="close" onPress={() => setQuery("")} /> : null}
          style={styles.search}
          outlineStyle={{ borderRadius: 14 }}
          dense
        />

        {/* ── Erro ──────────────────────────────────────────────────────── */}
        {error && (
          <Surface
            elevation={0}
            style={[styles.alertBanner, { backgroundColor: DANGER_BG, borderColor: DANGER }]}
          >
            <Icon source="alert-circle-outline" size={16} color={DANGER} />
            <Text style={[styles.alertText, { color: DANGER, flex: 1 }]}>{error}</Text>
            <TouchableOpacity onPress={reload}>
              <Text style={[styles.alertText, { color: DANGER, fontWeight: "800" }]}>
                Tentar novamente
              </Text>
            </TouchableOpacity>
          </Surface>
        )}

        {/* ── Loading ───────────────────────────────────────────────────── */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={BRAND_BLUE} />
            <Text style={[styles.loadingText, { color: tc.muted }]}>Carregando eventos...</Text>
          </View>
        )}

        {/* ── Lista ─────────────────────────────────────────────────────── */}
        {!loading && (
          <View style={styles.list}>
            {filtered.length === 0 ? (
              <EmptyState
                icon="calendar-remove-outline"
                title="Nenhum evento encontrado"
                description={
                  query
                    ? "Nenhum resultado para essa busca."
                    : canCreate
                      ? "Crie o primeiro evento da sua igreja."
                      : "Nenhum evento publicado ainda."
                }
                // ✅ Botão de ação no empty state só para admin/owner
                onAction={canCreate && churchId ? () => navigation.navigate("EventComposer") : null}
                tc={tc}
              />
            ) : (
              filtered.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  tc={tc}
                  onPress={() => navigation.navigate("EventsPreviewScreen", { id: e.id, event: e })}
                />
              ))
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:      { flex: 1 },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  hero: {
    backgroundColor: NAVY,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios:     { shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },

  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },

  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, zIndex: 2 },

  heroIconWrap: { width: 44, height: 44, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },

  heroActionBtn:      { borderRadius: 999, overflow: "hidden" },
  heroActionBtnInner: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  heroActionBtnText:  { fontSize: 12, fontWeight: "700", color: "#fff" },

  heroTitle:    { fontSize: 24, fontWeight: "900", color: "#fff", letterSpacing: -0.6, zIndex: 2 },
  heroSubtitle: { marginTop: 5, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 19, zIndex: 2 },

  heroPills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, zIndex: 2 },
  heroPill:  { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.13)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  heroPillDot:  { width: 6, height: 6, borderRadius: 999 },
  heroPillText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  alertBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  alertText:   { fontSize: 13, fontWeight: "600", lineHeight: 18 },

  search: { marginBottom: 12, backgroundColor: "transparent" },

  loadingRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 20, justifyContent: "center" },
  loadingText: { fontSize: 13 },

  list: { gap: 12 },

  eventCard: {
    borderWidth: 1, borderRadius: 18, overflow: "hidden",
    ...Platform.select({
      ios:     { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  eventCardInner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  eventThumb:     { width: 68, height: 68, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  eventThumbImg:  { width: "100%", height: "100%" },

  eventDateThumb: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", borderRadius: 16, borderWidth: 1, borderColor: "rgba(65,88,208,0.10)", backgroundColor: BRAND_LIGHT },
  eventDateDay:   { fontSize: 22, fontWeight: "900", color: NAVY, letterSpacing: -0.6, lineHeight: 26 },
  eventDateMonth: { marginTop: 1, fontSize: 10, fontWeight: "900", color: BRAND_BLUE, letterSpacing: 0.8 },

  eventInfo:   { flex: 1, gap: 5 },
  eventTopRow: { flexDirection: "row", alignItems: "center" },

  eventStatusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  eventStatusDot:  { width: 5, height: 5, borderRadius: 999 },
  eventStatusText: { fontSize: 10, fontWeight: "800" },

  eventTitle:   { fontSize: 14, fontWeight: "900", color: NAVY, letterSpacing: -0.2 },
  eventMeta:    { gap: 3 },
  eventMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  eventMetaText:{ fontSize: 12, flex: 1, lineHeight: 17 },

  empty: { alignItems: "center", padding: 28, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed" },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 999, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle:    { fontSize: 16, fontWeight: "900", color: NAVY, marginBottom: 6, textAlign: "center", letterSpacing: -0.3 },
  emptyDesc:     { fontSize: 13, textAlign: "center", lineHeight: 19 },
  emptyBtn:      { marginTop: 16, borderRadius: 16, overflow: "hidden" },
  emptyBtnInner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: BRAND_BLUE, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16 },
  emptyBtnText:  { fontSize: 13, fontWeight: "800", color: "#fff" },
});