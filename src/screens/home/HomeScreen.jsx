import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Icon,
  Surface,
  Text,
  useTheme,
  ActivityIndicator,
  TouchableRipple,
} from "react-native-paper";

import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

function roleLabel(role) {
  const r = String(role || "").toUpperCase();
  if (r === "OWNER") return "Responsável";
  if (r === "ADMIN") return "Admin";
  if (r === "LEADER") return "Líder";
  return "Membro";
}

async function authFetch(path, { method = "GET", body } = {}) {
  const auth = getAuth();
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error("Usuário não autenticado.");

  const token = await getIdToken(fbUser, true);
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || String(data) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// -------------------- helpers de cor (contraste) --------------------
function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "").trim();
  if (![3, 6].includes(h.length)) return null;

  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;

  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function getContrastText(bgHex, fallback = "#111") {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return fallback;

  const lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return lum > 0.6 ? "#111" : "#fff";
}

function withAlpha(hex, alpha = 0.14) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

// -------------------- UI --------------------
function QuickAction({ icon, label, onPress }) {
  const theme = useTheme();
  return (
    <TouchableRipple
      borderless
      onPress={onPress}
      style={[styles.qa, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.qaInner}>
        <View style={[styles.qaIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon source={icon} size={20} color={theme.colors.primary} />
        </View>
        <Text variant="labelLarge" style={{ fontWeight: "800" }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </TouchableRipple>
  );
}

function EventRow({ item, onPress }) {
  const theme = useTheme();

  const title = item?.title ?? "Evento";
  const date = item?.dateLabel ? String(item.dateLabel) : "Data a confirmar";
  const time = item?.timeLabel ? ` • ${item.timeLabel}` : "";
  const location = item?.location ? String(item.location) : "";

  // ✅ cor do evento vinda do banco (ajuste o nome do campo se necessário)
  const accent = item?.color || item?.eventColor || item?.themeColor || theme.colors.primary;

  const accentBg = withAlpha(accent, 0.14) || theme.colors.primaryContainer;
  const _accentText = getContrastText(accent, theme.colors.onSurface);

  return (
    <TouchableRipple onPress={onPress} style={styles.eventRow} borderless>
      <View style={styles.eventRowInner}>
        <View style={[styles.eventStripe, { backgroundColor: accent }]} />

        <View style={[styles.eventBadge, { backgroundColor: accentBg }]}>
          <Icon source="calendar" size={16} color={accent} />
          <Text style={{ color: theme.colors.onSurface, fontWeight: "800" }} numberOfLines={1}>
            {date}
            {time}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ fontWeight: "900" }} numberOfLines={1}>
            {title}
          </Text>

          <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {location || "Local a confirmar"}
          </Text>
        </View>

        <View style={[styles.eventDot, { backgroundColor: accent }]} />

        <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </View>
    </TouchableRipple>
  );
}

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const { me } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [church, setChurch] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [error, setError] = useState(null);

  const [eventsLoading, setEventsLoading] = useState(false);
  const [events, setEvents] = useState([]);

  const cityLine = useMemo(() => {
    if (!church) return "—";
    const c = church.city ?? "";
    const s = church.state ?? "";
    return [c, s].filter(Boolean).join(" • ") || "—";
  }, [church]);

  const greet = useMemo(() => {
    const first = me?.name ? String(me.name).split(" ")[0] : "";
    return first ? `Olá, ${first}` : "Olá";
  }, [me?.name]);

  const loadHome = useCallback(async () => {
    setError(null);

    const meDb = await authFetch("/users/me");
    const activeChurchId = meDb?.activeChurchId ?? null;

    const mine = await authFetch("/churches/mine");
    const selected =
      (activeChurchId && mine?.find?.((c) => c.id === activeChurchId)) || mine?.[0] || null;

    setChurch(selected);

    const roleFromMembership = selected?.members?.[0]?.role ?? null;
    setMyRole(roleFromMembership);

    if (selected?.id) {
      setEventsLoading(true);
      try {
        const ev = await authFetch(`/churches/${selected.id}/events`);
        const list = Array.isArray(ev) ? ev : Array.isArray(ev?.items) ? ev.items : [];

        const parseISODate = (s) => {
          const v = String(s || "").trim();
          const ok = /^\d{4}-\d{2}-\d{2}$/.test(v);
          return ok ? new Date(`${v}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        };

        const sorted = [...list].sort(
          (a, b) => parseISODate(a?.dateLabel) - parseISODate(b?.dateLabel)
        );
        setEvents(sorted.slice(0, 3));
      } catch (e) {
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    } else {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        await loadHome();
      } catch (e) {
        if (alive) {
          setChurch(null);
          setMyRole(null);
          setError(e?.message || "Erro ao carregar home.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loadHome]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadHome();
    } catch (e) {
      setError(e?.message || "Erro ao atualizar.");
    } finally {
      setRefreshing(false);
    }
  }, [loadHome]);

  // ---------------------- STATES ----------------------
  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, color: theme.colors.onSurfaceVariant }}>Carregando...</Text>
        </View>
      </View>
    );
  }

  if (!church) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={{ padding: 16 }}>
          <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleLarge" style={{ fontWeight: "900" }}>
              Sem igreja vinculada
            </Text>

            {!!error && (
              <Text style={{ marginTop: 8, color: theme.colors.error }}>{error}</Text>
            )}

            <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
              Entre em uma igreja ou crie uma para liberar o app.
            </Text>

            <Button
              mode="contained"
              style={{ marginTop: 14, borderRadius: 14 }}
              onPress={() => navigation.navigate("ChurchGate")}
            >
              Vincular igreja
            </Button>
          </Surface>
        </View>
      </View>
    );
  }

  // ---------------------- CONTENT ----------------------
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HEADER compacto */}
        <View style={styles.header}>
          {church?.photoUrl ? (
            <Avatar.Image size={44} source={{ uri: church.photoUrl }} />
          ) : (
            <Avatar.Icon
              size={44}
              icon="church"
              style={{ backgroundColor: theme.colors.primaryContainer }}
              color={theme.colors.primary}
            />
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{greet}</Text>
            <Text variant="titleLarge" style={{ fontWeight: "900" }} numberOfLines={1}>
              {church?.name ?? "—"}
            </Text>

            <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {cityLine} {myRole ? `• ${roleLabel(myRole)}` : ""}
            </Text>
          </View>

          <Button
            mode="text"
            onPress={() => navigation.navigate("ChurchProfile")}
            icon="account-circle-outline"
            contentStyle={{ flexDirection: "row-reverse" }}
          >
            Perfil
          </Button>
        </View>

        {/* AÇÕES RÁPIDAS (5 com Aniversariantes) */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={{ fontWeight: "900", marginBottom: 10 }}>
            Ações rápidas
          </Text>

          <View style={styles.qaGrid}>
            <QuickAction icon="bullhorn-outline" label="Avisos" onPress={() => navigation.navigate("News")} />
            <QuickAction icon="calendar-star" label="Eventos" onPress={() => navigation.navigate("Events")} />
            <QuickAction icon="account-group-outline" label="Diretório" onPress={() => navigation.navigate("Directory")} />
            <QuickAction icon="calendar-check-outline" label="Escalas" onPress={() => navigation.navigate("Schedules")} />
            {/* ✅ Novo botão */}
            <QuickAction
              icon="cake-variant-outline"
              label="Aniversários"
              onPress={() => navigation.navigate("Birthdays")}
            />
          </View>
        </View>

        {/* PRÓXIMOS EVENTOS (cores do evento) */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text variant="titleMedium" style={{ fontWeight: "900" }}>
              Próximos eventos
            </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate("Events")}
              icon="chevron-right"
              contentStyle={{ flexDirection: "row-reverse" }}
            >
              Ver todos
            </Button>
          </View>

          <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
            <Card.Content style={{ paddingVertical: 8 }}>
              {eventsLoading ? (
                <View style={{ paddingVertical: 12, alignItems: "center" }}>
                  <ActivityIndicator />
                  <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                    Carregando...
                  </Text>
                </View>
              ) : events?.length ? (
                <>
                  {events.map((ev, idx) => (
                    <View key={String(ev.id ?? idx)}>
                      <EventRow
                        item={ev}
                        onPress={() => {
                          navigation.navigate("Events");
                        }}
                      />
                      {idx < events.length - 1 && <Divider />}
                    </View>
                  ))}
                </>
              ) : (
                <View style={{ paddingVertical: 12 }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                    Nenhum evento publicado ainda.
                  </Text>
                  <Button
                    mode="contained-tonal"
                    style={{ marginTop: 12, alignSelf: "flex-start", borderRadius: 14 }}
                    icon="calendar-star"
                    onPress={() => navigation.navigate("Events")}
                  >
                    Ver agenda
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingBottom: 28 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  card: {
    borderRadius: 18,
    overflow: "hidden",
  },

  emptyCard: {
    borderRadius: 18,
    padding: 16,
  },

  // Quick Actions
  qaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  qa: {
    width: "48%",
    borderRadius: 18,
    overflow: "hidden",
  },
  qaInner: {
    padding: 14,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  qaIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  // Events rows
  eventRow: {
    borderRadius: 14,
  },
  eventRowInner: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  eventStripe: {
    width: 4,
    height: "100%",
    borderRadius: 999,
  },
  eventBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: 170,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
});
