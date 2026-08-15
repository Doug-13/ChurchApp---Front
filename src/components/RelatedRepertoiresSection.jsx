import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import repertoiresService from "../services/repertoiresService";

export default function RelatedRepertoiresSection({
  churchId,
  eventId,
  scheduleId,
  navigation,
  canManage = false,
  requireEventVisibility,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * Nos detalhes do evento, somente repertórios autorizados pelo
   * criador devem aparecer. Nas escalas, essa autorização adicional
   * não é necessária.
   */
  const mustRequireEventVisibility =
    requireEventVisibility !== undefined
      ? requireEventVisibility
      : Boolean(eventId);

  const load = useCallback(async () => {
    if (!churchId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await repertoiresService.list(churchId, {
        eventId,
        scheduleId,
        take: 50,
      });

      const repertoires = Array.isArray(response)
        ? response
        : response?.items || [];

      const visibleRepertoires = repertoires.filter(
        (repertoire) =>
          !mustRequireEventVisibility ||
          repertoire.showInEventDetails === true,
      );

      setItems(visibleRepertoires);
    } catch (err) {
      console.error(
        "Erro ao carregar repertórios relacionados:",
        err,
      );

      setItems([]);
      setError("Não foi possível carregar os repertórios.");
    } finally {
      setLoading(false);
    }
  }, [
    churchId,
    eventId,
    scheduleId,
    mustRequireEventVisibility,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const go = (screen, params = {}) => {
    if (!navigation) {
      return;
    }

    navigation.navigate("RepertoiresTab", {
      screen,
      params,
    });
  };

  const openRepertoire = (repertoire) => {
    go("RepertoireDetail", {
      churchId,
      repertoireId: repertoire.id,
    });
  };

  const createRepertoire = () => {
    go("RepertoireForm", {
      churchId,
      eventId: eventId || undefined,
      scheduleId: scheduleId || undefined,
      showInEventDetails: false,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Repertório</Text>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6D4AFF" />
          <Text style={styles.loadingText}>
            Carregando repertório...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Repertório</Text>

        {canManage ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.createButton}
            onPress={createRepertoire}
          >
            <Text style={styles.createButtonText}>Adicionar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.messageContainer}>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.retryButton}
            onPress={load}
          >
            <Text style={styles.retryButtonText}>
              Tentar novamente
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!error && items.length === 0 ? (
        <View style={styles.messageContainer}>
          <Text style={styles.emptyText}>
            Nenhum repertório disponível.
          </Text>

          {canManage ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptyCreateButton}
              onPress={createRepertoire}
            >
              <Text style={styles.emptyCreateButtonText}>
                Criar repertório
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {!error
        ? items.map((repertoire) => (
            <TouchableOpacity
              key={repertoire.id}
              activeOpacity={0.8}
              style={styles.card}
              onPress={() => openRepertoire(repertoire)}
            >
              <View style={styles.cardContent}>
                <Text
                  style={styles.repertoireTitle}
                  numberOfLines={2}
                >
                  {repertoire.title || "Repertório sem título"}
                </Text>

                {repertoire.description ? (
                  <Text
                    style={styles.description}
                    numberOfLines={2}
                  >
                    {repertoire.description}
                  </Text>
                ) : null}

                <View style={styles.detailsRow}>
                  {repertoire.status ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {formatStatus(repertoire.status)}
                      </Text>
                    </View>
                  ) : null}

                  {Array.isArray(repertoire.songs) ? (
                    <Text style={styles.songCount}>
                      {formatSongCount(
                        repertoire.songs.length,
                      )}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        : null}
    </View>
  );
}

function formatStatus(status) {
  const statusLabels = {
    DRAFT: "Rascunho",
    ACTIVE: "Ativo",
    PUBLISHED: "Publicado",
    ARCHIVED: "Arquivado",
  };

  return statusLabels[status] || status;
}

function formatSongCount(quantity) {
  if (quantity === 1) {
    return "1 música";
  }

  return `${quantity} músicas`;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  title: {
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "700",
  },

  createButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#6D4AFF",
  },

  createButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },

  loadingText: {
    marginLeft: 10,
    color: "#6B7280",
    fontSize: 14,
  },

  messageContainer: {
    alignItems: "center",
    paddingVertical: 18,
  },

  emptyText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },

  errorText: {
    color: "#B42318",
    fontSize: 14,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F0FF",
  },

  retryButtonText: {
    color: "#6D4AFF",
    fontSize: 13,
    fontWeight: "700",
  },

  emptyCreateButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#F3F0FF",
  },

  emptyCreateButtonText: {
    color: "#6D4AFF",
    fontSize: 13,
    fontWeight: "700",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
  },

  cardContent: {
    flex: 1,
  },

  repertoireTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },

  description: {
    marginTop: 5,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
  },

  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  badge: {
    marginRight: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
  },

  badgeText: {
    color: "#5B3FD1",
    fontSize: 11,
    fontWeight: "700",
  },

  songCount: {
    color: "#6B7280",
    fontSize: 12,
  },

  arrow: {
    marginLeft: 12,
    color: "#6D4AFF",
    fontSize: 28,
    fontWeight: "400",
  },
});