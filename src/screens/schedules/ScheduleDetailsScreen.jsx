import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFullDate(dateLabel) {
  if (!dateLabel) return "—";
  const [year, month, day] = String(dateLabel).split("-");
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (isNaN(date.getTime())) return dateLabel;
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isPast(dateLabel) {
  if (!dateLabel) return false;
  return new Date(`${dateLabel}T23:59:59`) < new Date();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const theme = useTheme();
  const cfg = useMemo(() => {
    if (status === "CONFIRMED")
      return {
        label: "Confirmado",
        icon: "check-circle-outline",
        bg: theme.colors.secondaryContainer ?? theme.colors.primaryContainer,
        fg: theme.colors.secondary ?? theme.colors.primary,
      };
    if (status === "DECLINED")
      return {
        label: "Recusado",
        icon: "close-circle-outline",
        bg: theme.colors.errorContainer,
        fg: theme.colors.error,
      };
    return {
      label: "Pendente",
      icon: "clock-outline",
      bg: theme.colors.primaryContainer,
      fg: theme.colors.primary,
    };
  }, [status, theme.colors]);

  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Icon source={cfg.icon} size={16} color={cfg.fg} />
      <Text style={{ color: cfg.fg, fontWeight: "900" }}>{cfg.label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Icon source={icon} size={18} color={theme.colors.onSurfaceVariant} />
      <Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Text style={{ fontWeight: "800" }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EventDetailsScreen({ route, navigation }) {
  const theme = useTheme();
  const { id, churchId: routeChurchId } = route.params || {};
  const { apiFetchAuth, activeChurchId, meLoading } = useAuth();

  const churchId = routeChurchId ?? activeChurchId;

  const [event, setEvent] = useState(null);
  const [myAssignment, setMyAssignment] = useState(null); // from my-assignments
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchEvent = useCallback(async () => {
    if (!id || !churchId) return;
    setError(null);
    try {
      const [evRes, myRes] = await Promise.allSettled([
        apiFetchAuth(`/churches/${churchId}/events/${id}`),
        apiFetchAuth(`/churches/${churchId}/events/my-assignments`),
      ]);

      if (evRes.status === "fulfilled") {
        const data = evRes.value?.data ?? evRes.value;
        setEvent(data);
      } else {
        setError(evRes.reason?.message ?? "Não foi possível carregar o evento.");
      }

      if (myRes.status === "fulfilled") {
        const list = Array.isArray(myRes.value)
          ? myRes.value
          : (myRes.value?.data ?? []);
        const mine = list.find((a) => a.eventId === id);
        setMyAssignment(mine ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetchAuth, id, churchId]);

  useEffect(() => {
    if (meLoading) return;
    setLoading(true);
    fetchEvent();
  }, [meLoading, fetchEvent]);

  // ── Confirm / Decline ─────────────────────────────────────────────────────────

  const handleConfirm = useCallback(
    (status) => {
      const label = status === "CONFIRMED" ? "confirmar" : "recusar";
      Alert.alert(
        status === "CONFIRMED" ? "Confirmar participação" : "Recusar participação",
        `Deseja ${label} sua participação neste evento?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: status === "CONFIRMED" ? "Confirmar" : "Recusar",
            style: status === "CONFIRMED" ? "default" : "destructive",
            onPress: async () => {
              setConfirming(true);
              try {
                await apiFetchAuth(
                  `/churches/${churchId}/events/${id}/assignments/confirm`,
                  { method: "PATCH", body: { status } },
                );
                setMyAssignment((prev) => ({ ...prev, status }));
              } catch (e) {
                Alert.alert("Erro", e?.message ?? "Não foi possível atualizar.");
              } finally {
                setConfirming(false);
              }
            },
          },
        ],
      );
    },
    [apiFetchAuth, churchId, id],
  );

  // ── Derived ───────────────────────────────────────────────────────────────────

  const past = isPast(event?.dateLabel);
  const myStatus = myAssignment?.status ?? null;
  const canAct = !!myAssignment && myStatus === "PENDING" && !past;

  // Extract all people from blocks
  const blockPeople = useMemo(() => {
    if (!Array.isArray(event?.blocks)) return [];
    const people = [];
    for (const block of event.blocks) {
      const blockPeople = Array.isArray(block?.people) ? block.people : [];
      for (const person of blockPeople) {
        if (person?.name || person?.userId) {
          people.push({
            blockTitle: block?.title ?? "",
            name: person?.name ?? "—",
            role: person?.role ?? block?.title ?? "Participante",
            userId: person?.userId ?? null,
          });
        }
      }
    }
    return people;
  }, [event?.blocks]);

  // ── States ────────────────────────────────────────────────────────────────────

  if (meLoading || loading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            Carregando evento...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background, padding: 24 }]}>
        <View style={styles.center}>
          <Icon source="alert-circle-outline" size={40} color={theme.colors.error} />
          <Text variant="titleMedium" style={{ marginTop: 12, fontWeight: "700", textAlign: "center" }}>
            {error ?? "Evento não encontrado."}
          </Text>
          <Button mode="outlined" onPress={fetchEvent} style={{ marginTop: 16 }}>
            Tentar novamente
          </Button>
          <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 6 }}>
            Voltar
          </Button>
        </View>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Header card ── */}
        <Card
          mode="outlined"
          style={[styles.headerCard, { borderColor: theme.colors.outlineVariant }]}
        >
          <Card.Content style={{ gap: 12 }}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
                  {event.title}
                </Text>
                {event.description ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 20 }}>
                    {event.description}
                  </Text>
                ) : null}
              </View>

              {myStatus && <StatusPill status={myStatus} />}
            </View>

            {/* Event identity */}
            <Surface
              style={[
                styles.hero,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
              ]}
              elevation={0}
            >
              <View style={styles.heroLeft}>
                <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Icon source="calendar-star" size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: "900" }} numberOfLines={1}>
                    {event.title}
                  </Text>
                  {event.ministries?.length > 0 && (
                    <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                      {event.ministries.map((m) => m.name).join(", ")}
                    </Text>
                  )}
                </View>
              </View>
            </Surface>

            {/* Info rows */}
            <View style={{ gap: 8 }}>
              <InfoRow
                icon="calendar-outline"
                label="Data"
                value={formatFullDate(event.dateLabel)}
              />
              {event.timeLabel ? (
                <InfoRow icon="clock-outline" label="Horário" value={event.timeLabel} />
              ) : null}
              {event.location ? (
                <InfoRow icon="map-marker-outline" label="Local" value={event.location} />
              ) : null}
            </View>
          </Card.Content>
        </Card>

        {/* ── Minha participação ── */}
        {myAssignment && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Minha participação
            </Text>
            <Card
              mode="outlined"
              style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
            >
              <Card.Content style={{ gap: 10 }}>
                <View style={styles.myRoleRow}>
                  <View
                    style={[styles.roleIcon, { backgroundColor: theme.colors.primaryContainer }]}
                  >
                    <Icon source="account-star-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                      Função: {myAssignment.roleName}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {myAssignment.ministry?.name ?? ""}
                    </Text>
                  </View>
                </View>

                {myAssignment.notes ? (
                  <>
                    <Divider />
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontWeight: "900" }}>Observações</Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                        {myAssignment.notes}
                      </Text>
                    </View>
                  </>
                ) : null}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* ── Ministérios ── */}
        {event.ministries?.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Ministérios
            </Text>
            <View style={styles.chipsRow}>
              {event.ministries.map((m) => (
                <View
                  key={m.id}
                  style={[styles.ministryChip, { backgroundColor: `${m.color}22` }]}
                >
                  {m.icon ? (
                    <Icon source={m.icon} size={16} color={m.color} />
                  ) : null}
                  <Text style={{ color: m.color, fontWeight: "700" }}>{m.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Equipe (blocks) ── */}
        {blockPeople.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Equipe e funções
            </Text>
            <Card
              mode="outlined"
              style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
            >
              <Card.Content style={{ gap: 10 }}>
                {blockPeople.map((p, idx) => {
                  const isMe = myAssignment && p.role === myAssignment.roleName;
                  return (
                    <View key={`${p.userId}-${idx}`}>
                      <View style={styles.roleRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                          <Icon
                            source="account-outline"
                            size={18}
                            color={theme.colors.onSurfaceVariant}
                          />
                          <Text style={{ fontWeight: "800" }} numberOfLines={1}>
                            {p.role}
                          </Text>
                          <Text
                            style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
                            numberOfLines={1}
                          >
                            • {p.name}
                          </Text>
                        </View>
                        {isMe ? (
                          <Chip icon="star" compact style={{ borderRadius: 999 }}>
                            Eu
                          </Chip>
                        ) : null}
                      </View>
                      {idx < blockPeople.length - 1 ? (
                        <Divider style={{ marginTop: 10 }} />
                      ) : null}
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* ── Ações ── */}
        {myAssignment && (
          <View style={styles.actionsRow}>
            {canAct ? (
              <>
                <Button
                  mode="contained"
                  style={{ flex: 1, borderRadius: 16 }}
                  contentStyle={{ height: 50 }}
                  icon="check"
                  loading={confirming}
                  disabled={confirming}
                  onPress={() => handleConfirm("CONFIRMED")}
                >
                  Confirmar
                </Button>
                <Button
                  mode="outlined"
                  style={{ flex: 1, borderRadius: 16 }}
                  contentStyle={{ height: 50 }}
                  icon="close"
                  disabled={confirming}
                  textColor={theme.colors.error}
                  onPress={() => handleConfirm("DECLINED")}
                >
                  Recusar
                </Button>
              </>
            ) : (
              <Surface
                style={[
                  styles.statusBanner,
                  {
                    backgroundColor:
                      myStatus === "CONFIRMED"
                        ? (theme.colors.secondaryContainer ?? theme.colors.primaryContainer)
                        : myStatus === "DECLINED"
                        ? theme.colors.errorContainer
                        : theme.colors.surfaceVariant,
                  },
                ]}
                elevation={0}
              >
                <Icon
                  source={
                    myStatus === "CONFIRMED"
                      ? "check-circle-outline"
                      : myStatus === "DECLINED"
                      ? "close-circle-outline"
                      : "calendar-clock"
                  }
                  size={20}
                  color={
                    myStatus === "CONFIRMED"
                      ? (theme.colors.secondary ?? theme.colors.primary)
                      : myStatus === "DECLINED"
                      ? theme.colors.error
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    fontWeight: "700",
                    color:
                      myStatus === "CONFIRMED"
                        ? (theme.colors.secondary ?? theme.colors.primary)
                        : myStatus === "DECLINED"
                        ? theme.colors.error
                        : theme.colors.onSurfaceVariant,
                  }}
                >
                  {myStatus === "CONFIRMED"
                    ? "Você confirmou sua participação."
                    : myStatus === "DECLINED"
                    ? "Você recusou sua participação."
                    : "Evento já realizado."}
                </Text>
              </Surface>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  headerCard: { borderRadius: 22 },
  headerTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  hero: { borderRadius: 18, borderWidth: 1, padding: 12 },
  heroLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  section: { marginTop: 20 },
  sectionTitle: { fontWeight: "900", marginBottom: 10 },

  card: { borderRadius: 18 },

  myRoleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ministryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 20 },

  statusBanner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
  },
});