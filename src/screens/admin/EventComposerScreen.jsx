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
import { getAuth } from "@react-native-firebase/auth";
import { launchImageLibrary } from "react-native-image-picker";
import { useAuth } from "../../context/AuthContext";

// ─── Design System ────────────────────────────────────────────────────────────
// Alinhado ao Design Manual ChurchApp (navy #1A2366, brand #4158D0)

const DS = {
  colors: {
    primary:       "#4158D0",   // Brand Blue do manual
    primaryDark:   "#2E3FA8",
    accent:        "#6A80E8",
    tint:          "#EEF0FA",   // Brand Light do manual
    error:         "#E84D4D",   // Danger do manual
    background:    "#F5F6FA",   // Background do manual
    backgroundAlt: "#F7F8FC",
    surface:       "#FFFFFF",
    text:          "#1A2366",   // Navy do manual
    textMuted:     "#9198B5",   // Muted do manual
    outline:       "#E4E6F0",   // Border do manual
    success:       "#2DBF8A",   // Success do manual
    warning:       "#F5A623",   // Warning do manual
  },
  radius: { sm: 12, md: 16, lg: 20, xl: 28 },
  t:      { h1: 28, h2: 24, h3: 20, body: 16, body2: 14, caption: 12 },
  space:  (n) => n * 8,
};

function withAlpha(hex, alphaHex = "14") {
  const h = String(hex || "").trim();
  if (!h) return hex;
  if (h.startsWith("#") && h.length === 7) return `${h}${alphaHex}`;
  return h;
}

// ─── Paleta de cores do evento ────────────────────────────────────────────────
// Mesmas cores do manual: usadas no gradiente do card da HomeScreen

const COLORS = [
  { hex: "#4158D0", name: "Azul (padrão)"  },
  { hex: "#7C3AED", name: "Roxo"           },
  { hex: "#EC4899", name: "Rosa"           },
  { hex: "#14B8A6", name: "Teal"           },
  { hex: "#2DBF8A", name: "Verde"          },
  { hex: "#F5A623", name: "Âmbar"          },
  { hex: "#E84D4D", name: "Vermelho"       },
  { hex: "#0EA5E9", name: "Ciano"          },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (r.includes("dire") || r.includes("abert")) return "#4158D0";
  if (r.includes("palavr") || r.includes("preg"))  return "#2DBF8A";
  if (r.includes("ofert") || r.includes("colet"))  return "#F5A623";
  if (r.includes("louv") || r.includes("mús"))      return "#EC4899";
  if (r.includes("mídi") || r.includes("som"))      return "#0EA5E9";
  if (r.includes("recep") || r.includes("acolh"))   return "#14B8A6";
  if (r.includes("interc") || r.includes("orac"))   return "#7C3AED";
  if (r.includes("apoio") || r.includes("suport"))  return "#E84D4D";
  return pickFromPalette(role);
}

function pad2(n) { return String(n).padStart(2, "0"); }
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
  const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const dd = Number(match[1]), mm = Number(match[2]), yyyy = Number(match[3]);
  const date = new Date(yyyy, mm - 1, dd);
  if (date.getFullYear() !== yyyy || date.getMonth() !== mm - 1 || date.getDate() !== dd) return null;
  return date;
}
function isValidTimeHM(label) {
  const s = String(label || "").trim();
  const match = s.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59;
}
function normalizeDateLabel(label) {
  const s = String(label || "").trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return s;
  return formatDateBR(new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
}
function dateBRToISO(label) {
  const date = parseDateBR(label);
  if (!date) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// ─── blocks <-> participations ────────────────────────────────────────────────

function blocksToParticipations(blocks) {
  const out = [];
  for (const block of blocks || []) {
    const roleFromBlock = block?.title || "Participação";
    for (const person of block?.people || []) {
      out.push({ id: makeId("part"), userId: person?.userId || null, name: person?.name || "Sem nome", role: person?.role || roleFromBlock });
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
    id: makeId("blk"), title: role, icon: "account-group-outline", people,
  }));
}

// ─── Firebase Storage helpers ─────────────────────────────────────────────────

function isHttpUrl(value) { return /^https?:\/\//i.test(String(value || "").trim()); }
function isFirebaseStorageUrl(value) { return String(value || "").includes("firebasestorage.googleapis.com"); }

function normalizeFileUri(uri) {
  let u = String(uri || "").trim();
  if (!u) return "";
  if (Platform.OS === "ios") u = u.replace(/^file:\/\//, "");
  return u;
}
function guessContentType(uri) {
  const c = String(uri || "").toLowerCase();
  if (c.includes(".png"))  return "image/png";
  if (c.includes(".webp")) return "image/webp";
  if (c.includes(".heic")) return "image/heic";
  return "image/jpeg";
}
function guessExtension(uri) {
  const c = String(uri || "").toLowerCase().split("?")[0];
  if (c.endsWith(".png"))  return "png";
  if (c.endsWith(".webp")) return "webp";
  if (c.endsWith(".heic")) return "heic";
  return "jpg";
}

async function pickSingleImageFromLibrary() {
  const res = await launchImageLibrary({ mediaType: "photo", selectionLimit: 1, quality: 0.85 });
  if (res.didCancel) return null;
  const uri = res.assets?.[0]?.uri;
  console.log("🟦 [ImagePicker] capa:", { uri, size: res.assets?.[0]?.fileSize });
  return uri ? normalizeFileUri(uri) : null;
}

async function pickMultipleImagesFromLibrary(limit = 6) {
  const res = await launchImageLibrary({ mediaType: "photo", selectionLimit: limit, quality: 0.85 });
  if (res.didCancel) return [];
  return (res.assets || []).map((a) => normalizeFileUri(a.uri)).filter(Boolean);
}

async function deleteStorageImageIfNeeded(url) {
  if (!url || !isHttpUrl(url) || !isFirebaseStorageUrl(url)) return;
  try { await storage().refFromURL(url).delete(); console.log("🗑️ [Storage] removida:", url); }
  catch (e) { console.log("⚠️ [Storage] não removida:", e?.code); }
}

async function uploadFileToStorage({ localUri, churchId, eventIdOrTemp, kind = "gallery", onProgress }) {
  if (!localUri) return null;
  const fbUser = getAuth().currentUser;
  if (!fbUser?.uid) throw new Error("Usuário não autenticado no Firebase.");

  const ext = guessExtension(localUri);
  const ct  = guessContentType(localUri);
  const filename = `${kind}-${Date.now()}.${ext}`;
  const storagePath = `images/events/${churchId}/${eventIdOrTemp}/${kind}/${filename}`;

  console.log("🟦 [Storage] upload →", { kind, storagePath });

  const ref  = storage().ref(storagePath);
  const task = ref.putFile(normalizeFileUri(localUri), {
    contentType: ct,
    customMetadata: { churchId, eventId: eventIdOrTemp, uploadedBy: fbUser.uid, kind },
  });

  task.on("state_changed", (snap) => {
    if (!snap.totalBytes) return;
    const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
    console.log(`📤 [Storage] ${kind}: ${pct}%`);
    onProgress?.(pct);
  });

  await task;
  const url = await ref.getDownloadURL();
  console.log("🟩 [Storage] concluído:", { kind, url });
  return url;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useChurchUsers({ churchId, enabled, q, apiGet }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const rid = useRef(0);

  const reload = useCallback(async () => {
    const id = ++rid.current;
    setLoading(true); setError(null);
    try {
      if (!enabled || !churchId) { setItems([]); return; }
      const qs = new URLSearchParams({ take: "120" });
      const term = (q || "").trim();
      if (term) qs.set("q", term);
      const json = await apiGet(`/churches/${churchId}/users?${qs}`);
      if (id !== rid.current) return;
      setItems(Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : []);
    } catch (e) { if (id !== rid.current) return; setError(String(e?.message || e)); setItems([]); }
    finally { if (id === rid.current) setLoading(false); }
  }, [enabled, churchId, q, apiGet]);

  useEffect(() => { reload(); }, [enabled, churchId]);
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(reload, 300);
    return () => clearTimeout(t);
  }, [q, enabled]);

  return { items, loading, error, reload };
}

function useChurchMinistries({ churchId, enabled, q, apiGet }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const rid = useRef(0);

  const reload = useCallback(async () => {
    const id = ++rid.current;
    setLoading(true); setError(null);
    try {
      if (!enabled || !churchId) { setItems([]); return; }
      const qs = new URLSearchParams({ take: "200" });
      const term = (q || "").trim();
      if (term) qs.set("q", term);
      const json = await apiGet(`/churches/${churchId}/ministries?${qs}`);
      if (id !== rid.current) return;
      setItems(Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : []);
    } catch (e) { if (id !== rid.current) return; setError(String(e?.message || e)); setItems([]); }
    finally { if (id === rid.current) setLoading(false); }
  }, [enabled, churchId, q, apiGet]);

  useEffect(() => { reload(); }, [enabled, churchId]);
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(reload, 300);
    return () => clearTimeout(t);
  }, [q, enabled]);

  return { items, loading, error, reload };
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action }) {
  return (
    <View style={{ marginTop: DS.space(2), marginBottom: DS.space(1) }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: DS.t.h3, fontWeight: "900", color: DS.colors.text, letterSpacing: -0.3 }}>{title}</Text>
          {subtitle ? <Text style={{ color: DS.colors.textMuted, marginTop: 4, lineHeight: 20, fontSize: DS.t.body2 }}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
    </View>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: DS.space(3), borderRadius: DS.radius.lg, backgroundColor: DS.colors.tint, borderWidth: 1.5, borderColor: DS.colors.outline, borderStyle: "dashed" }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: DS.colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 1, borderColor: DS.colors.outline }}>
        <Icon source={icon} size={28} color={DS.colors.textMuted} />
      </View>
      <Text style={{ fontSize: DS.t.h3, fontWeight: "900", marginBottom: 6, textAlign: "center", color: DS.colors.text }}>{title}</Text>
      <Text style={{ color: DS.colors.textMuted, textAlign: "center", fontSize: DS.t.body2 }}>{description}</Text>
      {action ? <View style={{ marginTop: 14, width: "100%" }}>{action}</View> : null}
    </View>
  );
}

