// src/screens/repertoires/RepertoiresScreen.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import {
  ActivityIndicator,
  Button,
  Card,
  FAB,
  Icon,
  IconButton,
  Searchbar,
  Surface,
  Text,
} from "react-native-paper";

import { useAuth } from "../../context/AuthContext";
import { repertoiresService } from "../../services/repertoiresService";
import type { Repertoire } from "../../types/repertoire";

type Props = {
  navigation: any;
  route: {
    params?: {
      churchId?: string;
      ministryId?: string;
      eventId?: string;
      scheduleId?: string;
      publicOnly?: boolean;
    };
  };
};

const DS = {
  colors: {
    primary: "#4158D0",
    primaryDark: "#1A2366",
    accent: "#6A80E8",
    background: "#F5F6FA",
    surface: "#FFFFFF",
    surfaceSoft: "#F7F8FC",
    tint: "#EEF0FA",
    text: "#1A2366",
    muted: "#7E86A8",
    outline: "#E4E6F0",
    success: "#2DBF8A",
    warning: "#F5A623",
    danger: "#E84D4D",
    purple: "#7C3AED",
    pink: "#EC4899",
    cyan: "#0EA5E9",
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 24,
  },
};

function withAlpha(hex: string, alphaHex = "18") {
  const value = String(hex || "").trim();

  if (value.startsWith("#") && value.length === 7) {
    return `${value}${alphaHex}`;
  }

  return value;
}

function getActiveChurchId(auth: any, routeChurchId?: string) {
  if (routeChurchId) return routeChurchId;

  if (auth?.activeChurchId) return auth.activeChurchId;
  if (auth?.user?.activeChurchId) return auth.user.activeChurchId;
  if (auth?.currentChurch?.id) return auth.currentChurch.id;
  if (auth?.selectedChurch?.id) return auth.selectedChurch.id;
  if (auth?.church?.id) return auth.church.id;

  return null;
}

function getVisibilityLabel(value: string) {
  switch (value) {
    case "ALL":
      return "Todos";
    case "PRIVATE":
      return "Privado";
    case "MINISTRY":
      return "Ministério";
    default:
      return value;
  }
}

function getVisibilityIcon(value: string) {
  switch (value) {
    case "ALL":
      return "earth";
    case "PRIVATE":
      return "lock-outline";
    case "MINISTRY":
      return "account-group-outline";
    default:
      return "eye-outline";
  }
}

function getVisibilityColor(value: string) {
  switch (value) {
    case "ALL":
      return DS.colors.success;
    case "PRIVATE":
      return DS.colors.purple;
    case "MINISTRY":
      return DS.colors.primary;
    default:
      return DS.colors.primary;
  }
}

function getStatusLabel(value: string) {
  switch (value) {
    case "DRAFT":
      return "Rascunho";
    case "IN_PROGRESS":
      return "Em definição";
    case "CONFIRMED":
      return "Confirmado";
    case "ARCHIVED":
      return "Arquivado";
    default:
      return value;
  }
}

function getStatusColor(value: string) {
  switch (value) {
    case "DRAFT":
      return DS.colors.warning;
    case "IN_PROGRESS":
      return DS.colors.cyan;
    case "CONFIRMED":
      return DS.colors.success;
    case "ARCHIVED":
      return DS.colors.muted;
    default:
      return DS.colors.primary;
  }
}

function getRepertoireAccent(item: Repertoire) {
  if (item.ministry?.color) return item.ministry.color;

  if (item.eventId) return DS.colors.pink;
  if (item.scheduleId) return DS.colors.cyan;

  return getVisibilityColor(item.visibility);
}

function getRepertoireSubtitle(item: Repertoire) {
  if (item.description) {
    return item.description;
  }

  if (item.ministry?.name) {
    return `Ministério ${item.ministry.name}`;
  }

  if (item.event?.title) {
    return `Evento: ${item.event.title}`;
  }

  if (item.schedule?.title) {
    return `Escala/ensaio: ${item.schedule.title}`;
  }

  return "Repertório da igreja";
}

