// src/screens/admin/EventStatisticsListScreen.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import {
  ActivityIndicator,
  Button,
  Icon,
  Searchbar,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

import { useAuth } from "../../context/AuthContext";

const NAVY = "#1A2366";
const BRAND = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const SUCCESS = "#2DBF8A";
const SUCCESS_BG = "#E8F9F3";
const MUTED = "#9198B5";
const BORDER = "#E4E6F0";

function getEventDate(event) {
  return (
    event?.dateLabel ||
    event?.date ||
    event?.startsAt ||
    event?.startDate ||
    event?.startAt ||
    ""
  );
}

function getEventTime(event) {
  return event?.timeLabel || event?.time || "23:59";
}

function getEventTimestamp(event) {
  const rawDate = String(getEventDate(event) || "").trim();

  if (!rawDate) {
    return null;
  }

  if (rawDate.includes("T")) {
    const timestamp = new Date(rawDate).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    const rawTime = String(getEventTime(event) || "23:59");
    const timeMatch = rawTime.match(/(\d{2}):(\d{2})/);
    const hours = timeMatch?.[1] || "23";
    const minutes = timeMatch?.[2] || "59";

    const timestamp = new Date(
      `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T${hours}:${minutes}:59`,
    ).getTime();

    return Number.isNaN(timestamp) ? null : timestamp;
  }

  const brMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

  if (brMatch) {
    const rawTime = String(getEventTime(event) || "23:59");
    const timeMatch = rawTime.match(/(\d{2}):(\d{2})/);
    const hours = timeMatch?.[1] || "23";
    const minutes = timeMatch?.[2] || "59";

    const timestamp = new Date(
      `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T${hours}:${minutes}:59`,
    ).getTime();

    return Number.isNaN(timestamp) ? null : timestamp;
  }

  const timestamp = new Date(rawDate).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatEventDate(event) {
  const rawDate = String(getEventDate(event) || "").trim();

  if (!rawDate) {
    return "Data não informada";
  }

  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  return rawDate;
}

function formatEventTime(event) {
  const value = String(
    event?.timeLabel ||
      event?.time ||
      getEventDate(event) ||
      "",
  );

  const match = value.match(/(?:T|^)(\d{2}):(\d{2})/);

  if (!match || (match[1] === "00" && match[2] === "00")) {
    return "";
  }

  return `${match[1]}:${match[2]}`;
}

function normalizeEvents(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.events)) {
    return response.events;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

function EventCard({ event, onPress, mutedColor }) {
  const time = formatEventTime(event);

  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={styles.eventTouch}
    >
      <Surface
        elevation={0}
        style={styles.eventCard}
      >
        <View style={styles.dateIcon}>
          <Icon
            source="calendar-check-outline"
            size={22}
            color={SUCCESS}
          />
        </View>

        <View style={styles.eventContent}>
          <Text
            style={styles.eventTitle}
            numberOfLines={2}
          >
            {event?.title || "Evento"}
          </Text>

          <View style={styles.eventMetaRow}>
            <Icon
              source="calendar-outline"
              size={14}
              color={mutedColor}
            />

            <Text
              style={[
                styles.eventMeta,
                {
                  color: mutedColor,
                },
              ]}
            >
              {formatEventDate(event)}
              {time ? ` • ${time}` : ""}
            </Text>
          </View>

          {event?.location ? (
            <View style={styles.eventMetaRow}>
              <Icon
                source="map-marker-outline"
                size={14}
                color={mutedColor}
              />

              <Text
                style={[
                  styles.eventMeta,
                  {
                    color: mutedColor,
                  },
                ]}
                numberOfLines={1}
              >
                {event.location}
              </Text>
            </View>
          ) : null}

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              Evento realizado
            </Text>
          </View>
        </View>

        <Icon
          source="chevron-right"
          size={22}
          color={mutedColor}
        />
      </Surface>
    </TouchableRipple>
  );
}

