// src/screens/repertoires/RepertoireFormScreen.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import {
  ActivityIndicator,
  Button,
  Divider,
  Icon,
  IconButton,
  Modal,
  Portal,
  SegmentedButtons,
  Surface,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";

import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { repertoiresService } from "../../services/repertoiresService";
import type {
  Repertoire,
  RepertoireSongStatus,
  RepertoireStatus,
  RepertoireVisibility,
} from "../../types/repertoire";

type Props = {
  navigation: any;
  route: {
    params?: {
      churchId?: string;
      repertoireId?: string;
      ministryId?: string;
      eventId?: string;
      scheduleId?: string;
      mode?: "create" | "edit";
    };
  };
};

type MinistryOption = {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
};

type DraftSong = {
  tempId: string;
  title: string;
  artist?: string;
  tone?: string;
  notes?: string;
  status: RepertoireSongStatus;
  linkLabel?: string;
  linkUrl?: string;
};

const BRAND = {
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

function getToneLabel(value?: string) {
  const tone = TONE_OPTIONS.find((item) => item.value === value);

  return tone?.label || value || "";
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

function normalizeMinistry(ministry: any): MinistryOption {
  if (!ministry) {
    return {
      id: "",
      name: "Ministério",
      color: null,
      icon: null,
      description: null,
    };
  }

  return {
    id: ministry.id,
    name: ministry.name ?? "Ministério",
    color: ministry.color ?? null,
    icon: ministry.icon ?? null,
    description: ministry.description ?? null,
  };
}

function getVisibilityLabel(value: RepertoireVisibility) {
  switch (value) {
    case "ALL":
      return "Toda a igreja";
    case "PRIVATE":
      return "Somente eu";
    case "MINISTRY":
      return "Ministérios";
    default:
      return value;
  }
}

function getVisibilityIcon(value: RepertoireVisibility) {
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

function getVisibilityColor(value: RepertoireVisibility) {
  switch (value) {
    case "ALL":
      return BRAND.success;
    case "PRIVATE":
      return BRAND.purple;
    case "MINISTRY":
      return BRAND.primary;
    default:
      return BRAND.primary;
  }
}

function getStatusLabel(value: RepertoireStatus) {
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

function getSongStatusLabel(value: RepertoireSongStatus) {
  switch (value) {
    case "CONFIRMED":
      return "Confirmada";
    case "STUDYING":
      return "Estudando";
    case "REMOVED":
      return "Removida";
    default:
      return value;
  }
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

function SelectField({
  label,
  value,
  placeholder,
  leftIcon,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  leftIcon?: string;
  onPress: () => void;
}) {
  return (
    <View>
      <TextInput
        mode="outlined"
        label={label}
        value={value || ""}
        placeholder={placeholder}
        editable={false}
        left={
          leftIcon ? (
            <TextInput.Icon icon={leftIcon} color={BRAND.muted} />
          ) : undefined
        }
        right={<TextInput.Icon icon="chevron-down" color={BRAND.muted} />}
        pointerEvents="none"
        outlineColor={BRAND.outline}
        activeOutlineColor={BRAND.primary}
        textColor={BRAND.text}
        placeholderTextColor={BRAND.muted}
        style={styles.input}
        outlineStyle={styles.inputOutline}
      />

      <Pressable onPress={onPress} style={styles.selectOverlay} />
    </View>
  );
}

function BottomSheet({
  visible,
  onDismiss,
  title,
  subtitle,
  children,
  rightAction,
}: {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface elevation={0} style={styles.sheetSurface}>
          <View style={styles.sheetGrabberWrap}>
            <View style={styles.sheetGrabber} />
          </View>

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>{title}</Text>

              {subtitle ? (
                <Text style={styles.sheetSubtitle}>{subtitle}</Text>
              ) : null}
            </View>

            <View style={styles.sheetActions}>
              {rightAction}

              <IconButton
                icon="close"
                onPress={onDismiss}
                iconColor={BRAND.muted}
              />
            </View>
          </View>

          <Divider style={{ backgroundColor: BRAND.outline }} />

          <View style={styles.sheetContent}>{children}</View>
        </Surface>
      </Modal>
    </Portal>
  );
}

export default function RepertoireFormScreen({ navigation, route }: Props) {
  const auth = useAuth();
  const routeParams = route.params || {};

  const churchId = useMemo(
    () => getActiveChurchId(auth, routeParams.churchId),
    [auth, routeParams.churchId],
  );

  const { repertoireId, ministryId, eventId, scheduleId, mode } = routeParams;

  const isEdit = mode === "edit" && !!repertoireId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [visibility, setVisibility] =
    useState<RepertoireVisibility>("PRIVATE");

  const [status, setStatus] = useState<RepertoireStatus>("DRAFT");

  const [allowAssignedMembers, setAllowAssignedMembers] = useState(true);

  const [visibilityPickerOpen, setVisibilityPickerOpen] = useState(false);

  const [visibilityMinistries, setVisibilityMinistries] = useState<
    MinistryOption[]
  >([]);

  const [ministryQuery, setMinistryQuery] = useState("");
  const [ministries, setMinistries] = useState<MinistryOption[]>([]);
  const [ministriesLoading, setMinistriesLoading] = useState(false);

  const [songs, setSongs] = useState<DraftSong[]>([]);
  const [songModalOpen, setSongModalOpen] = useState(false);
  const [tonePickerOpen, setTonePickerOpen] = useState(false);

  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songTone, setSongTone] = useState("");
  const [songNotes, setSongNotes] = useState("");
  const [songStatus, setSongStatus] =
    useState<RepertoireSongStatus>("CONFIRMED");

  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const visibilitySummaryLabel = useMemo(() => {
    if (visibility === "ALL") return "Toda a igreja";
    if (visibility === "PRIVATE") return "Somente eu";

    if (!visibilityMinistries.length) {
      return "Selecionar ministérios...";
    }

    const names = visibilityMinistries
      .slice(0, 2)
      .map((m) => m.name)
      .filter(Boolean)
      .join(", ");

    return visibilityMinistries.length <= 2
      ? names
      : `${names} +${visibilityMinistries.length - 2}`;
  }, [visibility, visibilityMinistries]);

  const loadMinistries = useCallback(async () => {
    if (!churchId || !visibilityPickerOpen) return;

    try {
      setMinistriesLoading(true);

      const response = await api.get(`/churches/${churchId}/ministries`, {
        params: {
          q: ministryQuery || undefined,
          take: 200,
        },
      });

      const data = response.data;

      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];

      setMinistries(items.map(normalizeMinistry));
    } catch (error) {
      console.log("Erro ao carregar ministérios:", error);
      setMinistries([]);
    } finally {
      setMinistriesLoading(false);
    }
  }, [churchId, visibilityPickerOpen, ministryQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMinistries();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadMinistries]);

  useEffect(() => {
    let mounted = true;

    async function loadRepertoire() {
      if (!isEdit || !churchId || !repertoireId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const data: Repertoire = await repertoiresService.getOne(
          churchId,
          repertoireId,
        );

        if (!mounted) return;

        setTitle(data.title || "");
        setDescription(data.description || "");
        setVisibility(data.visibility || "PRIVATE");
        setStatus(data.status || "DRAFT");
        setAllowAssignedMembers(data.allowAssignedMembers ?? true);

        const currentVisibilityMinistries = Array.isArray(
          data.visibleToMinistries,
        )
          ? data.visibleToMinistries
              .map((item) => item.ministry)
              .filter(Boolean)
              .map(normalizeMinistry)
          : [];

        setVisibilityMinistries(currentVisibilityMinistries);
      } catch (error: any) {
        console.log("Erro ao carregar repertório:", error);

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

    loadRepertoire();

    return () => {
      mounted = false;
    };
  }, [churchId, repertoireId, isEdit]);

  const toggleVisibilityMinistry = (ministry: MinistryOption) => {
    setVisibilityMinistries((prev) => {
      const exists = prev.some((item) => item.id === ministry.id);

      if (exists) {
        return prev.filter((item) => item.id !== ministry.id);
      }

      return [...prev, ministry];
    });
  };

  const resetSongForm = () => {
    setSongTitle("");
    setSongArtist("");
    setSongTone("");
    setSongNotes("");
    setSongStatus("CONFIRMED");
    setLinkLabel("");
    setLinkUrl("");
    setTonePickerOpen(false);
  };

  const openSongModal = () => {
    resetSongForm();
    setSongModalOpen(true);
  };

  const closeSongModal = () => {
    setSongModalOpen(false);
    resetSongForm();
  };

  const addDraftSong = () => {
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

    const newSong: DraftSong = {
      tempId: `${Date.now()}-${Math.random()}`,
      title: cleanTitle,
      artist: songArtist.trim() || undefined,
      tone: songTone || undefined,
      notes: songNotes.trim() || undefined,
      status: songStatus,
      linkLabel: linkLabel.trim() || undefined,
      linkUrl: cleanUrl || undefined,
    };

    setSongs((prev) => [...prev, newSong]);
    setSongModalOpen(false);
    resetSongForm();
  };

  const removeDraftSong = (tempId: string) => {
    setSongs((prev) => prev.filter((song) => song.tempId !== tempId));
  };

  const save = async () => {
    if (!churchId) {
      Alert.alert(
        "Igreja ativa não encontrada",
        "Selecione uma igreja ativa para criar o repertório.",
      );
      return;
    }

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      Alert.alert("Campo obrigatório", "Informe o nome do repertório.");
      return;
    }

    if (visibility === "MINISTRY" && visibilityMinistries.length === 0) {
      Alert.alert(
        "Visibilidade restrita",
        "Selecione pelo menos um ministério para visualizar este repertório.",
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: cleanTitle,
        description: description.trim() || undefined,
        visibility,
        status,
        ministryId,
        eventId,
        scheduleId,
        allowAssignedMembers,
        ministryVisibilityIds:
          visibility === "MINISTRY"
            ? visibilityMinistries.map((m) => m.id)
            : undefined,
        songs:
          !isEdit && songs.length > 0
            ? songs.map((song, index) => ({
                order: index + 1,
                title: song.title,
                artist: song.artist,
                tone: song.tone,
                notes: song.notes,
                status: song.status,
                links: song.linkUrl
                  ? [
                      {
                        label: song.linkLabel || "Link",
                        url: song.linkUrl,
                      },
                    ]
                  : [],
              }))
            : undefined,
      };

      let saved: Repertoire;

      if (isEdit && repertoireId) {
        saved = await repertoiresService.update(
          churchId,
          repertoireId,
          payload,
        );
      } else {
        saved = await repertoiresService.create(churchId, payload);
      }

      navigation.replace("RepertoireDetail", {
        churchId,
        repertoireId: saved.id,
      });
    } catch (error: any) {
      console.log("Erro ao salvar repertório:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
        method: error?.config?.method,
        payload: error?.config?.data,
      });

      const backendMessage = error?.response?.data?.message;

      Alert.alert(
        "Erro ao salvar",
        Array.isArray(backendMessage)
          ? backendMessage.join("\n")
          : backendMessage || "Não foi possível salvar o repertório.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingIconWrap}>
          <ActivityIndicator color={BRAND.primary} />
        </View>

        <Text style={styles.loadingTitle}>Carregando repertório...</Text>

        <Text style={styles.loadingDescription}>
          Buscando dados, visibilidade e permissões.
        </Text>
      </View>
    );
  }

  if (!churchId) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.emptyIconLarge}>
          <Icon source="church" size={34} color={BRAND.primary} />
        </View>

        <Text style={styles.loadingTitle}>Igreja ativa não encontrada</Text>

        <Text style={styles.loadingDescription}>
          Selecione uma igreja ativa para criar ou editar repertórios.
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
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={[BRAND.primaryDark, BRAND.primary, BRAND.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlow} />

            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Icon
                  source={isEdit ? "playlist-edit" : "playlist-plus"}
                  size={24}
                  color="#fff"
                />
              </View>

              <IconButton
                icon="close"
                size={20}
                iconColor="#fff"
                onPress={() => navigation.goBack()}
                style={styles.heroCloseButton}
              />
            </View>

            <Text style={styles.heroEyebrow}>
              {isEdit ? "Editar repertório" : "Novo repertório"}
            </Text>

            <Text style={styles.heroTitle}>
              {isEdit ? "Atualizar repertório" : "Criar repertório"}
            </Text>

            <Text style={styles.heroDescription}>
              Defina nome, status, visibilidade e quem poderá acessar.
            </Text>

            <View style={styles.heroChips}>
              <ModernChip
                icon={getVisibilityIcon(visibility)}
                label={getVisibilityLabel(visibility)}
                color="#FFFFFF"
              />

              <ModernChip
                icon="progress-check"
                label={getStatusLabel(status)}
                color="#FFFFFF"
              />

              {!isEdit && songs.length > 0 ? (
                <ModernChip
                  icon="music-note-outline"
                  label={`${songs.length} ${
                    songs.length === 1 ? "música" : "músicas"
                  }`}
                  color="#FFFFFF"
                />
              ) : null}
            </View>
          </LinearGradient>

          <Surface elevation={0} style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderIcon}>
                <Icon
                  source="music-box-multiple-outline"
                  size={22}
                  color={BRAND.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.formTitle}>Informações principais</Text>

                <Text style={styles.formSubtitle}>
                  Dados básicos do repertório.
                </Text>
              </View>
            </View>

            <View style={styles.form}>
              <TextInput
                label="Nome do repertório"
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                left={<TextInput.Icon icon="playlist-music-outline" />}
                outlineColor={BRAND.outline}
                activeOutlineColor={BRAND.primary}
                style={styles.input}
              />

              <TextInput
                label="Descrição"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={4}
                left={<TextInput.Icon icon="text-box-outline" />}
                outlineColor={BRAND.outline}
                activeOutlineColor={BRAND.primary}
                style={styles.input}
              />
            </View>
          </Surface>

          <Surface elevation={0} style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderIcon}>
                <Icon source="eye-outline" size={22} color={BRAND.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.formTitle}>Visibilidade</Text>

                <Text style={styles.formSubtitle}>
                  Escolha quem poderá visualizar este repertório.
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <SelectField
                label="Quem pode ver"
                value={visibilitySummaryLabel}
                placeholder="Somente eu"
                leftIcon="eye-outline"
                onPress={() => setVisibilityPickerOpen(true)}
              />

              {visibility === "MINISTRY" &&
              visibilityMinistries.length > 0 ? (
                <View style={styles.selectedMinistries}>
                  {visibilityMinistries.map((m) => (
                    <Surface
                      key={m.id}
                      elevation={0}
                      style={styles.ministryRow}
                    >
                      <View style={styles.ministryInfo}>
                        <View
                          style={[
                            styles.ministryIcon,
                            {
                              backgroundColor: m.color || BRAND.primary,
                            },
                          ]}
                        >
                          <Icon
                            source={m.icon || "layers-outline"}
                            size={16}
                            color="#fff"
                          />
                        </View>

                        <Text style={styles.ministryName}>{m.name}</Text>
                      </View>

                      <IconButton
                        icon="close"
                        onPress={() =>
                          setVisibilityMinistries((prev) =>
                            prev.filter((x) => x.id !== m.id),
                          )
                        }
                        iconColor={BRAND.muted}
                      />
                    </Surface>
                  ))}
                </View>
              ) : null}

              {visibility === "MINISTRY" &&
              visibilityMinistries.length === 0 ? (
                <Text style={styles.validationText}>
                  Selecione pelo menos um ministério para restringir a
                  visibilidade.
                </Text>
              ) : null}
            </View>
          </Surface>

          <Surface elevation={0} style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderIcon}>
                <Icon source="progress-check" size={22} color={BRAND.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.formTitle}>Status e acesso</Text>

                <Text style={styles.formSubtitle}>
                  Controle o andamento e o acesso dos escalados.
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <SegmentedButtons
                value={status}
                onValueChange={(value) => setStatus(value as RepertoireStatus)}
                buttons={[
                  {
                    value: "DRAFT",
                    label: "Rascunho",
                  },
                  {
                    value: "IN_PROGRESS",
                    label: "Definição",
                  },
                  {
                    value: "CONFIRMED",
                    label: "Confirmado",
                  },
                ]}
              />

              <Surface elevation={0} style={styles.switchCard}>
                <View style={styles.switchText}>
                  <Text style={styles.switchTitle}>
                    Permitir acesso aos escalados
                  </Text>

                  <Text style={styles.switchSubtitle}>
                    Pessoas escaladas no evento ou ensaio poderão visualizar o
                    repertório.
                  </Text>
                </View>

                <Switch
                  value={allowAssignedMembers}
                  onValueChange={setAllowAssignedMembers}
                />
              </Surface>
            </View>
          </Surface>

          {!isEdit ? (
            <Surface elevation={0} style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formHeaderIcon}>
                  <Icon
                    source="playlist-music-outline"
                    size={22}
                    color={BRAND.primary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formTitle}>Músicas do repertório</Text>

                  <Text style={styles.formSubtitle}>
                    Adicione músicas, tons e links antes de criar.
                  </Text>
                </View>

                <Button
                  mode="contained-tonal"
                  icon="plus"
                  onPress={openSongModal}
                  buttonColor={BRAND.tint}
                  textColor={BRAND.primary}
                  style={styles.addSongButton}
                >
                  Música
                </Button>
              </View>

              {songs.length === 0 ? (
                <Surface elevation={0} style={styles.emptySongsCard}>
                  <Icon source="music-note-plus" size={30} color={BRAND.primary} />

                  <Text style={styles.emptySongsTitle}>
                    Nenhuma música adicionada
                  </Text>

                  <Text style={styles.emptySongsText}>
                    Você pode criar o repertório já com as músicas, tons e links
                    de estudo.
                  </Text>

                  <Button
                    mode="contained"
                    icon="plus"
                    onPress={openSongModal}
                    buttonColor={BRAND.primary}
                    textColor="#fff"
                    style={styles.emptySongsButton}
                  >
                    Adicionar música
                  </Button>
                </Surface>
              ) : (
                <View style={styles.draftSongsList}>
                  {songs.map((song, index) => (
                    <Surface
                      key={song.tempId}
                      elevation={0}
                      style={styles.draftSongCard}
                    >
                      <View style={styles.draftSongOrder}>
                        <Text style={styles.draftSongOrderText}>
                          {index + 1}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={styles.draftSongTitle}>
                          {song.title}
                        </Text>

                        {!!song.artist && (
                          <Text
                            numberOfLines={1}
                            style={styles.draftSongSubtitle}
                          >
                            {song.artist}
                          </Text>
                        )}

                        <View style={styles.draftSongChips}>
                          {!!song.tone && (
                            <View style={styles.draftSongChip}>
                              <Icon
                                source="music-clef-treble"
                                size={12}
                                color={BRAND.primary}
                              />

                              <Text style={styles.draftSongChipText}>
                                Tom {song.tone}
                              </Text>
                            </View>
                          )}

                          <View style={styles.draftSongChip}>
                            <Icon
                              source="progress-check"
                              size={12}
                              color={BRAND.primary}
                            />

                            <Text style={styles.draftSongChipText}>
                              {getSongStatusLabel(song.status)}
                            </Text>
                          </View>

                          {!!song.linkUrl && (
                            <View style={styles.draftSongChip}>
                              <Icon
                                source="link-variant"
                                size={12}
                                color={BRAND.primary}
                              />

                              <Text style={styles.draftSongChipText}>Link</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <IconButton
                        icon="trash-can-outline"
                        size={20}
                        iconColor={BRAND.danger}
                        onPress={() => removeDraftSong(song.tempId)}
                      />
                    </Surface>
                  ))}
                </View>
              )}
            </Surface>
          ) : null}

          <Button
            mode="contained"
            onPress={save}
            loading={saving}
            disabled={saving}
            buttonColor={BRAND.primary}
            textColor="#fff"
            style={styles.saveButton}
            contentStyle={{ height: 54 }}
          >
            {isEdit ? "Salvar alterações" : "Criar repertório"}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            textColor={BRAND.primary}
          >
            Cancelar
          </Button>
        </ScrollView>
      </View>

      <BottomSheet
        visible={visibilityPickerOpen}
        onDismiss={() => setVisibilityPickerOpen(false)}
        title="Visibilidade"
        subtitle="Quem pode ver este repertório?"
        rightAction={
          <Button
            mode="contained"
            onPress={() => setVisibilityPickerOpen(false)}
            style={{ borderRadius: 16 }}
            buttonColor={BRAND.primary}
            textColor="#fff"
          >
            OK
          </Button>
        }
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {[
            {
              value: "ALL",
              icon: "earth",
              color: BRAND.success,
              label: "Toda a igreja",
              desc: "Qualquer membro ativo poderá ver",
            },
            {
              value: "PRIVATE",
              icon: "lock-outline",
              color: BRAND.purple,
              label: "Somente eu",
              desc: "Apenas o criador poderá ver",
            },
            {
              value: "MINISTRY",
              icon: "account-group-outline",
              color: BRAND.primary,
              label: "Selecionar ministérios",
              desc: "Somente ministérios escolhidos",
            },
          ].map((opt) => {
            const selected = visibility === opt.value;

            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  const nextVisibility = opt.value as RepertoireVisibility;

                  setVisibility(nextVisibility);

                  if (nextVisibility !== "MINISTRY") {
                    setVisibilityMinistries([]);
                    setVisibilityPickerOpen(false);
                  }
                }}
              >
                <Surface
                  elevation={0}
                  style={[
                    styles.sheetRow,
                    {
                      borderColor: selected ? opt.color : BRAND.outline,
                      backgroundColor: selected
                        ? withAlpha(opt.color, "12")
                        : BRAND.surface,
                    },
                  ]}
                >
                  <View style={styles.optionInfo}>
                    <View
                      style={[
                        styles.optionIcon,
                        {
                          backgroundColor: opt.color,
                        },
                      ]}
                    >
                      <Icon source={opt.icon} size={18} color="#fff" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>{opt.label}</Text>

                      <Text style={styles.optionDescription}>{opt.desc}</Text>
                    </View>
                  </View>

                  {selected ? (
                    <Icon
                      source="check-circle"
                      size={22}
                      color={opt.color}
                    />
                  ) : null}
                </Surface>
              </Pressable>
            );
          })}

          {visibility === "MINISTRY" ? (
            <>
              <TextInput
                mode="outlined"
                value={ministryQuery}
                onChangeText={setMinistryQuery}
                placeholder="Buscar ministério..."
                left={<TextInput.Icon icon="magnify" />}
                outlineColor={BRAND.outline}
                activeOutlineColor={BRAND.primary}
                style={styles.input}
              />

              {ministriesLoading ? (
                <ActivityIndicator
                  color={BRAND.primary}
                  style={{ marginTop: 16 }}
                />
              ) : ministries.length === 0 ? (
                <Surface elevation={0} style={styles.emptyMinistries}>
                  <Icon
                    source="layers-off-outline"
                    size={24}
                    color={BRAND.muted}
                  />

                  <Text style={{ color: BRAND.muted }}>
                    Nenhum ministério encontrado.
                  </Text>
                </Surface>
              ) : (
                ministries.map((m) => {
                  const selected = visibilityMinistries.some(
                    (x) => x.id === m.id,
                  );

                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => toggleVisibilityMinistry(m)}
                    >
                      <Surface
                        elevation={0}
                        style={[
                          styles.sheetRow,
                          {
                            backgroundColor: selected
                              ? withAlpha(m.color || BRAND.primary, "12")
                              : BRAND.surface,
                            borderColor: selected
                              ? m.color || BRAND.primary
                              : BRAND.outline,
                          },
                        ]}
                      >
                        <View style={styles.optionInfo}>
                          <View
                            style={[
                              styles.ministryIcon,
                              {
                                backgroundColor: m.color || BRAND.primary,
                              },
                            ]}
                          >
                            <Icon
                              source={m.icon || "layers-outline"}
                              size={18}
                              color="#fff"
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.optionTitle}>{m.name}</Text>

                            {!!m.description && (
                              <Text
                                numberOfLines={1}
                                style={styles.optionDescription}
                              >
                                {m.description}
                              </Text>
                            )}
                          </View>
                        </View>

                        {selected ? (
                          <Icon
                            source="check-circle"
                            size={22}
                            color={m.color || BRAND.primary}
                          />
                        ) : null}
                      </Surface>
                    </Pressable>
                  );
                })
              )}
            </>
          ) : null}
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={songModalOpen}
        onDismiss={closeSongModal}
        title="Adicionar música"
        subtitle="Informe música, tom, status e link de estudo."
        rightAction={
          <Button
            mode="contained"
            onPress={addDraftSong}
            style={{ borderRadius: 16 }}
            buttonColor={BRAND.primary}
            textColor="#fff"
          >
            Adicionar
          </Button>
        }
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.songSheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            label="Nome da música"
            value={songTitle}
            onChangeText={setSongTitle}
            mode="outlined"
            left={<TextInput.Icon icon="music-note-outline" />}
            outlineColor={BRAND.outline}
            activeOutlineColor={BRAND.primary}
            style={styles.input}
          />

          <TextInput
            label="Cantor/Banda/Ministério"
            value={songArtist}
            onChangeText={setSongArtist}
            mode="outlined"
            left={<TextInput.Icon icon="account-music-outline" />}
            outlineColor={BRAND.outline}
            activeOutlineColor={BRAND.primary}
            style={styles.input}
          />

          <SelectField
            label="Tom"
            value={getToneLabel(songTone)}
            placeholder="Selecionar tom"
            leftIcon="music-clef-treble"
            onPress={() => setTonePickerOpen(true)}
          />

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
                },
                {
                  value: "STUDYING",
                  label: "Estudando",
                },
                {
                  value: "REMOVED",
                  label: "Removida",
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
            outlineColor={BRAND.outline}
            activeOutlineColor={BRAND.primary}
            style={styles.input}
          />

          <Divider style={{ backgroundColor: BRAND.outline }} />

          <Text style={styles.formTitle}>Link de estudo</Text>

          <TextInput
            label="Nome do link"
            value={linkLabel}
            onChangeText={setLinkLabel}
            mode="outlined"
            placeholder="Ex.: YouTube, Cifra Club, Playback"
            left={<TextInput.Icon icon="tag-outline" />}
            outlineColor={BRAND.outline}
            activeOutlineColor={BRAND.primary}
            style={styles.input}
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
            outlineColor={BRAND.outline}
            activeOutlineColor={BRAND.primary}
            style={styles.input}
          />
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={tonePickerOpen}
        onDismiss={() => setTonePickerOpen(false)}
        title="Selecionar tom"
        subtitle="Escolha o tom da música."
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetList}
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
                    styles.sheetRow,
                    {
                      borderColor: selected ? BRAND.primary : BRAND.outline,
                      backgroundColor: selected ? BRAND.tint : BRAND.surface,
                    },
                  ]}
                >
                  <View style={styles.optionInfo}>
                    <View
                      style={[
                        styles.optionIcon,
                        {
                          backgroundColor: selected
                            ? BRAND.primary
                            : BRAND.tint,
                        },
                      ]}
                    >
                      <Icon
                        source="music-clef-treble"
                        size={18}
                        color={selected ? "#fff" : BRAND.primary}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>{tone.label}</Text>
                    </View>
                  </View>

                  {selected ? (
                    <Icon
                      source="check-circle"
                      size={22}
                      color={BRAND.primary}
                    />
                  ) : null}
                </Surface>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.background,
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
    backgroundColor: BRAND.background,
  },

  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND.tint,
    marginBottom: 16,
  },

  loadingTitle: {
    color: BRAND.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  loadingDescription: {
    color: BRAND.muted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  emptyIconLarge: {
    width: 70,
    height: 70,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND.tint,
    marginBottom: 14,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  heroCard: {
    borderRadius: 24,
    padding: 16,
    overflow: "hidden",
    marginBottom: 2,
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

  heroCloseButton: {
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

  formCard: {
    borderRadius: 22,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.outline,
    padding: 14,
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  formHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND.tint,
  },

  formTitle: {
    color: BRAND.text,
    fontSize: 16,
    fontWeight: "900",
  },

  formSubtitle: {
    color: BRAND.muted,
    fontSize: 13,
    marginTop: 2,
  },

  form: {
    gap: 14,
  },

  fieldGroup: {
    gap: 12,
  },

  fieldGroupLabel: {
    color: BRAND.text,
    fontSize: 14,
    fontWeight: "900",
  },

  input: {
    backgroundColor: BRAND.surfaceSoft,
  },

  inputOutline: {
    borderRadius: 14,
    borderWidth: 1.5,
  },

  selectOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  selectedMinistries: {
    gap: 8,
  },

  ministryRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 4,
    borderColor: BRAND.outline,
    backgroundColor: BRAND.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  ministryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  ministryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  ministryName: {
    fontWeight: "800",
    color: BRAND.text,
    flex: 1,
  },

  validationText: {
    color: BRAND.danger,
    fontSize: 13,
    lineHeight: 18,
  },

  switchCard: {
    borderRadius: 18,
    backgroundColor: BRAND.surfaceSoft,
    borderWidth: 1,
    borderColor: BRAND.outline,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  switchText: {
    flex: 1,
  },

  switchTitle: {
    color: BRAND.text,
    fontWeight: "900",
  },

  switchSubtitle: {
    color: BRAND.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },

  addSongButton: {
    borderRadius: 999,
  },

  emptySongsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.outline,
    backgroundColor: BRAND.surfaceSoft,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },

  emptySongsTitle: {
    color: BRAND.text,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },

  emptySongsText: {
    color: BRAND.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },

  emptySongsButton: {
    marginTop: 8,
    borderRadius: 16,
  },

  draftSongsList: {
    gap: 10,
  },

  draftSongCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.outline,
    backgroundColor: BRAND.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  draftSongOrder: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: BRAND.tint,
    alignItems: "center",
    justifyContent: "center",
  },

  draftSongOrderText: {
    color: BRAND.primary,
    fontWeight: "900",
  },

  draftSongTitle: {
    color: BRAND.text,
    fontSize: 15,
    fontWeight: "900",
  },

  draftSongSubtitle: {
    color: BRAND.muted,
    fontSize: 13,
    marginTop: 2,
  },

  draftSongChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },

  draftSongChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: BRAND.tint,
  },

  draftSongChipText: {
    color: BRAND.primary,
    fontSize: 11,
    fontWeight: "800",
  },

  saveButton: {
    borderRadius: 18,
    marginTop: 2,
  },

  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  sheetSurface: {
    backgroundColor: BRAND.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 16,
    height: "86%",
    borderWidth: 1,
    borderColor: BRAND.outline,
  },

  sheetGrabberWrap: {
    alignItems: "center",
    paddingBottom: 8,
  },

  sheetGrabber: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: BRAND.outline,
  },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },

  sheetTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: BRAND.text,
  },

  sheetSubtitle: {
    color: BRAND.muted,
    marginTop: 2,
    fontSize: 14,
  },

  sheetActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  sheetContent: {
    marginTop: 12,
    flex: 1,
  },

  sheetList: {
    gap: 10,
    paddingBottom: 14,
  },

  sheetRow: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderColor: BRAND.outline,
    backgroundColor: BRAND.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  optionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  optionTitle: {
    fontWeight: "900",
    color: BRAND.text,
  },

  optionDescription: {
    color: BRAND.muted,
    fontSize: 13,
    marginTop: 2,
  },

  emptyMinistries: {
    marginTop: 10,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.outline,
    backgroundColor: BRAND.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  songSheetContent: {
    gap: 14,
    paddingBottom: 24,
  },
});