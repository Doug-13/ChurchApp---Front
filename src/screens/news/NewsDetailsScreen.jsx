import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Divider,
  Icon,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";

// ─── News type metadata ───────────────────────────────────────────────────────

const NEWS_TYPE_META = {
  GENERAL: {
    icon: "bullhorn-outline",
    color: "#2DBF8A",
    bg: "#E8F9F3",
    label: "Geral",
  },
  URGENT: {
    icon: "alert-circle",
    color: "#E84D4D",
    bg: "#FEECEC",
    label: "Urgente",
  },
  IMPORTANT: {
    icon: "information",
    color: "#4158D0",
    bg: "#EEF0FA",
    label: "Importante",
  },
  WARNING: { icon: "alert", color: "#F5A623", bg: "#FEF5E7", label: "Atenção" },
  INFO: {
    icon: "information-outline",
    color: "#2E8AE5",
    bg: "#E6F4FF",
    label: "Informativo",
  },
  EVENT: {
    icon: "calendar-star",
    color: "#7C3AED",
    bg: "#F1EAFE",
    label: "Evento",
  },
  SOCIAL_ACTION: {
    icon: "hand-heart",
    color: "#E85D75",
    bg: "#FDECEF",
    label: "Ação social",
  },
  MEETING: {
    icon: "account-group",
    color: "#0EA5E9",
    bg: "#E7F6FE",
    label: "Reunião",
  },
  LEADERSHIP: {
    icon: "account-tie",
    color: "#6246EA",
    bg: "#EFECFF",
    label: "Liderança",
  },
  PRAYER: {
    icon: "hands-pray",
    color: "#14B8A6",
    bg: "#E6FFFA",
    label: "Oração",
  },
  WORSHIP: {
    icon: "music-clef-treble",
    color: "#EC4899",
    bg: "#FCE7F3",
    label: "Louvor",
  },
  SCALE: {
    icon: "clipboard-list-outline",
    color: "#F97316",
    bg: "#FFF3E8",
    label: "Escala",
  },
  TRAINING: {
    icon: "school-outline",
    color: "#2563EB",
    bg: "#EAF0FF",
    label: "Treinamento",
  },
  CHILDREN: {
    icon: "baby-face-outline",
    color: "#06B6D4",
    bg: "#E6FAFD",
    label: "Infantil",
  },
  YOUTH: {
    icon: "account-star-outline",
    color: "#8B5CF6",
    bg: "#F3EFFF",
    label: "Jovens",
  },
  WOMEN: {
    icon: "human-female",
    color: "#EC4899",
    bg: "#FCE7F3",
    label: "Mulheres",
  },
  MEN: { icon: "human-male", color: "#2563EB", bg: "#EAF0FF", label: "Homens" },
  FINANCE: {
    icon: "cash-multiple",
    color: "#16A34A",
    bg: "#EAFBF0",
    label: "Financeiro",
  },
  VOLUNTEERS: {
    icon: "account-heart-outline",
    color: "#22C55E",
    bg: "#EAFBF0",
    label: "Voluntários",
  },
};

const LEGACY_TYPE_MAP = {
  Aviso: "GENERAL",
  Evento: "EVENT",
  "Ação social": "SOCIAL_ACTION",
  "Acao social": "SOCIAL_ACTION",
};

function resolveTypeMeta(rawType) {
  if (!rawType) return NEWS_TYPE_META.GENERAL;
  const upper = String(rawType).toUpperCase();
  if (NEWS_TYPE_META[upper]) return NEWS_TYPE_META[upper];
  const mapped = LEGACY_TYPE_MAP[rawType];
  if (mapped && NEWS_TYPE_META[mapped]) return NEWS_TYPE_META[mapped];
  return NEWS_TYPE_META.GENERAL;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFullDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return formatFullDate(iso);
}

