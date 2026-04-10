import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  View,
  Pressable,
  Image,
  ImageBackground,
  FlatList,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Checkbox,
  Divider,
  Icon,
  IconButton,
  Menu,
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import storage from "@react-native-firebase/storage";
import { launchImageLibrary } from "react-native-image-picker";
import { useAuth } from "../../context/AuthContext";

/**
 * Tokens do Manual (aplicados localmente nesta tela)
 */
const DS = {
  colors: {
    primary: "#1CA7D1",
    primaryDark: "#177E9C",
    accent: "#46BCB1",
    tint: "#E3F7FC",
    error: "#F95F5C",
    background: "#F5F7FB",
    backgroundAlt: "#F7FEFE",
    surface: "#FFFFFF",
    text: "#333F42",
    textMuted: "#707D80",
    outline: "#DFE1E1",
    disabled: "#99ABB0",
  },
  radius: { sm: 12, md: 16, lg: 24, xl: 28 },
  t: { h1: 28, h2: 24, h3: 20, body: 16, body2: 14, caption: 12 },
  space: (n) => n * 8,
};

function withAlpha(hex, alphaHex = "14") {
  const h = String(hex || "").trim();
  if (!h) return hex;
  if (h.startsWith("#") && h.length === 7) return `${h}${alphaHex}`;
  return h;
}

// ============================================================================
// Helpers UI
// ============================================================================

function SectionHeader({ title, subtitle, action }) {
  return (
    <View style={{ marginTop: DS.space(2), marginBottom: DS.space(1) }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: DS.t.h3,
              fontWeight: "900",
              color: DS.colors.text,
              letterSpacing: 0.2,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                color: DS.colors.textMuted,
                marginTop: 4,
                lineHeight: 20,
                fontSize: DS.t.body2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
    </View>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: DS.space(3),
        borderRadius: DS.radius.lg,
        backgroundColor: DS.colors.tint,
        borderWidth: 1.5,
        borderColor: DS.colors.outline,
        borderStyle: "dashed",
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: DS.colors.surface,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          borderWidth: 1,
          borderColor: DS.colors.outline,
        }}
      >
        <Icon source={icon} size={30} color={DS.colors.textMuted} />
      </View>

      <Text
        style={{
          fontSize: DS.t.h3,
          fontWeight: "900",
          marginBottom: 6,
          textAlign: "center",
          color: DS.colors.text,
        }}
      >
        {title}
      </Text>
      <Text style={{ color: DS.colors.textMuted, textAlign: "center", fontSize: DS.t.body2 }}>
        {description}
      </Text>

      {action ? <View style={{ marginTop: 14, width: "100%" }}>{action}</View> : null}
    </View>
  );
}

function BottomSheet({ visible, onDismiss, title, subtitle, children, rightAction }) {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Surface
          elevation={0}
          style={{
            backgroundColor: DS.colors.surface,
            borderTopLeftRadius: DS.radius.xl,
            borderTopRightRadius: DS.radius.xl,
            padding: DS.space(2),
            height: "86%",
            borderWidth: 1,
            borderColor: DS.colors.outline,
          }}
        >
          {/* handle */}
          <View style={{ alignItems: "center", paddingBottom: DS.space(1) }}>
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 999,
                backgroundColor: DS.colors.outline,
                opacity: 0.9,
              }}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: DS.t.h2, fontWeight: "900", color: DS.colors.text }}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={{ color: DS.colors.textMuted, marginTop: 2, fontSize: DS.t.body2 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {rightAction}
              <IconButton icon="close" onPress={onDismiss} iconColor={DS.colors.textMuted} />
            </View>
          </View>

          <Divider style={{ backgroundColor: DS.colors.outline }} />

          <View style={{ marginTop: 12, flex: 1 }}>{children}</View>
        </Surface>
      </Modal>
    </Portal>
  );
}

function SelectField({ label, value, placeholder, leftIcon, onPress }) {
  return (
    <View>
      <TextInput
        mode="outlined"
        label={label}
        value={value || ""}
        placeholder={placeholder}
        editable={false}
        left={leftIcon ? <TextInput.Icon icon={leftIcon} color={DS.colors.textMuted} /> : null}
        right={<TextInput.Icon icon="chevron-down" color={DS.colors.textMuted} />}
        pointerEvents="none"
        outlineColor={DS.colors.outline}
        activeOutlineColor={DS.colors.primary}
        textColor={DS.colors.text}
        placeholderTextColor={DS.colors.textMuted}
        style={{ backgroundColor: DS.colors.backgroundAlt }}
        outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
      />
      <Pressable onPress={onPress} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
    </View>
  );
}

// ============================================================================
// Hooks seguros
// ============================================================================