function BottomSheet({ visible, onDismiss, title, subtitle, children, rightAction }) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={{ flex: 1, justifyContent: "flex-end" }}>
        <Surface elevation={0} style={{ backgroundColor: DS.colors.surface, borderTopLeftRadius: DS.radius.xl, borderTopRightRadius: DS.radius.xl, padding: DS.space(2), height: "86%", borderWidth: 1, borderColor: DS.colors.outline }}>
          <View style={{ alignItems: "center", paddingBottom: DS.space(1) }}>
            <View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: DS.colors.outline }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: DS.t.h2, fontWeight: "900", color: DS.colors.text }}>{title}</Text>
              {subtitle ? <Text style={{ color: DS.colors.textMuted, marginTop: 2, fontSize: DS.t.body2 }}>{subtitle}</Text> : null}
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
        mode="outlined" label={label} value={value || ""} placeholder={placeholder}
        editable={false}
        left={leftIcon ? <TextInput.Icon icon={leftIcon} color={DS.colors.textMuted} /> : null}
        right={<TextInput.Icon icon="chevron-down" color={DS.colors.textMuted} />}
        pointerEvents="none"
        outlineColor={DS.colors.outline} activeOutlineColor={DS.colors.primary}
        textColor={DS.colors.text} placeholderTextColor={DS.colors.textMuted}
        style={{ backgroundColor: DS.colors.backgroundAlt }}
        outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }}
      />
      <Pressable onPress={onPress} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
    </View>
  );
}

// ─── Preview Card ─────────────────────────────────────────────────────────────