function isExpired(rawDate) {
  if (!rawDate) return false;
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, color, theme }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: color + "18" }]}>
        <Icon source={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 1 }}
        >
          {label}
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurface, fontWeight: "600" }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewsDetailsScreen({ route, navigation }) {
  const { id } = route.params || {};
  const theme = useTheme();
  const { apiFetchAuth, isAdmin } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchAuth(`/news/${id}`);
      setPost(res?.data ?? res);
    } catch (e) {
      // ✅ Trata 403 com mensagem clara
      if (
        e?.message?.includes("403") ||
        e?.message?.toLowerCase().includes("acesso")
      ) {
        setError("Você não tem permissão para ver este aviso.");
      } else {
        setError(e?.message ?? "Não foi possível carregar o aviso.");
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetchAuth, id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!post) return;
    Alert.alert(
      "Excluir aviso",
      `Deseja excluir "${post.title}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await apiFetchAuth(`/news/${post.id}`, { method: "DELETE" });
              navigation.goBack();
            } catch (e) {
              Alert.alert("Erro", e?.message ?? "Não foi possível excluir.");
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [apiFetchAuth, post, navigation]);

  // ── Header buttons ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAdmin || !post) return;
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row" }}>
          <IconButton
            icon="pencil-outline"
            iconColor={theme.colors.primary}
            size={22}
            onPress={() => navigation.navigate("NewsForm", { post })}
          />
          <IconButton
            icon="trash-can-outline"
            iconColor={theme.colors.error}
            size={22}
            onPress={handleDelete}
          />
        </View>
      ),
    });
  }, [isAdmin, post, navigation, theme, handleDelete]);

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading || deleting) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
          {deleting ? "Excluindo..." : "Carregando..."}
        </Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.background, padding: 24 },
        ]}
      >
        <Icon
          source="alert-circle-outline"
          size={40}
          color={theme.colors.error}
        />
        <Text
          variant="titleMedium"
          style={{ marginTop: 12, fontWeight: "700", textAlign: "center" }}
        >
          {error ?? "Aviso não encontrado."}
        </Text>
        <Button mode="outlined" onPress={fetchPost} style={{ marginTop: 16 }}>
          Tentar novamente
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 6 }}
        >
          Voltar
        </Button>
      </View>
    );
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const meta = resolveTypeMeta(post.type);
  const expired = isExpired(post.expiresAt);
  const isDraft = post.active === false;
  const publishedLabel = formatRelative(post.publishedAt ?? post.createdAt);
  const publishedFull = formatFullDate(post.publishedAt ?? post.createdAt);
  const expiresLabel = formatDateTime(post.expiresAt);
  const updatedLabel = formatDateTime(post.updatedAt);
  const targetName = post.targetDepartmentName || post.departmentName || null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Cover ──────────────────────────────────────────────────────── */}
      {!!post.coverUrl && (
        <View style={styles.coverWrapper}>
          <Image
            source={{ uri: post.coverUrl }}
            style={styles.cover}
            resizeMode="cover"
          />
        </View>
      )}

      {/* ── Type pill + data ───────────────────────────────────────────── */}
      <View style={styles.topRow}>
        <View style={[styles.pill, { backgroundColor: meta.bg }]}>
          <Icon source={meta.icon} size={14} color={meta.color} />
          <Text
            variant="labelSmall"
            style={{ color: meta.color, fontWeight: "800" }}
          >
            {meta.label}
          </Text>
        </View>
        <View style={styles.dateRow}>
          <Icon
            source="clock-outline"
            size={13}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {publishedLabel}
          </Text>
        </View>
      </View>

      {/* ── Badges rascunho / expirado ────────────────────────────────── */}
      {(isDraft || expired) && (
        <View style={styles.badgesRow}>
          {isDraft && (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Icon
                source="eye-off-outline"
                size={12}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="labelSmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontWeight: "700",
                }}
              >
                Rascunho
              </Text>
            </View>
          )}
          {expired && (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.errorContainer },
              ]}
            >
              <Icon
                source="timer-off-outline"
                size={12}
                color={theme.colors.error}
              />
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.error, fontWeight: "700" }}
              >
                Expirado
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Título ────────────────────────────────────────────────────── */}
      <Text variant="headlineSmall" style={styles.title}>
        {post.title}
      </Text>

      {/* ── Autor ─────────────────────────────────────────────────────── */}
      {!!post.createdByName && (
        <View style={styles.authorRow}>
          <Icon
            source="account-circle-outline"
            size={16}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Publicado por{" "}
            <Text style={{ fontWeight: "700", color: theme.colors.onSurface }}>
              {post.createdByName}
            </Text>
          </Text>
        </View>
      )}

      <Divider
        style={[
          styles.divider,
          { backgroundColor: theme.colors.outlineVariant },
        ]}
      />

      {/* ── Mensagem em destaque ───────────────────────────────────────── */}
      <Surface
        style={[
          styles.contentCard,
          {
            backgroundColor: meta.bg,
            borderColor: meta.color + "40",
          },
        ]}
        elevation={0}
      >
        <View style={styles.contentCardInner}>
          {/* Barra lateral colorida */}
          <View
            style={[styles.contentCardBar, { backgroundColor: meta.color }]}
          />

          <View style={{ flex: 1 }}>
            {/* Label do tipo */}
            <View style={styles.contentCardHeader}>
              <Icon source={meta.icon} size={14} color={meta.color} />
              <Text style={[styles.contentCardLabel, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>

            {/* Texto da mensagem */}
            <Text
              style={[styles.contentText, { color: theme.colors.onSurface }]}
            >
              {post.content}
            </Text>
          </View>
        </View>
      </Surface>

      {!!post.repertoire && (
        <Surface
          style={[
            styles.repertoireCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={0}
        >
          <View style={styles.repertoireHeader}>
            <View style={styles.repertoireHeaderIcon}>
              <Icon
                source="playlist-music"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="labelSmall" style={styles.repertoireEyebrow}>
                REPERTÓRIO DO AVISO
              </Text>
              <Text variant="titleMedium" style={styles.repertoireTitle}>
                {post.repertoire.title}
              </Text>
              {!!post.repertoire.description && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 3 }}
                >
                  {post.repertoire.description}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.repertoireNotice}>
            <Icon
              source="shield-check-outline"
              size={17}
              color={theme.colors.primary}
            />
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
            >
              Este repertório está disponível para você pela visibilidade deste
              aviso.
            </Text>
          </View>

          {post.repertoire.songs?.length ? (
            <View style={styles.songList}>
              {post.repertoire.songs.map((song, index) => (
                <View
                  key={song.id || `${song.title}-${index}`}
                  style={[
                    styles.songRow,
                    index > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.songOrder,
                      { backgroundColor: theme.colors.primaryContainer },
                    ]}
                  >
                    <Text
                      style={{ color: theme.colors.primary, fontWeight: "900" }}
                    >
                      {song.order ?? index + 1}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.songTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {song.title}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        fontSize: 12,
                      }}
                    >
                      {[song.artist, song.tone ? `Tom ${song.tone}` : null]
                        .filter(Boolean)
                        .join(" • ") || "Sem artista ou tom informado"}
                    </Text>

                    {!!song.links?.length && (
                      <View style={styles.songLinks}>
                        {song.links.map((link) => (
                          <Button
                            key={link.id}
                            compact
                            mode="text"
                            icon="open-in-new"
                            onPress={() => Linking.openURL(link.url)}
                          >
                            {link.label || "Abrir link"}
                          </Button>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Nenhuma música adicionada ao repertório.
            </Text>
          )}
        </Surface>
      )}

      {/* ── Detalhes ──────────────────────────────────────────────────── */}
      <Surface
        style={[
          styles.infoCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        elevation={0}
      >
        <Text
          variant="labelMedium"
          style={[
            styles.infoCardTitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          Detalhes do aviso
        </Text>

        <InfoRow
          icon="calendar-check-outline"
          label="Publicado em"
          value={publishedFull}
          color={theme.colors.primary}
          theme={theme}
        />

        <InfoRow
          icon="earth"
          label="Visibilidade"
          value={targetName ?? "Toda a igreja"}
          color={targetName ? "#7C3AED" : theme.colors.primary}
          theme={theme}
        />

        {expiresLabel ? (
          <InfoRow
            icon={expired ? "timer-off-outline" : "timer-outline"}
            label={expired ? "Expirou em" : "Válido até"}
            value={expiresLabel}
            color={expired ? theme.colors.error : "#F5A623"}
            theme={theme}
          />
        ) : (
          <InfoRow
            icon="infinity"
            label="Validade"
            value="Sem data de expiração"
            color="#2DBF8A"
            theme={theme}
          />
        )}

        <InfoRow
          icon={isDraft ? "eye-off-outline" : "check-circle-outline"}
          label="Status"
          value={isDraft ? "Rascunho (não visível)" : "Publicado e ativo"}
          color={isDraft ? theme.colors.onSurfaceVariant : "#2DBF8A"}
          theme={theme}
        />

        {!!updatedLabel && (
          <InfoRow
            icon="pencil-clock-outline"
            label="Última atualização"
            value={updatedLabel}
            color={theme.colors.onSurfaceVariant}
            theme={theme}
          />
        )}
      </Surface>

      {/* ── Admin bar ─────────────────────────────────────────────────── */}
      {isAdmin && (
        <Surface
          style={[
            styles.adminBar,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={0}
        >
          <View style={styles.adminBarLeft}>
            <Icon
              source="shield-account-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text
              variant="labelMedium"
              style={{
                color: theme.colors.primary,
                marginLeft: 6,
                fontWeight: "700",
              }}
            >
              Ações de administrador
            </Text>
          </View>
          <View style={styles.adminBarBtns}>
            <Button
              mode="outlined"
              compact
              icon="pencil-outline"
              textColor={theme.colors.primary}
              style={{ borderColor: theme.colors.primary }}
              onPress={() => navigation.navigate("NewsForm", { post })}
            >
              Editar
            </Button>
            <Button
              mode="outlined"
              compact
              icon="trash-can-outline"
              textColor={theme.colors.error}
              style={{ borderColor: theme.colors.error }}
              onPress={handleDelete}
            >
              Excluir
            </Button>
          </View>
        </Surface>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Cover ──────────────────────────────────────────────────────────────────
  coverWrapper: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    height: 220,
  },
  cover: {
    width: "100%",
    height: "100%",
  },

  // ── Top row ────────────────────────────────────────────────────────────────
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  pill: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  // ── Badges ─────────────────────────────────────────────────────────────────
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },

  // ── Título / autor ─────────────────────────────────────────────────────────
  title: {
    fontWeight: "900",
    lineHeight: 32,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },

  // ── Mensagem em destaque ───────────────────────────────────────────────────
  contentCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 20,
    overflow: "hidden",
  },
  contentCardInner: {
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  contentCardBar: {
    width: 4,
    borderRadius: 999,
    alignSelf: "stretch",
    flexShrink: 0,
  },
  contentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  contentCardLabel: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  // ── Info card ──────────────────────────────────────────────────────────────
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },

  repertoireCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  repertoireHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  repertoireHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF0FA",
  },
  repertoireEyebrow: {
    color: "#9198B5",
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  repertoireTitle: {
    fontWeight: "900",
  },
  repertoireNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 14,
    padding: 11,
    borderRadius: 12,
    backgroundColor: "#EEF0FA",
  },
  songList: {
    marginTop: 10,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingVertical: 12,
  },
  songOrder: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  songTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  songLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  infoCardTitle: {
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Admin bar ──────────────────────────────────────────────────────────────
  adminBar: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  adminBarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminBarBtns: {
    flexDirection: "row",
    gap: 10,
  },
});
