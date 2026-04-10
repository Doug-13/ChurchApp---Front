import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
} from "react-native";
import {
  Card,
  Text,
  TextInput,
  Button,
  Chip,
  Avatar,
  IconButton,
  ActivityIndicator,
  Divider,
  Portal,
  Modal,
  Searchbar,
  Snackbar,
  Surface,
  Icon,
} from "react-native-paper";
import { getAuth } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ============================================================================
// Design Tokens
// ============================================================================
const DS = {
  colors: {
    primary: "#1CA7D1",
    primaryDark: "#177E9C",
    accent: "#46BCB1",

    bg: "#F5F7FB",
    card: "#FFFFFF",
    surface: "#FFFFFF",
    backgroundAlt: "#F1F4FA",

    text: "#333F42",
    textMuted: "#707D80",

    border: "#DFE1E1",
    outline: "#DFE1E1",

    tint: "#E3F7FC",
    tintBlue: "#E3F7FC",

    danger: "#F95F5C",
  },
  radius: { sm: 12, md: 14, lg: 18, card: 18, pill: 999 },
  space: (n) => n * 8,
};

// Paleta do template
const COLORS = [
  { hex: "#4F46E5", name: "Índigo" },
  { hex: "#06B6D4", name: "Ciano" },
  { hex: "#10B981", name: "Verde" },
  { hex: "#F59E0B", name: "Âmbar" },
  { hex: "#EF4444", name: "Vermelho" },
  { hex: "#8B5CF6", name: "Roxo" },
  { hex: "#EC4899", name: "Rosa" },
  { hex: "#14B8A6", name: "Teal" },
];