function getContextLabel(item: Repertoire) {
  if (item.event?.title) return "Evento";
  if (item.schedule?.title) return "Ensaio";
  if (item.ministry?.name) return item.ministry.name;

  return "Geral";
}

function ModernChip({
  icon,
  label,
  color,
}: {
  icon?: string;
  label: string;
  color: string;
}) {
  return (
    <View
      style={[
        styles.modernChip,
        {
          backgroundColor: withAlpha(color, "18"),
          borderColor: withAlpha(color, "35"),
        },
      ]}
    >
      {icon ? <Icon source={icon} size={13} color={color} /> : null}

      <Text
        style={[
          styles.modernChipText,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function RepertoiresScreen({ navigation, route }: Props) {
  const auth = useAuth();
  const routeParams = route.params || {};
  const publicOnly = routeParams.publicOnly === true;
  const canManage =
    !publicOnly &&
    !!(auth as any)?.permissions?.canManageRepertoires;

  const churchId = useMemo(
    () => getActiveChurchId(auth, routeParams.churchId),
    [auth, routeParams.churchId],
  );

  const { ministryId, eventId, scheduleId } = routeParams;

  const keepVisibleItems = useCallback(
    (repertoires: Repertoire[]) => {
      if (!publicOnly) {
        return repertoires;
      }

      return repertoires.filter(
        (repertoire) =>
          repertoire.visibility === "ALL" &&
          repertoire.status !== "ARCHIVED",
      );
    },
    [publicOnly],
  );

  const [items, setItems] = useState<Repertoire[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const stats = useMemo(() => {
    const total = items.length;

    const songs = items.reduce((acc, item) => {
      return acc + (item.songsCount || item.songs?.length || 0);
    }, 0);

    const confirmed = items.filter(
      (item) => item.status === "CONFIRMED",
    ).length;

    return {
      total,
      songs,
      confirmed,
    };
  }, [items]);

  const load = useCallback(
    async (searchText = q) => {
      if (!churchId) {
        setItems([]);
        return;
      }

      const response = await repertoiresService.list(churchId, {
        q: searchText,
        ministryId,
        eventId,
        scheduleId,
        take: 50,
      });

      setItems(keepVisibleItems(response.items || []));
      setErrorMessage("");
    },
    [churchId, ministryId, eventId, scheduleId, q, keepVisibleItems],
  );

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        setLoading(true);

        if (!churchId) {
          if (mounted) {
            setItems([]);
          }

          return;
        }

        const response = await repertoiresService.list(churchId, {
          ministryId,
          eventId,
          scheduleId,
          take: 50,
        });

        if (mounted) {
          setItems(keepVisibleItems(response.items || []));
          setErrorMessage("");
        }
      } catch (error: any) {
        console.log("Erro ao carregar repertórios:", {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
          url: error?.config?.url,
        });

        if (mounted) {
          setItems([]);

          const backendMessage = error?.response?.data?.message;

          setErrorMessage(
            Array.isArray(backendMessage)
              ? backendMessage.join("\n")
              : backendMessage || "Não foi possível carregar os repertórios.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    start();

    return () => {
      mounted = false;
    };
  }, [churchId, ministryId, eventId, scheduleId, keepVisibleItems]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await load();
    } catch (error: any) {
      console.log("Erro ao atualizar repertórios:", error);

      const backendMessage = error?.response?.data?.message;

      setErrorMessage(
        Array.isArray(backendMessage)
          ? backendMessage.join("\n")
          : backendMessage || "Não foi possível atualizar os repertórios.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const onSearch = async (value: string) => {
    setQ(value);

    try {
      await load(value);
    } catch (error: any) {
      console.log("Erro ao buscar repertórios:", error);

      const backendMessage = error?.response?.data?.message;

      setErrorMessage(
        Array.isArray(backendMessage)
          ? backendMessage.join("\n")
          : backendMessage || "Não foi possível buscar os repertórios.",
      );
    }
  };

  const openCreate = () => {
    if (!churchId || !canManage) return;

    navigation.push("RepertoireForm", {
      churchId,
      ministryId,
      eventId,
      scheduleId,
      mode: "create",
    });
  };

  const openDetail = (repertoire: Repertoire) => {
    if (!churchId) return;

    navigation.navigate(
      publicOnly ? "PublicRepertoireDetail" : "RepertoireDetail",
      {
        churchId,
        repertoireId: repertoire.id,
        readOnly: publicOnly,
      },
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingIconWrap}>
          <ActivityIndicator color={DS.colors.primary} />
        </View>

        <Text style={styles.loadingTitle}>Carregando repertórios...</Text>

        <Text style={styles.loadingDescription}>
          Buscando músicas, escalas e vínculos disponíveis.
        </Text>
      </View>
    );
  }

  if (!churchId) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.emptyIconLarge}>
          <Icon source="church" size={34} color={DS.colors.primary} />
        </View>

        <Text style={styles.loadingTitle}>Igreja ativa não encontrada</Text>

        <Text style={styles.loadingDescription}>
          Selecione uma igreja ativa para visualizar os repertórios.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.bgBlobOne} pointerEvents="none" />
      <View style={styles.bgBlobTwo} pointerEvents="none" />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={[
                DS.colors.primaryDark,
                DS.colors.primary,
                DS.colors.accent,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroGlow} />

              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <Icon source="music-clef-treble" size={24} color="#fff" />
                </View>

                <View style={{ flexDirection: "row" }}>
                  {!publicOnly ? (
                    <IconButton
                      icon="music-box-multiple-outline"
                      size={20}
                      iconColor="#fff"
                      onPress={() => navigation.navigate("SongCatalog")}
                      style={styles.heroAddButton}
                    />
                  ) : null}
                  {canManage ? <IconButton icon="plus" size={20} iconColor="#fff" onPress={openCreate} style={styles.heroAddButton} /> : null}
                </View>
              </View>

              <Text style={styles.heroEyebrow}>
                {publicOnly ? "Músicas da nossa igreja" : "Ministério de louvor"}
              </Text>

              <Text style={styles.heroTitle}>
                {publicOnly ? "Cante com a gente" : "Repertórios"}
              </Text>

              <Text style={styles.heroDescription}>
                {publicOnly
                  ? "Acesse os repertórios abertos, ouça as músicas e aprenda para cantar conosco."
                  : "Organize músicas, links, tons e permissões em um só lugar."}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.total}</Text>
                  <Text style={styles.statLabel}>repertórios</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.songs}</Text>
                  <Text style={styles.statLabel}>músicas</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.confirmed}</Text>
                  <Text style={styles.statLabel}>confirmados</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.searchWrap}>
              <Searchbar
                value={q}
                onChangeText={onSearch}
                placeholder="Buscar repertório"
                iconColor={DS.colors.primary}
                inputStyle={styles.searchInput}
                style={styles.search}
              />
            </View>

            {!!errorMessage && (
              <Card style={styles.errorCard}>
                <Card.Content style={styles.errorContent}>
                  <View style={styles.errorIcon}>
                    <Icon
                      source="alert-circle-outline"
                      size={22}
                      color={DS.colors.danger}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.errorTitle}>Erro ao carregar</Text>

                    <Text style={styles.errorText}>{errorMessage}</Text>

                    <Button mode="text" onPress={onRefresh}>
                      Tentar novamente
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            )}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {publicOnly ? "Repertórios abertos" : "Lista de repertórios"}
                </Text>

                <Text style={styles.sectionSubtitle}>
                  {publicOnly
                    ? "Escolha um repertório e aprenda as músicas cantadas na igreja."
                    : "Toque em um repertório para ver músicas e links."}
                </Text>
              </View>

              {canManage ? <Button
                mode="contained-tonal"
                icon="plus"
                onPress={openCreate}
                style={styles.newButton}
                buttonColor={DS.colors.tint}
                textColor={DS.colors.primary}
              >
                Novo
              </Button> : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          !errorMessage ? (
            <Surface elevation={0} style={styles.emptyCard}>
              <View style={styles.emptyIconLarge}>
                <Icon
                  source="playlist-music-outline"
                  size={34}
                  color={DS.colors.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                {publicOnly
                  ? "Nenhum repertório aberto"
                  : "Nenhum repertório encontrado"}
              </Text>

              <Text style={styles.emptyDescription}>
                {publicOnly
                  ? "Quando a igreja publicar um repertório para todos, ele aparecerá aqui."
                  : "Crie seu primeiro repertório para organizar as músicas do culto, evento ou ensaio."}
              </Text>

              {canManage ? <Button
                mode="contained"
                icon="plus"
                onPress={openCreate}
                style={styles.emptyButton}
                contentStyle={{ height: 48 }}
                buttonColor={DS.colors.primary}
                textColor="#fff"
              >
                Criar repertório
              </Button> : null}
            </Surface>
          ) : null
        }
        renderItem={({ item }) => {
          const songsCount = item.songsCount || item.songs?.length || 0;
          const accent = getRepertoireAccent(item);
          const statusColor = getStatusColor(item.status);
          const visibilityColor = getVisibilityColor(item.visibility);

          return (
            <Pressable
              onPress={() => openDetail(item)}
              android_ripple={{
                color: withAlpha(accent, "18"),
              }}
              style={({ pressed }) => [
                styles.cardPressable,
                pressed && styles.cardPressed,
              ]}
            >
              <Surface
                elevation={0}
                style={[
                  styles.repertoireCard,
                  {
                    borderColor: withAlpha(accent, "35"),
                  },
                ]}
              >
                <View
                  style={[
                    styles.cardAccent,
                    {
                      backgroundColor: accent,
                    },
                  ]}
                />

                <View style={styles.cardInner}>
                  <View style={styles.cardMainRow}>
                    <View
                      style={[
                        styles.cardIcon,
                        {
                          backgroundColor: withAlpha(accent, "18"),
                        },
                      ]}
                    >
                      <Icon source="playlist-music" size={24} color={accent} />
                    </View>

                    <View style={styles.cardText}>
                      <Text numberOfLines={1} style={styles.cardTitle}>
                        {item.title}
                      </Text>

                      <Text numberOfLines={2} style={styles.cardSubtitle}>
                        {getRepertoireSubtitle(item)}
                      </Text>
                    </View>

                    <View style={styles.songBadge}>
                      <Text style={styles.songBadgeNumber}>{songsCount}</Text>

                      <Text style={styles.songBadgeLabel}>
                        {songsCount === 1 ? "música" : "músicas"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardMetaRow}>
                    <ModernChip
                      icon={getVisibilityIcon(item.visibility)}
                      label={getVisibilityLabel(item.visibility)}
                      color={visibilityColor}
                    />

                    <ModernChip
                      icon="progress-check"
                      label={getStatusLabel(item.status)}
                      color={statusColor}
                    />

                    <ModernChip
                      icon="tag-outline"
                      label={getContextLabel(item)}
                      color={accent}
                    />

                    {item.allowAssignedMembers ? (
                      <ModernChip
                        icon="account-check-outline"
                        label="Escalados"
                        color={DS.colors.success}
                      />
                    ) : null}
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.footerHint}>
                      <Icon
                        source="music-note-outline"
                        size={16}
                        color={DS.colors.muted}
                      />

                      <Text style={styles.footerHintText}>
                        Ver músicas e links do repertório
                      </Text>
                    </View>

                    <Button
                      mode="text"
                      compact
                      onPress={() => openDetail(item)}
                      textColor={DS.colors.primary}
                      contentStyle={styles.openButtonContent}
                    >
                      Abrir
                    </Button>
                  </View>
                </View>
              </Surface>
            </Pressable>
          );
        }}
      />

      {canManage ? <FAB
        icon="plus"
        label="Novo"
        onPress={openCreate}
        style={styles.fab}
        color="#fff"
      /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },

  bgBlobOne: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: "#DDE3FF",
    top: -170,
    right: -150,
    opacity: 0.55,
  },

  bgBlobTwo: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "#EDE9FE",
    bottom: 80,
    left: -150,
    opacity: 0.65,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
    backgroundColor: DS.colors.background,
  },

  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.colors.tint,
    marginBottom: 16,
  },

  loadingTitle: {
    color: DS.colors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  loadingDescription: {
    color: DS.colors.muted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  list: {
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },

  hero: {
    borderRadius: 24,
    padding: 16,
    overflow: "hidden",
    marginBottom: 14,
  },

  heroGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    top: -65,
    right: -35,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },

  heroAddButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.16)",
    margin: 0,
  },

  heroEyebrow: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 14,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.7,
    marginTop: 1,
  },

  heroDescription: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 14,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: "94%",
  },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },

  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 9,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  statNumber: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  statLabel: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    marginTop: 1,
  },

  searchWrap: {
    marginBottom: 14,
  },

  search: {
    borderRadius: 20,
    backgroundColor: DS.colors.surface,
    borderWidth: 1,
    borderColor: DS.colors.outline,
    elevation: 0,
  },

  searchInput: {
    color: DS.colors.text,
  },

  errorCard: {
    borderRadius: DS.radius.lg,
    marginBottom: 12,
    backgroundColor: "#FFF7F7",
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },

  errorContent: {
    flexDirection: "row",
    gap: 12,
  },

  errorIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFEAEA",
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    color: DS.colors.danger,
    fontWeight: "900",
    fontSize: 15,
  },

  errorText: {
    color: DS.colors.muted,
    marginTop: 2,
    lineHeight: 19,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 2,
  },

  sectionTitle: {
    color: DS.colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    color: DS.colors.muted,
    marginTop: 3,
    fontSize: 13,
  },

  newButton: {
    borderRadius: 999,
  },

  cardPressable: {
    borderRadius: DS.radius.lg,
  },

  cardPressed: {
    opacity: 0.86,
  },

  repertoireCard: {
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.surface,
    borderWidth: 1,
    overflow: "hidden",
  },

  cardAccent: {
    height: 5,
    width: "100%",
  },

  cardInner: {
    padding: 14,
  },

  cardMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  cardText: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
  },

  cardTitle: {
    color: DS.colors.text,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  cardSubtitle: {
    color: DS.colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },

  songBadge: {
    minWidth: 64,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: DS.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },

  songBadgeNumber: {
    color: DS.colors.primary,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },

  songBadgeLabel: {
    color: DS.colors.text,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  cardMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14,
  },

  modernChip: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  modernChipText: {
    fontSize: 12,
    fontWeight: "800",
  },

  cardFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DS.colors.outline,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  footerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },

  footerHintText: {
    color: DS.colors.muted,
    fontSize: 12,
  },

  openButtonContent: {
    height: 34,
  },

  emptyCard: {
    borderRadius: DS.radius.xl,
    padding: 22,
    backgroundColor: DS.colors.surface,
    borderWidth: 1,
    borderColor: DS.colors.outline,
    alignItems: "center",
    marginTop: 4,
  },

  emptyIconLarge: {
    width: 70,
    height: 70,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.colors.tint,
    marginBottom: 14,
  },

  emptyTitle: {
    color: DS.colors.text,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyDescription: {
    color: DS.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  emptyButton: {
    marginTop: 18,
    borderRadius: 18,
    alignSelf: "stretch",
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    borderRadius: 18,
    backgroundColor: DS.colors.primary,
  },
});