export default function EventStatisticsListScreen({
  navigation,
}) {
  const theme = useTheme();

  const {
    activeChurchId,
    activeChurch,
    apiFetchAuth,
    permissions,
    isOwner,
  } = useAuth();

  const churchId =
    activeChurchId ||
    activeChurch?.id ||
    null;

  const canView =
    isOwner ||
    !!permissions?.canViewEventStatistics ||
    !!permissions?.canManageEventStatistics;

  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(
    async ({ refresh = false } = {}) => {
      if (!churchId || !canView) {
        setEvents([]);
        setLoading(false);
        return;
      }

      try {
        refresh
          ? setRefreshing(true)
          : setLoading(true);

        setErrorMessage("");

        const response = await apiFetchAuth(
          `/churches/${encodeURIComponent(churchId)}/events`,
          {
            method: "GET",
          },
        );

        setEvents(normalizeEvents(response));
      } catch (error) {
        setEvents([]);
        setErrorMessage(
          error?.message ||
            "Não foi possível carregar os eventos.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      apiFetchAuth,
      canView,
      churchId,
    ],
  );

  useEffect(() => {
    load();
  }, [load]);

  const completedEvents = useMemo(() => {
    const now = Date.now();
    const term = query.trim().toLowerCase();

    return events
      .filter((event) => {
        const timestamp = getEventTimestamp(event);

        if (timestamp === null || timestamp > now) {
          return false;
        }

        if (!term) {
          return true;
        }

        const title = String(event?.title || "").toLowerCase();
        const location = String(event?.location || "").toLowerCase();

        return (
          title.includes(term) ||
          location.includes(term)
        );
      })
      .sort((a, b) => {
        return (
          (getEventTimestamp(b) || 0) -
          (getEventTimestamp(a) || 0)
        );
      });
  }, [events, query]);

  const openStatistics = useCallback(
    (event) => {
      if (!event?.id) {
        return;
      }

      navigation.navigate("EventStatistics", {
        eventId: event.id,
        event,
      });
    },
    [navigation],
  );

  if (!canView) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <Icon
          source="lock-outline"
          size={42}
          color={MUTED}
        />

        <Text style={styles.centerTitle}>
          Acesso não permitido
        </Text>

        <Text style={styles.centerText}>
          Você não possui permissão para visualizar estatísticas de eventos.
        </Text>

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
        >
          Voltar
        </Button>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={BRAND}
        />

        <Text style={styles.centerText}>
          Carregando eventos realizados...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <FlatList
        data={completedEvents}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              load({
                refresh: true,
              })
            }
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Icon
                  source="chart-timeline-variant"
                  size={25}
                  color="#FFFFFF"
                />
              </View>

              <Text style={styles.heroEyebrow}>
                Pós-evento
              </Text>

              <Text style={styles.heroTitle}>
                Estatísticas de eventos
              </Text>

              <Text style={styles.heroDescription}>
                Selecione um evento realizado para registrar ou consultar público,
                visitantes, crianças, decisões e acompanhamentos.
              </Text>

              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>
                  {completedEvents.length} evento(s) realizado(s)
                </Text>
              </View>
            </View>

            <Searchbar
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar evento realizado"
              style={styles.search}
              inputStyle={styles.searchInput}
              elevation={0}
            />

            {errorMessage ? (
              <Surface
                elevation={0}
                style={styles.errorCard}
              >
                <Icon
                  source="alert-circle-outline"
                  size={20}
                  color="#E84D4D"
                />

                <View style={styles.errorContent}>
                  <Text style={styles.errorTitle}>
                    Não foi possível carregar
                  </Text>

                  <Text style={styles.errorText}>
                    {errorMessage}
                  </Text>
                </View>

                <Button
                  compact
                  onPress={() => load()}
                >
                  Tentar novamente
                </Button>
              </Surface>
            ) : null}

            {!errorMessage ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Eventos realizados
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    {
                      color: theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  Toque em um evento para abrir suas estatísticas.
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !errorMessage ? (
            <Surface
              elevation={0}
              style={styles.emptyCard}
            >
              <View style={styles.emptyIcon}>
                <Icon
                  source="calendar-search"
                  size={34}
                  color={BRAND}
                />
              </View>

              <Text style={styles.emptyTitle}>
                {query
                  ? "Nenhum evento encontrado"
                  : "Nenhum evento realizado"}
              </Text>

              <Text style={styles.emptyText}>
                {query
                  ? "Tente buscar usando outro nome."
                  : "Os eventos aparecerão aqui depois da data e do horário programados."}
              </Text>
            </Surface>
          ) : null
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            mutedColor={theme.colors.onSurfaceVariant}
            onPress={() => openStatistics(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  listContent: {
    padding: 16,
    paddingBottom: 32,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 14,
  },

  centerTitle: {
    color: NAVY,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },

  centerText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  hero: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: NAVY,
    overflow: "hidden",
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  heroEyebrow: {
    marginTop: 16,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  heroTitle: {
    marginTop: 2,
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },

  heroDescription: {
    marginTop: 8,
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    lineHeight: 20,
  },

  heroPill: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  heroPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  search: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
  },

  searchInput: {
    minHeight: 48,
  },

  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
  },

  sectionTitle: {
    color: NAVY,
    fontSize: 17,
    fontWeight: "900",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },

  eventTouch: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
  },

  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  dateIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SUCCESS_BG,
  },

  eventContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  eventTitle: {
    color: NAVY,
    fontSize: 15,
    fontWeight: "900",
  },

  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },

  eventMeta: {
    flex: 1,
    fontSize: 12,
  },

  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: SUCCESS_BG,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: SUCCESS,
  },

  statusText: {
    color: SUCCESS,
    fontSize: 10,
    fontWeight: "800",
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F7CACA",
    borderRadius: 15,
    backgroundColor: "#FFF1F1",
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "900",
  },

  errorText: {
    marginTop: 2,
    color: "#B42318",
    fontSize: 11,
    lineHeight: 16,
  },

  emptyCard: {
    alignItems: "center",
    marginTop: 14,
    padding: 28,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_LIGHT,
  },

  emptyTitle: {
    marginTop: 16,
    color: NAVY,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});

