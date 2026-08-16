// src/screens/repertoires/RepertoireDetailScreen.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import {
  ActivityIndicator,
  Button,
  Divider,
  FAB,
  Icon,
  IconButton,
  Modal,
  Portal,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";

import { repertoiresService } from "../../services/repertoiresService";
import type {
  Repertoire,
  RepertoireSong,
  RepertoireSongStatus,
} from "../../types/repertoire";

type Props = {
  navigation: any;
  route: {
    params: {
      churchId: string;
      repertoireId: string;
      readOnly?: boolean;
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

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  CONFIRMED: {
    label: "Confirmada",
    color: "#1E9E6B",
    bg: "#E3F7EE",
    icon: "check-circle-outline",
  },
  STUDYING: {
    label: "Estudando",
    color: "#C97A16",
    bg: "#FFF2DF",
    icon: "book-open-page-variant-outline",
  },
  REMOVED: {
    label: "Removida",
    color: "#C24949",
    bg: "#FBEAEA",
    icon: "close-circle-outline",
  },
};

const TONE_OPTIONS = [
  { label: "Não definido", value: "" },

  { label: "C / Dó", value: "C" },
  { label: "C# / Dó sustenido", value: "C#" },
  { label: "Db / Ré bemol", value: "Db" },

  { label: "D / Ré", value: "D" },
  { label: "D# / Ré sustenido", value: "D#" },
  { label: "Eb / Mi bemol", value: "Eb" },

  { label: "E / Mi", value: "E" },

  { label: "F / Fá", value: "F" },
  { label: "F# / Fá sustenido", value: "F#" },
  { label: "Gb / Sol bemol", value: "Gb" },

  { label: "G / Sol", value: "G" },
  { label: "G# / Sol sustenido", value: "G#" },
  { label: "Ab / Lá bemol", value: "Ab" },

  { label: "A / Lá", value: "A" },
  { label: "A# / Lá sustenido", value: "A#" },
  { label: "Bb / Si bemol", value: "Bb" },

  { label: "B / Si", value: "B" },

  { label: "Cm / Dó menor", value: "Cm" },
  { label: "C#m / Dó sustenido menor", value: "C#m" },
  { label: "Dbm / Ré bemol menor", value: "Dbm" },

  { label: "Dm / Ré menor", value: "Dm" },
  { label: "D#m / Ré sustenido menor", value: "D#m" },
  { label: "Ebm / Mi bemol menor", value: "Ebm" },

  { label: "Em / Mi menor", value: "Em" },

  { label: "Fm / Fá menor", value: "Fm" },
  { label: "F#m / Fá sustenido menor", value: "F#m" },
  { label: "Gbm / Sol bemol menor", value: "Gbm" },

  { label: "Gm / Sol menor", value: "Gm" },
  { label: "G#m / Sol sustenido menor", value: "G#m" },
  { label: "Abm / Lá bemol menor", value: "Abm" },

  { label: "Am / Lá menor", value: "Am" },
  { label: "A#m / Lá sustenido menor", value: "A#m" },
  { label: "Bbm / Si bemol menor", value: "Bbm" },

  { label: "Bm / Si menor", value: "Bm" },
];

function withAlpha(hex: string, alphaHex = "18") {
  const value = String(hex || "").trim();

  if (value.startsWith("#") && value.length === 7) {
    return `${value}${alphaHex}`;
  }

  return value;
}

function getToneLabel(value: string) {
  const tone = TONE_OPTIONS.find((item) => item.value === value);

  return tone?.label || value || "";
}

function getStatusMeta(value: string) {
  return (
    STATUS_META[value] || {
      label: value,
      color: DS.colors.primaryDark,
      bg: DS.colors.tint,
      icon: "circle-outline",
    }
  );
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

function getRepertoireStatusLabel(value: string) {
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

function getYouTubeVideoId(url?: string | null) {
  const value = String(url || "").trim();

  if (!value) return null;

  const patterns = [
    /youtu\.be\/([^?&/]+)/i,
    /youtube\.com\/watch\?v=([^?&/]+)/i,
    /youtube\.com\/embed\/([^?&/]+)/i,
    /youtube\.com\/shorts\/([^?&/]+)/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function getSongImageUrl(song: RepertoireSong) {
  const links = song.links || [];

  const youtubeLink = links.find((link) =>
    /youtube\.com|youtu\.be/i.test(link.url || ""),
  );

  const videoId = getYouTubeVideoId(youtubeLink?.url);

  if (!videoId) return null;

  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function getMainLink(song: RepertoireSong) {
  const links = song.links || [];

  if (!links.length) return null;

  const youtubeLink = links.find((link) =>
    /youtube\.com|youtu\.be/i.test(link.url || ""),
  );

  return youtubeLink || links[0];
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

      <Text style={[styles.modernChipText, { color }]}>{label}</Text>
    </View>
  );
}

function SongCompactCard({
  song,
  index,
  onOpenUrl,
  onRemove,
}: {
  song: RepertoireSong;
  index: number;
  onOpenUrl: (url: string) => void;
  onRemove?: (songId: string) => void;
}) {
  const imageUrl = useMemo(() => getSongImageUrl(song), [song]);
  const mainLink = useMemo(() => getMainLink(song), [song]);
  const status = getStatusMeta(song.status);

  return (
    <Surface
      elevation={0}
      style={[
        styles.songCard,
        {
          borderColor: withAlpha(status.color, "30"),
        },
      ]}
    >
      <View style={[styles.songTopAccent, { backgroundColor: status.color }]} />

      <View style={styles.songCardContent}>
        <View style={styles.songRow}>
          <View style={styles.songCover}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.songCoverImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[DS.colors.tint, "#FFFFFF"]}
                style={styles.songCoverFallback}
              >
                <Icon source="music-note" size={28} color={DS.colors.primary} />
              </LinearGradient>
            )}

            <View style={styles.songOrderBadge}>
              <Text style={styles.songOrderText}>{song.order || index + 1}</Text>
            </View>
          </View>

          <View style={styles.songInfo}>
            <View style={styles.songTitleLine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {song.title}
                </Text>

                {!!song.artist && (
                  <Text numberOfLines={1} style={styles.songArtist}>
                    {song.artist}
                  </Text>
                )}
              </View>

              {onRemove ? (
                <IconButton
                  icon="trash-can-outline"
                  size={19}
                  iconColor={DS.colors.danger}
                  onPress={() => onRemove(song.id)}
                  style={styles.deleteSongButton}
                />
              ) : null}
            </View>

            <View style={styles.songMiniChips}>
              {!!song.tone && (
                <View style={styles.toneChip}>
                  <Icon
                    source="music-clef-treble"
                    size={12}
                    color={DS.colors.primary}
                  />

                  <Text style={styles.toneChipText}>Tom {song.tone}</Text>
                </View>
              )}

              <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                <Icon source={status.icon} size={13} color={status.color} />

                <Text style={[styles.statusChipText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {!!song.notes && (
              <Text numberOfLines={2} style={styles.songNotes}>
                {song.notes}
              </Text>
            )}

            <View style={styles.songActions}>
              {mainLink ? (
                <Button
                  mode="contained-tonal"
                  compact
                  icon="open-in-new"
                  onPress={() => onOpenUrl(mainLink.url)}
                  style={styles.linkButton}
                  labelStyle={styles.linkButtonLabel}
                  buttonColor={DS.colors.tint}
                  textColor={DS.colors.primary}
                >
                  {mainLink.label || "Abrir link"}
                </Button>
              ) : (
                <Text style={styles.noLinkText}>Sem link</Text>
              )}

              {(song.links || []).length > 1 ? (
                <Text style={styles.extraLinksText}>
                  +{(song.links || []).length - 1} links
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Surface>
  );
}

export default function RepertoireDetailScreen({ navigation, route }: Props) {
  const { churchId, repertoireId, readOnly = false } = route.params;

  const [data, setData] = useState<Repertoire | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [songModalOpen, setSongModalOpen] = useState(false);
  const [tonePickerOpen, setTonePickerOpen] = useState(false);
  const [savingSong, setSavingSong] = useState(false);

  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songTone, setSongTone] = useState("");
  const [songNotes, setSongNotes] = useState("");
  const [songStatus, setSongStatus] =
    useState<RepertoireSongStatus>("CONFIRMED");

  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const load = useCallback(async () => {
    const response = await repertoiresService.getOne(churchId, repertoireId);
    setData(response);
  }, [churchId, repertoireId]);

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        setLoading(true);

        const response = await repertoiresService.getOne(
          churchId,
          repertoireId,
        );

        if (mounted) {
          setData(response);
        }
      } catch (error: any) {
        console.log("Erro ao carregar repertório:", {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });

        Alert.alert(
          "Erro ao carregar",
          error?.response?.data?.message ||
            "Não foi possível carregar o repertório.",
        );
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
  }, [churchId, repertoireId]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const songStats = useMemo(() => {
    const songs = data?.songs || [];

    return {
      total: songs.length,
      confirmed: songs.filter((s) => s.status === "CONFIRMED").length,
      studying: songs.filter((s) => s.status === "STUDYING").length,
    };
  }, [data?.songs]);

  const resetSongForm = () => {
    setSongTitle("");
    setSongArtist("");
    setSongTone("");
    setTonePickerOpen(false);
    setSongNotes("");
    setSongStatus("CONFIRMED");
    setLinkLabel("");
    setLinkUrl("");
  };

  const openAddSongModal = () => {
    resetSongForm();
    setSongModalOpen(true);
  };

  const closeAddSongModal = () => {
    if (savingSong) return;

    setSongModalOpen(false);
    setTonePickerOpen(false);
    resetSongForm();
  };

  const saveSong = async () => {
    const cleanTitle = songTitle.trim();

    if (!cleanTitle) {
      Alert.alert("Campo obrigatório", "Informe o nome da música.");
      return;
    }

    const cleanUrl = linkUrl.trim();

    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
      Alert.alert(
        "Link inválido",
        "Informe um link começando com http:// ou https://.",
      );
      return;
    }

    try {
      setSavingSong(true);

      const links = cleanUrl
        ? [
            {
              label: linkLabel.trim() || "Link",
              url: cleanUrl,
            },
          ]
        : [];

      await repertoiresService.addSong(churchId, repertoireId, {
        title: cleanTitle,
        artist: songArtist.trim() || undefined,
        tone: songTone || undefined,
        notes: songNotes.trim() || undefined,
        status: songStatus,
        links,
      });

      await load();

      setSongModalOpen(false);
      resetSongForm();
    } catch (error: any) {
      console.log("Erro ao adicionar música:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
        payload: error?.config?.data,
      });

      const backendMessage = error?.response?.data?.message;

      Alert.alert(
        "Erro ao adicionar música",
        Array.isArray(backendMessage)
          ? backendMessage.join("\n")
          : backendMessage || "Não foi possível adicionar a música.",
      );
    } finally {
      setSavingSong(false);
    }
  };

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert("Link inválido", "Não foi possível abrir este link.");
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert("Erro", "Não foi possível abrir este link.");
    }
  };

  const removeRepertoire = () => {
    Alert.alert(
      "Excluir repertório",
      "Tem certeza que deseja excluir este repertório?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await repertoiresService.remove(churchId, repertoireId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const removeSong = (songId: string) => {
    Alert.alert(
      "Remover música",
      "Tem certeza que deseja remover esta música do repertório?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              await repertoiresService.removeSong(
                churchId,
                repertoireId,
                songId,
              );

              await load();
            } catch (error: any) {
              Alert.alert(
                "Erro ao remover",
                error?.response?.data?.message ||
                  "Não foi possível remover a música.",
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingIconWrap}>
          <ActivityIndicator color={DS.colors.primary} />
        </View>

        <Text style={styles.loadingTitle}>Carregando repertório...</Text>

        <Text style={styles.loadingDescription}>
          Buscando músicas, tons e links de estudo.
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.emptyIconLarge}>
          <Icon source="music-off" size={34} color={DS.colors.primary} />
        </View>

        <Text style={styles.loadingTitle}>Repertório não encontrado</Text>

        <Text style={styles.loadingDescription}>
          Não foi possível localizar este repertório.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.root}>
        <View style={styles.bgBlobOne} pointerEvents="none" />
        <View style={styles.bgBlobTwo} pointerEvents="none" />

        <ScrollView
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[DS.colors.primary]}
              tintColor={DS.colors.primary}
            />
          }
        >
          <LinearGradient
            colors={[DS.colors.primaryDark, DS.colors.primary, DS.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroGlow} />

            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Icon source="playlist-music" size={24} color="#fff" />
              </View>

              {!readOnly ? (
                <View style={styles.heroActions}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    iconColor="#fff"
                    onPress={() =>
                      navigation.push("RepertoireForm", {
                        churchId,
                        repertoireId,
                        mode: "edit",
                      })
                    }
                    style={styles.heroIconButton}
                  />
                </View>
              ) : null}
            </View>

            <Text style={styles.heroEyebrow}>Repertório</Text>

            <Text numberOfLines={2} style={styles.heroTitle}>
              {data.title}
            </Text>

            {!!data.description && (
              <Text numberOfLines={3} style={styles.heroDescription}>
                {data.description}
              </Text>
            )}

            <View style={styles.heroChips}>
              <ModernChip
                icon={getVisibilityIcon(data.visibility)}
                label={getVisibilityLabel(data.visibility)}
                color="#FFFFFF"
              />

              <ModernChip
                icon="progress-check"
                label={getRepertoireStatusLabel(data.status)}
                color="#FFFFFF"
              />

              {data.allowAssignedMembers ? (
                <ModernChip
                  icon="account-check-outline"
                  label="Escalados"
                  color="#FFFFFF"
                />
              ) : null}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{songStats.total}</Text>
                <Text style={styles.statLabel}>músicas</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{songStats.confirmed}</Text>
                <Text style={styles.statLabel}>confirmadas</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{songStats.studying}</Text>
                <Text style={styles.statLabel}>estudando</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Músicas</Text>

              <Text style={styles.sectionSubtitle}>
                Tons, links e observações do repertório.
              </Text>
            </View>

            {!readOnly ? (
              <Button
                mode="contained-tonal"
                icon="plus"
                onPress={openAddSongModal}
                style={styles.newButton}
                buttonColor={DS.colors.tint}
                textColor={DS.colors.primary}
              >
                Música
              </Button>
            ) : null}
          </View>

          {(data.songs || []).length === 0 ? (
            <Surface elevation={0} style={styles.emptyCard}>
              <View style={styles.emptyIconLarge}>
                <Icon
                  source="playlist-music-outline"
                  size={34}
                  color={DS.colors.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>Nenhuma música adicionada</Text>

              <Text style={styles.emptyDescription}>
                Adicione músicas, tons, links do YouTube e observações para
                preparar este repertório.
              </Text>

              {!readOnly ? (
                <Button
                  mode="contained"
                  icon="plus"
                  onPress={openAddSongModal}
                  style={styles.emptyButton}
                  contentStyle={{ height: 48 }}
                  buttonColor={DS.colors.primary}
                  textColor="#fff"
                >
                  Adicionar música
                </Button>
              ) : null}
            </Surface>
          ) : (
            (data.songs || []).map((song, index) => (
              <SongCompactCard
                key={song.id}
                song={song}
                index={index}
                onOpenUrl={openUrl}
                onRemove={readOnly ? undefined : removeSong}
              />
            ))
          )}

          {!readOnly ? (
            <Surface elevation={0} style={styles.dangerCard}>
              <View style={styles.dangerInfo}>
                <View style={styles.dangerIcon}>
                  <Icon
                    source="trash-can-outline"
                    size={22}
                    color={DS.colors.danger}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.dangerTitle}>Excluir repertório</Text>

                  <Text style={styles.dangerText}>
                    Remove o repertório e suas músicas vinculadas.
                  </Text>
                </View>
              </View>

              <Button
                mode="outlined"
                textColor={DS.colors.danger}
                onPress={removeRepertoire}
                style={styles.deleteButton}
              >
                Excluir
              </Button>
            </Surface>
          ) : null}

          <View style={{ height: 84 }} />
        </ScrollView>

        {!readOnly ? (
          <FAB
            icon="plus"
            label="Música"
            onPress={openAddSongModal}
            style={styles.fab}
            color="#fff"
          />
        ) : null}
      </View>

      <Portal>
        <Modal
          visible={songModalOpen}
          onDismiss={closeAddSongModal}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface elevation={0} style={styles.modalSurface}>
            <View style={styles.modalGrabber} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Adicionar música</Text>

                <Text style={styles.modalSubtitle}>
                  Informe a música, tom e link de estudo.
                </Text>
              </View>

              <IconButton
                icon="close"
                onPress={closeAddSongModal}
                disabled={savingSong}
                iconColor={DS.colors.muted}
              />
            </View>

            <Divider style={{ backgroundColor: DS.colors.outline }} />

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                label="Nome da música"
                value={songTitle}
                onChangeText={setSongTitle}
                mode="outlined"
                left={<TextInput.Icon icon="music-note-outline" />}
                outlineColor={DS.colors.outline}
                activeOutlineColor={DS.colors.primary}
                style={{ backgroundColor: DS.colors.surfaceSoft }}
              />

              <TextInput
                label="Cantor/Banda/Ministério"
                value={songArtist}
                onChangeText={setSongArtist}
                mode="outlined"
                left={<TextInput.Icon icon="account-music-outline" />}
                outlineColor={DS.colors.outline}
                activeOutlineColor={DS.colors.primary}
                style={{ backgroundColor: DS.colors.surfaceSoft }}
              />

              <View>
                <TextInput
                  label="Tom"
                  value={getToneLabel(songTone)}
                  mode="outlined"
                  placeholder="Selecionar tom"
                  editable={false}
                  left={<TextInput.Icon icon="music-clef-treble" />}
                  right={<TextInput.Icon icon="chevron-down" />}
                  outlineColor={DS.colors.outline}
                  activeOutlineColor={DS.colors.primary}
                  style={{ backgroundColor: DS.colors.surfaceSoft }}
                  pointerEvents="none"
                />

                <Pressable
                  onPress={() => setTonePickerOpen(true)}
                  style={styles.selectOverlay}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldGroupLabel}>Status da música</Text>

                <SegmentedButtons
                  value={songStatus}
                  onValueChange={(value) =>
                    setSongStatus(value as RepertoireSongStatus)
                  }
                  buttons={[
                    {
                      value: "CONFIRMED",
                      label: "Confirmada",
                      icon: "check-circle-outline",
                    },
                    {
                      value: "STUDYING",
                      label: "Estudando",
                      icon: "book-open-page-variant-outline",
                    },
                    {
                      value: "REMOVED",
                      label: "Removida",
                      icon: "close-circle-outline",
                    },
                  ]}
                />
              </View>

              <TextInput
                label="Observações"
                value={songNotes}
                onChangeText={setSongNotes}
                mode="outlined"
                multiline
                numberOfLines={4}
                placeholder="Ex.: repetir refrão, entrada só violão, subir tom..."
                outlineColor={DS.colors.outline}
                activeOutlineColor={DS.colors.primary}
                style={{ backgroundColor: DS.colors.surfaceSoft }}
              />

              <Divider style={styles.divider} />

              <Text style={styles.formSectionTitle}>Link de estudo</Text>

              <TextInput
                label="Nome do link"
                value={linkLabel}
                onChangeText={setLinkLabel}
                mode="outlined"
                placeholder="Ex.: YouTube, Cifra Club, Playback"
                left={<TextInput.Icon icon="tag-outline" />}
                outlineColor={DS.colors.outline}
                activeOutlineColor={DS.colors.primary}
                style={{ backgroundColor: DS.colors.surfaceSoft }}
              />

              <TextInput
                label="URL"
                value={linkUrl}
                onChangeText={setLinkUrl}
                mode="outlined"
                placeholder="https://youtube.com/..."
                autoCapitalize="none"
                keyboardType="url"
                left={<TextInput.Icon icon="link-variant" />}
                outlineColor={DS.colors.outline}
                activeOutlineColor={DS.colors.primary}
                style={{ backgroundColor: DS.colors.surfaceSoft }}
              />

              <Button
                mode="contained"
                icon="check"
                onPress={saveSong}
                loading={savingSong}
                disabled={savingSong}
                buttonColor={DS.colors.primary}
                textColor="#fff"
                style={styles.saveSongButton}
                contentStyle={{ height: 50 }}
              >
                Adicionar música
              </Button>

              <Button
                mode="text"
                onPress={closeAddSongModal}
                disabled={savingSong}
              >
                Cancelar
              </Button>
            </ScrollView>
          </Surface>
        </Modal>

        <Modal
          visible={tonePickerOpen}
          onDismiss={() => setTonePickerOpen(false)}
          contentContainerStyle={styles.toneModalContainer}
        >
          <Surface elevation={0} style={styles.toneModalSurface}>
            <View style={styles.modalGrabber} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Selecionar tom</Text>

                <Text style={styles.modalSubtitle}>
                  Escolha o tom da música.
                </Text>
              </View>

              <IconButton
                icon="close"
                onPress={() => setTonePickerOpen(false)}
                iconColor={DS.colors.muted}
              />
            </View>

            <Divider style={{ backgroundColor: DS.colors.outline }} />

            <ScrollView
              contentContainerStyle={styles.toneList}
              showsVerticalScrollIndicator={false}
            >
              {TONE_OPTIONS.map((tone) => {
                const selected = songTone === tone.value;

                return (
                  <Pressable
                    key={tone.label}
                    onPress={() => {
                      setSongTone(tone.value);
                      setTonePickerOpen(false);
                    }}
                  >
                    <Surface
                      elevation={0}
                      style={[
                        styles.toneOption,
                        selected && styles.toneOptionSelected,
                      ]}
                    >
                      <View style={styles.toneOptionInfo}>
                        <View
                          style={[
                            styles.toneOptionIcon,
                            selected && styles.toneOptionIconSelected,
                          ]}
                        >
                          <Icon
                            source="music-clef-treble"
                            size={18}
                            color={selected ? "#fff" : DS.colors.primary}
                          />
                        </View>

                        <Text
                          style={[
                            styles.toneOptionText,
                            selected && styles.toneOptionTextSelected,
                          ]}
                        >
                          {tone.label}
                        </Text>
                      </View>

                      {selected ? (
                        <Icon
                          source="check-circle"
                          size={22}
                          color={DS.colors.primary}
                        />
                      ) : null}
                    </Surface>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>
    </>
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

  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },

  hero: {
    borderRadius: 24,
    padding: 16,
    overflow: "hidden",
    marginBottom: 8,
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

  heroActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroIconButton: {
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

  heroChips: {
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

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
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

  songCard: {
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.surface,
    borderWidth: 1,
    overflow: "hidden",
  },

  songTopAccent: {
    height: 5,
    width: "100%",
  },

  songCardContent: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },

  songRow: {
    flexDirection: "row",
    gap: 12,
  },

  songCover: {
    width: 94,
    height: 76,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: DS.colors.tint,
  },

  songCoverImage: {
    width: "100%",
    height: "100%",
  },

  songCoverFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  songOrderBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },

  songOrderText: {
    fontSize: 12,
    fontWeight: "900",
    color: DS.colors.text,
  },

  songInfo: {
    flex: 1,
    minHeight: 76,
  },

  songTitleLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },

  songTitle: {
    color: DS.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },

  songArtist: {
    color: DS.colors.muted,
    marginTop: 2,
    fontSize: 13,
  },

  deleteSongButton: {
    margin: -8,
  },

  songMiniChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },

  toneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: DS.colors.tint,
  },

  toneChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: DS.colors.primary,
  },

  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusChipText: {
    fontSize: 12,
    fontWeight: "800",
  },

  songNotes: {
    color: DS.colors.muted,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },

  songActions: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  linkButton: {
    borderRadius: 999,
  },

  linkButtonLabel: {
    fontSize: 12.5,
    fontWeight: "800",
  },

  noLinkText: {
    color: DS.colors.muted,
    fontSize: 12,
    fontStyle: "italic",
  },

  extraLinksText: {
    color: DS.colors.muted,
    fontSize: 12,
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

  dangerCard: {
    borderRadius: DS.radius.lg,
    backgroundColor: "#FFF7F7",
    borderWidth: 1,
    borderColor: "#FFD6D6",
    padding: 14,
    marginTop: 8,
  },

  dangerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  dangerIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFEAEA",
    alignItems: "center",
    justifyContent: "center",
  },

  dangerTitle: {
    color: DS.colors.danger,
    fontWeight: "900",
    fontSize: 15,
  },

  dangerText: {
    color: DS.colors.muted,
    marginTop: 2,
    lineHeight: 19,
    fontSize: 13,
  },

  deleteButton: {
    marginTop: 12,
    borderRadius: 999,
    borderColor: "#FFD6D6",
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    borderRadius: 18,
    backgroundColor: DS.colors.primary,
  },

  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalSurface: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    borderWidth: 1,
    borderColor: DS.colors.outline,
  },

  modalGrabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: DS.colors.outline,
    marginTop: 10,
  },

  modalHeader: {
    padding: 16,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: DS.colors.text,
  },

  modalSubtitle: {
    color: DS.colors.muted,
    marginTop: 2,
    fontSize: 14,
  },

  modalContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },

  fieldGroup: {
    gap: 10,
  },

  fieldGroupLabel: {
    fontWeight: "800",
    color: DS.colors.text,
  },

  formSectionTitle: {
    color: DS.colors.text,
    fontSize: 17,
    fontWeight: "900",
  },

  divider: {
    marginVertical: 14,
  },

  saveSongButton: {
    marginTop: 8,
    borderRadius: 18,
  },

  selectOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  toneModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  toneModalSurface: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "82%",
    borderWidth: 1,
    borderColor: DS.colors.outline,
  },

  toneList: {
    padding: 16,
    paddingBottom: 28,
    gap: 8,
  },

  toneOption: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DS.colors.outline,
    backgroundColor: DS.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  toneOptionSelected: {
    borderColor: DS.colors.primary,
    backgroundColor: DS.colors.tint,
  },

  toneOptionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  toneOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.colors.tint,
  },

  toneOptionIconSelected: {
    backgroundColor: DS.colors.primary,
  },

  toneOptionText: {
    color: DS.colors.text,
    fontSize: 15,
    fontWeight: "800",
  },

  toneOptionTextSelected: {
    color: DS.colors.primary,
  },
});
