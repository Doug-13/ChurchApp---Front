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

// Pure function — no hooks, safe to call anywhere
function getStatusCfg(status, colors) {
  if (status === "CONFIRMED")
    return {
      label: "Confirmado",
      icon: "check-circle-outline",
      bg: colors.secondaryContainer ?? colors.primaryContainer,
      fg: colors.secondary ?? colors.primary,
    };
  if (status === "DECLINED")
    return {
      label: "Recusado",
      icon: "close-circle-outline",
      bg: colors.errorContainer,
      fg: colors.error,
    };
  return {
    label: "Pendente",
    icon: "clock-outline",
    bg: colors.tertiaryContainer ?? colors.primaryContainer,
    fg: colors.tertiary ?? colors.primary,
  };
}

// ─── Sub-components (hooks allowed here at top level) ────────────────────────

function StatusPill({ status }) {
  const theme = useTheme(); // ✅ hook at top level of its own component
  const cfg = getStatusCfg(status, theme.colors);
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Icon source={cfg.icon} size={14} color={cfg.fg} />
      <Text variant="labelSmall" style={{ color: cfg.fg, fontWeight: "700" }}>
        {cfg.label}
      </Text>
    </View>
  );
}

function RoleBadge({ roleName, ministryName }) {
  const theme = useTheme();
  return (
    <View style={[styles.roleBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Icon source="account-music-outline" size={15} color={theme.colors.onSurfaceVariant} />
      <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
        {roleName}
      </Text>
      {ministryName ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          • {ministryName}
        </Text>
      ) : null}
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
      mode="outlined"
      style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
      onPress={() =>
        navigation.navigate("ScheduleDetails", { id: item.eventId, churchId: activeChurchId })
      }
    >
      <Card.Content style={{ gap: 10 }}>
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source="calendar-star" size={20} color={theme.colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: "800" }} numberOfLines={1}>
              {item.event?.title ?? "Evento"}
            </Text>
            <View style={styles.metaRow}>
              <Icon source="calendar-outline" size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatDate(item.event?.dateLabel)}
                {item.event?.timeLabel ? ` • ${item.event.timeLabel}` : ""}
              </Text>
            </View>
            {item.event?.location ? (
              <View style={styles.metaRow}>
                <Icon source="map-marker-outline" size={14} color={theme.colors.onSurfaceVariant} />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                  numberOfLines={1}
                >
                  {item.event.location}
                </Text>
              </View>
            ) : null}
          </View>

          <StatusPill status={item.status} />
        </View>

        <RoleBadge roleName={item.roleName} ministryName={item.ministry?.name} />

        {canAct && (
          <View style={styles.actionsRow}>
            <Button
              mode="contained"
              icon="check"
              loading={isConfirming}
              disabled={isConfirming}
              style={[
                styles.actionBtn,
                { backgroundColor: theme.colors.secondary ?? theme.colors.primary },
              ]}
              onPress={() => onConfirm(item, "CONFIRMED")}
            >
              Confirmar
            </Button>
            <Button
              mode="outlined"
              icon="close"
              disabled={isConfirming}
              style={styles.actionBtn}
              textColor={theme.colors.error}
              onPress={() => onConfirm(item, "DECLINED")}
            >
              Recusar
            </Button>
          </View>
        )}

        {!canAct && item.status !== "PENDING" && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {item.status === "CONFIRMED"
              ? "✓ Você confirmou sua participação."
              : "✗ Você recusou sua participação."}
          </Text>
        )}

        {past && item.status === "PENDING" && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Evento já realizado.
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

function ScheduleCard({ item, navigation }) {
  const theme = useTheme();
  return (
    <Card
      mode="outlined"
      style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
      onPress={() => navigation.navigate("ScheduleDetails", { id: item.scheduleId })}
    >
      <Card.Content style={{ gap: 10 }}>
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source="calendar-check-outline" size={20} color={theme.colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: "800" }} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.metaRow}>
              <Icon source="calendar-outline" size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatDate(item.date)}
              </Text>
            </View>
          </View>

          <View style={[styles.pill, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source="account-check-outline" size={14} color={theme.colors.primary} />
            <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: "700" }}>
              {item.roleName || "Escalado"}
            </Text>
          </View>
        </View>

        {item.notes ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={2}
          >
            {item.notes}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Toque para ver detalhes
          </Text>
          <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
        </View>
      </Card.Content>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MySchedulesScreen({ navigation }) {
  const theme = useTheme();
  const { apiFetchAuth, activeChurchId, meLoading } = useAuth();

  const [eventAssignments, setEventAssignments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Eventos");
  const [filter, setFilter] = useState("Todos");

  // ── Fetch ─────────────────────────────────────────────────────────────────────

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

  // ── Confirm ───────────────────────────────────────────────────────────────────

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

  // ── Filtered ──────────────────────────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    return eventAssignments.filter((a) => {
      if (filter === "Pendentes") return a.status === "PENDING";
      if (filter === "Confirmados") return a.status === "CONFIRMED";
      if (filter === "Recusados") return a.status === "DECLINED";
      return true;
    });
  }, [eventAssignments, filter]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (filter === "Futuros") return !isPast(s.date);
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

  // ── Render fns (no hooks — props passed down to components) ──────────────────

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

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (
    meLoading ||
    (loading && eventAssignments.length === 0 && schedules.length === 0 && !error)
  ) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            Carregando escalas...
          </Text>
        </View>
      </View>
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────────────

  const isEventTab = tab === "Eventos";
  const listData = isEventTab ? filteredEvents : filteredSchedules;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: "800" }}>
          Minhas escalas
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {pendingCount > 0
            ? `${pendingCount} confirmação${pendingCount !== 1 ? "ões" : ""} pendente${pendingCount !== 1 ? "s" : ""}`
            : "Tudo em dia!"}
        </Text>
      </View>

      {error ? (
        <Surface
          style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}
          elevation={0}
        >
          <Icon source="alert-circle-outline" size={16} color={theme.colors.error} />
          <Text style={{ color: theme.colors.onErrorContainer, flex: 1, marginLeft: 8 }}>
            {error}
          </Text>
          <Button mode="text" compact onPress={fetchAll} textColor={theme.colors.error}>
            Tentar
          </Button>
        </Surface>
      ) : null}

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {["Eventos", "Serviços"].map((t) => (
          <Button
            key={t}
            mode={tab === t ? "contained" : "outlined"}
            onPress={() => { setTab(t); setFilter("Todos"); }}
            style={styles.tabBtn}
            compact
          >
            {t === "Eventos" && eventAssignments.length > 0
              ? `Eventos (${eventAssignments.length})`
              : t === "Serviços" && schedules.length > 0
              ? `Serviços (${schedules.length})`
              : t}
          </Button>
        ))}
      </View>

      {/* Filters */}
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
            style={styles.chip}
            compact
          >
            {f}
          </Chip>
        ))}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, idx) =>
          isEventTab
            ? `ev-${item.eventId}-${idx}`
            : `sc-${item.scheduleId}-${item.assignmentId}-${idx}`
        }
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 96 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <Surface
              style={[
                styles.empty,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
              ]}
              elevation={0}
            >
              <Icon source="calendar-remove-outline" size={32} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleMedium" style={{ marginTop: 12, fontWeight: "700" }}>
                Nenhuma escala encontrada
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: "center" }}
              >
                {isEventTab
                  ? "Você ainda não está escalado para nenhum evento."
                  : "Você ainda não foi escalado para nenhum serviço."}
              </Text>
            </Surface>
          ) : null
        }
        renderItem={isEventTab ? renderEvent : renderSchedule}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  header: { marginBottom: 8 },
  tabRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  tabBtn: { flex: 1, borderRadius: 12 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  chip: { borderRadius: 999 },
  card: { borderRadius: 18 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, borderRadius: 12 },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
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
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});