function useChurchUsers({ churchId, enabled, q, apiGet }) {
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
      qs.set("take", "120");
      const term = (q || "").trim();
      if (term) qs.set("q", term);

      const json = await apiGet(`/churches/${churchId}/users?${qs.toString()}`);
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

function useChurchMinistries({ churchId, enabled, q, apiGet }) {
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
      qs.set("take", "200");
      const term = (q || "").trim();
      if (term) qs.set("q", term);

      const json = await apiGet(`/churches/${churchId}/ministries?${qs.toString()}`);
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

// ============================================================================
// Cores / Templates
// ============================================================================

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

const ROLE_PRESETS = [
  "Direção e abertura",
  "Palavra",
  "Ministrar Ofertas",
  "Louvor",
  "Mídia",
  "Recepção",
  "Intercessão",
  "Apoio",
];

function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function pickFromPalette(key) {
  const s = String(key || "");
  let acc = 0;
  for (let i = 0; i < s.length; i++) acc = (acc + s.charCodeAt(i) * (i + 1)) % 100000;
  return COLORS[acc % COLORS.length]?.hex || COLORS[0].hex;
}

function getRoleColor(role) {
  const r = String(role || "").toLowerCase();
  if (r.includes("dire") || r.includes("abert")) return "#4F46E5";
  if (r.includes("palavr") || r.includes("preg")) return "#10B981";
  if (r.includes("ofert") || r.includes("colet")) return "#F59E0B";
  if (r.includes("louv") || r.includes("mús") || r.includes("music")) return "#EC4899";
  if (r.includes("mídi") || r.includes("proje") || r.includes("som")) return "#06B6D4";
  if (r.includes("recep") || r.includes("acolh")) return "#14B8A6";
  if (r.includes("interc") || r.includes("orac")) return "#8B5CF6";
  if (r.includes("apoio") || r.includes("suport")) return "#EF4444";
  return pickFromPalette(role);
}

// ============================================================================
// Helpers: Data/Hora (dd/mm/aaaa e hh:mm)
// ============================================================================

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateBR(date) {
  if (!(date instanceof Date)) return "";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatTimeHM(date) {
  if (!(date instanceof Date)) return "";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function parseDateBR(label) {
  const s = String(label || "").trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);

  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}

function isValidTimeHM(label) {
  const s = String(label || "").trim();
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return false;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function normalizeDateLabel(label) {
  const s = String(label || "").trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return s;

  const yyyy = Number(iso[1]);
  const mm = Number(iso[2]);
  const dd = Number(iso[3]);

  const d = new Date(yyyy, mm - 1, dd);
  return formatDateBR(d);
}

function dateBRToISO(label) {
  const d = parseDateBR(label);
  if (!d) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function logSaveDebug({ editingId, churchId, endpoint, method, payload }) {
  try {
    console.log("📤 EVENT SAVE (payload pronto)", { editingId, churchId, endpoint, method, payload });
  } catch { }
}

// ============================================================================
// Converter participações <-> blocks (backend)
// ============================================================================

function blocksToParticipations(blocks) {
  const out = [];
  for (const b of blocks || []) {
    const roleFromBlock = b?.title || "Participação";
    for (const p of b?.people || []) {
      out.push({
        id: makeId("part"),
        userId: p?.userId || null,
        name: p?.name || "Sem nome",
        role: p?.role || roleFromBlock,
      });
    }
  }
  return out;
}

function participationsToBlocks(participations) {
  const map = new Map();
  for (const p of participations || []) {
    if (!p?.userId) continue;
    const role = (p?.role || "Participação").trim() || "Participação";
    if (!map.has(role)) map.set(role, []);
    map.get(role).push({ userId: p.userId, name: p.name || "Sem nome", role });
  }

  return Array.from(map.entries()).map(([role, people]) => ({
    id: makeId("blk"),
    title: role,
    icon: "account-group-outline",
    people,
  }));
}

// ============================================================================
// Firebase Storage helpers (Picker + Upload)
// ============================================================================

function normalizeFileUri(uri) {
  if (!uri) return "";
  return uri;
}

async function pickSingleImageFromLibrary() {
  const res = await launchImageLibrary({
    mediaType: "photo",
    selectionLimit: 1,
    quality: 0.85,
  });

  if (res.didCancel) return null;
  const asset = res.assets?.[0];
  const uri = asset?.uri;
  return uri ? normalizeFileUri(uri) : null;
}

async function pickMultipleImagesFromLibrary(limit = 6) {
  const res = await launchImageLibrary({
    mediaType: "photo",
    selectionLimit: limit,
    quality: 0.85,
  });

  if (res.didCancel) return [];
  const assets = res.assets || [];
  return assets.map((a) => normalizeFileUri(a.uri)).filter(Boolean);
}

async function uploadFileToStorage({ localUri, churchId, eventIdOrTemp, folder = "events" }) {
  if (!localUri) return null;

  const extGuess = localUri.includes(".") ? localUri.split(".").pop()?.split("?")?.[0] : "jpg";
  const filename = `${Date.now()}_${Math.random().toString(16).slice(2)}.${extGuess || "jpg"}`;

  const path = `${folder}/${churchId}/${eventIdOrTemp}/${filename}`;

  const ref = storage().ref(path);
  await ref.putFile(localUri);
  const url = await ref.getDownloadURL();

  return url;
}

// ============================================================================
// Preview Card
// ============================================================================

function EventPreviewCard({ mode = "mini", data, onOpenFull, onPressImage, previewButton, accentColor }) {
  const { title, dateLabel, timeLabel, location, description, coverImageUrl, galleryUrls } = data;

  const showDescription = mode === "complete";
  const showGallery = mode === "complete" && (galleryUrls || []).length > 0;

  const heroHeight = mode === "mini" ? 148 : 196;
  const when = [dateLabel, timeLabel].filter(Boolean).join(" • ");
  const where = (location || "").trim() ? location.trim() : "Sua rua, seu bairro - Sua Cidade";

  const hasAccent = !!(accentColor || "").trim();
  const accent = hasAccent ? accentColor : DS.colors.primary;

  return (
    <Card
      mode="outlined"
      style={{
        borderRadius: DS.radius.lg,
        overflow: "hidden",
        borderColor: hasAccent ? accent : DS.colors.outline,
        backgroundColor: DS.colors.surface,
      }}
    >
      <View
        style={{
          height: heroHeight,
          backgroundColor: hasAccent ? withAlpha(accent, "14") : DS.colors.tint,
        }}
      >
        <Pressable onPress={onPressImage} style={{ flex: 1 }}>
          {coverImageUrl ? (
            <ImageBackground source={{ uri: coverImageUrl }} style={{ flex: 1 }} resizeMode="cover">
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 86,
                  backgroundColor: "rgba(0,0,0,0.30)",
                }}
              />
            </ImageBackground>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Icon source="image-outline" size={34} color={hasAccent ? accent : DS.colors.textMuted} />
              <Text style={{ color: DS.colors.textMuted, marginTop: 8 }}>Capa do evento</Text>
            </View>
          )}
        </Pressable>

        <View style={{ position: "absolute", top: 10, right: 10 }}>
          <Surface
            elevation={0}
            style={{
              borderRadius: 999,
              overflow: "hidden",
              backgroundColor: coverImageUrl ? "rgba(0,0,0,0.35)" : DS.colors.surface,
              borderWidth: 1,
              borderColor: coverImageUrl ? "rgba(255,255,255,0.25)" : DS.colors.outline,
            }}
          >
            <IconButton
              icon="image-edit-outline"
              size={18}
              style={{ margin: 0 }}
              iconColor={coverImageUrl ? "#fff" : DS.colors.textMuted}
              onPress={onPressImage}
            />
          </Surface>
        </View>
      </View>

      <Card.Content style={{ paddingTop: 14, paddingBottom: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text
            style={{ fontSize: DS.t.h2, fontWeight: "900", flex: 1, color: DS.colors.text }}
            numberOfLines={2}
          >
            {title?.trim() ? title.trim() : "Evento"}
          </Text>
          {previewButton ? <View>{previewButton}</View> : null}
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon source="calendar-blank-outline" size={18} color={DS.colors.textMuted} />
            <Text style={{ color: DS.colors.textMuted, flex: 1 }} numberOfLines={1}>
              {when || "Data • Hora"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon source="map-marker-outline" size={18} color={DS.colors.textMuted} />
            <Text style={{ color: DS.colors.textMuted, flex: 1 }} numberOfLines={2}>
              {where}
            </Text>
          </View>
        </View>

        {showDescription ? (
          <Surface
            elevation={0}
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: DS.radius.md,
              backgroundColor: hasAccent ? accent : DS.colors.primary,
            }}
          >
            <Text style={{ color: "#fff", lineHeight: 20 }}>
              {description?.trim() ? description.trim() : "Descrição do evento..."}
            </Text>
          </Surface>
        ) : null}

        {showGallery ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {galleryUrls.map((u) => (
                <Surface
                  key={u}
                  elevation={0}
                  style={{
                    width: 84,
                    height: 64,
                    borderRadius: DS.radius.md,
                    overflow: "hidden",
                    backgroundColor: DS.colors.tint,
                    borderWidth: 1,
                    borderColor: DS.colors.outline,
                  }}
                >
                  <Image source={{ uri: u }} style={{ width: "100%", height: "100%" }} />
                </Surface>
              ))}
            </View>
          </ScrollView>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <Button
            mode="contained"
            style={{ borderRadius: DS.radius.md }}
            contentStyle={{ height: 44 }}
            icon="calendar-plus"
            buttonColor={hasAccent ? accent : DS.colors.primary}
            textColor="#fff"
          >
            Adicionar ao calendário
          </Button>

          {onOpenFull ? (
            <Button mode="text" onPress={onOpenFull} icon="arrow-expand" textColor={DS.colors.primary}>
              Tela inteira
            </Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

// ============================================================================
// Screen
// ============================================================================

export default function EventComposerScreen(props) {
  // mantém useTheme para compatibilidade (ícones/paper), mas o visual base vem do DS
  useTheme();
  const styles = createStyles();

  const navigation = props?.navigation;
  const route = props?.route;
  const editingId = route?.params?.id ?? null;

  const { activeChurchId, activeChurch, apiFetchAuth } = useAuth();
  const churchId = activeChurchId || activeChurch?.id || null;

  const apiGet = useCallback((path) => apiFetchAuth(path, { method: "GET" }), [apiFetchAuth]);

  const apiPost = useCallback(
    (path, body) =>
      apiFetchAuth(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    [apiFetchAuth]
  );

  const apiPatch = useCallback(
    (path, body) =>
      apiFetchAuth(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    [apiFetchAuth]
  );

  const scrollRef = useRef(null);

  // ----------------------------
  // Form state
  // ----------------------------
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [dateLabel, setDateLabel] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [location, setLocation] = useState("");

  // Imagens (URLs finais do Storage)
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState([]);

  // ✅ arquivos locais (antes do upload)
  const [coverLocalUri, setCoverLocalUri] = useState(""); // file://...
  const [galleryLocalUris, setGalleryLocalUris] = useState([]); // array de file://...

  // ✅ status upload
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Ministérios (dropdown multi)
  const [selectedMinistries, setSelectedMinistries] = useState([]);
  const [ministryQuery, setMinistryQuery] = useState("");
  const [sheetMinistriesOpen, setSheetMinistriesOpen] = useState(false);

  // ✅ Participantes por ministério (checkbox por grupo)
  const [ministryMembersMap, setMinistryMembersMap] = useState({});
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [excludedByMinistry, setExcludedByMinistry] = useState({});

  // ✅ Visibilidade
  const [visibilityMode, setVisibilityMode] = useState("all");
  const [visibilityPickerOpen, setVisibilityPickerOpen] = useState(false);
  const [visibilityMinistries, setVisibilityMinistries] = useState([]);

  // ✅ CASCADE: somente 1 ministério aberto
  const [expandedMinistryId, setExpandedMinistryId] = useState(null);

  function normalizeParticipations(list) {
    const arr = Array.isArray(list) ? list : [];
    return arr.length > 0 ? arr : [{ id: makeId("part"), userId: null, name: "", role: "" }];
  }

  const [participations, setParticipations] = useState(() =>
    normalizeParticipations([{ id: makeId("part"), userId: null, name: "", role: "" }])
  );

  // Dropdown usuário
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [activeParticipationId, setActiveParticipationId] = useState(null);

  // Dropdown função
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [roleCustomInput, setRoleCustomInput] = useState("");

  // Preview
  const [previewMode, setPreviewMode] = useState("mini");
  const [previewFullOpen, setPreviewFullOpen] = useState(false);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);

  // ✅ cor do evento (SALVAR NO BANCO)
  const [eventColor, setEventColor] = useState("");

  // Modal imagens (capa/galeria + cor)
  const [imagesModalOpen, setImagesModalOpen] = useState(false);

  // ----------------------------
  // Helpers: membros (shape flexível)
  // ----------------------------
  function memberId(it) {
    return it?.userId || it?.id || it?.user?.id || null;
  }
  function memberName(it) {
    return it?.name || it?.user?.name || it?.user?.displayName || "Sem nome";
  }
  function memberEmail(it) {
    return it?.email || it?.user?.email || "";
  }
  function memberPhoto(it) {
    return it?.photoUrl || it?.avatarUrl || it?.user?.photoUrl || it?.user?.photoURL || "";
  }

  function normalizeMinistry(m) {
    if (!m) return { id: makeId("min"), name: "Ministério", color: null, icon: null, description: null };
    return {
      id: m.id,
      name: m.name ?? "Ministério",
      color: m.color ?? null,
      icon: m.icon ?? null,
      description: m.description ?? null,
    };
  }

  // ----------------------------
  // Date/Time Picker
  // ----------------------------
  const isIOS = Platform.OS === "ios";

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerValue, setPickerValue] = useState(new Date());

  function openDatePicker() {
    const d = parseDateBR(dateLabel) || new Date();
    setPickerValue(d);
    setDatePickerOpen(true);
  }

  function openTimePicker() {
    const base = new Date();
    if (isValidTimeHM(timeLabel)) {
      const [hh, mm] = timeLabel.split(":").map(Number);
      base.setHours(hh, mm, 0, 0);
    }
    setPickerValue(base);
    setTimePickerOpen(true);
  }

  function openImagesModal() {
    if (previewFullOpen) setPreviewFullOpen(false);
    setImagesModalOpen(true);
  }

  const { items: users, loading: usersLoading, error: usersError } = useChurchUsers({
    churchId,
    enabled: userPickerOpen,
    q: userQuery,
    apiGet,
  });

  const { items: ministries, loading: ministriesLoading, error: ministriesError } = useChurchMinistries({
    churchId,
    enabled: sheetMinistriesOpen || visibilityPickerOpen,
    q: ministryQuery,
    apiGet,
  });

  const ministriesSummaryLabel = useMemo(() => {
    if (selectedMinistries.length === 0) return "";
    const names = selectedMinistries
      .slice(0, 2)
      .map((m) => m.name)
      .filter(Boolean)
      .join(", ");
    return selectedMinistries.length <= 2 ? names : `${names} +${selectedMinistries.length - 2}`;
  }, [selectedMinistries]);

  const visibilitySummaryLabel = useMemo(() => {
    if (visibilityMode === "all") return "Toda a igreja";
    if ((visibilityMinistries || []).length === 0) return "Selecionar ministérios...";
    const names = visibilityMinistries
      .slice(0, 2)
      .map((m) => m.name)
      .filter(Boolean)
      .join(", ");
    return visibilityMinistries.length <= 2 ? names : `${names} +${visibilityMinistries.length - 2}`;
  }, [visibilityMode, visibilityMinistries]);

  // ----------------------------
  // Carregar membros dos ministérios selecionados
  // ----------------------------
  const selectedMinistryIdsKey = useMemo(
    () => selectedMinistries.map((m) => m.id).sort().join("|"),
    [selectedMinistries]
  );

  useEffect(() => {
    let alive = true;

    async function loadPeople() {
      if (!churchId || selectedMinistries.length === 0) {
        setMinistryMembersMap({});
        setExcludedByMinistry({});
        return;
      }

      setPeopleLoading(true);
      try {
        const entries = await Promise.all(
          selectedMinistries.map(async (m) => {
            const res = await apiGet(`/churches/${churchId}/ministries/${m.id}/members`);
            const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
            return [m.id, items];
          })
        );

        if (!alive) return;

        const map = {};
        for (const [ministryId, items] of entries) map[ministryId] = items;
        setMinistryMembersMap(map);
      } catch (e) {
        if (!alive) return;
        setMinistryMembersMap({});
      } finally {
        if (alive) setPeopleLoading(false);
      }
    }

    loadPeople();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId, selectedMinistryIdsKey]);

  useEffect(() => {
    setExcludedByMinistry((prev) => {
      const next = {};
      for (const m of selectedMinistries) {
        const items = ministryMembersMap[m.id] || [];
        const valid = new Set(items.map(memberId).filter(Boolean));
        const prevList = Array.isArray(prev?.[m.id]) ? prev[m.id] : [];
        next[m.id] = prevList.filter((uid) => valid.has(uid));
      }
      return next;
    });
  }, [selectedMinistryIdsKey, ministryMembersMap, selectedMinistries]);

  useEffect(() => {
    if (!selectedMinistries.length) {
      setExpandedMinistryId(null);
      return;
    }
    const ok = selectedMinistries.some((m) => m.id === expandedMinistryId);
    if (!ok) setExpandedMinistryId(selectedMinistries[0].id);
  }, [selectedMinistries, expandedMinistryId]);

  const selectedMinistryIdSet = useMemo(() => new Set(selectedMinistries.map((m) => m.id)), [selectedMinistries]);

  const uniquePeople = useMemo(() => {
    const set = new Set();
    for (const m of selectedMinistries) {
      const items = ministryMembersMap[m.id] || [];
      for (const it of items) {
        const uid = memberId(it);
        if (uid) set.add(uid);
      }
    }
    return Array.from(set);
  }, [selectedMinistries, ministryMembersMap]);

  const excludedUserIds = useMemo(() => {
    const membership = new Map();

    for (const m of selectedMinistries) {
      const items = ministryMembersMap[m.id] || [];
      for (const it of items) {
        const uid = memberId(it);
        if (!uid) continue;
        if (!membership.has(uid)) membership.set(uid, []);
        membership.get(uid).push(m.id);
      }
    }

    const out = [];
    for (const [uid, mins] of membership.entries()) {
      const allExcluded = mins.every((minId) => (excludedByMinistry?.[minId] || []).includes(uid));
      if (allExcluded) out.push(uid);
    }
    return out;
  }, [selectedMinistries, ministryMembersMap, excludedByMinistry]);

  const scheduledCount = useMemo(
    () => Math.max(0, uniquePeople.length - excludedUserIds.length),
    [uniquePeople.length, excludedUserIds.length]
  );

  function toggleExcludedUser(ministryId, userId) {
    setExcludedByMinistry((prev) => {
      const cur = new Set(Array.isArray(prev?.[ministryId]) ? prev[ministryId] : []);
      if (cur.has(userId)) cur.delete(userId);
      else cur.add(userId);
      return { ...prev, [ministryId]: Array.from(cur) };
    });
  }

  function includeAllPeopleInMinistry(ministryId) {
    setExcludedByMinistry((prev) => ({ ...prev, [ministryId]: [] }));
  }

  function excludeAllPeopleInMinistry(ministryId) {
    const items = ministryMembersMap[ministryId] || [];
    const all = items.map(memberId).filter(Boolean);
    setExcludedByMinistry((prev) => ({ ...prev, [ministryId]: all }));
  }

  function includeAllPeople() {
    setExcludedByMinistry((prev) => {
      const next = { ...prev };
      for (const m of selectedMinistries) next[m.id] = [];
      return next;
    });
  }

  function excludeAllPeople() {
    setExcludedByMinistry((prev) => {
      const next = { ...prev };
      for (const m of selectedMinistries) {
        const items = ministryMembersMap[m.id] || [];
        next[m.id] = items.map(memberId).filter(Boolean);
      }
      return next;
    });
  }

  function selectMinistry(mRaw) {
    const m = normalizeMinistry(mRaw);
    setSelectedMinistries((prev) => {
      const exists = prev.some((x) => x.id === m.id);
      if (exists) return prev;
      return [...prev, m];
    });
    setExpandedMinistryId(m.id);
  }

  function deselectMinistry(ministryId) {
    setSelectedMinistries((prev) => prev.filter((x) => x.id !== ministryId));
  }

  function removeSelectedMinistry(id) {
    deselectMinistry(id);
  }

  function setVisibilityAll() {
    setVisibilityMode("all");
    setVisibilityMinistries([]);
  }

  function setVisibilityByMinistry() {
    setVisibilityMode("ministries");
  }

  function toggleVisibilityMinistry(m) {
    setVisibilityMinistries((prev) => {
      const exists = prev.some((x) => x.id === m.id);
      if (exists) return prev.filter((x) => x.id !== m.id);
      const mm = normalizeMinistry(m);
      return [...prev, { id: mm.id, name: mm.name, color: mm.color, icon: mm.icon }];
    });
  }

  function removeVisibilityMinistry(id) {
    setVisibilityMinistries((prev) => prev.filter((x) => x.id !== id));
  }

  function addParticipation() {
    setParticipations((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      { id: makeId("part"), userId: null, name: "", role: "" },
    ]);
  }

  function removeParticipation(id) {
    setParticipations((prev) => normalizeParticipations((prev || []).filter((p) => p.id !== id)));

    if (activeParticipationId === id) {
      setActiveParticipationId(null);
      setUserPickerOpen(false);
      setRolePickerOpen(false);
    }
  }

  function openUserPicker(participationId) {
    setActiveParticipationId(participationId);
    setUserQuery("");
    setUserPickerOpen(true);
  }

  function pickUser(u) {
    if (!activeParticipationId) return;
    setParticipations((prev) =>
      prev.map((p) => (p.id === activeParticipationId ? { ...p, userId: u.id, name: u.name || "Sem nome" } : p))
    );
    setUserPickerOpen(false);
  }

  function openRolePicker(participationId) {
    const p = participations.find((x) => x.id === participationId);
    setActiveParticipationId(participationId);
    setRoleCustomInput(p?.role || "");
    setRolePickerOpen(true);
  }

  function pickRole(role) {
    if (!activeParticipationId) return;
    const r = (role || "").trim();
    setParticipations((prev) => prev.map((p) => (p.id === activeParticipationId ? { ...p, role: r } : p)));
    setRolePickerOpen(false);
  }

  function applyCustomRole() {
    const r = (roleCustomInput || "").trim();
    if (!r) return alert("Informe a função.");
    pickRole(r);
  }

  const pickedUserIds = useMemo(() => {
    const set = new Set();
    for (const p of participations || []) if (p.userId) set.add(p.userId);
    return set;
  }, [participations]);

  const ministriesForPicker = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const m of selectedMinistries) {
      out.push(normalizeMinistry(m));
      seen.add(m.id);
    }
    for (const m of ministries) {
      if (seen.has(m.id)) continue;
      out.push(normalizeMinistry(m));
    }
    return out;
  }, [selectedMinistries, ministries]);

  const pickerCascadeData = useMemo(() => {
    const q = (peopleQuery || "").trim().toLowerCase();
    const out = [];

    for (const m of ministriesForPicker) {
      const isSelected = selectedMinistryIdSet.has(m.id);
      const isOpen = isSelected && m.id === expandedMinistryId;

      const items = isSelected ? ministryMembersMap?.[m.id] : undefined;
      const hasLoaded = Array.isArray(items);
      const excludedSet = new Set(isSelected ? (excludedByMinistry?.[m.id] || []) : []);

      const total = hasLoaded ? items.length : 0;
      const excludedCount = isSelected ? excludedSet.size : 0;
      const checkedCount = isSelected ? Math.max(0, total - excludedCount) : 0;

      out.push({
        type: "ministry",
        key: `m:${m.id}`,
        ministry: m,
        selected: isSelected,
        expanded: isOpen,
        total,
        checkedCount,
        excludedCount,
        hasLoaded,
      });

      if (!isOpen) continue;

      if (peopleLoading && !hasLoaded) {
        out.push({ type: "loading", key: `l:${m.id}`, ministryId: m.id });
        continue;
      }

      const arr = hasLoaded ? items : [];
      const filtered = arr.filter((it) => {
        if (!q) return true;
        const nm = (memberName(it) || "").toLowerCase();
        const em = (memberEmail(it) || "").toLowerCase();
        return nm.includes(q) || em.includes(q);
      });

      if (filtered.length === 0) {
        out.push({
          type: "empty",
          key: `e:${m.id}`,
          ministryId: m.id,
          label: q ? "Nenhum participante encontrado." : "Nenhum membro neste ministério.",
        });
        continue;
      }

      for (const it of filtered) {
        const uid = memberId(it);
        if (!uid) continue;

        out.push({
          type: "person",
          key: `p:${m.id}:${uid}`,
          ministryId: m.id,
          userId: uid,
          person: it,
          checked: !excludedSet.has(uid),
        });
      }
    }

    return out;
  }, [
    peopleQuery,
    ministriesForPicker,
    selectedMinistryIdSet,
    expandedMinistryId,
    ministryMembersMap,
    excludedByMinistry,
    peopleLoading,
  ]);

  function renderPickerCascadeItem({ item }) {
    if (item.type === "ministry") {
      const m = item.ministry;
      const isSelected = item.selected;
      const isOpen = item.expanded;

      const bg = isSelected ? DS.colors.tint : DS.colors.surface;
      const border = isOpen ? DS.colors.primary : DS.colors.outline;

      return (
        <Pressable
          onPress={() => {
            if (!isSelected) selectMinistry(m);
            else setExpandedMinistryId(m.id);
          }}
          style={{ marginBottom: 10 }}
        >
          <Surface elevation={0} style={[styles.sheetRow, { backgroundColor: bg, borderColor: border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  backgroundColor: m.color || DS.colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon source={m.icon || "layers-outline"} size={18} color="#fff" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: DS.colors.text }}>{m.name || "Ministério"}</Text>

                {!isSelected ? (
                  <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                    {m.description || "Toque para selecionar e abrir participantes"}
                  </Text>
                ) : (
                  <Text style={{ color: DS.colors.textMuted }}>
                    {item.hasLoaded ? (
                      <>
                        Membros: {item.total} • Marcados: {item.checkedCount} • Desmarcados: {item.excludedCount}
                      </>
                    ) : (
                      "Carregando membros..."
                    )}
                  </Text>
                )}
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {isSelected && isOpen ? (
                <>
                  <Button
                    mode="contained-tonal"
                    compact
                    onPress={() => includeAllPeopleInMinistry(m.id)}
                    disabled={!item.total}
                    buttonColor={DS.colors.tint}
                    textColor={DS.colors.primaryDark}
                    style={{ borderRadius: DS.radius.md }}
                  >
                    Marcar
                  </Button>
                  <Button
                    mode="contained-tonal"
                    compact
                    onPress={() => excludeAllPeopleInMinistry(m.id)}
                    disabled={!item.total}
                    buttonColor={DS.colors.tint}
                    textColor={DS.colors.primaryDark}
                    style={{ borderRadius: DS.radius.md }}
                  >
                    Desmarcar
                  </Button>
                </>
              ) : null}

              <IconButton
                icon={isSelected ? "close" : "plus"}
                size={20}
                style={{ margin: 0 }}
                iconColor={DS.colors.textMuted}
                onPress={() => (isSelected ? deselectMinistry(m.id) : selectMinistry(m))}
              />

              {isSelected ? (
                <Icon source={isOpen ? "chevron-up" : "chevron-down"} size={22} color={DS.colors.textMuted} />
              ) : null}
            </View>
          </Surface>
        </Pressable>
      );
    }

    if (item.type === "loading") {
      return (
        <View style={{ paddingLeft: 56, paddingBottom: 12 }}>
          <Surface elevation={0} style={[styles.noticeBox, { alignSelf: "flex-start" }]}>
            <ActivityIndicator />
            <Text style={{ color: DS.colors.textMuted }}>Carregando participantes...</Text>
          </Surface>
        </View>
      );
    }

    if (item.type === "empty") {
      return (
        <View style={{ paddingLeft: 56, paddingBottom: 12 }}>
          <Surface elevation={0} style={[styles.noticeBox, { alignSelf: "flex-start" }]}>
            <Icon source="account-off-outline" size={18} color={DS.colors.textMuted} />
            <Text style={{ color: DS.colors.textMuted }}>{item.label}</Text>
          </Surface>
        </View>
      );
    }

    const it = item.person;
    const uid = item.userId;
    const checked = item.checked;

    const name = memberName(it);
    const email = memberEmail(it);
    const photoUrl = memberPhoto(it);

    return (
      <Pressable onPress={() => toggleExcludedUser(item.ministryId, uid)} style={{ marginLeft: 10, marginBottom: 10 }}>
        <Surface
          elevation={0}
          style={[
            styles.sheetRow,
            {
              marginLeft: 46,
              backgroundColor: checked ? DS.colors.surface : "#FFF7F7",
              borderColor: checked ? DS.colors.outline : DS.colors.error,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            {photoUrl ? (
              <Avatar.Image size={38} source={{ uri: photoUrl }} />
            ) : (
              <Avatar.Text
                size={38}
                label={(name || "?").slice(0, 2).toUpperCase()}
                style={{ backgroundColor: DS.colors.tint }}
                color={DS.colors.primary}
                labelStyle={{ fontWeight: "900" }}
              />
            )}

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: DS.colors.text }}>{name}</Text>
              <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                {email || " "}
              </Text>
              {!checked ? <Text style={{ color: DS.colors.error, marginTop: 2 }}>Desmarcado neste ministério</Text> : null}
            </View>
          </View>

          <Checkbox
            status={checked ? "checked" : "unchecked"}
            color={DS.colors.primary}
            uncheckedColor={DS.colors.outline}
          />
        </Surface>
      </Pressable>
    );
  }

  // Load editing
  useEffect(() => {
    let alive = true;

    async function loadEditing() {
      if (!editingId || !churchId) return;

      try {
        const json = await apiGet(`/churches/${churchId}/events/${editingId}`);
        if (!alive) return;

        setTitle(json?.title ?? "");
        setDescription(json?.description ?? "");
        setDateLabel(normalizeDateLabel(json?.dateLabel ?? ""));
        setTimeLabel(json?.timeLabel ?? "");
        setLocation(json?.location ?? "");

        setCoverImageUrl(json?.coverImageUrl ?? "");
        setGalleryUrls(Array.isArray(json?.galleryUrls) ? json.galleryUrls : []);

        setSelectedMinistries(Array.isArray(json?.ministries) ? json.ministries.map(normalizeMinistry) : []);
        setParticipations(normalizeParticipations(blocksToParticipations(json?.blocks || [])));

        // ✅ carregar cor salva no banco
        setEventColor(json?.color ?? "");

        const serverExcludedByMinistry = json?.excludedByMinistry;
        const serverExcludedUserIds = Array.isArray(json?.excludedUserIds) ? json.excludedUserIds : [];

        if (serverExcludedByMinistry && typeof serverExcludedByMinistry === "object") {
          setExcludedByMinistry(serverExcludedByMinistry);
        } else {
          const mins = Array.isArray(json?.ministries) ? json.ministries : [];
          const fallback = {};
          for (const m of mins) fallback[m.id] = serverExcludedUserIds.slice();
          setExcludedByMinistry(fallback);
        }

        const vis = json?.visibility;
        if (vis?.mode === "ministries") {
          setVisibilityMode("ministries");
          setVisibilityMinistries(Array.isArray(vis?.ministries) ? vis.ministries : []);
        } else {
          setVisibilityMode("all");
          setVisibilityMinistries([]);
        }
      } catch {
        // ok
      }
    }

    loadEditing();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, churchId]);

  function validate() {
    if (!churchId) return "Selecione uma igreja ativa.";
    if (!title.trim()) return "Informe o título do evento.";
    if (!dateLabel.trim()) return "Selecione a data do evento.";
    if (!parseDateBR(dateLabel.trim())) return "Data inválida. Use o calendário (dd/mm/aaaa).";
    if (timeLabel.trim() && !isValidTimeHM(timeLabel.trim())) return "Hora inválida (hh:mm).";
    if (selectedMinistries.length === 0) return "Selecione pelo menos 1 ministério do evento.";
    if (visibilityMode === "ministries" && visibilityMinistries.length === 0)
      return "Selecione ao menos 1 ministério para visibilidade (ou use 'Toda a igreja').";
    return null;
  }

  async function onSave() {
    const err = validate();
    if (err) return alert(err);

    const blocks = participationsToBlocks(participations);
    const dateIso = dateBRToISO(dateLabel.trim());
    if (!dateIso) return alert("Data inválida.");

    const endpoint = editingId ? `/churches/${churchId}/events/${editingId}` : `/churches/${churchId}/events`;
    const method = editingId ? "PATCH" : "POST";

    setSaving(true);
    try {
      // ✅ Upload capa se houver arquivo local
      let finalCoverUrl = coverImageUrl?.trim() || null;

      if (coverLocalUri) {
        setUploadingCover(true);
        const tempId = editingId || `tmp_${Date.now()}`;
        const url = await uploadFileToStorage({
          localUri: coverLocalUri,
          churchId,
          eventIdOrTemp: tempId,
          folder: "events/covers",
        });
        finalCoverUrl = url || finalCoverUrl;
        setUploadingCover(false);
      }

      // ✅ Upload galeria (somente novos arquivos locais)
      let finalGalleryUrls = Array.isArray(galleryUrls) ? [...galleryUrls] : [];

      if (galleryLocalUris.length) {
        setUploadingGallery(true);
        const tempId = editingId || `tmp_${Date.now()}`;

        const uploaded = [];
        for (const uri of galleryLocalUris) {
          const url = await uploadFileToStorage({
            localUri: uri,
            churchId,
            eventIdOrTemp: tempId,
            folder: "events/gallery",
          });
          if (url) uploaded.push(url);
        }

        const set = new Set([...finalGalleryUrls, ...uploaded]);
        finalGalleryUrls = Array.from(set);

        setUploadingGallery(false);
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        dateLabel: dateIso,
        timeLabel: timeLabel.trim() || null,
        location: location.trim() || null,

        // ✅ URLs finais do Storage
        coverImageUrl: finalCoverUrl,
        galleryUrls: finalGalleryUrls,

        // ✅ COR DO EVENTO (o backend precisa aceitar e salvar!)
        color: eventColor || null,

        ministries: selectedMinistries.map((m) => ({
          id: m.id,
          name: m.name ?? null,
          color: m.color ?? null,
          icon: m.icon ?? null,
        })),
        excludedUserIds,
        blocks,
        visibility:
          visibilityMode === "all"
            ? { mode: "all" }
            : {
              mode: "ministries",
              ministries: visibilityMinistries.map((m) => ({
                id: m.id,
                name: m.name ?? null,
                color: m.color ?? null,
                icon: m.icon ?? null,
              })),
            },
      };

      logSaveDebug({ editingId, churchId, endpoint, method, payload });

      const res = editingId ? await apiPatch(endpoint, payload) : await apiPost(endpoint, payload);
      console.log("✅ RESPONSE", res);

      // limpa locais depois de salvar
      setCoverLocalUri("");
      setGalleryLocalUris([]);

      navigation?.goBack?.();
    } catch (e) {
      console.error("❌ SAVE ERROR", e);
      alert(String(e?.message || e));
    } finally {
      setUploadingCover(false);
      setUploadingGallery(false);
      setSaving(false);
    }
  }

  const previewData = useMemo(
    () => ({
      title,
      dateLabel,
      timeLabel,
      location,
      description,
      coverImageUrl: coverLocalUri || coverImageUrl,
      galleryUrls: [...galleryLocalUris, ...galleryUrls],
    }),
    [title, dateLabel, timeLabel, location, description, coverImageUrl, galleryUrls, coverLocalUri, galleryLocalUris]
  );

  return (
    <View style={styles.root}>
      {/* background blobs (tint/primary) */}
      <View style={styles.bg} pointerEvents="none">
        <View style={styles.blob1} />
        <View style={styles.blob2} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* PRÉVIA */}
        <EventPreviewCard
          mode={previewMode}
          data={previewData}
          onOpenFull={() => setPreviewFullOpen(true)}
          onPressImage={() => openImagesModal()}
          accentColor={eventColor}
          previewButton={
            <Menu
              visible={previewMenuOpen}
              onDismiss={() => setPreviewMenuOpen(false)}
              anchor={
                <Button
                  mode="contained-tonal"
                  icon="chevron-down"
                  onPress={() => setPreviewMenuOpen(true)}
                  style={{ borderRadius: 999 }}
                  compact
                  buttonColor={DS.colors.tint}
                  textColor={DS.colors.primaryDark}
                >
                  {previewMode === "mini" ? "Mínima" : "Completa"}
                </Button>
              }
            >
              <Menu.Item
                leadingIcon="card-text-outline"
                title="Prévia mínima"
                onPress={() => {
                  setPreviewMode("mini");
                  setPreviewMenuOpen(false);
                }}
              />
              <Menu.Item
                leadingIcon="card-bulleted-outline"
                title="Prévia completa"
                onPress={() => {
                  setPreviewMode("complete");
                  setPreviewMenuOpen(false);
                }}
              />
            </Menu>
          }
        />

        {/* Dados do evento */}
        <SectionHeader title="Dados do evento" subtitle="Título, data, hora (opcional) e local." />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={{ gap: 12 }}>
            <TextInput
              mode="outlined"
              label="Título"
              value={title}
              onChangeText={setTitle}
              left={<TextInput.Icon icon="format-title" color={DS.colors.textMuted} />}
              outlineColor={DS.colors.outline}
              activeOutlineColor={DS.colors.primary}
              textColor={DS.colors.text}
              placeholderTextColor={DS.colors.textMuted}
              style={{ backgroundColor: DS.colors.backgroundAlt }}
              outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <SelectField
                  label="Data"
                  value={dateLabel}
                  placeholder="Selecionar (dd/mm/aaaa)"
                  leftIcon="calendar"
                  onPress={openDatePicker}
                />
              </View>

              <View style={{ width: 140 }}>
                <SelectField
                  label="Hora"
                  value={timeLabel}
                  placeholder="Selecionar (hh:mm)"
                  leftIcon="clock-outline"
                  onPress={openTimePicker}
                />
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Local"
              value={location}
              onChangeText={setLocation}
              placeholder="Rua..., Bairro - Cidade"
              left={<TextInput.Icon icon="map-marker-outline" color={DS.colors.textMuted} />}
              outlineColor={DS.colors.outline}
              activeOutlineColor={DS.colors.primary}
              textColor={DS.colors.text}
              placeholderTextColor={DS.colors.textMuted}
              style={{ backgroundColor: DS.colors.backgroundAlt }}
              outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
            />

            <TextInput
              mode="outlined"
              label="Descrição (opcional)"
              value={description}
              onChangeText={setDescription}
              left={<TextInput.Icon icon="text-long" color={DS.colors.textMuted} />}
              multiline
              numberOfLines={4}
              outlineColor={DS.colors.outline}
              activeOutlineColor={DS.colors.primary}
              textColor={DS.colors.text}
              placeholderTextColor={DS.colors.textMuted}
              style={{ backgroundColor: DS.colors.backgroundAlt }}
              outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
            />
          </Card.Content>
        </Card>

        {/* Botão: Imagens + cor */}
        <SectionHeader title="Imagens e cor" subtitle="Capa, galeria e cor do evento." />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={{ gap: 10 }}>
            <Button
              mode="contained"
              icon="image-edit-outline"
              onPress={() => setImagesModalOpen(true)}
              style={{ borderRadius: DS.radius.lg }}
              contentStyle={{ height: 48 }}
              buttonColor={DS.colors.primary}
              textColor="#fff"
            >
              Abrir editor de imagens e cor
            </Button>

            <Surface elevation={0} style={[styles.noticeBox, { backgroundColor: DS.colors.tint }]}>
              <Icon source="palette-outline" size={18} color={eventColor || DS.colors.primary} />
              <Text style={{ color: DS.colors.textMuted, flex: 1 }}>
                Cor do evento: {eventColor ? eventColor : "Padrão do tema"}
              </Text>
            </Surface>
          </Card.Content>
        </Card>

        {/* Visibilidade */}
        <SectionHeader title="Visibilidade" subtitle="Quem pode ver este card." />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={{ gap: 12 }}>
            <SelectField
              label="Quem pode ver"
              value={visibilitySummaryLabel}
              placeholder="Toda a igreja"
              leftIcon="eye-outline"
              onPress={() => setVisibilityPickerOpen(true)}
            />

            {visibilityMode === "ministries" ? (
              visibilityMinistries.length === 0 ? (
                <Text style={{ color: DS.colors.textMuted }}>Selecione ao menos 1 ministério.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {visibilityMinistries.map((m) => (
                    <Surface key={m.id} elevation={0} style={styles.ministryRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                        <Avatar.Icon
                          size={44}
                          icon={() => <Icon source={m.icon || "layers-outline"} size={20} color="#fff" />}
                          style={{ backgroundColor: m.color || DS.colors.primary }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "900", color: DS.colors.text }}>{m.name || "Ministério"}</Text>
                          <Text style={{ color: DS.colors.textMuted }}>Pode ver</Text>
                        </View>
                      </View>

                      <IconButton icon="close" onPress={() => removeVisibilityMinistry(m.id)} iconColor={DS.colors.textMuted} />
                    </Surface>
                  ))}
                </View>
              )
            ) : null}
          </Card.Content>
        </Card>

        {/* MINISTÉRIOS */}
        <SectionHeader
          title="Ministérios e participantes"
          subtitle="Selecione ministérios e ajuste os participantes (cascade) que serão escalados."
        />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={{ gap: 12 }}>
            <SelectField
              label="Selecionar ministérios / participantes"
              value={ministriesSummaryLabel}
              placeholder="Toque para escolher"
              leftIcon="layers-outline"
              onPress={() => setSheetMinistriesOpen(true)}
            />

            {selectedMinistries.length === 0 ? (
              <Text style={{ color: DS.colors.textMuted }}>Nenhum ministério selecionado ainda.</Text>
            ) : (
              <>
                <View style={{ gap: 10 }}>
                  {selectedMinistries.map((m) => {
                    const total = (ministryMembersMap[m.id] || []).length;
                    const exc = (excludedByMinistry?.[m.id] || []).length;
                    const marked = Math.max(0, total - exc);

                    return (
                      <Surface key={m.id} elevation={0} style={styles.ministryRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                          <Avatar.Icon
                            size={44}
                            icon={() => <Icon source={m.icon || "layers-outline"} size={20} color="#fff" />}
                            style={{ backgroundColor: m.color || DS.colors.primary }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: "900", color: DS.colors.text }}>{m.name || "Ministério"}</Text>
                            <Text style={{ color: DS.colors.textMuted }}>
                              Membros: {total} • Marcados: {marked}
                            </Text>
                          </View>
                        </View>

                        <IconButton icon="close" onPress={() => removeSelectedMinistry(m.id)} iconColor={DS.colors.textMuted} />
                      </Surface>
                    );
                  })}
                </View>

                <Surface elevation={0} style={styles.noticeBox}>
                  <Icon source="checkbox-marked-circle-outline" size={18} color={DS.colors.primary} />
                  <Text style={{ color: DS.colors.textMuted, flex: 1 }}>
                    No seletor, ao selecionar um ministério ele abre os participantes (apenas um aberto por vez).
                  </Text>
                </Surface>

                <Surface elevation={0} style={styles.noticeBox}>
                  <Icon source="account-group-outline" size={18} color={DS.colors.primary} />
                  <Text style={{ color: DS.colors.textMuted, flex: 1 }}>
                    Total único (união): {uniquePeople.length} • Escalados: {scheduledCount}
                  </Text>
                </Surface>
              </>
            )}
          </Card.Content>
        </Card>

        {/* PARTICIPAÇÕES */}
        <SectionHeader
          title="Participações"
          subtitle="Cada participação tem um usuário (dropdown) e uma função (dropdown)."
          action={
            <Button
              mode="contained-tonal"
              icon="plus"
              onPress={addParticipation}
              style={{ borderRadius: DS.radius.md }}
              compact
              buttonColor={DS.colors.tint}
              textColor={DS.colors.primaryDark}
            >
              Adicionar
            </Button>
          }
        />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={{ gap: 12 }}>
            <View style={{ gap: 12 }}>
              {participations.map((p, idx) => {
                const userLabel = p.userId ? p.name : "";
                const roleLabelStr = (p.role || "").trim();
                const disableTrash = participations.length === 1;

                const roleColor = roleLabelStr ? getRoleColor(roleLabelStr) : DS.colors.primary;

                return (
                  <Surface
                    key={p.id}
                    elevation={0}
                    style={{
                      borderWidth: 1,
                      borderRadius: DS.radius.lg,
                      padding: 12,
                      borderColor: DS.colors.outline,
                      backgroundColor: DS.colors.surface,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            backgroundColor: roleLabelStr ? roleColor : DS.colors.tint,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon source="account-star-outline" size={18} color={roleLabelStr ? "#fff" : DS.colors.primary} />
                        </View>

                        <View>
                          <Text style={{ fontWeight: "900", color: DS.colors.text }}>{`Participação ${idx + 1}`}</Text>
                          <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                            {roleLabelStr || "Defina usuário e função"}
                          </Text>
                        </View>
                      </View>

                      <IconButton
                        icon="trash-can-outline"
                        disabled={disableTrash}
                        iconColor={disableTrash ? DS.colors.textMuted : DS.colors.error}
                        onPress={() => removeParticipation(p.id)}
                      />
                    </View>

                    <SelectField
                      label="Usuário"
                      value={userLabel}
                      placeholder="Selecionar usuário"
                      leftIcon="account-outline"
                      onPress={() => openUserPicker(p.id)}
                    />

                    <SelectField
                      label="Função"
                      value={roleLabelStr}
                      placeholder="Selecionar função"
                      leftIcon="briefcase-outline"
                      onPress={() => openRolePicker(p.id)}
                    />
                  </Surface>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Botão salvar */}
        <View style={{ marginTop: 18 }}>
          <Button
            mode="contained"
            icon="check"
            onPress={onSave}
            loading={saving}
            disabled={saving || !churchId}
            style={{ borderRadius: DS.radius.lg }}
            contentStyle={{ height: 52 }}
            buttonColor={DS.colors.primary}
            textColor="#fff"
          >
            Salvar
          </Button>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* ======================= ANDROID PICKERS ======================= */}
      {!isIOS && datePickerOpen ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setDatePickerOpen(false);
            if (event?.type === "set" && selected) setDateLabel(formatDateBR(selected));
          }}
        />
      ) : null}

      {!isIOS && timePickerOpen ? (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          is24Hour
          display="default"
          onChange={(event, selected) => {
            setTimePickerOpen(false);
            if (event?.type === "set" && selected) setTimeLabel(formatTimeHM(selected));
          }}
        />
      ) : null}

      {/* ======================= iOS PICKER: DATA ======================= */}
      <Portal>
        <Modal
          visible={isIOS && datePickerOpen}
          onDismiss={() => setDatePickerOpen(false)}
          contentContainerStyle={{ padding: 16 }}
        >
          <Surface elevation={0} style={styles.dialog}>
            <Text style={{ fontSize: DS.t.h2, fontWeight: "900", color: DS.colors.text }}>Selecionar data</Text>

            <View style={{ marginTop: 10 }}>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="spinner"
                onChange={(_, selected) => {
                  if (selected) setPickerValue(selected);
                }}
              />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <Button onPress={() => setDatePickerOpen(false)} textColor={DS.colors.textMuted}>
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  setDateLabel(formatDateBR(pickerValue));
                  setDatePickerOpen(false);
                }}
                buttonColor={DS.colors.primary}
                textColor="#fff"
                style={{ borderRadius: DS.radius.md }}
              >
                OK
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* ======================= iOS PICKER: HORA ======================= */}
      <Portal>
        <Modal
          visible={isIOS && timePickerOpen}
          onDismiss={() => setTimePickerOpen(false)}
          contentContainerStyle={{ padding: 16 }}
        >
          <Surface elevation={0} style={styles.dialog}>
            <Text style={{ fontSize: DS.t.h2, fontWeight: "900", color: DS.colors.text }}>Selecionar hora</Text>

            <View style={{ marginTop: 10 }}>
              <DateTimePicker
                value={pickerValue}
                mode="time"
                is24Hour
                display="spinner"
                onChange={(_, selected) => {
                  if (selected) setPickerValue(selected);
                }}
              />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <Button onPress={() => setTimePickerOpen(false)} textColor={DS.colors.textMuted}>
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  setTimeLabel(formatTimeHM(pickerValue));
                  setTimePickerOpen(false);
                }}
                buttonColor={DS.colors.primary}
                textColor="#fff"
                style={{ borderRadius: DS.radius.md }}
              >
                OK
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* ======================= MODAL: IMAGENS + COR (UPLOAD STORAGE) ======================= */}
      <Portal>
        <Modal visible={imagesModalOpen} onDismiss={() => setImagesModalOpen(false)} contentContainerStyle={{ flex: 1 }}>
          <Surface style={styles.fullWrap} elevation={0}>
            <View style={styles.fullHeader}>
              <Text style={{ fontSize: DS.t.h2, fontWeight: "900", color: DS.colors.text }}>Imagens e cor</Text>
              <IconButton icon="close" onPress={() => setImagesModalOpen(false)} iconColor={DS.colors.textMuted} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={{ gap: 14 }}>
                  {/* CAPA */}
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: DS.t.h3, fontWeight: "900", color: DS.colors.text }}>Capa do evento</Text>

                    <Button
                      mode="contained-tonal"
                      icon="image-plus"
                      buttonColor={DS.colors.tint}
                      textColor={DS.colors.primaryDark}
                      style={{ borderRadius: DS.radius.md, alignSelf: "flex-start" }}
                      loading={uploadingCover}
                      disabled={uploadingCover}
                      onPress={async () => {
                        const uri = await pickSingleImageFromLibrary();
                        if (!uri) return;
                        setCoverLocalUri(uri);
                      }}
                    >
                      Selecionar imagem
                    </Button>

                    {(coverLocalUri || coverImageUrl) ? (
                      <Surface
                        elevation={0}
                        style={{
                          height: 160,
                          borderRadius: DS.radius.lg,
                          overflow: "hidden",
                          borderWidth: 1,
                          borderColor: DS.colors.outline,
                          backgroundColor: DS.colors.tint,
                        }}
                      >
                        <Image
                          source={{ uri: coverLocalUri || coverImageUrl }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      </Surface>
                    ) : (
                      <Text style={{ color: DS.colors.textMuted }}>Nenhuma capa selecionada.</Text>
                    )}

                    {(coverLocalUri || coverImageUrl) ? (
                      <Button
                        mode="text"
                        icon="close"
                        textColor={DS.colors.error}
                        onPress={() => {
                          setCoverLocalUri("");
                          setCoverImageUrl("");
                        }}
                        style={{ alignSelf: "flex-start" }}
                      >
                        Remover capa
                      </Button>
                    ) : null}
                  </View>

                  <Divider style={{ backgroundColor: DS.colors.outline }} />

                  {/* GALERIA */}
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: DS.t.h3, fontWeight: "900", color: DS.colors.text }}>Galeria (opcional)</Text>

                    <Button
                      mode="contained-tonal"
                      icon="image-multiple"
                      buttonColor={DS.colors.tint}
                      textColor={DS.colors.primaryDark}
                      style={{ borderRadius: DS.radius.md, alignSelf: "flex-start" }}
                      loading={uploadingGallery}
                      disabled={uploadingGallery}
                      onPress={async () => {
                        const uris = await pickMultipleImageFromLibrarySafe(6);
                        if (!uris.length) return;
                        setGalleryLocalUris((prev) => {
                          const set = new Set([...(prev || []), ...uris]);
                          return Array.from(set);
                        });
                      }}
                    >
                      Adicionar imagens
                    </Button>

                    {([...galleryLocalUris, ...galleryUrls].length) ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          {[...galleryLocalUris, ...galleryUrls].map((u) => (
                            <Surface
                              key={u}
                              elevation={0}
                              style={{
                                width: 92,
                                height: 72,
                                borderRadius: DS.radius.lg,
                                overflow: "hidden",
                                backgroundColor: DS.colors.tint,
                                borderWidth: 1,
                                borderColor: DS.colors.outline,
                              }}
                            >
                              <Image source={{ uri: u }} style={{ width: "100%", height: "100%" }} />
                              <View style={{ position: "absolute", top: 4, right: 4 }}>
                                <IconButton
                                  icon="close"
                                  size={16}
                                  style={{ margin: 0 }}
                                  iconColor={DS.colors.textMuted}
                                  onPress={() => {
                                    setGalleryLocalUris((prev) => prev.filter((x) => x !== u));
                                    setGalleryUrls((prev) => prev.filter((x) => x !== u));
                                  }}
                                />
                              </View>
                            </Surface>
                          ))}
                        </View>
                      </ScrollView>
                    ) : (
                      <Text style={{ color: DS.colors.textMuted }}>Nenhuma imagem na galeria.</Text>
                    )}
                  </View>

                  <Divider style={{ backgroundColor: DS.colors.outline }} />

                  {/* COR DO EVENTO */}
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: DS.t.h3, fontWeight: "900", color: DS.colors.text }}>Cor do evento</Text>
                    <Text style={{ color: DS.colors.textMuted, fontSize: DS.t.body2 }}>
                      Esta cor será salva no banco e usada na Home/Lista de eventos.
                    </Text>

                    {/* padrão do tema */}
                    <Pressable onPress={() => setEventColor("")} style={{ width: "100%" }}>
                      <Surface
                        elevation={0}
                        style={[
                          styles.sheetRow,
                          {
                            borderColor: eventColor ? DS.colors.outline : DS.colors.primary,
                            backgroundColor: eventColor ? DS.colors.surface : DS.colors.tint,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                          <View style={styles.sheetIcon(DS.colors.primary)}>
                            <Icon source="palette-outline" size={18} color="#fff" />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: "900", color: DS.colors.text }}>Padrão do tema</Text>
                            <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                              Usa as cores do app
                            </Text>
                          </View>
                        </View>

                        {!eventColor ? <Icon source="check-circle" size={22} color={DS.colors.primary} /> : null}
                      </Surface>
                    </Pressable>

                    {/* grade 2 colunas */}
                    <View style={styles.colorGrid}>
                      {COLORS.map((c) => {
                        const selected = eventColor === c.hex;

                        return (
                          <Pressable key={c.hex} onPress={() => setEventColor(c.hex)} style={styles.colorCell}>
                            <Surface
                              elevation={0}
                              style={[
                                styles.sheetRow,
                                {
                                  borderColor: selected ? c.hex : DS.colors.outline,
                                  backgroundColor: selected ? withAlpha(c.hex, "14") : DS.colors.surface,
                                },
                              ]}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                                <View style={styles.sheetIcon(c.hex)}>
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

      {/* ======================= PREVIEW FULLSCREEN ======================= */}
      <Portal>
        <Modal visible={previewFullOpen} onDismiss={() => setPreviewFullOpen(false)} contentContainerStyle={{ flex: 1 }}>
          <Surface style={styles.fullWrap} elevation={0}>
            <View style={styles.fullHeader}>
              <Text style={{ fontSize: DS.t.h2, fontWeight: "900", color: DS.colors.text }}>Prévia (tela inteira)</Text>
              <IconButton icon="close" onPress={() => setPreviewFullOpen(false)} iconColor={DS.colors.textMuted} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
              <EventPreviewCard
                mode={previewMode}
                data={previewData}
                onPressImage={() => openImagesModal()}
                accentColor={eventColor}
              />
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>

      {/* ======================= DROPDOWN: VISIBILIDADE ======================= */}
      <BottomSheet
        visible={visibilityPickerOpen}
        onDismiss={() => setVisibilityPickerOpen(false)}
        title="Visibilidade"
        subtitle="Quem pode ver este card?"
        rightAction={
          <Button
            mode="contained"
            onPress={() => setVisibilityPickerOpen(false)}
            style={{ borderRadius: DS.radius.md }}
            buttonColor={DS.colors.primary}
            textColor="#fff"
          >
            OK
          </Button>
        }
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 14 }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => {
              setVisibilityAll();
              setVisibilityPickerOpen(false);
            }}
          >
            <Surface
              elevation={0}
              style={[
                styles.sheetRow,
                {
                  borderColor: visibilityMode === "all" ? DS.colors.primary : DS.colors.outline,
                  backgroundColor: visibilityMode === "all" ? DS.colors.tint : DS.colors.surface,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <View style={styles.sheetIcon(DS.colors.primary)}>
                  <Icon source="earth" size={18} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "900", color: DS.colors.text }}>Toda a igreja</Text>
                  <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                    Qualquer membro pode ver
                  </Text>
                </View>
              </View>

              {visibilityMode === "all" ? <Icon source="check-circle" size={22} color={DS.colors.primary} /> : null}
            </Surface>
          </Pressable>

          <Pressable onPress={() => setVisibilityByMinistry()}>
            <Surface
              elevation={0}
              style={[
                styles.sheetRow,
                {
                  borderColor: visibilityMode === "ministries" ? DS.colors.primary : DS.colors.outline,
                  backgroundColor: visibilityMode === "ministries" ? DS.colors.tint : DS.colors.surface,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <View style={styles.sheetIcon(DS.colors.primary)}>
                  <Icon source="layers-outline" size={18} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "900", color: DS.colors.text }}>Selecionar ministérios</Text>
                  <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                    Somente ministérios escolhidos
                  </Text>
                </View>
              </View>

              {visibilityMode === "ministries" ? <Icon source="check-circle" size={22} color={DS.colors.primary} /> : null}
            </Surface>
          </Pressable>

          {visibilityMode === "ministries" ? (
            <>
              <TextInput
                mode="outlined"
                value={ministryQuery}
                onChangeText={setMinistryQuery}
                placeholder="Buscar ministério..."
                left={<TextInput.Icon icon="magnify" color={DS.colors.textMuted} />}
                outlineColor={DS.colors.outline}
                activeOutlineColor={DS.colors.primary}
                textColor={DS.colors.text}
                placeholderTextColor={DS.colors.textMuted}
                style={{ backgroundColor: DS.colors.backgroundAlt }}
                outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
              />

              {ministriesError ? (
                <Surface style={styles.noticeBox} elevation={0}>
                  <Icon source="alert-circle-outline" size={18} color={DS.colors.error} />
                  <Text style={{ color: DS.colors.error, flex: 1 }}>{ministriesError}</Text>
                </Surface>
              ) : null}

              {ministriesLoading ? (
                <View style={{ paddingTop: 10, alignItems: "center" }}>
                  <ActivityIndicator />
                </View>
              ) : ministries.length === 0 ? (
                <EmptyState icon="layers-outline" title="Nenhum ministério" description="Não encontramos ministérios." />
              ) : (
                ministries.map((m) => {
                  const selected = visibilityMinistries.some((x) => x.id === m.id);

                  return (
                    <Pressable key={m.id} onPress={() => toggleVisibilityMinistry(m)}>
                      <Surface
                        elevation={0}
                        style={[
                          styles.sheetRow,
                          {
                            backgroundColor: selected ? DS.colors.tint : DS.colors.surface,
                            borderColor: selected ? DS.colors.primary : DS.colors.outline,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                          <View style={styles.sheetIcon(m.color || DS.colors.primary)}>
                            <Icon source={m.icon || "layers-outline"} size={18} color="#fff" />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: "900", color: DS.colors.text }}>{m.name || "Ministério"}</Text>
                            <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                              {m.description || (selected ? "Selecionado" : "Toque para selecionar")}
                            </Text>
                          </View>
                        </View>

                        {selected ? <Icon source="check-circle" size={22} color={DS.colors.primary} /> : null}
                      </Surface>
                    </Pressable>
                  );
                })
              )}
            </>
          ) : null}
        </ScrollView>
      </BottomSheet>

      {/* ======================= DROPDOWN: MINISTRIES + PARTICIPANTES ======================= */}
      <BottomSheet
        visible={sheetMinistriesOpen}
        onDismiss={() => setSheetMinistriesOpen(false)}
        title="Selecionar ministérios"
        subtitle="Toque no ministério para selecionar e abrir os participantes. Apenas 1 aberto por vez."
        rightAction={
          <Button
            mode="contained"
            onPress={() => setSheetMinistriesOpen(false)}
            style={{ borderRadius: DS.radius.md }}
            buttonColor={DS.colors.primary}
            textColor="#fff"
          >
            OK
          </Button>
        }
      >
        <TextInput
          mode="outlined"
          value={ministryQuery}
          onChangeText={setMinistryQuery}
          placeholder="Buscar ministério..."
          left={<TextInput.Icon icon="magnify" color={DS.colors.textMuted} />}
          outlineColor={DS.colors.outline}
          activeOutlineColor={DS.colors.primary}
          textColor={DS.colors.text}
          placeholderTextColor={DS.colors.textMuted}
          style={{ backgroundColor: DS.colors.backgroundAlt }}
          outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
        />

        {ministriesError ? (
          <Surface style={styles.noticeBox} elevation={0}>
            <Icon source="alert-circle-outline" size={18} color={DS.colors.error} />
            <Text style={{ color: DS.colors.error, flex: 1 }}>{ministriesError}</Text>
          </Surface>
        ) : null}

        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: DS.t.h3, fontWeight: "900", color: DS.colors.text }}>Participantes (cascade)</Text>
            <Text style={{ color: DS.colors.textMuted }}>
              Total único: {uniquePeople.length} • Marcados: {scheduledCount} • Desmarcados: {excludedUserIds.length}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              mode="contained-tonal"
              onPress={includeAllPeople}
              compact
              disabled={!selectedMinistries.length}
              buttonColor={DS.colors.tint}
              textColor={DS.colors.primaryDark}
              style={{ borderRadius: DS.radius.md }}
            >
              Marcar
            </Button>
            <Button
              mode="contained-tonal"
              onPress={excludeAllPeople}
              compact
              disabled={!selectedMinistries.length}
              buttonColor={DS.colors.tint}
              textColor={DS.colors.primaryDark}
              style={{ borderRadius: DS.radius.md }}
            >
              Desmarcar
            </Button>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <TextInput
            mode="outlined"
            value={peopleQuery}
            onChangeText={setPeopleQuery}
            placeholder="Buscar participante..."
            left={<TextInput.Icon icon="magnify" color={DS.colors.textMuted} />}
            outlineColor={DS.colors.outline}
            activeOutlineColor={DS.colors.primary}
            textColor={DS.colors.text}
            placeholderTextColor={DS.colors.textMuted}
            style={{ backgroundColor: DS.colors.backgroundAlt }}
            outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
          />
        </View>

        <View style={{ marginTop: 10, flex: 1 }}>
          {ministriesLoading && ministriesForPicker.length === 0 ? (
            <View style={{ paddingTop: 10, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : ministriesForPicker.length === 0 ? (
            <EmptyState icon="layers-outline" title="Nenhum ministério" description="Não encontramos ministérios." />
          ) : (
            <FlatList
              data={pickerCascadeData}
              renderItem={renderPickerCascadeItem}
              keyExtractor={(item) => item.key}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 14 }}
            />
          )}
        </View>
      </BottomSheet>

      {/* ======================= DROPDOWN: USERS ======================= */}
      <BottomSheet
        visible={userPickerOpen}
        onDismiss={() => setUserPickerOpen(false)}
        title="Selecionar usuário"
        subtitle="Escolha o membro para esta participação."
      >
        <TextInput
          mode="outlined"
          value={userQuery}
          onChangeText={setUserQuery}
          placeholder="Buscar membro..."
          left={<TextInput.Icon icon="magnify" color={DS.colors.textMuted} />}
          outlineColor={DS.colors.outline}
          activeOutlineColor={DS.colors.primary}
          textColor={DS.colors.text}
          placeholderTextColor={DS.colors.textMuted}
          style={{ backgroundColor: DS.colors.backgroundAlt }}
          outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
        />

        {usersError ? (
          <Surface style={styles.noticeBox} elevation={0}>
            <Icon source="alert-circle-outline" size={18} color={DS.colors.error} />
            <Text style={{ color: DS.colors.error, flex: 1 }}>{usersError}</Text>
          </Surface>
        ) : null}

        <ScrollView
          style={{ flex: 1, marginTop: 12 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 14 }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {usersLoading ? (
            <View style={{ paddingTop: 10, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : users.length === 0 ? (
            <EmptyState icon="account-search-outline" title="Nenhum usuário" description="Não encontramos membros." />
          ) : (
            users.map((u) => {
              const alreadyPickedSomewhere = pickedUserIds.has(u.id);
              const isThisRow =
                activeParticipationId && participations.some((p) => p.id === activeParticipationId && p.userId === u.id);

              return (
                <Pressable key={u.id} onPress={() => pickUser(u)} disabled={alreadyPickedSomewhere && !isThisRow}>
                  <Surface
                    elevation={0}
                    style={[
                      styles.sheetRow,
                      {
                        backgroundColor: isThisRow ? DS.colors.tint : DS.colors.surface,
                        borderColor: isThisRow ? DS.colors.primary : DS.colors.outline,
                        opacity: alreadyPickedSomewhere && !isThisRow ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      <Avatar.Text
                        size={38}
                        label={(u.name || "?").slice(0, 2).toUpperCase()}
                        style={{ backgroundColor: DS.colors.tint }}
                        color={DS.colors.primary}
                        labelStyle={{ fontWeight: "900" }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "900", color: DS.colors.text }}>{u.name || "Sem nome"}</Text>
                        <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                          {alreadyPickedSomewhere && !isThisRow ? "Já selecionado em outra participação" : u.email || " "}
                        </Text>
                      </View>
                    </View>

                    {isThisRow ? <Icon source="check-circle" size={22} color={DS.colors.primary} /> : null}
                  </Surface>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </BottomSheet>

      {/* ======================= DROPDOWN: ROLE/FUNÇÃO ======================= */}
      <BottomSheet
        visible={rolePickerOpen}
        onDismiss={() => setRolePickerOpen(false)}
        title="Selecionar função"
        subtitle="Escolha uma função rápida ou informe uma personalizada."
        rightAction={
          <Button
            mode="contained"
            onPress={applyCustomRole}
            style={{ borderRadius: DS.radius.md }}
            buttonColor={DS.colors.primary}
            textColor="#fff"
          >
            Aplicar
          </Button>
        }
      >
        <TextInput
          mode="outlined"
          value={roleCustomInput}
          onChangeText={setRoleCustomInput}
          placeholder="Função personalizada (opcional)"
          label="Função"
          left={<TextInput.Icon icon="briefcase-outline" color={DS.colors.textMuted} />}
          outlineColor={DS.colors.outline}
          activeOutlineColor={DS.colors.primary}
          textColor={DS.colors.text}
          placeholderTextColor={DS.colors.textMuted}
          style={{ backgroundColor: DS.colors.backgroundAlt }}
          outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
        />

        <ScrollView
          style={{ flex: 1, marginTop: 12 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 14 }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {ROLE_PRESETS.map((r) => {
            const c = getRoleColor(r);
            const currentRole = (participations.find((x) => x.id === activeParticipationId)?.role || "").trim();
            const selected = currentRole === r;

            return (
              <Pressable key={r} onPress={() => pickRole(r)}>
                <Surface
                  elevation={0}
                  style={[
                    styles.sheetRow,
                    {
                      borderColor: selected ? c : DS.colors.outline,
                      backgroundColor: selected ? withAlpha(c, "14") : DS.colors.surface,
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <View style={styles.sheetIcon(c)}>
                      <Icon source="briefcase-outline" size={18} color="#fff" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "900", color: DS.colors.text }}>{r}</Text>
                      <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                        {selected ? "Selecionado" : "Toque para selecionar"}
                      </Text>
                    </View>
                  </View>

                  {selected ? <Icon source="check-circle" size={22} color={c} /> : null}
                </Surface>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

// ✅ Pequeno helper porque eu usei um nome seguro no modal (para evitar typo)
async function pickMultipleImageFromLibrarySafe(limit = 6) {
  try {
    return await pickMultipleImagesFromLibrary(limit);
  } catch (e) {
    console.log("pickMultipleImagesFromLibrary error:", e?.message || e);
    return [];
  }
}

// ============================================================================
// Styles
// ============================================================================

function createStyles() {
  return {
    root: { flex: 1, backgroundColor: DS.colors.background },
    container: { padding: DS.space(2), paddingBottom: DS.space(3) },

    bg: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, overflow: "hidden" },
    blob1: {
      position: "absolute",
      width: 460,
      height: 460,
      borderRadius: 999,
      backgroundColor: DS.colors.tint,
      top: -260,
      right: -180,
      opacity: 0.55,
    },
    blob2: {
      position: "absolute",
      width: 340,
      height: 340,
      borderRadius: 999,
      backgroundColor: DS.colors.accent,
      bottom: -190,
      left: -160,
      opacity: 0.12,
    },

    card: {
      borderRadius: DS.radius.lg,
      overflow: "hidden",
      borderColor: DS.colors.outline,
      backgroundColor: DS.colors.surface,
    },

    ministryRow: {
      borderWidth: 1,
      borderRadius: DS.radius.lg,
      padding: 12,
      borderColor: DS.colors.outline,
      backgroundColor: DS.colors.surface,
    },

    noticeBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: DS.radius.md,
      backgroundColor: DS.colors.tint,
      borderWidth: 1,
      borderColor: DS.colors.outline,
    },

    sheetRow: {
      borderWidth: 1,
      borderRadius: DS.radius.lg,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderColor: DS.colors.outline,
      backgroundColor: DS.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    sheetIcon: (bg) => ({
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: bg,
      alignItems: "center",
      justifyContent: "center",
    }),

    dialog: {
      padding: 16,
      borderRadius: DS.radius.lg,
      borderWidth: 1,
      borderColor: DS.colors.outline,
      backgroundColor: DS.colors.surface,
    },

    colorGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 10,
    },

    colorCell: { width: "48%" },

    fullWrap: { flex: 1, backgroundColor: DS.colors.background },
    fullHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: DS.colors.outline,
      backgroundColor: DS.colors.surface,
    },
  };
}
