import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, Pressable, Image } from "react-native";
import { Button, Card, Icon, IconButton, Surface, Text, TextInput, useTheme } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";

function EmptyState({ icon, title, description, action }) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        borderRadius: 16,
        backgroundColor: theme.colors.surfaceVariant,
        borderWidth: 2,
        borderColor: theme.colors.outlineVariant,
        borderStyle: "dashed",
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.colors.surface,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Icon source={icon} size={30} color={theme.colors.onSurfaceVariant} />
      </View>

      <Text variant="titleMedium" style={{ fontWeight: "900", marginBottom: 6, textAlign: "center" }}>
        {title}
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>{description}</Text>

      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

// ✅ HOOK SAFE
function useChurchEvents({ churchId, enabled, q, apiGet }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reqIdRef = useRef(0);

  const reload = async () => {
    const rid = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    try {
      if (!enabled || !churchId) {
        setItems([]);
        return;
      }

      const qs = new URLSearchParams();
      qs.set("take", "60");
      const term = (q || "").trim();
      if (term) qs.set("q", term);

      // Ajuste pro seu backend:
      // GET /churches/:churchId/events?take=60&q=
      const json = await apiGet(`/churches/${churchId}/events?${qs.toString()}`);
      if (rid !== reqIdRef.current) return;

      const arr = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
      setItems(arr);
    } catch (e) {
      if (rid !== reqIdRef.current) return;
      setError(String(e?.message || e));
      setItems([]);
    } finally {
      if (rid === reqIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, churchId]);

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => reload(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, enabled]);

  return { items, loading, error, reload };
}

export default function EventsManageScreen({ navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);

  const { activeChurchId, activeChurch, apiFetchAuth } = useAuth();
  const churchId = activeChurchId || activeChurch?.id || null;

  const apiGet = React.useCallback((path) => apiFetchAuth(path, { method: "GET" }), [apiFetchAuth]);

  const [query, setQuery] = useState("");

  const { items: events, loading, error, reload } = useChurchEvents({
    churchId,
    enabled: true,
    q: query,
    apiGet,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return (events || []).filter((e) => {
      const t = String(e?.title || "").toLowerCase();
      const l = String(e?.location || e?.address || "").toLowerCase();
      return t.includes(q) || l.includes(q);
    });
  }, [events, query]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineMedium" style={styles.title}>
              Eventos
            </Text>
            <Text style={styles.subtitle}>Crie eventos e depois o app gera as escalas automaticamente.</Text>
          </View>

          <Button
            mode="contained"
            icon="plus"
            onPress={() => navigation.navigate("EventComposer")}
            style={{ borderRadius: 16 }}
            contentStyle={{ height: 46 }}
            disabled={!churchId}
          >
            Criar
          </Button>
        </View>

        {!churchId ? (
          <Surface style={styles.warn} elevation={0}>
            <Icon source="alert-circle-outline" size={18} color={theme.colors.error} />
            <Text style={{ color: theme.colors.error, flex: 1 }}>
              Nenhuma igreja ativa no contexto (activeChurchId). Selecione uma igreja antes.
            </Text>
          </Surface>
        ) : null}

        {/* Buscar */}
        <TextInput
          mode="outlined"
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por título ou local..."
          left={<TextInput.Icon icon="magnify" />}
          style={{ marginTop: 14 }}
        />

        {/* Lista */}
        <View style={{ marginTop: 12, gap: 12 }}>
          {error ? (
            <Surface style={styles.notice} elevation={0}>
              <Icon source="alert-circle-outline" size={18} color={theme.colors.error} />
              <Text style={{ color: theme.colors.error, flex: 1 }}>{error}</Text>
              <IconButton icon="refresh" onPress={reload} />
            </Surface>
          ) : null}

          {loading ? <Text style={{ color: theme.colors.onSurfaceVariant }}>Carregando...</Text> : null}

          {!loading && filtered.length === 0 ? (
            <EmptyState
              icon="calendar-remove-outline"
              title="Nenhum evento encontrado"
              description="Crie um novo evento ou ajuste sua busca."
              action={
                <Button
                  mode="contained"
                  icon="plus"
                  onPress={() => navigation.navigate("EventComposer")}
                  style={{ borderRadius: 16 }}
                  contentStyle={{ height: 46 }}
                  disabled={!churchId}
                >
                  Novo evento
                </Button>
              }
            />
          ) : (
            filtered.map((e) => {
              const cover = e?.coverImageUrl || e?.coverUrl || null;
              const dateLabel = e?.dateLabel || e?.date || "";
              const timeLabel = e?.timeLabel || e?.time || "";
              const where = e?.location || e?.address || "";
              const price = e?.priceLabel || (e?.isFree ? "Gratuito" : "");

              return (
                <Card
                  key={e.id}
                  mode="outlined"
                  style={[styles.rowCard, { borderColor: theme.colors.outlineVariant }]}
                  onPress={() => navigation.navigate("EventComposer", { id: e.id })}
                >
                  <Card.Content style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Surface
                        elevation={0}
                        style={{
                          width: 74,
                          height: 74,
                          borderRadius: 18,
                          overflow: "hidden",
                          backgroundColor: theme.colors.surfaceVariant,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {cover ? (
                          <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} />
                        ) : (
                          <Icon source="calendar-star-outline" size={22} color={theme.colors.onSurfaceVariant} />
                        )}
                      </Surface>

                      <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ fontWeight: "900" }} numberOfLines={1}>
                          {e?.title || "Evento"}
                        </Text>

                        <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                          {(dateLabel ? `${dateLabel}` : "Sem data")}
                          {timeLabel ? ` • ${timeLabel}` : ""}
                          {where ? ` • ${where}` : ""}
                        </Text>

                        {price ? (
                          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>{price}</Text>
                        ) : null}
                      </View>

                      <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                    </View>
                  </Card.Content>
                </Card>
              );
            })
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(theme) {
  return {
    root: { flex: 1, backgroundColor: theme.colors.background },
    container: { padding: 16, paddingBottom: 28 },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    title: { fontWeight: "900", letterSpacing: -0.6 },
    subtitle: { color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 18 },

    warn: {
      marginTop: 12,
      padding: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    notice: {
      padding: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    rowCard: { borderRadius: 18 },
  };
}