function withAlpha(hex, alphaHex = "22") {
  const h = String(hex || "").trim();
  if (!/^#?[0-9a-fA-F]{6}$/.test(h)) return hex;
  const clean = h.startsWith("#") ? h.slice(1) : h;
  return `#${clean}${alphaHex}`;
}

function isHttpUrl(u) {
  const s = String(u || "").trim();
  return /^https?:\/\/\S+/i.test(s);
}

// ============================================================================
// Endpoints
// ============================================================================
const ENDPOINTS = {
  createCell: () => `/cells`,

  // ✅ principal (igual seu exemplo)
  listChurchUsers: (churchId, qs) => `/churches/${encodeURIComponent(churchId)}/users?${qs}`,

  // ✅ fallback se você ainda usa members?churchId=
  listMembersFallback: (churchId, qs) => `/members?churchId=${encodeURIComponent(churchId)}&${qs}`,
};

// ============================================================================
// Fetch helper
// ============================================================================
function maskToken(t = "") {
  const s = String(t || "");
  if (!s) return "";
  return s.length > 18 ? `${s.slice(0, 8)}...${s.slice(-8)}` : "***";
}

async function authedFetch(path, { method = "GET", body, debug = false } = {}, authCtx) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE_URL}${path}`;
  const jsonBody = body ? JSON.stringify(body) : undefined;

  if (debug) {
    console.log("🌐 [authedFetch] =>", {
      method,
      url,
      auth: token ? maskToken(token) : null,
      body,
    });
  }

  const res = await fetch(url, {
    method,
    headers,
    body: jsonBody,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (debug) {
    console.log("🌐 [authedFetch] <=", {
      status: res.status,
      ok: res.ok,
      data,
    });
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `Erro ao comunicar com o servidor (${res.status}).`;

    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}


// ============================================================================
// Helpers
// ============================================================================
const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CELL_TYPES = ["Jovens", "Adultos", "Casais", "Kids", "Misto"];

function normalizeTimeInput(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  const hOnly = s.match(/^(\d{1,2})h$/);
  if (hOnly) return `${String(hOnly[1]).padStart(2, "0")}:00`;
  const onlyNum = s.match(/^(\d{1,2})$/);
  if (onlyNum) return `${String(onlyNum[1]).padStart(2, "0")}:00`;
  const hhmmLoose = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (hhmmLoose)
    return `${String(hhmmLoose[1]).padStart(2, "0")}:${String(hhmmLoose[2]).padStart(2, "0")}`;
  return raw;
}

function isValidTimeHHMM(v) {
  const s = String(v || "").trim();
  if (!s) return true;
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [hh, mm] = s.split(":").map((x) => Number(x));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function formatMeeting(day, time) {
  if (!day && !time) return null;
  if (day && time) return `${day} • ${time}`;
  return day || time;
}

function formatAddress({ street, number, neighborhood, city }) {
  const line1 = [street, number].filter(Boolean).join(", ");
  const line2 = [neighborhood, city].filter(Boolean).join(" • ");
  const s = [line1, line2].filter(Boolean).join(" — ");
  return s || null;
}

// ============================================================================
// UI Components
// ============================================================================
function SelectField({ label, value, placeholder, leftIcon, onPress, disabled }) {
  const hasValue = String(value || "").trim().length > 0;

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: DS.colors.textMuted, fontWeight: "800", fontSize: 12 }}>{label}</Text>

        <Surface
          elevation={0}
          style={[
            styles.selectWrap,
            {
              opacity: disabled ? 0.55 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View style={[styles.selectIcon, { backgroundColor: DS.colors.tint }]}>
              <Icon source={leftIcon || "chevron-down"} size={18} color={DS.colors.primaryDark} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: hasValue ? DS.colors.text : DS.colors.textMuted,
                  fontWeight: hasValue ? "900" : "700",
                }}
                numberOfLines={1}
              >
                {hasValue ? value : placeholder || "Selecionar"}
              </Text>
            </View>
          </View>

          <Icon source="chevron-down" size={22} color={DS.colors.textMuted} />
        </Surface>
      </View>
    </Pressable>
  );
}

function CascadePicker({
  visible,
  title,
  q,
  setQ,
  items,
  selectedId,
  onSelect,
  loading,
  emptyText = "Nenhum usuário encontrado.",
}) {
  if (!visible) return null;

  return (
    <Surface elevation={0} style={styles.cascadePanel}>
      <Text style={{ fontWeight: "900", color: DS.colors.text, marginBottom: 10 }}>{title}</Text>

      <Searchbar
        placeholder="Buscar..."
        value={q}
        onChangeText={setQ}
        style={styles.cascadeSearch}
        inputStyle={{ color: DS.colors.text }}
        iconColor={DS.colors.textMuted}
        placeholderTextColor={DS.colors.textMuted}
      />

      <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ color: DS.colors.textMuted }}>Carregando...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={{ padding: 14 }}>
            <Text style={{ color: DS.colors.textMuted }}>{emptyText}</Text>
          </View>
        ) : (
          items.map((u) => {
            const active = selectedId === u.id;
            const hasPhoto = !!u.photoUrl && isHttpUrl(u.photoUrl);

            return (
              <Pressable key={u.id} onPress={() => onSelect(u)} style={{ marginBottom: 10 }}>
                <Surface
                  elevation={0}
                  style={[
                    styles.cascadeRow,
                    { borderColor: active ? DS.colors.primary : DS.colors.outline },
                  ]}
                >
                  {hasPhoto ? (
                    <Avatar.Image size={40} source={{ uri: u.photoUrl }} />
                  ) : (
                    <Avatar.Text
                      size={40}
                      label={initials(u.fullName)}
                      color="#fff"
                      style={{ backgroundColor: active ? DS.colors.primary : DS.colors.textMuted }}
                    />
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "900", color: DS.colors.text }} numberOfLines={1}>
                      {u.fullName}
                    </Text>
                    <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                      {u.email || u.phone || " "}
                    </Text>
                  </View>

                  <Icon
                    source={active ? "check-circle" : "chevron-right"}
                    size={22}
                    color={active ? DS.colors.primary : DS.colors.textMuted}
                  />
                </Surface>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Surface>
  );
}

// ============================================================================
// Screen
// ============================================================================
export default function CellCreateScreen({ navigation }) {
  const authCtx = useAuth();

  const churchId =
    authCtx?.activeChurch?.id ||
    authCtx?.church?.id ||
    authCtx?.me?.activeChurchId ||
    authCtx?.user?.activeChurchId ||
    authCtx?.activeChurchId ||
    null;

  // básicos
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // reunião
  const [meetingDay, setMeetingDay] = useState("");
  const [meetingTime, setMeetingTime] = useState("");

  // campos
  const [type, setType] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");

  // ✅ TEMPLATE (foto + cor + galeria)
  const [imagesModalOpen, setImagesModalOpen] = useState(false);
  const coverInputRef = useRef(null);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [galleryInput, setGalleryInput] = useState("");
  const [galleryUrls, setGalleryUrls] = useState([]);
  const [previewCardColor, setPreviewCardColor] = useState(""); // "" = padrão do tema

  // ✅ USERS (para Líder / Vice - cascade)
  const [usersAll, setUsersAll] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [leader, setLeader] = useState(null);
  const [viceLeader, setViceLeader] = useState(null);

  const [leaderOpen, setLeaderOpen] = useState(false);
  const [viceOpen, setViceOpen] = useState(false);
  const [leaderQ, setLeaderQ] = useState("");
  const [viceQ, setViceQ] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [snack, setSnack] = useState({ visible: false, text: "" });

  // ✅ carrega usuários (sem hooks extras)
  const loadUsers = useCallback(async () => {
    if (!churchId) {
      setUsersAll([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("take", "300");

      let json;
      try {
        json = await authedFetch(ENDPOINTS.listChurchUsers(churchId, qs.toString()), {}, authCtx);
      } catch {
        json = await authedFetch(ENDPOINTS.listMembersFallback(churchId, qs.toString()), {}, authCtx);
      }

      const arr = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
          ? json
          : Array.isArray(json?.members)
            ? json.members
            : [];

      const normalized = (arr || [])
        .map((raw) => ({
          id: raw?.id,
          fullName: raw?.fullName || raw?.name || raw?.displayName || "Membro",
          email: raw?.email || null,
          phone: raw?.phone || null,
          photoUrl: raw?.photoUrl || raw?.avatarUrl || null,
          raw,
        }))
        .filter((x) => !!x.id);

      normalized.sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));
      setUsersAll(normalized);
    } catch {
      setUsersAll([]);
    } finally {
      setUsersLoading(false);
    }
  }, [churchId, authCtx]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filterUsers = useCallback((list, q) => {
    const term = String(q || "").trim().toLowerCase();
    if (!term) return list;
    return list.filter((u) => {
      const hay = [u.fullName, u.email, u.phone].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, []);

  const leaderItems = useMemo(() => filterUsers(usersAll, leaderQ), [usersAll, leaderQ, filterUsers]);

  const viceItems = useMemo(() => {
    const base = filterUsers(usersAll, viceQ);
    const leaderId = leader?.id;
    return leaderId ? base.filter((u) => u.id !== leaderId) : base;
  }, [usersAll, viceQ, filterUsers, leader]);

  const meetingLabel = useMemo(() => formatMeeting(meetingDay, meetingTime), [meetingDay, meetingTime]);

  const addressLabel = useMemo(
    () =>
      formatAddress({
        street: street.trim(),
        number: number.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
      }),
    [street, number, neighborhood, city]
  );

  // ✅ cor mais destacada, mas sem borda “fora do padrão”
  const previewBg = useMemo(() => {
    if (!previewCardColor) return DS.colors.card;
    return withAlpha(previewCardColor, "70"); // mais forte que antes
  }, [previewCardColor]);

  const previewBorder = useMemo(() => {
    if (!previewCardColor) return DS.colors.outline;
    return withAlpha(previewCardColor, "55"); // borda levemente “tint”, sem ficar gritante
  }, [previewCardColor]);

  const addGalleryUrl = useCallback(() => {
    const u = String(galleryInput || "").trim();
    if (!isHttpUrl(u)) return;
    setGalleryUrls((prev) => (prev.includes(u) ? prev : [...prev, u]));
    setGalleryInput("");
  }, [galleryInput]);

  const removeGalleryUrl = useCallback((u) => {
    setGalleryUrls((prev) => prev.filter((x) => x !== u));
  }, []);

  const canSave = useMemo(() => {
    if (!churchId) return false;

    const n = String(name || "").trim();
    if (n.length < 2) return false;

    if (!isValidTimeHHMM(meetingTime)) return false;

    if (leader?.id && viceLeader?.id && leader.id === viceLeader.id) return false;

    return true;
  }, [churchId, name, meetingTime, leader, viceLeader]);

  const onSave = useCallback(async () => {
    if (!canSave || saving) return;

    setError("");
    setSaving(true);
    try {
      const payload = {
        churchId,
        name: String(name).trim(),
        description: String(description || "").trim() || undefined,

        meetingDay: String(meetingDay || "").trim() || undefined,
        meetingTime: String(meetingTime || "").trim() || undefined,

        type: String(type || "").trim() || undefined,
        city: String(city || "").trim() || undefined,
        neighborhood: String(neighborhood || "").trim() || undefined,
        street: String(street || "").trim() || undefined,
        number: String(number || "").trim() || undefined,
        complement: String(complement || "").trim() || undefined,
        reference: String(reference || "").trim() || undefined,

        leaderUserId: leader?.id || undefined,
        viceLeaderUserId: viceLeader?.id || undefined,

        // ✅ template (ajuste nomes se o back exigir)
        photoUrl: isHttpUrl(coverImageUrl) ? coverImageUrl.trim() : undefined,
        templateColor: previewCardColor || undefined,
        galleryUrls: galleryUrls.length ? galleryUrls : undefined,
      };

      // 🔎 log mais legível (remove undefined só pro log)
      const payloadToLog = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined)
      );

      console.log("📤 [CellCreate] createCell payload =>", JSON.stringify(payloadToLog, null, 2));
      console.log("👤 [CellCreate] leader =>", leader);
      console.log("👤 [CellCreate] viceLeader =>", viceLeader);
      console.log("🆔 [CellCreate] leaderId =>", leader?.id, "| viceLeaderId =>", viceLeader?.id);
      console.log("⛪ [CellCreate] churchId =>", churchId);


      await authedFetch(
        ENDPOINTS.createCell(),
        { method: "POST", body: payload, debug: true },
        authCtx
      );

      setSnack({ visible: true, text: "Célula criada com sucesso!" });
      setTimeout(() => navigation?.goBack?.(), 450);
    } catch (e) {
      console.log("❌ [CellCreate] createCell error message =>", e?.message);
      console.log("❌ [CellCreate] createCell status =>", e?.status);
      console.log("❌ [CellCreate] createCell payload =>", e?.payload); // 👈 resposta do backend
      setError(e?.message || "Erro ao criar célula.");
    }
    finally {
      setSaving(false);
    }
  }, [
    canSave,
    saving,
    authCtx,
    churchId,
    name,
    description,
    meetingDay,
    meetingTime,
    type,
    city,
    neighborhood,
    street,
    number,
    complement,
    reference,
    leader,
    viceLeader,
    navigation,
    coverImageUrl,
    previewCardColor,
    galleryUrls,
  ]);

  const dayChips = (
    <View style={styles.dayRow}>
      {DAYS.map((d) => {
        const active = meetingDay === d;
        return (
          <Chip
            key={d}
            style={[styles.dayChip, { backgroundColor: active ? DS.colors.tintBlue : "#F1F1F1" }]}
            textStyle={{ color: active ? DS.colors.primary : DS.colors.text, fontWeight: active ? "900" : "700" }}
            onPress={() => setMeetingDay(active ? "" : d)}
          >
            {d.slice(0, 3)}
          </Chip>
        );
      })}
    </View>
  );

  const typeChips = (
    <View style={styles.dayRow}>
      {CELL_TYPES.map((t) => {
        const active = type === t;
        return (
          <Chip
            key={t}
            style={[styles.dayChip, { backgroundColor: active ? "#ECFBF9" : "#F1F1F1" }]}
            textStyle={{ color: active ? DS.colors.accent : DS.colors.text, fontWeight: active ? "900" : "700" }}
            onPress={() => setType(active ? "" : t)}
          >
            {t}
          </Chip>
        );
      })}
    </View>
  );

  const hasPhoto = isHttpUrl(coverImageUrl);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* HERO */}
          <Card style={styles.heroCard} mode="elevated">
            <Card.Content>
              <View style={styles.heroTopRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="headlineSmall" style={styles.heroTitle}>
                    Nova célula
                  </Text>
                  <Text style={styles.heroSubtitle}>Cadastre a célula com tipo, local, líderes e reunião.</Text>
                </View>

                {/* ✅ avatar no topo (estilo perfil) */}
                <Surface
                  elevation={0}
                  style={[
                    styles.heroAvatar,
                    {
                      backgroundColor: previewCardColor ? withAlpha(previewCardColor, "22") : DS.colors.tint,
                      borderColor: previewCardColor ? withAlpha(previewCardColor, "55") : DS.colors.outline,
                    },
                  ]}
                >
                  {hasPhoto ? (
                    <Image source={{ uri: coverImageUrl.trim() }} style={styles.heroAvatarImg} />
                  ) : (
                    <Icon source="image-outline" size={22} color={DS.colors.textMuted} />
                  )}
                </Surface>
              </View>

              {!!type && (
                <View style={{ marginTop: 10 }}>
                  <Chip
                    style={{ backgroundColor: "#ECFBF9", borderRadius: DS.radius.pill }}
                    textStyle={{ color: DS.colors.accent, fontWeight: "900" }}
                    icon="tag"
                  >
                    {type}
                  </Chip>
                </View>
              )}

              {!churchId && (
                <View style={{ marginTop: 12 }}>
                  <Chip
                    style={{ backgroundColor: "#FFF1F1", borderRadius: DS.radius.pill }}
                    textStyle={{ color: DS.colors.danger, fontWeight: "900" }}
                    icon="alert-circle"
                  >
                    Nenhuma igreja ativa
                  </Chip>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* PREVIEW / RESUMO */}
          <Card style={[styles.previewCard, { backgroundColor: previewBg, borderColor: previewBorder }]} mode="outlined">
            {!!previewCardColor && (
              <View pointerEvents="none" style={[styles.previewAccent, { backgroundColor: previewCardColor }]} />
            )}

            <Card.Content style={{ gap: 10 }}>
              <View style={styles.previewHeaderRow}>
                <Text style={styles.sectionTitle}></Text>

                <Button
                  mode="contained-tonal"
                  icon="palette-outline"
                  onPress={() => setImagesModalOpen(true)}
                  style={{ borderRadius: DS.radius.pill }}
                  buttonColor={DS.colors.tint}
                  textColor={DS.colors.primaryDark}
                >
                  Template
                </Button>
              </View>

              {/* FOTO (perfil) + info template */}
              <View style={styles.profileRow}>
                <Surface
                  elevation={0}
                  style={[
                    styles.profileAvatar,
                    {
                      backgroundColor: previewCardColor ? withAlpha(previewCardColor, "18") : DS.colors.tint,
                      borderColor: previewCardColor ? withAlpha(previewCardColor, "55") : DS.colors.outline,
                    },
                  ]}
                >
                  {hasPhoto ? (
                    <Image source={{ uri: coverImageUrl.trim() }} style={styles.profileAvatarImg} />
                  ) : (
                    <View style={{ alignItems: "center", gap: 4 }}>
                      <Icon source="image-outline" size={22} color={DS.colors.textMuted} />
                      <Text style={{ color: DS.colors.textMuted, fontSize: 11, fontWeight: "800" }}>Sem foto</Text>
                    </View>
                  )}
                </Surface>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: DS.colors.text, fontWeight: "900", fontSize: 24 }} numberOfLines={1}>
                    {String(name || "").trim() || "Nome da célula"}
                  </Text>

                  {/* <Text style={{ color: DS.colors.textMuted }} numberOfLines={2}>
                    Template: {galleryUrls.length ? `${galleryUrls.length} imagens` : "sem galeria"}.{" "}
                    {previewCardColor ? "Cor personalizada." : "Cor padrão do tema."}
                  </Text> */}
                </View>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {!!meetingLabel && (
                  <Chip
                    style={{ backgroundColor: DS.colors.tintBlue, borderRadius: DS.radius.pill }}
                    textStyle={{ color: DS.colors.primary, fontWeight: "800" }}
                    icon="calendar-clock"
                  >
                    {meetingLabel}
                  </Chip>
                )}

                {!!addressLabel && (
                  <Chip
                    style={{ backgroundColor: "#F1F1F1", borderRadius: DS.radius.pill }}
                    textStyle={{ color: DS.colors.text, fontWeight: "800" }}
                    icon="map-marker"
                  >
                    {addressLabel}
                  </Chip>
                )}

                {!!leader?.fullName && (
                  <Chip
                    style={{ backgroundColor: "#F1F1F1", borderRadius: DS.radius.pill }}
                    textStyle={{ color: DS.colors.text, fontWeight: "800" }}
                    icon="account"
                  >
                    Líder: {leader.fullName}
                  </Chip>
                )}

                {!!viceLeader?.fullName && (
                  <Chip
                    style={{ backgroundColor: "#F1F1F1", borderRadius: DS.radius.pill }}
                    textStyle={{ color: DS.colors.text, fontWeight: "800" }}
                    icon="account"
                  >
                    Vice: {viceLeader.fullName}
                  </Chip>
                )}
              </View>

              {/* <Text style={{ color: DS.colors.textMuted }}>
                Isso é só um resumo visual (os membros serão adicionados depois; o app mostra a contagem automaticamente).
              </Text> */}
            </Card.Content>
          </Card>

          {!!error && (
            <Card style={styles.errorCard} mode="elevated">
              <Card.Content style={{ gap: 8 }}>
                <Text style={{ fontWeight: "900", color: DS.colors.text }}>Não foi possível salvar</Text>
                <Text style={{ color: DS.colors.textMuted }}>{error}</Text>
              </Card.Content>
            </Card>
          )}

          {/* INFORMAÇÕES */}
          <Card style={styles.formCard} mode="elevated">
            <Card.Content style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Informações</Text>

              <TextInput
                label="Nome da célula *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                outlineColor={DS.colors.border}
                activeOutlineColor={DS.colors.primary}
                style={styles.input}
              />

              <TextInput
                label="Descrição (opcional)"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                outlineColor={DS.colors.border}
                activeOutlineColor={DS.colors.primary}
                multiline
                numberOfLines={4}
                style={styles.input}
              />

              <Divider style={{ backgroundColor: DS.colors.border, marginTop: 4 }} />

              <Text style={styles.sectionTitle}>Tipo</Text>
              <Text style={{ color: DS.colors.textMuted, marginTop: -8 }}>Ex.: Jovens, Casais, Kids…</Text>

              {typeChips}

              <TextInput
                label="Outro tipo (opcional)"
                value={type}
                onChangeText={setType}
                mode="outlined"
                outlineColor={DS.colors.border}
                activeOutlineColor={DS.colors.accent}
                style={styles.input}
                placeholder="Ex.: Universitários"
              />
            </Card.Content>
          </Card>

          {/* ENDEREÇO */}
          <Card style={styles.formCard} mode="elevated">
            <Card.Content style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Local</Text>
              <Text style={{ color: DS.colors.textMuted, marginTop: -8 }}>Cidade, bairro e endereço (opcional).</Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    label="Cidade"
                    value={city}
                    onChangeText={setCity}
                    mode="outlined"
                    outlineColor={DS.colors.border}
                    activeOutlineColor={DS.colors.primary}
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    label="Bairro"
                    value={neighborhood}
                    onChangeText={setNeighborhood}
                    mode="outlined"
                    outlineColor={DS.colors.border}
                    activeOutlineColor={DS.colors.primary}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1.6 }}>
                  <TextInput
                    label="Rua"
                    value={street}
                    onChangeText={setStreet}
                    mode="outlined"
                    outlineColor={DS.colors.border}
                    activeOutlineColor={DS.colors.primary}
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 0.7 }}>
                  <TextInput
                    label="Número"
                    value={number}
                    onChangeText={setNumber}
                    mode="outlined"
                    outlineColor={DS.colors.border}
                    activeOutlineColor={DS.colors.primary}
                    style={styles.input}
                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                  />
                </View>
              </View>

              <TextInput
                label="Complemento (opcional)"
                value={complement}
                onChangeText={setComplement}
                mode="outlined"
                outlineColor={DS.colors.border}
                activeOutlineColor={DS.colors.primary}
                style={styles.input}
                placeholder="Apto, casa, bloco..."
              />

              <TextInput
                label="Referência (opcional)"
                value={reference}
                onChangeText={setReference}
                mode="outlined"
                outlineColor={DS.colors.border}
                activeOutlineColor={DS.colors.primary}
                style={styles.input}
                placeholder="Próximo ao mercado, esquina..."
              />
            </Card.Content>
          </Card>

          {/* REUNIÃO */}
          <Card style={styles.formCard} mode="elevated">
            <Card.Content style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Reunião</Text>
              <Text style={{ color: DS.colors.textMuted, marginTop: -8 }}>Você pode definir agora ou depois.</Text>

              <View style={{ marginTop: 6 }}>
                <Text style={{ fontWeight: "900", color: DS.colors.text, marginBottom: 8 }}>Dia da semana</Text>
                {dayChips}
              </View>

              <TextInput
                label="Horário (HH:MM)"
                value={meetingTime}
                onChangeText={(v) => setMeetingTime(normalizeTimeInput(v))}
                mode="outlined"
                outlineColor={DS.colors.border}
                activeOutlineColor={DS.colors.primary}
                placeholder="Ex: 19:30 ou 19h"
                style={styles.input}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                right={
                  !isValidTimeHHMM(meetingTime) ? (
                    <TextInput.Icon icon="alert-circle" color={DS.colors.danger} />
                  ) : (
                    <TextInput.Icon icon="clock-outline" />
                  )
                }
              />

              {!isValidTimeHHMM(meetingTime) && (
                <Text style={{ color: DS.colors.danger, fontWeight: "700" }}>
                  Horário inválido. Use 00:00 até 23:59.
                </Text>
              )}
            </Card.Content>
          </Card>

          {/* LIDERANÇA (CASCADE) */}
          <Card style={styles.formCard} mode="elevated">
            <Card.Content style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Liderança</Text>

              <SelectField
                label="Líder"
                value={leader?.fullName || ""}
                placeholder={churchId ? (usersLoading ? "Carregando..." : "Selecionar membro") : "Nenhuma igreja ativa"}
                leftIcon="account-star-outline"
                onPress={() => {
                  if (!churchId) return;
                  setViceOpen(false);
                  setLeaderOpen((v) => !v);
                }}
                disabled={!churchId}
              />

              <CascadePicker
                visible={leaderOpen}
                title="Selecione o líder"
                q={leaderQ}
                setQ={setLeaderQ}
                items={leaderItems}
                selectedId={leader?.id}
                loading={usersLoading}
                onSelect={(u) => {
                  if (viceLeader?.id && viceLeader.id === u.id) setViceLeader(null);
                  setLeader(u);
                  setLeaderOpen(false);
                  setViceOpen(true); // ✅ cascade: abre vice automaticamente
                }}
              />

              {!!leader?.id ? (
                <Button
                  mode="text"
                  textColor={DS.colors.textMuted}
                  onPress={() => {
                    setLeader(null);
                    setViceLeader(null);
                    setLeaderQ("");
                    setViceQ("");
                    setLeaderOpen(false);
                    setViceOpen(false);
                  }}
                  style={{ alignSelf: "flex-start", paddingHorizontal: 0 }}
                >
                  Limpar líder
                </Button>
              ) : null}

              <SelectField
                label="Vice-líder"
                value={viceLeader?.fullName || ""}
                placeholder={
                  !churchId
                    ? "Nenhuma igreja ativa"
                    : !leader?.id
                      ? "Selecione um líder primeiro"
                      : usersLoading
                        ? "Carregando..."
                        : "Selecionar membro"
                }
                leftIcon="account-outline"
                onPress={() => {
                  if (!churchId || !leader?.id) return;
                  setLeaderOpen(false);
                  setViceOpen((v) => !v);
                }}
                disabled={!churchId || !leader?.id}
              />

              <CascadePicker
                visible={viceOpen}
                title="Selecione o vice-líder"
                q={viceQ}
                setQ={setViceQ}
                items={viceItems}
                selectedId={viceLeader?.id}
                loading={usersLoading}
                onSelect={(u) => {
                  if (leader?.id && leader.id === u.id) setLeader(null);
                  setViceLeader(u);
                  setViceOpen(false);
                }}
                emptyText={leader?.id ? "Nenhum usuário encontrado." : "Selecione um líder primeiro."}
              />

              {!!viceLeader?.id ? (
                <Button
                  mode="text"
                  textColor={DS.colors.textMuted}
                  onPress={() => {
                    setViceLeader(null);
                    setViceQ("");
                    setViceOpen(false);
                  }}
                  style={{ alignSelf: "flex-start", paddingHorizontal: 0 }}
                >
                  Limpar vice-líder
                </Button>
              ) : null}

              {leader?.id && viceLeader?.id && leader.id === viceLeader.id ? (
                <Text style={{ color: DS.colors.danger, fontWeight: "800" }}>
                  Líder e Vice-líder não podem ser a mesma pessoa.
                </Text>
              ) : null}
            </Card.Content>
          </Card>

          <View style={{ height: DS.space(10) }} />
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Button
            mode="outlined"
            textColor={DS.colors.primary}
            style={[styles.footerBtn, { borderColor: DS.colors.primary }]}
            onPress={() => navigation?.goBack?.()}
            disabled={saving}
          >
            Cancelar
          </Button>

          <Button
            mode="contained"
            buttonColor={DS.colors.primary}
            textColor="#fff"
            style={styles.footerBtn}
            onPress={onSave}
            loading={saving}
            disabled={!canSave || saving}
          >
            Criar
          </Button>
        </View>
      </KeyboardAvoidingView>

      {/* ✅ MODAL TEMPLATE (foto perfil + cor + galeria) */}
      <Portal>
        <Modal visible={imagesModalOpen} onDismiss={() => setImagesModalOpen(false)} contentContainerStyle={{ flex: 1 }}>
          <Surface style={styles.fullWrap} elevation={0}>
            <View style={styles.fullHeader}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: DS.colors.text }}>Template da célula</Text>
              <IconButton icon="close" onPress={() => setImagesModalOpen(false)} iconColor={DS.colors.textMuted} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={{ gap: 12 }}>
                  <Text style={{ fontWeight: "900", color: DS.colors.text }}>Foto da célula (perfil)</Text>
                  <Text style={{ color: DS.colors.textMuted }}>
                    Use uma URL (https://...). Ela aparece como foto circular na lista de células.
                  </Text>

                  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    <Surface
                      elevation={0}
                      style={[
                        styles.profileAvatar,
                        {
                          backgroundColor: previewCardColor ? withAlpha(previewCardColor, "22") : DS.colors.tint,
                          borderColor: previewCardColor ? withAlpha(previewCardColor, "55") : DS.colors.outline,
                        },
                      ]}
                    >
                      {isHttpUrl(coverImageUrl) ? (
                        <Image source={{ uri: coverImageUrl.trim() }} style={styles.profileAvatarImg} />
                      ) : (
                        <Icon source="image-outline" size={22} color={DS.colors.textMuted} />
                      )}
                    </Surface>

                    <View style={{ flex: 1 }}>
                      <TextInput
                        ref={coverInputRef}
                        mode="outlined"
                        label="URL da foto (perfil)"
                        value={coverImageUrl}
                        onChangeText={setCoverImageUrl}
                        placeholder="https://..."
                        left={<TextInput.Icon icon="image-outline" color={DS.colors.textMuted} />}
                        outlineColor={DS.colors.outline}
                        activeOutlineColor={DS.colors.primary}
                        textColor={DS.colors.text}
                        placeholderTextColor={DS.colors.textMuted}
                        style={{ backgroundColor: DS.colors.backgroundAlt }}
                        outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
                      />
                    </View>
                  </View>

                  <Divider style={{ backgroundColor: DS.colors.outline, marginTop: 6 }} />

                  <Text style={{ fontWeight: "900", color: DS.colors.text }}>Galeria (opcional)</Text>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        mode="outlined"
                        label="Adicionar imagem (URL)"
                        value={galleryInput}
                        onChangeText={setGalleryInput}
                        placeholder="https://..."
                        left={<TextInput.Icon icon="image-multiple-outline" color={DS.colors.textMuted} />}
                        outlineColor={DS.colors.outline}
                        activeOutlineColor={DS.colors.primary}
                        textColor={DS.colors.text}
                        placeholderTextColor={DS.colors.textMuted}
                        style={{ backgroundColor: DS.colors.backgroundAlt }}
                        outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
                      />
                    </View>

                    <Button
                      mode="contained-tonal"
                      onPress={addGalleryUrl}
                      style={{ borderRadius: DS.radius.md, alignSelf: "flex-end" }}
                      contentStyle={{ height: 54 }}
                      buttonColor={DS.colors.tint}
                      textColor={DS.colors.primaryDark}
                      disabled={!isHttpUrl(galleryInput)}
                    >
                      Add
                    </Button>
                  </View>

                  {(galleryUrls || []).length === 0 ? (
                    <Text style={{ color: DS.colors.textMuted }}>
                      Galeria vazia (opcional). Você pode adicionar várias URLs.
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        {galleryUrls.map((u) => (
                          <Surface key={u} elevation={0} style={styles.galleryThumb}>
                            <Image source={{ uri: u }} style={{ width: "100%", height: "100%" }} />
                            <View style={{ position: "absolute", top: 2, right: 2 }}>
                              <IconButton
                                icon="close"
                                size={16}
                                style={{ margin: 0 }}
                                iconColor={DS.colors.textMuted}
                                onPress={() => removeGalleryUrl(u)}
                              />
                            </View>
                          </Surface>
                        ))}                     </View>
                    </ScrollView>
                  )}

                  <Divider style={{ backgroundColor: DS.colors.outline, marginTop: 6 }} />

                  <View style={{ marginTop: 12, gap: 10 }}>
                    <Text style={{ fontWeight: "900", color: DS.colors.text }}>Cor do card (prévia)</Text>
                    <Text style={{ color: DS.colors.textMuted }}>
                      A cor deixa o Resumo mais destacado, mas a borda segue um “tint” suave (não fica fora do padrão).
                    </Text>

                    {/* Padrão do tema */}
                    <Pressable onPress={() => setPreviewCardColor("")} style={{ width: "100%" }}>
                      <Surface
                        elevation={0}
                        style={[
                          styles.sheetRow,
                          {
                            borderColor: previewCardColor ? DS.colors.outline : DS.colors.primary,
                            backgroundColor: previewCardColor ? DS.colors.surface : DS.colors.tint,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                          <View style={[styles.sheetIcon, { backgroundColor: DS.colors.primary }]}>
                            <Icon source="palette-outline" size={18} color="#fff" />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: "900", color: DS.colors.text }}>Padrão do tema</Text>
                            <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                              Usa as cores do app
                            </Text>
                          </View>
                        </View>

                        {!previewCardColor ? <Icon source="check-circle" size={22} color={DS.colors.primary} /> : null}
                      </Surface>
                    </Pressable>

                    {/* grade cores */}
                    <View style={styles.colorGrid}>
                      {COLORS.map((c) => {
                        const selected = previewCardColor === c.hex;
                        return (
                          <Pressable key={c.hex} onPress={() => setPreviewCardColor(c.hex)} style={styles.colorCell}>
                            <Surface
                              elevation={0}
                              style={[
                                styles.sheetRow,
                                {
                                  borderColor: selected ? c.hex : DS.colors.outline,
                                  backgroundColor: selected ? withAlpha(c.hex, "10") : DS.colors.surface,
                                },
                              ]}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                                <View style={[styles.sheetIcon, { backgroundColor: c.hex }]}>
                                  <Icon source="palette-outline" size={18} color="#fff" />
                                </View>

                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontWeight: "900", color: DS.colors.text }} numberOfLines={1}>
                                    {c.name}
                                  </Text>
                                </View>
                              </View>

                              {selected ? <Icon source="check-circle" size={22} color={c.hex} /> : null}
                            </Surface>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <Button
                    mode="contained"
                    icon="check"
                    onPress={() => setImagesModalOpen(false)}
                    style={{ borderRadius: DS.radius.lg, marginTop: 6 }}
                    contentStyle={{ height: 48 }}
                    buttonColor={DS.colors.primary}
                    textColor="#fff"
                  >
                    OK
                  </Button>
                </Card.Content>
              </Card>
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>

      <Snackbar visible={snack.visible} onDismiss={() => setSnack({ visible: false, text: "" })} duration={2200}>
        {snack.text}
      </Snackbar>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.colors.bg },

  content: {
    padding: DS.space(2),
    paddingBottom: DS.space(2),
    gap: DS.space(1.5),
  },

  heroCard: { borderRadius: DS.radius.card, backgroundColor: DS.colors.card },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroTitle: { fontWeight: "900", color: DS.colors.text, letterSpacing: 0.2 },
  heroSubtitle: { color: DS.colors.textMuted, marginTop: 6, lineHeight: 18 },

  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroAvatarImg: { width: "100%", height: "100%" },

  previewCard: {
    borderRadius: DS.radius.card,
    overflow: "hidden",
  },

  previewHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },

  profileRow: { flexDirection: "row", gap: 12, alignItems: "center" },

  profileAvatar: {
    width: 90,
    height: 90,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatarImg: { width: "100%", height: "100%" },

  formCard: { borderRadius: DS.radius.card, backgroundColor: DS.colors.card },

  sectionTitle: { fontWeight: "900", color: DS.colors.text, fontSize: 16 },

  input: { backgroundColor: DS.colors.card },

  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayChip: { borderRadius: DS.radius.pill },

  errorCard: {
    borderRadius: DS.radius.card,
    backgroundColor: DS.colors.card,
    borderWidth: 1,
    borderColor: "#FFE0E0",
  },

  footer: {
    padding: DS.space(2),
    paddingTop: DS.space(1.5),
    backgroundColor: DS.colors.bg,
    borderTopWidth: 1,
    borderTopColor: DS.colors.border,
    flexDirection: "row",
    gap: 10,
  },
  footerBtn: { flex: 1, borderRadius: DS.radius.pill },

  // SelectField
  selectWrap: {
    borderWidth: 1,
    borderColor: DS.colors.outline,
    backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.lg,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Cascade (lista embaixo do campo)
  cascadePanel: {
    borderWidth: 1,
    borderColor: DS.colors.outline,
    backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.lg,
    padding: 12,
    marginTop: -2,
  },
  cascadeSearch: {
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.card,
    borderWidth: 1,
    borderColor: DS.colors.border,
    marginBottom: 12,
  },
  cascadeRow: {
    padding: 12,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    backgroundColor: DS.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Template modal
  fullWrap: { flex: 1, backgroundColor: DS.colors.bg },
  fullHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: { borderRadius: DS.radius.card, backgroundColor: DS.colors.card, borderColor: DS.colors.outline },

  sheetRow: {
    padding: 12,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    backgroundColor: DS.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorCell: { width: "48%" },

  galleryThumb: {
    width: 92,
    height: 72,
    borderRadius: DS.radius.lg,
    overflow: "hidden",
    backgroundColor: DS.colors.tint,
    borderWidth: 1,
    borderColor: DS.colors.outline,
  },

  previewAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    opacity: 0.95,
    borderTopLeftRadius: DS.radius.card,
    borderTopRightRadius: DS.radius.card,
  },
});