function EventPreviewCard({ mode = "mini", data, onOpenFull, onPressImage, previewButton, accentColor }) {
  const { title, dateLabel, timeLabel, location, description, coverImageUrl, galleryUrls } = data;
  const showDescription = mode === "complete";
  const showGallery = mode === "complete" && (galleryUrls || []).length > 0;
  const heroHeight = mode === "mini" ? 148 : 196;
  const when  = [dateLabel, timeLabel].filter(Boolean).join(" • ");
  const where = (location || "").trim() || "Local do evento";
  const accent = (accentColor || "").trim() || DS.colors.primary;

  return (
    <Card mode="outlined" style={{ borderRadius: DS.radius.lg, overflow: "hidden", borderColor: DS.colors.outline, backgroundColor: DS.colors.surface }}>
      {/* Faixa de acento no topo — igual ao card da HomeScreen */}
      <View style={{ height: 4, backgroundColor: accent }} />
      <View style={{ height: heroHeight, backgroundColor: withAlpha(accent, "14") }}>
        <Pressable onPress={onPressImage} style={{ flex: 1 }}>
          {coverImageUrl ? (
            <ImageBackground source={{ uri: coverImageUrl }} style={{ flex: 1 }} resizeMode="cover">
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 60, backgroundColor: "rgba(0,0,0,0.30)" }} />
            </ImageBackground>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
              <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: withAlpha(accent, "22"), alignItems: "center", justifyContent: "center" }}>
                <Icon source="image-plus" size={26} color={accent} />
              </View>
              <Text style={{ color: DS.colors.textMuted, fontSize: 13 }}>Toque para adicionar capa</Text>
            </View>
          )}
        </Pressable>
        {/* Botão editar imagem */}
        <View style={{ position: "absolute", top: 10, right: 10 }}>
          <Surface elevation={0} style={{ borderRadius: 999, overflow: "hidden", backgroundColor: coverImageUrl ? "rgba(0,0,0,0.35)" : DS.colors.surface, borderWidth: 1, borderColor: coverImageUrl ? "rgba(255,255,255,0.25)" : DS.colors.outline }}>
            <IconButton icon="image-edit-outline" size={18} style={{ margin: 0 }} iconColor={coverImageUrl ? "#fff" : DS.colors.textMuted} onPress={onPressImage} />
          </Surface>
        </View>
      </View>

      <Card.Content style={{ paddingTop: 14, paddingBottom: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text style={{ fontSize: DS.t.h2, fontWeight: "900", flex: 1, color: DS.colors.text, letterSpacing: -0.4 }} numberOfLines={2}>
            {title?.trim() || "Evento"}
          </Text>
          {previewButton ? <View>{previewButton}</View> : null}
        </View>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon source="calendar-blank-outline" size={16} color={accent} />
            <Text style={{ color: DS.colors.textMuted, flex: 1 }} numberOfLines={1}>{when || "Data • Hora"}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon source="map-marker-outline" size={16} color={accent} />
            <Text style={{ color: DS.colors.textMuted, flex: 1 }} numberOfLines={2}>{where}</Text>
          </View>
        </View>
        {showDescription ? (
          <View style={{ marginTop: 4, padding: 12, borderRadius: DS.radius.md, backgroundColor: withAlpha(accent, "14"), borderWidth: 1, borderColor: withAlpha(accent, "30") }}>
            <Text style={{ color: DS.colors.text, lineHeight: 20 }}>{description?.trim() || "Descrição do evento..."}</Text>
          </View>
        ) : null}
        {showGallery ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {galleryUrls.map((url) => (
                <Surface key={url} elevation={0} style={{ width: 84, height: 64, borderRadius: DS.radius.md, overflow: "hidden", backgroundColor: DS.colors.tint, borderWidth: 1, borderColor: DS.colors.outline }}>
                  <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} />
                </Surface>
              ))}
            </View>
          </ScrollView>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          {/* Chip "Em breve" — igual ao HomeScreen */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: withAlpha(accent, "22") }}>
            <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: accent }} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: accent }}>Em breve</Text>
          </View>
          {onOpenFull ? (
            <Button mode="text" onPress={onOpenFull} icon="arrow-expand" textColor={DS.colors.primary} compact>
              Tela inteira
            </Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeMinistry(ministry) {
  if (!ministry) return { id: makeId("min"), name: "Ministério", color: null, icon: null, description: null };
  return { id: ministry.id, name: ministry.name ?? "Ministério", color: ministry.color ?? null, icon: ministry.icon ?? null, description: ministry.description ?? null };
}

function normalizeParticipations(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.length > 0 ? arr : [{ id: makeId("part"), userId: null, name: "", role: "" }];
}

function memberId(item)    { return item?.userId || item?.id || item?.user?.id || null; }
function memberName(item)  { return item?.name || item?.user?.name || "Sem nome"; }
function memberEmail(item) { return item?.email || item?.user?.email || ""; }
function memberPhoto(item) { return item?.photoUrl || item?.avatarUrl || item?.user?.photoUrl || ""; }

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EventComposerScreen(props) {
  useTheme();
  const styles = createStyles();
  const navigation = props?.navigation;
  const route      = props?.route;
  const editingId  = route?.params?.id ?? null;

  const { activeChurchId, activeChurch, apiFetchAuth } = useAuth();
  const churchId = activeChurchId || activeChurch?.id || null;

  const apiGet  = useCallback((path)        => apiFetchAuth(path, { method: "GET" }), [apiFetchAuth]);
  const apiPost = useCallback((path, body)  => apiFetchAuth(path, { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), [apiFetchAuth]);
  const apiPatch= useCallback((path, body)  => apiFetchAuth(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), [apiFetchAuth]);

  const scrollRef = useRef(null);
  const isIOS = Platform.OS === "ios";

  // ── Form state ──────────────────────────────────────────────────────────────
  const [saving,          setSaving]          = useState(false);
  const [title,           setTitle]           = useState("");
  const [description,     setDescription]     = useState("");
  const [dateLabel,       setDateLabel]       = useState("");
  const [timeLabel,       setTimeLabel]       = useState("");
  const [location,        setLocation]        = useState("");

  // 🖼️ Imagens — coverImageUrl é o campo do banco (Event.coverImageUrl)
  const [coverImageUrl,   setCoverImageUrl]   = useState("");   // URL salva no banco
  const [galleryUrls,     setGalleryUrls]     = useState([]);   // URLs salvas no banco
  const [coverLocalUri,   setCoverLocalUri]   = useState("");   // URI local antes do upload
  const [galleryLocalUris,setGalleryLocalUris]= useState([]);   // URIs locais antes do upload
  const [uploadingCover,  setUploadingCover]  = useState(false);
  const [uploadingGallery,setUploadingGallery]= useState(false);

  // 🎨 Cor do acento — salva como campo separado (não conflita com o banco)
  // NOTA: O modelo Event NÃO tem campo "color" — usamos "eventColor" apenas localmente
  // para colorir o preview. A cor real vem do ministério (ministry.color).
  // Se quiser persistir a cor do evento, adicione o campo ao schema Prisma.
  const [eventColor,      setEventColor]      = useState("");

  // ── Ministérios ─────────────────────────────────────────────────────────────
  const [selectedMinistries,   setSelectedMinistries]   = useState([]);
  const [ministryQuery,        setMinistryQuery]        = useState("");
  const [sheetMinistriesOpen,  setSheetMinistriesOpen]  = useState(false);
  const [ministryMembersMap,   setMinistryMembersMap]   = useState({});
  const [peopleLoading,        setPeopleLoading]        = useState(false);
  const [peopleQuery,          setPeopleQuery]          = useState("");
  const [excludedByMinistry,   setExcludedByMinistry]   = useState({});
  const [expandedMinistryId,   setExpandedMinistryId]   = useState(null);

  // ── Visibilidade ────────────────────────────────────────────────────────────
  const [visibilityMode,       setVisibilityMode]       = useState("all");
  const [visibilityPickerOpen, setVisibilityPickerOpen] = useState(false);
  const [visibilityMinistries, setVisibilityMinistries] = useState([]);

  // ── Participações ───────────────────────────────────────────────────────────
  const [participations,      setParticipations]      = useState(() => normalizeParticipations([{ id: makeId("part"), userId: null, name: "", role: "" }]));
  const [userPickerOpen,      setUserPickerOpen]      = useState(false);
  const [userQuery,           setUserQuery]           = useState("");
  const [activePartId,        setActivePartId]        = useState(null);
  const [rolePickerOpen,      setRolePickerOpen]      = useState(false);
  const [roleCustomInput,     setRoleCustomInput]     = useState("");

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [previewMode,     setPreviewMode]     = useState("mini");
  const [previewFullOpen, setPreviewFullOpen] = useState(false);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [imagesModalOpen, setImagesModalOpen] = useState(false);
  const [datePickerOpen,  setDatePickerOpen]  = useState(false);
  const [timePickerOpen,  setTimePickerOpen]  = useState(false);
  const [pickerValue,     setPickerValue]     = useState(new Date());

  // ── Data queries ────────────────────────────────────────────────────────────
  const { items: users,      loading: usersLoading,      error: usersError }      = useChurchUsers({ churchId, enabled: userPickerOpen, q: userQuery, apiGet });
  const { items: ministries, loading: ministriesLoading, error: ministriesError } = useChurchMinistries({ churchId, enabled: sheetMinistriesOpen || visibilityPickerOpen, q: ministryQuery, apiGet });

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedMinistryIdsKey = useMemo(() => selectedMinistries.map((m) => m.id).sort().join("|"), [selectedMinistries]);
  const selectedMinistryIdSet  = useMemo(() => new Set(selectedMinistries.map((m) => m.id)), [selectedMinistries]);

  const ministriesSummaryLabel = useMemo(() => {
    if (!selectedMinistries.length) return "";
    const names = selectedMinistries.slice(0, 2).map((m) => m.name).filter(Boolean).join(", ");
    return selectedMinistries.length <= 2 ? names : `${names} +${selectedMinistries.length - 2}`;
  }, [selectedMinistries]);

  const visibilitySummaryLabel = useMemo(() => {
    if (visibilityMode === "all") return "Toda a igreja";
    if (!visibilityMinistries.length) return "Selecionar ministérios...";
    const names = visibilityMinistries.slice(0, 2).map((m) => m.name).filter(Boolean).join(", ");
    return visibilityMinistries.length <= 2 ? names : `${names} +${visibilityMinistries.length - 2}`;
  }, [visibilityMode, visibilityMinistries]);

  const uniquePeople = useMemo(() => {
    const set = new Set();
    for (const m of selectedMinistries)
      for (const item of ministryMembersMap[m.id] || []) { const uid = memberId(item); if (uid) set.add(uid); }
    return Array.from(set);
  }, [selectedMinistries, ministryMembersMap]);

  const excludedUserIds = useMemo(() => {
    const membership = new Map();
    for (const m of selectedMinistries)
      for (const item of ministryMembersMap[m.id] || []) {
        const uid = memberId(item); if (!uid) continue;
        if (!membership.has(uid)) membership.set(uid, []);
        membership.get(uid).push(m.id);
      }
    const out = [];
    for (const [uid, mids] of membership.entries())
      if (mids.every((mid) => (excludedByMinistry?.[mid] || []).includes(uid))) out.push(uid);
    return out;
  }, [selectedMinistries, ministryMembersMap, excludedByMinistry]);

  const scheduledCount = useMemo(() => Math.max(0, uniquePeople.length - excludedUserIds.length), [uniquePeople.length, excludedUserIds.length]);

  const pickedUserIds = useMemo(() => {
    const set = new Set();
    for (const p of participations || []) if (p.userId) set.add(p.userId);
    return set;
  }, [participations]);

  const ministriesForPicker = useMemo(() => {
    const out = [], seen = new Set();
    for (const m of selectedMinistries) { out.push(normalizeMinistry(m)); seen.add(m.id); }
    for (const m of ministries)         { if (!seen.has(m.id)) out.push(normalizeMinistry(m)); }
    return out;
  }, [selectedMinistries, ministries]);

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Carregar membros dos ministérios selecionados
  useEffect(() => {
    let alive = true;
    async function loadPeople() {
      if (!churchId || !selectedMinistries.length) { setMinistryMembersMap({}); return; }
      setPeopleLoading(true);
      try {
        const entries = await Promise.all(selectedMinistries.map(async (m) => {
          const res = await apiGet(`/churches/${churchId}/ministries/${m.id}/members`);
          return [m.id, Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []];
        }));
        if (!alive) return;
        const map = {};
        for (const [id, items] of entries) map[id] = items;
        setMinistryMembersMap(map);
      } catch { if (alive) setMinistryMembersMap({}); }
      finally  { if (alive) setPeopleLoading(false); }
    }
    loadPeople();
    return () => { alive = false; };
  }, [churchId, selectedMinistryIdsKey]);

  // Limpar excludedByMinistry quando ministério é removido
  useEffect(() => {
    setExcludedByMinistry((prev) => {
      const next = {};
      for (const m of selectedMinistries) {
        const valid = new Set((ministryMembersMap[m.id] || []).map(memberId).filter(Boolean));
        next[m.id] = (prev?.[m.id] || []).filter((uid) => valid.has(uid));
      }
      return next;
    });
  }, [selectedMinistryIdsKey, ministryMembersMap]);

  // Garantir expandedMinistryId válido
  useEffect(() => {
    if (!selectedMinistries.length) { setExpandedMinistryId(null); return; }
    if (!selectedMinistries.some((m) => m.id === expandedMinistryId))
      setExpandedMinistryId(selectedMinistries[0].id);
  }, [selectedMinistries, expandedMinistryId]);

  // Carregar evento ao editar
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
        // 🖼️ Campo correto do banco
        setCoverImageUrl(json?.coverImageUrl ?? "");
        setGalleryUrls(Array.isArray(json?.galleryUrls) ? json.galleryUrls : []);
        setCoverLocalUri(""); setGalleryLocalUris([]);
        setSelectedMinistries(Array.isArray(json?.ministries) ? json.ministries.map(normalizeMinistry) : []);
        setParticipations(normalizeParticipations(blocksToParticipations(json?.blocks || [])));
        // ⚠️ Nota: o banco NÃO tem campo "color" no modelo Event
        // Se futuramente adicionar, habilite: setEventColor(json?.color ?? "");
        setEventColor("");
        const vis = json?.visibility;
        if (vis?.mode === "ministries") {
          setVisibilityMode("ministries");
          setVisibilityMinistries(Array.isArray(vis?.ministries) ? vis.ministries : []);
        } else { setVisibilityMode("all"); setVisibilityMinistries([]); }
        const excl = json?.excludedByMinistry;
        if (excl && typeof excl === "object") {
          setExcludedByMinistry(excl);
        } else {
          const fallback = {};
          for (const m of (json?.ministries || [])) fallback[m.id] = Array.isArray(json?.excludedUserIds) ? [...json.excludedUserIds] : [];
          setExcludedByMinistry(fallback);
        }
      } catch (e) { console.log("🟥 [EventComposer] erro ao carregar:", e?.message); }
    }
    loadEditing();
    return () => { alive = false; };
  }, [editingId, churchId]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  function selectMinistry(raw) {
    const m = normalizeMinistry(raw);
    setSelectedMinistries((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
    setExpandedMinistryId(m.id);
  }
  function deselectMinistry(id) { setSelectedMinistries((prev) => prev.filter((m) => m.id !== id)); }
  function toggleExcludedUser(ministryId, userId) {
    setExcludedByMinistry((prev) => {
      const cur = new Set(prev?.[ministryId] || []);
      cur.has(userId) ? cur.delete(userId) : cur.add(userId);
      return { ...prev, [ministryId]: Array.from(cur) };
    });
  }
  function includeAllPeopleInMinistry(ministryId) { setExcludedByMinistry((prev) => ({ ...prev, [ministryId]: [] })); }
  function excludeAllPeopleInMinistry(ministryId) {
    const all = (ministryMembersMap[ministryId] || []).map(memberId).filter(Boolean);
    setExcludedByMinistry((prev) => ({ ...prev, [ministryId]: all }));
  }
  function includeAllPeople() {
    setExcludedByMinistry((prev) => { const next = { ...prev }; for (const m of selectedMinistries) next[m.id] = []; return next; });
  }
  function excludeAllPeople() {
    setExcludedByMinistry((prev) => {
      const next = { ...prev };
      for (const m of selectedMinistries) next[m.id] = (ministryMembersMap[m.id] || []).map(memberId).filter(Boolean);
      return next;
    });
  }

  function addParticipation() { setParticipations((prev) => [...(prev || []), { id: makeId("part"), userId: null, name: "", role: "" }]); }
  function removeParticipation(id) {
    setParticipations((prev) => normalizeParticipations((prev || []).filter((p) => p.id !== id)));
    if (activePartId === id) { setActivePartId(null); setUserPickerOpen(false); setRolePickerOpen(false); }
  }
  function openUserPicker(id) { setActivePartId(id); setUserQuery(""); setUserPickerOpen(true); }
  function pickUser(user) {
    if (!activePartId) return;
    setParticipations((prev) => prev.map((p) => p.id === activePartId ? { ...p, userId: user.id, name: user.name || "Sem nome" } : p));
    setUserPickerOpen(false);
  }
  function openRolePicker(id) {
    const p = participations.find((x) => x.id === id);
    setActivePartId(id); setRoleCustomInput(p?.role || ""); setRolePickerOpen(true);
  }
  function pickRole(role) {
    if (!activePartId) return;
    setParticipations((prev) => prev.map((p) => p.id === activePartId ? { ...p, role: (role || "").trim() } : p));
    setRolePickerOpen(false);
  }
  function applyCustomRole() {
    const clean = (roleCustomInput || "").trim();
    if (!clean) { alert("Informe a função."); return; }
    pickRole(clean);
  }

  function openDatePicker() { setPickerValue(parseDateBR(dateLabel) || new Date()); setDatePickerOpen(true); }
  function openTimePicker() {
    const base = new Date();
    if (isValidTimeHM(timeLabel)) { const [h, m] = timeLabel.split(":").map(Number); base.setHours(h, m, 0, 0); }
    setPickerValue(base); setTimePickerOpen(true);
  }
  function openImagesModal() { if (previewFullOpen) setPreviewFullOpen(false); setImagesModalOpen(true); }

  // ── Validate & Save ──────────────────────────────────────────────────────────

  function validate() {
    if (!churchId)                        return "Selecione uma igreja ativa.";
    if (!title.trim())                    return "Informe o título do evento.";
    if (!dateLabel.trim())                return "Selecione a data do evento.";
    if (!parseDateBR(dateLabel.trim()))   return "Data inválida. Use o calendário.";
    if (timeLabel.trim() && !isValidTimeHM(timeLabel.trim())) return "Hora inválida (hh:mm).";
    if (!selectedMinistries.length)       return "Selecione pelo menos 1 ministério.";
    if (visibilityMode === "ministries" && !visibilityMinistries.length)
      return "Selecione ao menos 1 ministério para visibilidade.";
    return null;
  }

  async function onSave() {
    const err = validate();
    if (err) { alert(err); return; }

    const dateIso = dateBRToISO(dateLabel.trim());
    if (!dateIso) { alert("Data inválida."); return; }

    const endpoint = editingId ? `/churches/${churchId}/events/${editingId}` : `/churches/${churchId}/events`;
    const method   = editingId ? "PATCH" : "POST";

    setSaving(true);

    try {
      const fbUser = getAuth().currentUser;
      if (!fbUser?.uid) throw new Error("Usuário não autenticado no Firebase.");

      const eventStorageId = editingId || `tmp_${churchId}_${Date.now()}`;

      // ── Upload capa ────────────────────────────────────────────────────────
      let finalCoverUrl = coverImageUrl?.trim() || null;
      if (coverLocalUri) {
        setUploadingCover(true);
        console.log("📤 [EventComposer] upload capa →", { coverLocalUri, churchId, eventStorageId });
        try {
          finalCoverUrl = await uploadFileToStorage({ localUri: coverLocalUri, churchId, eventIdOrTemp: eventStorageId, kind: "cover", onProgress: (p) => console.log(`📤 capa ${p}%`) });
          if (editingId && coverImageUrl && coverImageUrl !== finalCoverUrl)
            await deleteStorageImageIfNeeded(coverImageUrl);
          console.log("🟩 [EventComposer] coverImageUrl final →", finalCoverUrl);
        } catch (e) {
          if (e?.code === "storage/unauthorized") throw new Error("Firebase Storage bloqueou o envio. Verifique as regras.");
          throw new Error(e?.message || "Não foi possível enviar a capa.");
        } finally { setUploadingCover(false); }
      }

      // ── Upload galeria ─────────────────────────────────────────────────────
      let finalGalleryUrls = Array.isArray(galleryUrls) ? [...galleryUrls] : [];
      if (galleryLocalUris.length) {
        setUploadingGallery(true);
        try {
          const uploaded = [];
          for (let i = 0; i < galleryLocalUris.length; i++) {
            const url = await uploadFileToStorage({ localUri: galleryLocalUris[i], churchId, eventIdOrTemp: eventStorageId, kind: "gallery", onProgress: (p) => console.log(`📤 galeria ${i+1}/${galleryLocalUris.length}: ${p}%`) });
            if (url) uploaded.push(url);
          }
          finalGalleryUrls = Array.from(new Set([...finalGalleryUrls, ...uploaded]));
        } catch (e) {
          if (e?.code === "storage/unauthorized") throw new Error("Firebase Storage bloqueou o envio da galeria.");
          throw new Error(e?.message || "Não foi possível enviar a galeria.");
        } finally { setUploadingGallery(false); }
      }

      // ── Payload ────────────────────────────────────────────────────────────
      // ⚠️  IMPORTANTE: "color" foi removido — NÃO existe no modelo Event do banco.
      //     Se quiser persistir a cor, faça uma migration Prisma adicionando:
      //     color String? @db.VarChar(16)
      //     e então reabilite o campo abaixo.
      const payload = {
        title:        title.trim(),
        description:  description.trim() || null,
        dateLabel:    dateIso,
        timeLabel:    timeLabel.trim() || null,
        location:     location.trim() || null,
        coverImageUrl: finalCoverUrl,       // ✅ campo correto do banco
        galleryUrls:   finalGalleryUrls,
        // color: eventColor || null,       // ❌ removido — campo não existe no schema
        ministries: selectedMinistries.map((m) => ({ id: m.id, name: m.name ?? null, color: m.color ?? null, icon: m.icon ?? null })),
        excludedUserIds,
        blocks: participationsToBlocks(participations),
        visibility: visibilityMode === "all"
          ? { mode: "all" }
          : { mode: "ministries", ministries: visibilityMinistries.map((m) => ({ id: m.id, name: m.name ?? null, color: m.color ?? null, icon: m.icon ?? null })) },
      };

      console.log("📤 [EventComposer] payload →", JSON.stringify({ endpoint, method, coverImageUrl: payload.coverImageUrl, galleryUrls: payload.galleryUrls, ministries: payload.ministries.map((m) => m.id) }, null, 2));

      const response = editingId ? await apiPatch(endpoint, payload) : await apiPost(endpoint, payload);

      console.log("✅ [EventComposer] salvo →", {
        id:            response?.id,
        coverImageUrl: response?.coverImageUrl,
        galleryUrls:   response?.galleryUrls,
      });

      setCoverImageUrl(finalCoverUrl || "");
      setGalleryUrls(finalGalleryUrls);
      setCoverLocalUri(""); setGalleryLocalUris([]);
      navigation?.goBack?.();

    } catch (e) {
      console.error("❌ [EventComposer] erro:", e?.message, e);
      alert(String(e?.message || e));
    } finally {
      setUploadingCover(false); setUploadingGallery(false); setSaving(false);
    }
  }

  const previewData = useMemo(() => ({
    title, dateLabel, timeLabel, location, description,
    coverImageUrl:  coverLocalUri || coverImageUrl,
    galleryUrls:    [...galleryLocalUris, ...galleryUrls],
  }), [title, dateLabel, timeLabel, location, description, coverImageUrl, galleryUrls, coverLocalUri, galleryLocalUris]);

  // ── Picker cascade ───────────────────────────────────────────────────────────

  const pickerCascadeData = useMemo(() => {
    const query = (peopleQuery || "").trim().toLowerCase();
    const out = [];
    for (const ministry of ministriesForPicker) {
      const isSel  = selectedMinistryIdSet.has(ministry.id);
      const isOpen = isSel && ministry.id === expandedMinistryId;
      const items  = isSel ? ministryMembersMap?.[ministry.id] : undefined;
      const hasLoaded = Array.isArray(items);
      const excSet = new Set(isSel ? excludedByMinistry?.[ministry.id] || [] : []);
      const total  = hasLoaded ? items.length : 0;
      out.push({ type: "ministry", key: `m:${ministry.id}`, ministry, selected: isSel, expanded: isOpen, total, checkedCount: Math.max(0, total - excSet.size), excludedCount: excSet.size, hasLoaded });
      if (!isOpen) continue;
      if (peopleLoading && !hasLoaded) { out.push({ type: "loading", key: `l:${ministry.id}`, ministryId: ministry.id }); continue; }
      const filtered = (hasLoaded ? items : []).filter((item) => {
        if (!query) return true;
        return (memberName(item) || "").toLowerCase().includes(query) || (memberEmail(item) || "").toLowerCase().includes(query);
      });
      if (!filtered.length) { out.push({ type: "empty", key: `e:${ministry.id}`, ministryId: ministry.id, label: query ? "Nenhum encontrado." : "Nenhum membro." }); continue; }
      for (const item of filtered) {
        const uid = memberId(item);
        if (!uid) continue;
        out.push({ type: "person", key: `p:${ministry.id}:${uid}`, ministryId: ministry.id, userId: uid, person: item, checked: !excSet.has(uid) });
      }
    }
    return out;
  }, [peopleQuery, ministriesForPicker, selectedMinistryIdSet, expandedMinistryId, ministryMembersMap, excludedByMinistry, peopleLoading]);

  function renderPickerCascadeItem({ item }) {
    if (item.type === "ministry") {
      const m = item.ministry;
      return (
        <Pressable onPress={() => { if (!item.selected) selectMinistry(m); else setExpandedMinistryId(m.id); }} style={{ marginBottom: 10 }}>
          <Surface elevation={0} style={[styles.sheetRow, { backgroundColor: item.selected ? DS.colors.tint : DS.colors.surface, borderColor: item.expanded ? DS.colors.primary : DS.colors.outline }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: m.color || DS.colors.primary, alignItems: "center", justifyContent: "center" }}>
                <Icon source={m.icon || "layers-outline"} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: DS.colors.text }}>{m.name || "Ministério"}</Text>
                <Text style={{ color: DS.colors.textMuted }}>
                  {!item.selected ? (m.description || "Toque para selecionar") :
                    item.hasLoaded ? `Membros: ${item.total} • Marcados: ${item.checkedCount}` : "Carregando..."}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {item.selected && item.expanded ? (
                <>
                  <Button mode="contained-tonal" compact onPress={() => includeAllPeopleInMinistry(m.id)} disabled={!item.total} buttonColor={DS.colors.tint} textColor={DS.colors.primaryDark} style={{ borderRadius: DS.radius.md }}>Marcar</Button>
                  <Button mode="contained-tonal" compact onPress={() => excludeAllPeopleInMinistry(m.id)} disabled={!item.total} buttonColor={DS.colors.tint} textColor={DS.colors.primaryDark} style={{ borderRadius: DS.radius.md }}>Desmarcar</Button>
                </>
              ) : null}
              <IconButton icon={item.selected ? "close" : "plus"} size={20} style={{ margin: 0 }} iconColor={DS.colors.textMuted} onPress={() => item.selected ? deselectMinistry(m.id) : selectMinistry(m)} />
              {item.selected ? <Icon source={item.expanded ? "chevron-up" : "chevron-down"} size={22} color={DS.colors.textMuted} /> : null}
            </View>
          </Surface>
        </Pressable>
      );
    }
    if (item.type === "loading") return (
      <View style={{ paddingLeft: 56, paddingBottom: 12 }}>
        <Surface elevation={0} style={[styles.noticeBox, { alignSelf: "flex-start" }]}><ActivityIndicator /><Text style={{ color: DS.colors.textMuted }}>Carregando...</Text></Surface>
      </View>
    );
    if (item.type === "empty") return (
      <View style={{ paddingLeft: 56, paddingBottom: 12 }}>
        <Surface elevation={0} style={[styles.noticeBox, { alignSelf: "flex-start" }]}><Icon source="account-off-outline" size={18} color={DS.colors.textMuted} /><Text style={{ color: DS.colors.textMuted }}>{item.label}</Text></Surface>
      </View>
    );
    const p = item.person, uid = item.userId, checked = item.checked;
    const name = memberName(p), photo = memberPhoto(p);
    return (
      <Pressable onPress={() => toggleExcludedUser(item.ministryId, uid)} style={{ marginLeft: 10, marginBottom: 10 }}>
        <Surface elevation={0} style={[styles.sheetRow, { marginLeft: 46, backgroundColor: checked ? DS.colors.surface : "#FEF5F5", borderColor: checked ? DS.colors.outline : DS.colors.error }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            {photo ? <Avatar.Image size={38} source={{ uri: photo }} /> : <Avatar.Text size={38} label={(name || "?").slice(0, 2).toUpperCase()} style={{ backgroundColor: DS.colors.tint }} color={DS.colors.primary} labelStyle={{ fontWeight: "900" }} />}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: DS.colors.text }}>{name}</Text>
              {!checked ? <Text style={{ color: DS.colors.error, marginTop: 2, fontSize: 12 }}>Desmarcado</Text> : null}
            </View>
          </View>
          <Checkbox status={checked ? "checked" : "unchecked"} color={DS.colors.primary} uncheckedColor={DS.colors.outline} />
        </Surface>
      </Pressable>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <View style={styles.bg} pointerEvents="none">
        <View style={styles.blob1} />
        <View style={styles.blob2} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Preview Card — alinhado com o design da HomeScreen */}
        <EventPreviewCard
          mode={previewMode}
          data={previewData}
          onOpenFull={() => setPreviewFullOpen(true)}
          onPressImage={openImagesModal}
          accentColor={eventColor || selectedMinistries[0]?.color || DS.colors.primary}
          previewButton={
            <Menu
              visible={previewMenuOpen}
              onDismiss={() => setPreviewMenuOpen(false)}
              anchor={
                <Button mode="contained-tonal" icon="chevron-down" onPress={() => setPreviewMenuOpen(true)} style={{ borderRadius: 999 }} compact buttonColor={DS.colors.tint} textColor={DS.colors.primaryDark}>
                  {previewMode === "mini" ? "Mínima" : "Completa"}
                </Button>
              }
            >
              <Menu.Item leadingIcon="card-text-outline" title="Prévia mínima" onPress={() => { setPreviewMode("mini"); setPreviewMenuOpen(false); }} />
              <Menu.Item leadingIcon="card-bulleted-outline" title="Prévia completa" onPress={() => { setPreviewMode("complete"); setPreviewMenuOpen(false); }} />
            </Menu>
          }
        />

        {/* Dados básicos */}
        <SectionHeader title="Dados do evento" subtitle="Título, data, hora e local." />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={{ gap: 12 }}>
            <TextInput mode="outlined" label="Título" value={title} onChangeText={setTitle} left={<TextInput.Icon icon="format-title" color={DS.colors.textMuted} />} outlineColor={DS.colors.outline} activeOutlineColor={DS.colors.primary} textColor={DS.colors.text} placeholderTextColor={DS.colors.textMuted} style={{ backgroundColor: DS.colors.backgroundAlt }} outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><SelectField label="Data" value={dateLabel} placeholder="dd/mm/aaaa" leftIcon="calendar" onPress={openDatePicker} /></View>
              <View style={{ width: 140 }}><SelectField label="Hora" value={timeLabel} placeholder="hh:mm" leftIcon="clock-outline" onPress={openTimePicker} /></View>
            </View>
            <TextInput mode="outlined" label="Local" value={location} onChangeText={setLocation} placeholder="Rua, Bairro - Cidade" left={<TextInput.Icon icon="map-marker-outline" color={DS.colors.textMuted} />} outlineColor={DS.colors.outline} activeOutlineColor={DS.colors.primary} textColor={DS.colors.text} placeholderTextColor={DS.colors.textMuted} style={{ backgroundColor: DS.colors.backgroundAlt }} outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }} />
            <TextInput mode="outlined" label="Descrição (opcional)" value={description} onChangeText={setDescription} left={<TextInput.Icon icon="text-long" color={DS.colors.textMuted} />} multiline numberOfLines={4} outlineColor={DS.colors.outline} activeOutlineColor={DS.colors.primary} textColor={DS.colors.text} placeholderTextColor={DS.colors.textMuted} style={{ backgroundColor: DS.colors.backgroundAlt }} outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }} />
          </Card.Content>
        </Card>

        {/* Imagens e cor */}
        <SectionHeader title="Imagens e cor" subtitle="Capa, galeria e cor de destaque do evento." />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={{ gap: 10 }}>
            <Button mode="contained" icon="image-edit-outline" onPress={openImagesModal} style={{ borderRadius: DS.radius.lg }} contentStyle={{ height: 48 }} buttonColor={DS.colors.primary} textColor="#fff">
              Editar imagens e cor
            </Button>
            {/* Status resumido */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Surface elevation={0} style={[styles.noticeBox, { flex: 1 }]}>
                <Icon source="image-outline" size={16} color={coverLocalUri || coverImageUrl ? DS.colors.success : DS.colors.textMuted} />
                <Text style={{ color: DS.colors.textMuted, fontSize: 12, flex: 1 }}>
                  {coverLocalUri ? "Capa selecionada (pendente upload)" : coverImageUrl ? "Capa salva ✓" : "Sem capa"}
                </Text>
              </Surface>
              <Surface elevation={0} style={[styles.noticeBox, { flex: 1 }]}>
                <View style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: eventColor || DS.colors.textMuted }} />
                <Text style={{ color: DS.colors.textMuted, fontSize: 12, flex: 1 }}>
                  {eventColor ? eventColor : "Cor do ministério"}
                </Text>
              </Surface>
            </View>
          </Card.Content>
        </Card>

        {/* Visibilidade */}
        <SectionHeader title="Visibilidade" subtitle="Quem pode ver este evento." />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={{ gap: 12 }}>
            <SelectField label="Quem pode ver" value={visibilitySummaryLabel} placeholder="Toda a igreja" leftIcon="eye-outline" onPress={() => setVisibilityPickerOpen(true)} />
            {visibilityMode === "ministries" && visibilityMinistries.map((m) => (
              <Surface key={m.id} elevation={0} style={styles.ministryRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: m.color || DS.colors.primary, alignItems: "center", justifyContent: "center" }}>
                    <Icon source={m.icon || "layers-outline"} size={16} color="#fff" />
                  </View>
                  <Text style={{ fontWeight: "900", color: DS.colors.text, flex: 1 }}>{m.name}</Text>
                </View>
                <IconButton icon="close" onPress={() => setVisibilityMinistries((prev) => prev.filter((x) => x.id !== m.id))} iconColor={DS.colors.textMuted} />
              </Surface>
            ))}
          </Card.Content>
        </Card>

        {/* Ministérios e participantes */}
        <SectionHeader title="Ministérios e participantes" subtitle="Selecione ministérios e ajuste quem será escalado." />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={{ gap: 12 }}>
            <SelectField label="Selecionar ministérios" value={ministriesSummaryLabel} placeholder="Toque para escolher" leftIcon="layers-outline" onPress={() => setSheetMinistriesOpen(true)} />
            {selectedMinistries.length === 0 ? (
              <Text style={{ color: DS.colors.textMuted }}>Nenhum ministério selecionado.</Text>
            ) : selectedMinistries.map((m) => {
              const total = (ministryMembersMap[m.id] || []).length;
              const excl  = (excludedByMinistry?.[m.id] || []).length;
              return (
                <Surface key={m.id} elevation={0} style={styles.ministryRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: m.color || DS.colors.primary, alignItems: "center", justifyContent: "center" }}>
                      <Icon source={m.icon || "layers-outline"} size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "900", color: DS.colors.text }}>{m.name}</Text>
                      <Text style={{ color: DS.colors.textMuted, fontSize: 12 }}>Membros: {total} • Marcados: {Math.max(0, total - excl)}</Text>
                    </View>
                  </View>
                  <IconButton icon="close" onPress={() => deselectMinistry(m.id)} iconColor={DS.colors.textMuted} />
                </Surface>
              );
            })}
            {selectedMinistries.length > 0 && (
              <Surface elevation={0} style={styles.noticeBox}>
                <Icon source="account-group-outline" size={18} color={DS.colors.primary} />
                <Text style={{ color: DS.colors.textMuted, flex: 1 }}>Total único: {uniquePeople.length} • Escalados: {scheduledCount}</Text>
              </Surface>
            )}
          </Card.Content>
        </Card>

        {/* Participações */}
        <SectionHeader title="Participações" subtitle="Usuário + função por participação." action={
          <Button mode="contained-tonal" icon="plus" onPress={addParticipation} style={{ borderRadius: DS.radius.md }} compact buttonColor={DS.colors.tint} textColor={DS.colors.primaryDark}>Adicionar</Button>
        } />
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={{ gap: 12 }}>
            {participations.map((p, idx) => {
              const roleColor  = p.role ? getRoleColor(p.role) : DS.colors.primary;
              const disableTrash = participations.length === 1;
              return (
                <Surface key={p.id} elevation={0} style={{ borderWidth: 1, borderRadius: DS.radius.lg, padding: 12, borderColor: DS.colors.outline, backgroundColor: DS.colors.surface, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: p.role ? roleColor : DS.colors.tint, alignItems: "center", justifyContent: "center" }}>
                        <Icon source="account-star-outline" size={18} color={p.role ? "#fff" : DS.colors.primary} />
                      </View>
                      <View>
                        <Text style={{ fontWeight: "900", color: DS.colors.text }}>{`Participação ${idx + 1}`}</Text>
                        <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>{p.role || "Defina usuário e função"}</Text>
                      </View>
                    </View>
                    <IconButton icon="trash-can-outline" disabled={disableTrash} iconColor={disableTrash ? DS.colors.textMuted : DS.colors.error} onPress={() => removeParticipation(p.id)} />
                  </View>
                  <SelectField label="Usuário" value={p.userId ? p.name : ""} placeholder="Selecionar usuário" leftIcon="account-outline" onPress={() => openUserPicker(p.id)} />
                  <SelectField label="Função" value={p.role || ""} placeholder="Selecionar função" leftIcon="briefcase-outline" onPress={() => openRolePicker(p.id)} />
                </Surface>
              );
            })}
          </Card.Content>
        </Card>

        {/* Salvar */}
        <View style={{ marginTop: 18 }}>
          <Button mode="contained" icon="check" onPress={onSave} loading={saving} disabled={saving || !churchId} style={{ borderRadius: DS.radius.lg }} contentStyle={{ height: 52 }} buttonColor={DS.colors.primary} textColor="#fff">
            {uploadingCover ? "Enviando capa..." : uploadingGallery ? "Enviando galeria..." : editingId ? "Salvar alterações" : "Criar evento"}
          </Button>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Date/Time pickers Android */}
      {!isIOS && datePickerOpen && (
        <DateTimePicker value={pickerValue} mode="date" display="default" onChange={(e, sel) => { setDatePickerOpen(false); if (e?.type === "set" && sel) setDateLabel(formatDateBR(sel)); }} />
      )}
      {!isIOS && timePickerOpen && (
        <DateTimePicker value={pickerValue} mode="time" is24Hour display="default" onChange={(e, sel) => { setTimePickerOpen(false); if (e?.type === "set" && sel) setTimeLabel(formatTimeHM(sel)); }} />
      )}

      {/* Date/Time pickers iOS */}
      <Portal>
        <Modal visible={isIOS && datePickerOpen} onDismiss={() => setDatePickerOpen(false)} contentContainerStyle={{ padding: 16 }}>
          <Surface elevation={0} style={styles.dialog}>
            <Text style={{ fontSize: DS.t.h2, fontWeight: "900", color: DS.colors.text }}>Selecionar data</Text>
            <DateTimePicker value={pickerValue} mode="date" display="spinner" onChange={(_, sel) => { if (sel) setPickerValue(sel); }} />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <Button onPress={() => setDatePickerOpen(false)} textColor={DS.colors.textMuted}>Cancelar</Button>
              <Button mode="contained" onPress={() => { setDateLabel(formatDateBR(pickerValue)); setDatePickerOpen(false); }} buttonColor={DS.colors.primary} textColor="#fff" style={{ borderRadius: DS.radius.md }}>OK</Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      <Portal>
        <Modal visible={isIOS && timePickerOpen} onDismiss={() => setTimePickerOpen(false)} contentContainerStyle={{ padding: 16 }}>
          <Surface elevation={0} style={styles.dialog}>
            <Text style={{ fontSize: DS.t.h2, fontWeight: "900", color: DS.colors.text }}>Selecionar hora</Text>
            <DateTimePicker value={pickerValue} mode="time" is24Hour display="spinner" onChange={(_, sel) => { if (sel) setPickerValue(sel); }} />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <Button onPress={() => setTimePickerOpen(false)} textColor={DS.colors.textMuted}>Cancelar</Button>
              <Button mode="contained" onPress={() => { setTimeLabel(formatTimeHM(pickerValue)); setTimePickerOpen(false); }} buttonColor={DS.colors.primary} textColor="#fff" style={{ borderRadius: DS.radius.md }}>OK</Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* Modal: Imagens e cor */}
      <Portal>
        <Modal visible={imagesModalOpen} onDismiss={() => setImagesModalOpen(false)} contentContainerStyle={{ flex: 1 }}>
          <Surface style={styles.fullWrap} elevation={0}>
            <View style={styles.fullHeader}>
              <Text style={{ fontSize: DS.t.h2, fontWeight: "900", color: DS.colors.text }}>Imagens e cor</Text>
              <IconButton icon="close" onPress={() => setImagesModalOpen(false)} iconColor={DS.colors.textMuted} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={{ gap: 16 }}>

                  {/* Capa */}
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: DS.t.h3, fontWeight: "900", color: DS.colors.text, letterSpacing: -0.3 }}>Capa do evento</Text>
                    <Text style={{ color: DS.colors.textMuted, fontSize: 13 }}>
                      Aparece no card da HomeScreen. Salvo em <Text style={{ fontFamily: "monospace" }}>coverImageUrl</Text>.
                    </Text>
                    <Button mode="contained-tonal" icon="image-plus" buttonColor={DS.colors.tint} textColor={DS.colors.primaryDark} style={{ borderRadius: DS.radius.md, alignSelf: "flex-start" }} loading={uploadingCover} disabled={uploadingCover}
                      onPress={async () => { const uri = await pickSingleImageFromLibrary(); if (uri) setCoverLocalUri(uri); }}>
                      Selecionar capa
                    </Button>
                    {(coverLocalUri || coverImageUrl) ? (
                      <Surface elevation={0} style={{ height: 160, borderRadius: DS.radius.lg, overflow: "hidden", borderWidth: 1, borderColor: DS.colors.outline }}>
                        <Image source={{ uri: coverLocalUri || coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        {coverLocalUri ? (
                          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: DS.colors.warning, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>Pendente upload</Text>
                          </View>
                        ) : (
                          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: DS.colors.success, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>Salva ✓</Text>
                          </View>
                        )}
                      </Surface>
                    ) : (
                      <Text style={{ color: DS.colors.textMuted }}>Nenhuma capa selecionada.</Text>
                    )}
                    {(coverLocalUri || coverImageUrl) && (
                      <Button mode="text" icon="close" textColor={DS.colors.error} onPress={() => { setCoverLocalUri(""); setCoverImageUrl(""); }} style={{ alignSelf: "flex-start" }}>Remover capa</Button>
                    )}
                  </View>

                  <Divider style={{ backgroundColor: DS.colors.outline }} />

                  {/* Galeria */}
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: DS.t.h3, fontWeight: "900", color: DS.colors.text, letterSpacing: -0.3 }}>Galeria (opcional)</Text>
                    <Button mode="contained-tonal" icon="image-multiple" buttonColor={DS.colors.tint} textColor={DS.colors.primaryDark} style={{ borderRadius: DS.radius.md, alignSelf: "flex-start" }} loading={uploadingGallery} disabled={uploadingGallery}
                      onPress={async () => { const uris = await pickMultipleImagesFromLibrarySafe(6); if (uris.length) setGalleryLocalUris((prev) => Array.from(new Set([...prev, ...uris]))); }}>
                      Adicionar imagens
                    </Button>
                    {[...galleryLocalUris, ...galleryUrls].length ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          {[...galleryLocalUris, ...galleryUrls].map((url) => (
                            <Surface key={url} elevation={0} style={{ width: 92, height: 72, borderRadius: DS.radius.lg, overflow: "hidden", backgroundColor: DS.colors.tint, borderWidth: 1, borderColor: DS.colors.outline }}>
                              <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} />
                              <View style={{ position: "absolute", top: 4, right: 4 }}>
                                <IconButton icon="close" size={16} style={{ margin: 0 }} iconColor="#fff" onPress={() => { setGalleryLocalUris((p) => p.filter((x) => x !== url)); setGalleryUrls((p) => p.filter((x) => x !== url)); }} />
                              </View>
                            </Surface>
                          ))}
                        </View>
                      </ScrollView>
                    ) : <Text style={{ color: DS.colors.textMuted }}>Nenhuma imagem na galeria.</Text>}
                  </View>

                  <Divider style={{ backgroundColor: DS.colors.outline }} />

                  {/* Cor do evento */}
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: DS.t.h3, fontWeight: "900", color: DS.colors.text, letterSpacing: -0.3 }}>Cor de destaque</Text>
                    <Text style={{ color: DS.colors.textMuted, fontSize: 13 }}>
                      Usada no gradiente do card quando não há imagem. Se não selecionar, usa a cor do ministério.
                    </Text>
                    {/* Padrão */}
                    <Pressable onPress={() => setEventColor("")}>
                      <Surface elevation={0} style={[styles.sheetRow, { borderColor: !eventColor ? DS.colors.primary : DS.colors.outline, backgroundColor: !eventColor ? DS.colors.tint : DS.colors.surface }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                          <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: DS.colors.primary, alignItems: "center", justifyContent: "center" }}>
                            <Icon source="palette-outline" size={18} color="#fff" />
                          </View>
                          <View><Text style={{ fontWeight: "900", color: DS.colors.text }}>Cor do ministério</Text><Text style={{ color: DS.colors.textMuted, fontSize: 12 }}>Padrão automático</Text></View>
                        </View>
                        {!eventColor && <Icon source="check-circle" size={22} color={DS.colors.primary} />}
                      </Surface>
                    </Pressable>
                    {/* Paleta */}
                    <View style={styles.colorGrid}>
                      {COLORS.map((c) => {
                        const sel = eventColor === c.hex;
                        return (
                          <Pressable key={c.hex} onPress={() => setEventColor(c.hex)} style={styles.colorCell}>
                            <Surface elevation={0} style={[styles.sheetRow, { borderColor: sel ? c.hex : DS.colors.outline, backgroundColor: sel ? withAlpha(c.hex, "18") : DS.colors.surface }]}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                                <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: c.hex, alignItems: "center", justifyContent: "center" }}>
                                  <Icon source="palette-outline" size={18} color="#fff" />
                                </View>
                                <Text style={{ fontWeight: "900", color: DS.colors.text, flex: 1 }} numberOfLines={1}>{c.name}</Text>
                              </View>
                              {sel && <Icon source="check-circle" size={22} color={c.hex} />}
                            </Surface>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <Button mode="contained" icon="check" onPress={() => setImagesModalOpen(false)} style={{ borderRadius: DS.radius.lg, marginTop: 4 }} contentStyle={{ height: 48 }} buttonColor={DS.colors.primary} textColor="#fff">OK</Button>
                </Card.Content>
              </Card>
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>

      {/* Modal: Prévia tela inteira */}
      <Portal>
        <Modal visible={previewFullOpen} onDismiss={() => setPreviewFullOpen(false)} contentContainerStyle={{ flex: 1 }}>
          <Surface style={styles.fullWrap} elevation={0}>
            <View style={styles.fullHeader}>
              <Text style={{ fontSize: DS.t.h2, fontWeight: "900", color: DS.colors.text }}>Prévia (tela inteira)</Text>
              <IconButton icon="close" onPress={() => setPreviewFullOpen(false)} iconColor={DS.colors.textMuted} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
              <EventPreviewCard mode={previewMode} data={previewData} onPressImage={openImagesModal} accentColor={eventColor || selectedMinistries[0]?.color || DS.colors.primary} />
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>

      {/* Bottom Sheet: Visibilidade */}
      <BottomSheet visible={visibilityPickerOpen} onDismiss={() => setVisibilityPickerOpen(false)} title="Visibilidade" subtitle="Quem pode ver este evento?"
        rightAction={<Button mode="contained" onPress={() => setVisibilityPickerOpen(false)} style={{ borderRadius: DS.radius.md }} buttonColor={DS.colors.primary} textColor="#fff">OK</Button>}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 14 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
          {[
            { mode: "all",        icon: "earth",          label: "Toda a igreja",         desc: "Qualquer membro pode ver" },
            { mode: "ministries", icon: "layers-outline", label: "Selecionar ministérios", desc: "Somente ministérios escolhidos" },
          ].map((opt) => (
            <Pressable key={opt.mode} onPress={() => { if (opt.mode === "all") { setVisibilityMode("all"); setVisibilityMinistries([]); setVisibilityPickerOpen(false); } else setVisibilityMode("ministries"); }}>
              <Surface elevation={0} style={[styles.sheetRow, { borderColor: visibilityMode === opt.mode ? DS.colors.primary : DS.colors.outline, backgroundColor: visibilityMode === opt.mode ? DS.colors.tint : DS.colors.surface }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: DS.colors.primary, alignItems: "center", justifyContent: "center" }}><Icon source={opt.icon} size={18} color="#fff" /></View>
                  <View style={{ flex: 1 }}><Text style={{ fontWeight: "900", color: DS.colors.text }}>{opt.label}</Text><Text style={{ color: DS.colors.textMuted }}>{opt.desc}</Text></View>
                </View>
                {visibilityMode === opt.mode && <Icon source="check-circle" size={22} color={DS.colors.primary} />}
              </Surface>
            </Pressable>
          ))}
          {visibilityMode === "ministries" && (
            <>
              <TextInput mode="outlined" value={ministryQuery} onChangeText={setMinistryQuery} placeholder="Buscar ministério..." left={<TextInput.Icon icon="magnify" color={DS.colors.textMuted} />} outlineColor={DS.colors.outline} activeOutlineColor={DS.colors.primary} textColor={DS.colors.text} placeholderTextColor={DS.colors.textMuted} style={{ backgroundColor: DS.colors.backgroundAlt }} outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }} />
              {ministriesLoading ? <ActivityIndicator style={{ marginTop: 10 }} /> : ministries.map((m) => {
                const sel = visibilityMinistries.some((x) => x.id === m.id);
                return (
                  <Pressable key={m.id} onPress={() => setVisibilityMinistries((prev) => sel ? prev.filter((x) => x.id !== m.id) : [...prev, normalizeMinistry(m)])}>
                    <Surface elevation={0} style={[styles.sheetRow, { backgroundColor: sel ? DS.colors.tint : DS.colors.surface, borderColor: sel ? DS.colors.primary : DS.colors.outline }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: m.color || DS.colors.primary, alignItems: "center", justifyContent: "center" }}><Icon source={m.icon || "layers-outline"} size={18} color="#fff" /></View>
                        <Text style={{ fontWeight: "900", color: DS.colors.text, flex: 1 }}>{m.name}</Text>
                      </View>
                      {sel && <Icon source="check-circle" size={22} color={DS.colors.primary} />}
                    </Surface>
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>
      </BottomSheet>

      {/* Bottom Sheet: Ministérios e participantes */}
      <BottomSheet visible={sheetMinistriesOpen} onDismiss={() => setSheetMinistriesOpen(false)} title="Ministérios e participantes" subtitle="Selecione um ministério para ver seus membros."
        rightAction={<Button mode="contained" onPress={() => setSheetMinistriesOpen(false)} style={{ borderRadius: DS.radius.md }} buttonColor={DS.colors.primary} textColor="#fff">OK</Button>}>
        <TextInput mode="outlined" value={ministryQuery} onChangeText={setMinistryQuery} placeholder="Buscar ministério..." left={<TextInput.Icon icon="magnify" color={DS.colors.textMuted} />} outlineColor={DS.colors.outline} activeOutlineColor={DS.colors.primary} textColor={DS.colors.text} placeholderTextColor={DS.colors.textMuted} style={{ backgroundColor: DS.colors.backgroundAlt }} outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }} />
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}><Text style={{ fontWeight: "900", color: DS.colors.text }}>Participantes</Text><Text style={{ color: DS.colors.textMuted, fontSize: 12 }}>Total: {uniquePeople.length} • Escalados: {scheduledCount} • Excluídos: {excludedUserIds.length}</Text></View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button mode="contained-tonal" compact onPress={includeAllPeople} disabled={!selectedMinistries.length} buttonColor={DS.colors.tint} textColor={DS.colors.primaryDark} style={{ borderRadius: DS.radius.md }}>Marcar</Button>
            <Button mode="contained-tonal" compact onPress={excludeAllPeople} disabled={!selectedMinistries.length} buttonColor={DS.colors.tint} textColor={DS.colors.primaryDark} style={{ borderRadius: DS.radius.md }}>Desmarcar</Button>
          </View>
        </View>
        <TextInput mode="outlined" value={peopleQuery} onChangeText={setPeopleQuery} placeholder="Buscar participante..." left={<TextInput.Icon icon="magnify" color={DS.colors.textMuted} />} outlineColor={DS.colors.outline} activeOutlineColor={DS.colors.primary} textColor={DS.colors.text} placeholderTextColor={DS.colors.textMuted} style={{ backgroundColor: DS.colors.backgroundAlt, marginTop: 10 }} outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }} />
        <View style={{ marginTop: 10, flex: 1 }}>
          {ministriesForPicker.length === 0
            ? <EmptyState icon="layers-outline" title="Nenhum ministério" description="Não encontramos ministérios." />
            : <FlatList data={pickerCascadeData} renderItem={renderPickerCascadeItem} keyExtractor={(item) => item.key} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 14 }} />
          }
        </View>
      </BottomSheet>

      {/* Bottom Sheet: Usuário */}
      <BottomSheet visible={userPickerOpen} onDismiss={() => setUserPickerOpen(false)} title="Selecionar usuário" subtitle="Membro para esta participação.">
        <TextInput mode="outlined" value={userQuery} onChangeText={setUserQuery} placeholder="Buscar membro..." left={<TextInput.Icon icon="magnify" color={DS.colors.textMuted} />} outlineColor={DS.colors.outline} activeOutlineColor={DS.colors.primary} textColor={DS.colors.text} placeholderTextColor={DS.colors.textMuted} style={{ backgroundColor: DS.colors.backgroundAlt }} outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }} />
        <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ gap: 10, paddingBottom: 14 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
          {usersLoading ? <ActivityIndicator style={{ marginTop: 10 }} /> : users.length === 0 ? <EmptyState icon="account-search-outline" title="Nenhum usuário" description="Não encontramos membros." /> : users.map((user) => {
            const alreadyPicked = pickedUserIds.has(user.id);
            const isThisRow = activePartId && participations.some((p) => p.id === activePartId && p.userId === user.id);
            return (
              <Pressable key={user.id} onPress={() => pickUser(user)} disabled={alreadyPicked && !isThisRow}>
                <Surface elevation={0} style={[styles.sheetRow, { backgroundColor: isThisRow ? DS.colors.tint : DS.colors.surface, borderColor: isThisRow ? DS.colors.primary : DS.colors.outline, opacity: alreadyPicked && !isThisRow ? 0.6 : 1 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <Avatar.Text size={38} label={(user.name || "?").slice(0, 2).toUpperCase()} style={{ backgroundColor: DS.colors.tint }} color={DS.colors.primary} labelStyle={{ fontWeight: "900" }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "900", color: DS.colors.text }}>{user.name || "Sem nome"}</Text>
                      <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>{alreadyPicked && !isThisRow ? "Já selecionado" : user.email || " "}</Text>
                    </View>
                  </View>
                  {isThisRow && <Icon source="check-circle" size={22} color={DS.colors.primary} />}
                </Surface>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>

      {/* Bottom Sheet: Função */}
      <BottomSheet visible={rolePickerOpen} onDismiss={() => setRolePickerOpen(false)} title="Selecionar função" subtitle="Rápida ou personalizada."
        rightAction={<Button mode="contained" onPress={applyCustomRole} style={{ borderRadius: DS.radius.md }} buttonColor={DS.colors.primary} textColor="#fff">Aplicar</Button>}>
        <TextInput mode="outlined" value={roleCustomInput} onChangeText={setRoleCustomInput} placeholder="Função personalizada" label="Função" left={<TextInput.Icon icon="briefcase-outline" color={DS.colors.textMuted} />} outlineColor={DS.colors.outline} activeOutlineColor={DS.colors.primary} textColor={DS.colors.text} placeholderTextColor={DS.colors.textMuted} style={{ backgroundColor: DS.colors.backgroundAlt }} outlineStyle={{ borderRadius: DS.radius.sm, borderWidth: 1.5 }} />
        <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ gap: 10, paddingBottom: 14 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
          {ROLE_PRESETS.map((role) => {
            const color = getRoleColor(role);
            const curRole = (participations.find((p) => p.id === activePartId)?.role || "").trim();
            const sel = curRole === role;
            return (
              <Pressable key={role} onPress={() => pickRole(role)}>
                <Surface elevation={0} style={[styles.sheetRow, { borderColor: sel ? color : DS.colors.outline, backgroundColor: sel ? withAlpha(color, "14") : DS.colors.surface }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: color, alignItems: "center", justifyContent: "center" }}><Icon source="briefcase-outline" size={18} color="#fff" /></View>
                    <View style={{ flex: 1 }}><Text style={{ fontWeight: "900", color: DS.colors.text }}>{role}</Text><Text style={{ color: DS.colors.textMuted, fontSize: 12 }}>{sel ? "Selecionado" : "Toque para selecionar"}</Text></View>
                  </View>
                  {sel && <Icon source="check-circle" size={22} color={color} />}
                </Surface>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

// ─── Helpers async safe ───────────────────────────────────────────────────────

async function pickMultipleImagesFromLibrarySafe(limit = 6) {
  try { return await pickMultipleImagesFromLibrary(limit); }
  catch (e) { console.log("pickMultiple error:", e?.message); return []; }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles() {
  return {
    root:      { flex: 1, backgroundColor: DS.colors.background },
    container: { padding: DS.space(2), paddingBottom: DS.space(3) },
    bg:        { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, overflow: "hidden" },
    blob1:     { position: "absolute", width: 400, height: 400, borderRadius: 999, backgroundColor: DS.colors.tint,   top: -200, right: -150, opacity: 0.5 },
    blob2:     { position: "absolute", width: 300, height: 300, borderRadius: 999, backgroundColor: DS.colors.accent, bottom: -160, left: -120, opacity: 0.1 },

    card:        { borderRadius: DS.radius.lg, overflow: "hidden", borderColor: DS.colors.outline, backgroundColor: DS.colors.surface },
    ministryRow: { borderWidth: 1, borderRadius: DS.radius.lg, padding: 12, borderColor: DS.colors.outline, backgroundColor: DS.colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    noticeBox:   { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: DS.radius.md, backgroundColor: DS.colors.tint, borderWidth: 1, borderColor: DS.colors.outline },
    sheetRow:    { borderWidth: 1, borderRadius: DS.radius.lg, paddingVertical: 10, paddingHorizontal: 12, borderColor: DS.colors.outline, backgroundColor: DS.colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    dialog:      { padding: 16, borderRadius: DS.radius.lg, borderWidth: 1, borderColor: DS.colors.outline, backgroundColor: DS.colors.surface },
    colorGrid:   { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginTop: 8 },
    colorCell:   { width: "48%" },
    fullWrap:    { flex: 1, backgroundColor: DS.colors.background },
    fullHeader:  { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: DS.colors.outline, backgroundColor: DS.colors.surface },
  };
}