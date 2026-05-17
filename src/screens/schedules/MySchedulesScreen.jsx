import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  Icon,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";

// ─── Design System ────────────────────────────────────────────────────────────
// Conforme Design Manual ChurchApp v1.0

const DS = {
  colors: {
    navy:        "#1A2366",
    primary:     "#4158D0",
    tint:        "#EEF0FA",
    background:  "#F5F6FA",
    surface:     "#FFFFFF",
    text:        "#1A2366",
    muted:       "#9198B5",
    outline:     "#E4E6F0",
    success:     "#2DBF8A",
    successLight:"#E8F9F3",
    danger:      "#E84D4D",
    dangerLight: "#FEECEC",
    warning:     "#F5A623",
    warningLight:"#FEF5E7",
  },
  radius: {
    pill: 999,
    xl:   28,
    lg:   24,
    card: 20,
    md:   16,
    sm:   12,
    xs:   8,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return "";
  const iso = String(value).includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function isPast(value) {
  if (!value) return false;
  const iso = String(value).includes("T") ? value : `${value}T23:59:59`;
  return new Date(iso) < new Date();
}

function getStatusCfg(status) {
  if (status === "CONFIRMED")
    return {
      label: "Confirmado",
      icon: "check-circle-outline",
      bg: DS.colors.successLight,
      fg: DS.colors.success,
    };
  if (status === "DECLINED")
    return {
      label: "Recusado",
      icon: "close-circle-outline",
      bg: DS.colors.dangerLight,
      fg: DS.colors.danger,
    };
  return {
    label: "Pendente",
    icon: "clock-outline",
    bg: DS.colors.warningLight,
    fg: DS.colors.warning,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const cfg = getStatusCfg(status);
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Icon source={cfg.icon} size={13} color={cfg.fg} />
      <Text style={[styles.pillText, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

function RoleBadge({ roleName, ministryName }) {
  return (
    <View style={styles.roleBadge}>
      <Icon source="account-music-outline" size={14} color={DS.colors.primary} />
      <Text style={styles.roleName}>{roleName}</Text>
      {ministryName ? (
        <Text style={styles.roleMinistry}>• {ministryName}</Text>
      ) : null}
    </View>
  );
}

function SectionHeader({ label }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderBar} />
      <Text style={styles.sectionHeaderText}>{label}</Text>
    </View>
  );
}

function EventCard({ item, onConfirm, confirming, navigation, activeChurchId }) {
  const theme = useTheme();
  const past = isPast(item.event?.dateLabel);
  const isConfirming = confirming === item.eventId;
  const canAct = !past && item.status === "PENDING";

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={styles.card}
      onPress={() =>
        navigation.navigate("ScheduleDetails", { id: item.eventId, churchId: activeChurchId })
      }
    >
      {/* Faixa superior colorida — padrão dos cards do manual */}
      <View style={[styles.cardStrip, { backgroundColor: DS.colors.primary }]} />

      <Card.Content style={styles.cardContent}>
        {/* Topo: ícone + título + status */}
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Icon source="calendar-star" size={20} color={DS.colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.event?.title ?? "Evento"}
            </Text>
            <View style={styles.metaRow}>
              <Icon source="calendar-outline" size={13} color={DS.colors.muted} />
              <Text style={styles.metaText}>
                {formatDate(item.event?.dateLabel)}
                {item.event?.timeLabel ? ` • ${item.event.timeLabel}` : ""}
              </Text>
            </View>
            {item.event?.location ? (
              <View style={styles.metaRow}>
                <Icon source="map-marker-outline" size={13} color={DS.colors.muted} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.event.location}
                </Text>
              </View>
            ) : null}
          </View>

          <StatusPill status={item.status} />
        </View>

        {/* Badge de função */}
        <RoleBadge roleName={item.roleName} ministryName={item.ministry?.name} />

        {/* Ações — só se pendente e não passado */}
        {canAct && (
          <View style={styles.actionsRow}>
            <Button
              mode="contained"
              icon="check"
              loading={isConfirming}
              disabled={isConfirming}
              style={[styles.actionBtn, { backgroundColor: DS.colors.success }]}
              labelStyle={{ fontWeight: "800", fontSize: 13 }}
              onPress={() => onConfirm(item, "CONFIRMED")}
            >
              Confirmar
            </Button>
            <Button
              mode="outlined"
              icon="close"
              disabled={isConfirming}
              style={[styles.actionBtn, styles.actionBtnOutline]}
              textColor={DS.colors.danger}
              labelStyle={{ fontWeight: "800", fontSize: 13 }}
              onPress={() => onConfirm(item, "DECLINED")}
            >
              Recusar
            </Button>
          </View>
        )}

        {!canAct && item.status !== "PENDING" && (
          <Text style={styles.feedbackText}>
            {item.status === "CONFIRMED"
              ? "✓ Você confirmou sua participação."
              : "✗ Você recusou sua participação."}
          </Text>
        )}

        {past && item.status === "PENDING" && (
          <Text style={styles.feedbackText}>Evento já realizado.</Text>
        )}
      </Card.Content>
    </Card>
  );
}

function ScheduleCard({ item, navigation }) {
  const past = isPast(item.date);

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={[styles.card, past && { opacity: 0.7 }]}
      onPress={() => navigation.navigate("ScheduleDetails", { id: item.scheduleId })}
    >
      <View style={[styles.cardStrip, { backgroundColor: DS.colors.navy }]} />

      <Card.Content style={styles.cardContent}>
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: DS.colors.tint }]}>
            <Icon source="calendar-check-outline" size={20} color={DS.colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.metaRow}>
              <Icon source="calendar-outline" size={13} color={DS.colors.muted} />
              <Text style={styles.metaText}>{formatDate(item.date)}</Text>
            </View>
          </View>

          <View style={[styles.pill, { backgroundColor: DS.colors.tint }]}>
            <Icon source="account-check-outline" size={13} color={DS.colors.primary} />
            <Text style={[styles.pillText, { color: DS.colors.primary }]}>
              {item.roleName || "Escalado"}
            </Text>
          </View>
        </View>

        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.footerHint}>Toque para ver detalhes</Text>
          <Icon source="chevron-right" size={18} color={DS.colors.muted} />
        </View>
      </Card.Content>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MySchedulesScreen({ navigation }) {
  const { apiFetchAuth, activeChurchId, meLoading } = useAuth();

  const [eventAssignments, setEventAssignments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Eventos");
  const [filter, setFilter] = useState("Todos");

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!activeChurchId) return;
    setError(null);

    const [evRes, scRes] = await Promise.allSettled([
      apiFetchAuth(`/churches/${activeChurchId}/events/my-assignments`),
      apiFetchAuth(`/churches/${activeChurchId}/schedules/my`),
    ]);

    if (evRes.status === "fulfilled") {
      const raw = evRes.value;
      const data = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setEventAssignments([...data].reverse());
    } else {
      setError(evRes.reason?.message ?? "Erro ao carregar escalas de eventos.");
    }

    if (scRes.status === "fulfilled") {
      const raw = scRes.value;
      const data = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setSchedules([...data].reverse());
    }
  }, [apiFetchAuth, activeChurchId]);

  useEffect(() => {
    if (meLoading) return;
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [meLoading, fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // ── Confirm ───────────────────────────────────────────────────────────────

  const handleConfirm = useCallback(
    (item, status) => {
      Alert.alert(
        status === "CONFIRMED" ? "Confirmar participação" : "Recusar participação",
        `Deseja ${status === "CONFIRMED" ? "confirmar" : "recusar"} sua participação em "${item.event?.title}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: status === "CONFIRMED" ? "Confirmar" : "Recusar",
            style: status === "CONFIRMED" ? "default" : "destructive",
            onPress: async () => {
              setConfirming(item.eventId);
              try {
                await apiFetchAuth(
                  `/churches/${activeChurchId}/events/${item.eventId}/assignments/confirm`,
                  { method: "PATCH", body: { status } },
                );
                setEventAssignments((prev) =>
                  prev.map((a) => (a.eventId === item.eventId ? { ...a, status } : a)),
                );
              } catch (e) {
                Alert.alert("Erro", e?.message ?? "Não foi possível atualizar.");
              } finally {
                setConfirming(null);
              }
            },
          },
        ],
      );
    },
    [apiFetchAuth, activeChurchId],
  );

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    return eventAssignments.filter((a) => {
      if (filter === "Pendentes")   return a.status === "PENDING";
      if (filter === "Confirmados") return a.status === "CONFIRMED";
      if (filter === "Recusados")   return a.status === "DECLINED";
      return true;
    });
  }, [eventAssignments, filter]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (filter === "Futuros")  return !isPast(s.date);
      if (filter === "Passados") return isPast(s.date);
      return true;
    });
  }, [schedules, filter]);

  const pendingCount = useMemo(
    () =>
      eventAssignments.filter(
        (a) => a.status === "PENDING" && !isPast(a.event?.dateLabel),
      ).length,
    [eventAssignments],
  );

  // ── Render fns ─────────────────────────────────────────────────────────────

  const renderEvent = useCallback(
    ({ item }) => (
      <EventCard
        item={item}
        onConfirm={handleConfirm}
        confirming={confirming}
        navigation={navigation}
        activeChurchId={activeChurchId}
      />
    ),
    [handleConfirm, confirming, navigation, activeChurchId],
  );

  const renderSchedule = useCallback(
    ({ item }) => <ScheduleCard item={item} navigation={navigation} />,
    [navigation],
  );

  // ── Loading ────────────────────────────────────────────────────────────────

  if (
    meLoading ||
    (loading && eventAssignments.length === 0 && schedules.length === 0 && !error)
  ) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={DS.colors.primary} size="large" />
        <Text style={styles.loadingText}>Carregando escalas...</Text>
      </View>
    );
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  const isEventTab = tab === "Eventos";
  const listData = isEventTab ? filteredEvents : filteredSchedules;

  return (
    <View style={styles.root}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconWrap}>
            <Icon source="calendar-month-outline" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Minhas escalas</Text>
            <Text style={styles.headerSub}>
              {pendingCount > 0
                ? `${pendingCount} confirmação${pendingCount !== 1 ? "ões" : ""} pendente${pendingCount !== 1 ? "s" : ""}`
                : "Tudo em dia! ✓"}
            </Text>
          </View>
        </View>

        {/* Badge de pendentes */}
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Icon source="bell-ring-outline" size={14} color={DS.colors.warning} />
            <Text style={styles.pendingBadgeText}>
              {pendingCount} confirmação{pendingCount !== 1 ? "ões" : ""} aguardando resposta
            </Text>
          </View>
        )}
      </View>

      {/* ── Erro ───────────────────────────────────────────────────────── */}
      {error ? (
        <View style={styles.errorBanner}>
          <Icon source="alert-circle-outline" size={16} color={DS.colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Button
            mode="text"
            compact
            onPress={fetchAll}
            textColor={DS.colors.danger}
            labelStyle={{ fontWeight: "800", fontSize: 12 }}
          >
            Tentar
          </Button>
        </View>
      ) : null}

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        {["Eventos", "Serviços"].map((t) => {
          const active = tab === t;
          const count = t === "Eventos" ? eventAssignments.length : schedules.length;
          return (
            <Button
              key={t}
              mode={active ? "contained" : "outlined"}
              onPress={() => { setTab(t); setFilter("Todos"); }}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              labelStyle={[styles.tabLabel, active && styles.tabLabelActive]}
              compact
            >
              {count > 0 ? `${t} (${count})` : t}
            </Button>
          );
        })}
      </View>

      {/* ── Filtros ────────────────────────────────────────────────────── */}
      <View style={styles.chipsRow}>
        {(isEventTab
          ? ["Todos", "Pendentes", "Confirmados", "Recusados"]
          : ["Todos", "Futuros", "Passados"]
        ).map((f) => (
          <Chip
            key={f}
            selected={filter === f}
            onPress={() => setFilter(f)}
            mode={filter === f ? "flat" : "outlined"}
            style={[
              styles.chip,
              filter === f
                ? { backgroundColor: DS.colors.primary }
                : { backgroundColor: DS.colors.surface, borderColor: DS.colors.outline },
            ]}
            textStyle={[
              styles.chipText,
              filter === f ? { color: "#fff" } : { color: DS.colors.muted },
            ]}
            compact
          >
            {f}
          </Chip>
        ))}
      </View>

      {/* ── Lista ──────────────────────────────────────────────────────── */}
      <FlatList
        data={listData}
        keyExtractor={(item, idx) =>
          isEventTab
            ? `ev-${item.eventId}-${idx}`
            : `sc-${item.scheduleId}-${item.assignmentId}-${idx}`
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[DS.colors.primary]}
            tintColor={DS.colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Icon source="calendar-remove-outline" size={28} color={DS.colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma escala encontrada</Text>
              <Text style={styles.emptyText}>
                {isEventTab
                  ? "Você ainda não está escalado para nenhum evento."
                  : "Você ainda não foi escalado para nenhum serviço."}
              </Text>
            </View>
          ) : null
        }
        renderItem={isEventTab ? renderEvent : renderSchedule}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: DS.colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: DS.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: DS.colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: DS.colors.navy,
    borderRadius: DS.radius.card,
    padding: 18,
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: DS.radius.sm,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "600",
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: DS.colors.warningLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: DS.radius.pill,
    alignSelf: "flex-start",
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: DS.colors.warning,
  },

  // ── Error banner ──────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DS.colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: DS.radius.sm,
    marginBottom: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: DS.colors.danger,
    fontWeight: "600",
  },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    borderRadius: DS.radius.md,
    borderColor: DS.colors.outline,
  },
  tabBtnActive: {
    backgroundColor: DS.colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: DS.colors.muted,
  },
  tabLabelActive: {
    color: "#fff",
    fontWeight: "800",
  },

  // ── Chips ─────────────────────────────────────────────────────────────────
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderRadius: DS.radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  listContent: {
    paddingTop: 10,
    paddingBottom: 96,
  },
  card: {
    borderRadius: DS.radius.card,
    backgroundColor: DS.colors.surface,
    overflow: "hidden",
    borderWidth: 0,
  },
  cardStrip: {
    height: 4,
    width: "100%",
  },
  cardContent: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: 14,
  },

  // ── Card top row ──────────────────────────────────────────────────────────
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: DS.radius.sm,
    backgroundColor: DS.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: DS.colors.navy,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 12,
    color: DS.colors.muted,
    fontWeight: "500",
  },

  // ── Pill ──────────────────────────────────────────────────────────────────
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DS.radius.pill,
    alignSelf: "flex-start",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
  },

  // ── Role badge ────────────────────────────────────────────────────────────
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: DS.colors.tint,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: DS.radius.xs,
    alignSelf: "flex-start",
  },
  roleName: {
    fontSize: 13,
    fontWeight: "800",
    color: DS.colors.navy,
  },
  roleMinistry: {
    fontSize: 12,
    color: DS.colors.muted,
    fontWeight: "500",
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    borderRadius: DS.radius.md,
  },
  actionBtnOutline: {
    borderColor: DS.colors.danger,
  },

  // ── Feedback text ─────────────────────────────────────────────────────────
  feedbackText: {
    fontSize: 12,
    color: DS.colors.muted,
    fontWeight: "500",
  },

  // ── Schedule card extras ──────────────────────────────────────────────────
  notesText: {
    fontSize: 13,
    color: DS.colors.muted,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  footerHint: {
    fontSize: 12,
    color: DS.colors.muted,
    fontWeight: "500",
  },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    marginBottom: 12,
  },
  sectionHeaderBar: {
    width: 3,
    height: 16,
    borderRadius: DS.radius.pill,
    backgroundColor: DS.colors.primary,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "900",
    color: DS.colors.navy,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyCard: {
    marginTop: 32,
    backgroundColor: DS.colors.surface,
    borderWidth: 1,
    borderColor: DS.colors.outline,
    borderRadius: DS.radius.lg,
    padding: 32,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: DS.radius.card,
    backgroundColor: DS.colors.tint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: DS.colors.navy,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: DS.colors.muted,
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "500",
  },
});