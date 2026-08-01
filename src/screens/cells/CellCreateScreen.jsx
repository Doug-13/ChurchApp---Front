// src/screens/admin/CellCreateScreen.jsx
// Também pode ser usado em src/screens/cells/CellCreateScreen.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Pressable,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Divider,
  Searchbar,
  Snackbar,
  Surface,
  TouchableRipple,
  Avatar,
} from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { getAuth } from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import ImagePicker from "react-native-image-crop-picker";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { useTerms } from "../../context/TerminologyContext";

// ─── Design System ───────────────────────────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND       = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const BG          = "#F5F6FA";
const SURFACE     = "#FFFFFF";
const BORDER      = "#E4E6F0";
const MUTED       = "#9198B5";
const SUCCESS     = "#2DBF8A";
const DANGER      = "#E84D4D";
const DANGER_LIGHT = "#FEECEC";
const WARNING     = "#F5A623";

const TEMPLATE_COLORS = [
  { hex: "#4158D0", name: "Azul"     },
  { hex: "#7C3AED", name: "Roxo"     },
  { hex: "#06B6D4", name: "Ciano"    },
  { hex: "#10B981", name: "Verde"    },
  { hex: "#F59E0B", name: "Âmbar"   },
  { hex: "#E84D4D", name: "Vermelho" },
  { hex: "#EC4899", name: "Rosa"     },
  { hex: "#14B8A6", name: "Teal"     },
];

const DAYS       = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CELL_TYPES = ["Jovens", "Adultos", "Casais", "Kids", "Misto"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function withAlpha(hex, alphaHex = "18") {
  const h = String(hex || "").trim();
  if (!/^#?[0-9a-fA-F]{6}$/.test(h)) return hex;
  const clean = h.startsWith("#") ? h.slice(1) : h;
  return `#${clean}${alphaHex}`;
}

function isHttpUrl(u) {
  return /^https?:\/\/\S+/i.test(String(u || "").trim());
}

function safeStr(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return text.trim();
}

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] : "")).toUpperCase();
}

function normalizeTimeInput(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  const hOnly    = s.match(/^(\d{1,2})h$/);
  if (hOnly)    return `${String(hOnly[1]).padStart(2, "0")}:00`;
  const onlyNum  = s.match(/^(\d{1,2})$/);
  if (onlyNum)  return `${String(onlyNum[1]).padStart(2, "0")}:00`;
  const hhmmLoose = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (hhmmLoose) return `${String(hhmmLoose[1]).padStart(2, "0")}:${String(hhmmLoose[2]).padStart(2, "0")}`;
  return raw;
}

function isValidTimeHHMM(v) {
  const s = String(v || "").trim();
  if (!s) return true;
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [hh, mm] = s.split(":").map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function formatAddress({ street, number, neighborhood, city }) {
  const line1 = [street, number].filter(Boolean).join(", ");
  const line2 = [neighborhood, city].filter(Boolean).join(" • ");
  return [line1, line2].filter(Boolean).join(" — ") || null;
}

function normalizeGallery(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value.split(/[\n,;]/).map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function normalizeUserOption(raw) {
  if (!raw) return null;
  const id = raw?.id || raw?.userId || raw?.memberId || raw?.uid;
  if (!id) return null;
  return {
    id,
    fullName: raw?.fullName || raw?.name || raw?.displayName || raw?.email || "Membro",
    email:    raw?.email    || null,
    phone:    raw?.phone    || null,
    photoUrl: raw?.photoUrl || raw?.avatarUrl || null,
  };
}

function getCellLeader(cell) {
  return normalizeUserOption(
    cell?.leader || cell?.leaderUser ||
    (cell?.leaderUserId ? { id: cell.leaderUserId, fullName: cell?.leaderName || cell?.leaderUserName || "Líder" } : null)
  );
}

function getCellViceLeader(cell) {
  return normalizeUserOption(
    cell?.viceLeader || cell?.viceLeaderUser ||
    (cell?.viceLeaderUserId ? { id: cell.viceLeaderUserId, fullName: cell?.viceLeaderName || cell?.viceLeaderUserName || "Vice-líder" } : null)
  );
}

// ─── Fetch ───────────────────────────────────────────────────────────────────
const ENDPOINTS = {
  createCell:           ()    => `/cells`,
  updateCell:           (id)  => `/cells/${encodeURIComponent(id)}`,
  getCell:              (id)  => `/cells/${encodeURIComponent(id)}`,
  listChurchUsers:      (id, qs) => `/churches/${encodeURIComponent(id)}/users?${qs}`,
  listMembersFallback:  (id, qs) => `/members?churchId=${encodeURIComponent(id)}&${qs}`,
};

async function authedFetch(path, { method = "GET", body, signal } = {}, authCtx) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { method, headers, signal, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }

  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join("\n") : (data && (data.message || data.error)) || `Erro ${res.status}.`;
    const err = new Error(msg);
    err.status  = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.mutedText}>{subtitle}</Text>}
    </View>
  );
}

function SelectChip({ label, active, onPress, activeColor }) {
  const color = activeColor || BRAND;
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={[styles.selectChip, { backgroundColor: active ? withAlpha(color, "18") : BG, borderColor: active ? color : BORDER }]}
    >
      <Text style={[styles.selectChipText, { color: active ? color : MUTED }]}>{label}</Text>
    </TouchableRipple>
  );
}

function SelectField({ label, value, placeholder, icon, onPress, disabled }) {
  const hasValue = String(value || "").trim().length > 0;
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableRipple onPress={onPress} disabled={disabled} borderless style={[styles.selectField, disabled && { opacity: 0.55 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <View style={[styles.selectFieldIcon, { backgroundColor: BRAND_LIGHT }]}>
            <MaterialCommunityIcons name={icon || "chevron-down"} size={18} color={BRAND} />
          </View>
          <Text style={[styles.selectFieldText, { color: hasValue ? NAVY : MUTED, fontWeight: hasValue ? "900" : "600" }]} numberOfLines={1}>
            {hasValue ? value : placeholder || "Selecionar"}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={MUTED} />
        </View>
      </TouchableRipple>
    </View>
  );
}

function CascadePicker({ visible, title, q, setQ, items, selectedId, onSelect, loading, emptyText }) {
  if (!visible) return null;
  return (
    <Surface elevation={0} style={styles.cascadePanel}>
      <Text style={styles.cascadeTitle}>{title}</Text>
      <Searchbar
        placeholder="Buscar..."
        value={q}
        onChangeText={setQ}
        style={styles.cascadeSearch}
        inputStyle={{ color: NAVY }}
        iconColor={MUTED}
        placeholderTextColor={MUTED}
      />
      <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={BRAND} />
            <Text style={styles.mutedText}>Carregando...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={{ padding: 14 }}>
            <Text style={styles.mutedText}>{emptyText || "Nenhum usuário encontrado."}</Text>
          </View>
        ) : (
          items.map((u) => {
            const active = selectedId === u.id;
            return (
              <TouchableRipple
                key={u.id}
                onPress={() => onSelect(u)}
                borderless
                style={[styles.cascadeRow, { borderColor: active ? BRAND : BORDER, backgroundColor: active ? BRAND_LIGHT : SURFACE }]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {isHttpUrl(u.photoUrl) ? (
                    <Avatar.Image size={40} source={{ uri: u.photoUrl }} />
                  ) : (
                    <Avatar.Text size={40} label={initials(u.fullName)} color="#fff" style={{ backgroundColor: active ? BRAND : MUTED }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: active ? BRAND : NAVY }]} numberOfLines={1}>{u.fullName}</Text>
                    <Text style={styles.mutedText} numberOfLines={1}>{u.email || u.phone || " "}</Text>
                  </View>
                  <MaterialCommunityIcons name={active ? "check-circle" : "chevron-right"} size={22} color={active ? BRAND : MUTED} />
                </View>
              </TouchableRipple>
            );
          })
        )}
      </ScrollView>
    </Surface>
  );
}

function InfoPill({ icon, label }) {
  return (
    <View style={[styles.infoPill, { backgroundColor: BRAND_LIGHT }]}>
      <MaterialCommunityIcons name={icon} size={11} color={BRAND} />
      <Text style={[styles.infoPillText, { color: NAVY }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function ColorOption({ color, name, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.colorOption,
        { borderColor: selected ? color : BORDER, backgroundColor: selected ? withAlpha(color, "16") : SURFACE, opacity: pressed ? 0.86 : 1 },
      ]}
    >
      <View style={[styles.colorPreviewCircle, { backgroundColor: color }]}>
        {selected && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
      </View>
      <Text style={[styles.colorOptionText, { color: selected ? color : NAVY }]} numberOfLines={1}>{name}</Text>
    </Pressable>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function CellCreateScreen({ navigation, route }) {
  const authCtx = useAuth();
  const { t }   = useTerms();  // ← termos da igreja

  const routeCell  = route?.params?.cell || null;
  const editCellId = route?.params?.cellId || route?.params?.id || routeCell?.id || null;
  const isEditMode = !!editCellId;

  const [loadedCell,   setLoadedCell]   = useState(routeCell);
  const [loadingCell,  setLoadingCell]  = useState(false);

  const churchId =
    loadedCell?.churchId ||
    route?.params?.churchId ||
    authCtx?.activeChurch?.id ||
    authCtx?.church?.id ||
    authCtx?.me?.activeChurchId ||
    authCtx?.user?.activeChurchId ||
    authCtx?.activeChurchId ||
    null;

  // Formulário
  const [name,         setName]         = useState("");
  const [description,  setDescription]  = useState("");
  const [meetingDay,   setMeetingDay]   = useState("");
  const [meetingTime,  setMeetingTime]  = useState("");
  const [type,         setType]         = useState("");
  const [city,         setCity]         = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [street,       setStreet]       = useState("");
  const [number,       setNumber]       = useState("");
  const [complement,   setComplement]   = useState("");
  const [reference,    setReference]    = useState("");

  // Aparência
  const [coverImageUrl,  setCoverImageUrl]  = useState("");
  const [coverImagePath, setCoverImagePath] = useState("");
  const [templateColor,  setTemplateColor]  = useState(BRAND);
  const [galleryInput,   setGalleryInput]   = useState("");
  const [galleryUrls,    setGalleryUrls]    = useState([]);

  // Liderança
  const [usersAll,     setUsersAll]     = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [leader,       setLeader]       = useState(null);
  const [viceLeader,   setViceLeader]   = useState(null);
  const [leaderOpen,   setLeaderOpen]   = useState(false);
  const [viceOpen,     setViceOpen]     = useState(false);
  const [leaderQ,      setLeaderQ]      = useState("");
  const [viceQ,        setViceQ]        = useState("");

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [snack,  setSnack]  = useState({ visible: false, text: "" });

  const applyCellToForm = useCallback((cell) => {
    if (!cell) return;
    setName(safeStr(cell?.name));
    setDescription(safeStr(cell?.description));
    setMeetingDay(safeStr(cell?.meetingDay));
    setMeetingTime(safeStr(cell?.meetingTime));
    setType(safeStr(cell?.type));
    setCity(safeStr(cell?.city));
    setNeighborhood(safeStr(cell?.neighborhood));
    setStreet(safeStr(cell?.street));
    setNumber(safeStr(cell?.number));
    setComplement(safeStr(cell?.complement));
    setReference(safeStr(cell?.reference));
    setCoverImageUrl(safeStr(cell?.photoUrl));
    setCoverImagePath("");
    setTemplateColor(safeStr(cell?.templateColor) || BRAND);
    setGalleryUrls(normalizeGallery(cell?.galleryUrls));
    setLeader(getCellLeader(cell));
    setViceLeader(getCellViceLeader(cell));
  }, []);

  useEffect(() => { if (routeCell) applyCellToForm(routeCell); }, [routeCell, applyCellToForm]);

  const loadCellForEdit = useCallback(async () => {
    if (!isEditMode || !editCellId) return;
    setLoadingCell(true);
    setError("");
    try {
      const data = await authedFetch(ENDPOINTS.getCell(editCellId), {}, authCtx);
      setLoadedCell(data);
      applyCellToForm(data);
    } catch (e) {
      setError(e?.message || `Erro ao carregar ${t.cell.toLowerCase()} para edição.`);
    } finally {
      setLoadingCell(false);
    }
  }, [isEditMode, editCellId, authCtx, applyCellToForm]);

  useEffect(() => { loadCellForEdit(); }, [loadCellForEdit]);

  // ── Usuários ───────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    if (!churchId) { setUsersAll([]); setUsersLoading(false); return; }
    setUsersLoading(true);
    try {
      const qs = new URLSearchParams({ take: "300" }).toString();
      let json;
      try {
        json = await authedFetch(ENDPOINTS.listChurchUsers(churchId, qs), {}, authCtx);
      } catch {
        json = await authedFetch(ENDPOINTS.listMembersFallback(churchId, qs), {}, authCtx);
      }
      const arr = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : Array.isArray(json?.members) ? json.members : [];
      setUsersAll(
        arr
          .map((r) => ({ id: r?.id, fullName: r?.fullName || r?.name || r?.displayName || t.member, email: r?.email || null, phone: r?.phone || null, photoUrl: r?.photoUrl || r?.avatarUrl || null }))
          .filter((x) => !!x.id)
          .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)))
      );
    } catch { setUsersAll([]); }
    finally { setUsersLoading(false); }
  }, [churchId, authCtx]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filterUsers = useCallback((list, q) => {
    const term = String(q || "").trim().toLowerCase();
    if (!term) return list;
    return list.filter((u) => [u.fullName, u.email, u.phone].filter(Boolean).join(" ").toLowerCase().includes(term));
  }, []);

  const leaderItems = useMemo(() => filterUsers(usersAll, leaderQ), [usersAll, leaderQ, filterUsers]);
  const viceItems   = useMemo(() => {
    const base = filterUsers(usersAll, viceQ);
    return leader?.id ? base.filter((u) => u.id !== leader.id) : base;
  }, [usersAll, viceQ, filterUsers, leader]);

  // ── Imagem ────────────────────────────────────────────────────────────────
  const handleCoverImagePick = useCallback(() => {
    ImagePicker.openPicker({ width: 900, height: 900, cropping: true, cropperCircleOverlay: false, compressImageQuality: 0.82, mediaType: "photo", includeBase64: false })
      .then((image) => { setCoverImagePath(image.path); setError(""); })
      .catch((err) => { if (err?.code !== "E_PICKER_CANCELLED") Alert.alert("Erro", `Não foi possível selecionar a imagem da ${t.cell.toLowerCase()}.`); });
  }, [t.cell]);

  const uploadCellCoverIfNeeded = useCallback(async (localPathOrUrl) => {
    if (!localPathOrUrl) return null;
    if (/^https?:\/\//i.test(localPathOrUrl)) return localPathOrUrl;
    if (!churchId) throw new Error(`Nenhuma igreja ativa encontrada para salvar a imagem da ${t.cell.toLowerCase()}.`);
    let uploadUri = localPathOrUrl;
    if (Platform.OS === "ios" && uploadUri.startsWith("file://")) uploadUri = uploadUri.replace("file://", "");
    const fileName    = `cell-cover-${Date.now()}.jpg`;
    const storagePath = `images/churches/${churchId}/cells/${fileName}`;
    const ref         = storage().ref(storagePath);
    await ref.putFile(uploadUri, { contentType: "image/jpeg" });
    return await ref.getDownloadURL();
  }, [churchId, t.cell]);

  const removeCoverImage = useCallback(() => { setCoverImageUrl(""); setCoverImagePath(""); }, []);

  // ── Galeria ───────────────────────────────────────────────────────────────
  const addGalleryUrl = useCallback(() => {
    const u = String(galleryInput || "").trim();
    if (!isHttpUrl(u)) return;
    setGalleryUrls((prev) => (prev.includes(u) ? prev : [...prev, u]));
    setGalleryInput("");
  }, [galleryInput]);

  const removeGalleryUrl = useCallback((u) => { setGalleryUrls((prev) => prev.filter((x) => x !== u)); }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const accent          = templateColor || BRAND;
  const accentLight     = withAlpha(accent, "18");
  const coverPreviewUri = coverImagePath || coverImageUrl;
  const hasPhoto        = !!String(coverPreviewUri || "").trim();

  const addressLabel = useMemo(
    () => formatAddress({ street: street.trim(), number: number.trim(), neighborhood: neighborhood.trim(), city: city.trim() }),
    [street, number, neighborhood, city]
  );

  const canSave = useMemo(() => {
    if (!churchId) return false;
    if (safeStr(name).length < 2) return false;
    if (!isValidTimeHHMM(meetingTime)) return false;
    if (leader?.id && viceLeader?.id && leader.id === viceLeader.id) return false;
    return true;
  }, [churchId, name, meetingTime, leader, viceLeader]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const onSave = useCallback(async () => {
    if (!canSave || saving) return;
    setError("");
    setSaving(true);
    try {
      const selectedCover = coverImagePath || coverImageUrl;
      let finalPhotoUrl   = selectedCover || null;
      if (selectedCover) finalPhotoUrl = await uploadCellCoverIfNeeded(selectedCover);

      const basePayload = {
        name:             safeStr(name),
        description:      safeStr(description)   || undefined,
        meetingDay:       safeStr(meetingDay)     || undefined,
        meetingTime:      safeStr(meetingTime)    || undefined,
        type:             safeStr(type)           || undefined,
        city:             safeStr(city)           || undefined,
        neighborhood:     safeStr(neighborhood)   || undefined,
        street:           safeStr(street)         || undefined,
        number:           safeStr(number)         || undefined,
        complement:       safeStr(complement)     || undefined,
        reference:        safeStr(reference)      || undefined,
        leaderUserId:     leader?.userId    || leader?.id    || undefined,
        viceLeaderUserId: viceLeader?.userId || viceLeader?.id || undefined,
        photoUrl:         finalPhotoUrl || null,
        templateColor:    templateColor || undefined,
        galleryUrls:      galleryUrls.length ? galleryUrls : undefined,
      };

      const payload = isEditMode ? basePayload : { churchId, ...basePayload };

      if (isEditMode) {
        await authedFetch(`/cells/${encodeURIComponent(editCellId)}`, { method: "PATCH", body: payload }, authCtx);
        setSnack({ visible: true, text: `${t.cell} atualizada com sucesso!` });  // "Grupo atualizado..."
      } else {
        await authedFetch(ENDPOINTS.createCell(), { method: "POST", body: payload }, authCtx);
        setSnack({ visible: true, text: `${t.cell} criada com sucesso!` });       // "Grupo criado..."
      }

      setCoverImageUrl(finalPhotoUrl || "");
      setCoverImagePath("");
      setTimeout(() => navigation?.goBack?.(), 450);
    } catch (e) {
      if (e?.code === "storage/unauthorized") {
        setError("Não foi possível enviar a imagem. O Firebase Storage bloqueou o envio. Verifique as regras do Storage.");
        return;
      }
      setError(e?.message || (isEditMode ? `Erro ao editar ${t.cell.toLowerCase()}.` : `Erro ao criar ${t.cell.toLowerCase()}.`));
    } finally {
      setSaving(false);
    }
  }, [canSave, saving, isEditMode, editCellId, authCtx, churchId, name, description, meetingDay, meetingTime, type, city, neighborhood, street, number, complement, reference, leader, viceLeader, navigation, coverImageUrl, coverImagePath, uploadCellCoverIfNeeded, templateColor, galleryUrls, t.cell]);

  // ── Loading edição ────────────────────────────────────────────────────────
  if (isEditMode && loadingCell && !loadedCell) {
    return (
      <View style={styles.centeredFull}>
        <Surface elevation={0} style={styles.loadingCard}>
          <ActivityIndicator color={BRAND} size="large" />
          {/* "Carregando grupo..." | "Carregando célula..." */}
          <Text style={[styles.mutedText, { marginTop: 12 }]}>Carregando {t.cell.toLowerCase()}...</Text>
        </Surface>
      </View>
    );
  }

  // ─── Labels derivados dos termos ──────────────────────────────────────────
  // Reutilizados em vários lugares da UI
  const labelSaveBtn  = saving ? "Salvando..." : isEditMode ? "Salvar alterações" : `Criar ${t.cell}`;
  const labelHeroMode = isEditMode ? "Editar" : `Criar nova`;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <Surface elevation={0} style={[styles.heroCard, { backgroundColor: NAVY }]}>
            <View style={[styles.blob, { width: 180, height: 180, top: -60, right: -50 }]} />
            <View style={[styles.blob, { width: 120, height: 120, bottom: -50, left: -30 }]} />

            <View style={styles.heroTop}>
              <Pressable onPress={saving ? null : handleCoverImagePick} style={({ pressed }) => [styles.heroAvatarPressable, pressed && !saving && { opacity: 0.88 }]}>
                <Surface elevation={0} style={[styles.heroAvatar, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
                  {hasPhoto ? (
                    <Image source={{ uri: coverPreviewUri }} style={styles.heroAvatarImg} />
                  ) : (
                    <MaterialCommunityIcons name="home-group" size={24} color="#fff" />
                  )}
                </Surface>
                <View style={styles.heroCameraBadge}>
                  <MaterialCommunityIcons name="camera" size={13} color="#fff" />
                </View>
              </Pressable>

              <View style={{ flex: 1 }}>
                {/* "Editar" | "Criar nova" */}
                <Text style={styles.heroGreet}>{labelHeroMode}</Text>
                {/* nome ou t.cell → "Grupo" | "Célula" */}
                <Text style={styles.heroTitle}>{safeStr(name) || t.cell}</Text>
                <Text style={styles.heroMeta}>
                  {type || `Defina o tipo abaixo`} {meetingDay ? `• ${meetingDay}` : ""}
                </Text>
              </View>

              <View style={[styles.colorMiniPreview, { backgroundColor: accent }]}>
                <MaterialCommunityIcons name={isEditMode ? "pencil" : "palette-outline"} size={18} color="#fff" />
              </View>
            </View>

            <View style={styles.heroPills}>
              <View style={styles.heroPill}>
                <View style={[styles.pillDot, { backgroundColor: isEditMode ? WARNING : SUCCESS }]} />
                {/* "Modo edição" | "Nova Grupo" | "Nova Célula" */}
                <Text style={styles.heroPillText}>{isEditMode ? "Modo edição" : `Nova ${t.cell}`}</Text>
              </View>
              {hasPhoto && (
                <View style={styles.heroPill}>
                  <View style={[styles.pillDot, { backgroundColor: "#7EFFD4" }]} />
                  <Text style={styles.heroPillText}>Imagem adicionada</Text>
                </View>
              )}
              <View style={styles.heroPill}>
                <View style={[styles.pillDot, { backgroundColor: accent }]} />
                {/* "Cor da grupo" | "Cor da célula" */}
                <Text style={styles.heroPillText}>Cor da {t.cell.toLowerCase()}</Text>
              </View>
              {!!leader?.fullName && (
                <View style={styles.heroPill}>
                  <View style={[styles.pillDot, { backgroundColor: "#7EFFD4" }]} />
                  <Text style={styles.heroPillText}>{leader.fullName}</Text>
                </View>
              )}
              {!churchId && (
                <View style={[styles.heroPill, { backgroundColor: DANGER_LIGHT }]}>
                  <View style={[styles.pillDot, { backgroundColor: DANGER }]} />
                  <Text style={[styles.heroPillText, { color: DANGER }]}>Sem igreja ativa</Text>
                </View>
              )}
            </View>
          </Surface>

          {!!error && (
            <Surface elevation={0} style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={DANGER} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>
                  {isEditMode ? `Não foi possível editar` : `Não foi possível salvar`}
                </Text>
                <Text style={[styles.mutedText, { marginTop: 2 }]}>{error}</Text>
              </View>
            </Surface>
          )}

          {/* ── Aparência ─────────────────────────────────────────────────── */}
          <Surface elevation={0} style={[styles.previewCard, { borderColor: withAlpha(accent, "55") }]}>
            <View style={[styles.previewStrip, { backgroundColor: accent }]} />
            <View style={{ padding: 14, gap: 14 }}>
              <SectionHeader
                title={`Aparência da ${t.cell.toLowerCase()}`}  // "Aparência do grupo"
                subtitle={`Toque na foto para abrir a galeria. Escolha também a cor usada nos cards da ${t.cell.toLowerCase()}.`}
              />

              <View style={styles.appearanceRow}>
                <Pressable
                  onPress={saving ? null : handleCoverImagePick}
                  style={({ pressed }) => [styles.coverPicker, { borderColor: withAlpha(accent, "55"), backgroundColor: accentLight, opacity: pressed && !saving ? 0.9 : 1 }]}
                >
                  {hasPhoto ? (
                    <Image source={{ uri: coverPreviewUri }} style={styles.coverPickerImage} />
                  ) : (
                    <View style={styles.coverPickerFallback}>
                      <MaterialCommunityIcons name="camera-plus-outline" size={34} color={accent} />
                      <Text style={[styles.coverPickerFallbackText, { color: accent }]}>Adicionar foto</Text>
                    </View>
                  )}
                  <View style={[styles.coverPickerBadge, { backgroundColor: accent }]}>
                    <MaterialCommunityIcons name="camera" size={16} color="#fff" />
                  </View>
                </Pressable>

                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {safeStr(name) || `Nome da ${t.cell.toLowerCase()}`}  {/* "Nome do grupo" */}
                  </Text>
                  <Text style={styles.mutedText}>
                    A foto será enviada ao Firebase Storage somente quando você tocar em "{labelSaveBtn}".
                  </Text>
                  {hasPhoto && (
                    <Button mode="outlined" compact icon="trash-can-outline" onPress={removeCoverImage} disabled={saving}
                      textColor={DANGER} style={{ alignSelf: "flex-start", borderRadius: 999, borderColor: DANGER }}>
                      Remover foto
                    </Button>
                  )}
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={{ gap: 10 }}>
                {/* "Cor do grupo" | "Cor da célula" */}
                <Text style={styles.fieldLabel}>Cor da {t.cell.toLowerCase()}</Text>
                <View style={styles.colorOptionsGrid}>
                  {TEMPLATE_COLORS.map((c) => (
                    <ColorOption key={c.hex} color={c.hex} name={c.name} selected={templateColor === c.hex} onPress={() => setTemplateColor(c.hex)} />
                  ))}
                </View>
              </View>

              <View style={styles.previewPills}>
                {!!(meetingDay || meetingTime) && (
                  <InfoPill icon="calendar-clock" label={[meetingDay, meetingTime].filter(Boolean).join(" às ")} />
                )}
                {!!addressLabel && <InfoPill icon="map-marker" label={addressLabel} />}
                {/* t.cellLeader → "Anfitrião" | "Líder" */}
                {!!leader?.fullName    && <InfoPill icon="account-star" label={`${t.cellLeader}: ${leader.fullName}`} />}
                {!!viceLeader?.fullName && <InfoPill icon="account"      label={`Vice: ${viceLeader.fullName}`} />}
              </View>
            </View>
          </Surface>

          {/* ── Informações ───────────────────────────────────────────────── */}
          <Surface elevation={0} style={styles.formCard}>
            <View style={[styles.formStrip, { backgroundColor: accent }]} />
            <View style={styles.formBody}>
              {/* "Informações" / "Nome e descrição do grupo." */}
              <SectionHeader title="Informações" subtitle={`Nome e descrição da ${t.cell.toLowerCase()}.`} />

              <TextInput
                label={`Nome da ${t.cell.toLowerCase()} *`}   // "Nome do grupo *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                outlineColor={BORDER}
                activeOutlineColor={accent}
                style={styles.input}
              />

              <TextInput
                label="Descrição (opcional)"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                outlineColor={BORDER}
                activeOutlineColor={accent}
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <Divider style={styles.divider} />

              <SectionHeader title="Tipo" subtitle="Ex.: Jovens, Casais, Kids…" />
              <View style={styles.chipRow}>
                {CELL_TYPES.map((tp) => (
                  <SelectChip key={tp} label={tp} active={type === tp} onPress={() => setType(type === tp ? "" : tp)} activeColor={accent} />
                ))}
              </View>
              <TextInput
                label="Outro tipo (opcional)"
                value={type}
                onChangeText={setType}
                mode="outlined"
                outlineColor={BORDER}
                activeOutlineColor={accent}
                style={styles.input}
                placeholder="Ex.: Universitários"
              />
            </View>
          </Surface>

          {/* ── Local ─────────────────────────────────────────────────────── */}
          <Surface elevation={0} style={styles.formCard}>
            <View style={[styles.formStrip, { backgroundColor: SUCCESS }]} />
            <View style={styles.formBody}>
              <SectionHeader title="Local" subtitle="Cidade, bairro e endereço (opcional)." />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}><TextInput label="Cidade"  value={city}         onChangeText={setCity}         mode="outlined" outlineColor={BORDER} activeOutlineColor={accent} style={styles.input} /></View>
                <View style={{ flex: 1 }}><TextInput label="Bairro"  value={neighborhood}  onChangeText={setNeighborhood}  mode="outlined" outlineColor={BORDER} activeOutlineColor={accent} style={styles.input} /></View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1.6 }}><TextInput label="Rua"    value={street}  onChangeText={setStreet}  mode="outlined" outlineColor={BORDER} activeOutlineColor={accent} style={styles.input} /></View>
                <View style={{ flex: 0.7 }}><TextInput label="Número" value={number}  onChangeText={setNumber}  mode="outlined" outlineColor={BORDER} activeOutlineColor={accent} style={styles.input} keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"} /></View>
              </View>
              <TextInput label="Complemento (opcional)" value={complement} onChangeText={setComplement} mode="outlined" outlineColor={BORDER} activeOutlineColor={accent} style={styles.input} placeholder="Apto, casa, bloco..." />
              <TextInput label="Referência (opcional)"  value={reference}  onChangeText={setReference}  mode="outlined" outlineColor={BORDER} activeOutlineColor={accent} style={styles.input} placeholder="Próximo ao mercado, esquina..." />
            </View>
          </Surface>

          {/* ── Reunião ───────────────────────────────────────────────────── */}
          <Surface elevation={0} style={styles.formCard}>
            <View style={[styles.formStrip, { backgroundColor: WARNING }]} />
            <View style={styles.formBody}>
              {/* t.cellMeeting → "Encontro" | "Reunião" */}
              <SectionHeader title={t.cellMeeting} subtitle="Você pode definir agora ou depois." />

              <Text style={styles.fieldLabel}>Dia da semana</Text>
              <View style={styles.chipRow}>
                {DAYS.map((d) => (
                  <SelectChip key={d} label={d.slice(0, 3)} active={meetingDay === d} onPress={() => setMeetingDay(meetingDay === d ? "" : d)} activeColor={WARNING} />
                ))}
              </View>

              <TextInput
                label="Horário (HH:MM)"
                value={meetingTime}
                onChangeText={(v) => setMeetingTime(normalizeTimeInput(v))}
                mode="outlined"
                outlineColor={BORDER}
                activeOutlineColor={accent}
                placeholder="Ex: 19:30 ou 19h"
                style={styles.input}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                right={
                  !isValidTimeHHMM(meetingTime)
                    ? <TextInput.Icon icon="alert-circle" color={DANGER} />
                    : <TextInput.Icon icon="clock-outline" color={MUTED} />
                }
              />
              {!isValidTimeHHMM(meetingTime) && (
                <View style={[styles.infoPill, { backgroundColor: DANGER_LIGHT, alignSelf: "flex-start" }]}>
                  <MaterialCommunityIcons name="alert-circle" size={11} color={DANGER} />
                  <Text style={{ fontSize: 10, fontWeight: "800", color: DANGER }}>Horário inválido. Use 00:00 até 23:59.</Text>
                </View>
              )}
            </View>
          </Surface>

          {/* ── Liderança ─────────────────────────────────────────────────── */}
          <Surface elevation={0} style={styles.formCard}>
            <View style={[styles.formStrip, { backgroundColor: "#7C3AED" }]} />
            <View style={styles.formBody}>
              {/* "Liderança" / "Defina o anfitrião e vice-anfitrião da célula." */}
              <SectionHeader
                title="Liderança"
                subtitle={`Defina o ${t.cellLeader.toLowerCase()} e vice-${t.cellLeader.toLowerCase()} da ${t.cell.toLowerCase()}.`}
              />

              {/* t.cellLeader → "Anfitrião" | "Líder" */}
              <SelectField
                label={t.cellLeader}
                value={leader?.fullName || ""}
                placeholder={!churchId ? "Nenhuma igreja ativa" : usersLoading ? "Carregando..." : `Selecionar ${t.member.toLowerCase()}`}
                icon="account-star-outline"
                onPress={() => { if (!churchId) return; setViceOpen(false); setLeaderOpen((v) => !v); }}
                disabled={!churchId}
              />

              <CascadePicker
                visible={leaderOpen}
                title={`Selecionar ${t.cellLeader.toLowerCase()}`}   // "Selecionar anfitrião"
                q={leaderQ}
                setQ={setLeaderQ}
                items={leaderItems}
                selectedId={leader?.id}
                loading={usersLoading}
                onSelect={(u) => {
                  if (viceLeader?.id && viceLeader.id === u.id) setViceLeader(null);
                  setLeader(u);
                  setLeaderOpen(false);
                  setViceOpen(true);
                }}
              />

              {!!leader?.id && (
                <TouchableRipple onPress={() => { setLeader(null); setViceLeader(null); setLeaderQ(""); setViceQ(""); }} borderless>
                  <Text style={styles.clearBtn}>Limpar {t.cellLeader.toLowerCase()}</Text>
                </TouchableRipple>
              )}

              <Divider style={styles.divider} />

              <SelectField
                label={`Vice-${t.cellLeader.toLowerCase()}`}         // "Vice-anfitrião"
                value={viceLeader?.fullName || ""}
                placeholder={
                  !churchId ? "Nenhuma igreja ativa"
                  : !leader?.id ? `Selecione um ${t.cellLeader.toLowerCase()} primeiro`
                  : usersLoading ? "Carregando..."
                  : `Selecionar ${t.member.toLowerCase()}`
                }
                icon="account-outline"
                onPress={() => { if (!churchId || !leader?.id) return; setLeaderOpen(false); setViceOpen((v) => !v); }}
                disabled={!churchId || !leader?.id}
              />

              <CascadePicker
                visible={viceOpen}
                title={`Selecionar vice-${t.cellLeader.toLowerCase()}`}
                q={viceQ}
                setQ={setViceQ}
                items={viceItems}
                selectedId={viceLeader?.id}
                loading={usersLoading}
                onSelect={(u) => { setViceLeader(u); setViceOpen(false); }}
                emptyText={leader?.id ? "Nenhum usuário encontrado." : `Selecione um ${t.cellLeader.toLowerCase()} primeiro.`}
              />

              {!!viceLeader?.id && (
                <TouchableRipple onPress={() => { setViceLeader(null); setViceQ(""); setViceOpen(false); }} borderless>
                  <Text style={styles.clearBtn}>Limpar vice-{t.cellLeader.toLowerCase()}</Text>
                </TouchableRipple>
              )}

              {leader?.id && viceLeader?.id && leader.id === viceLeader.id && (
                <View style={[styles.infoPill, { backgroundColor: DANGER_LIGHT, alignSelf: "flex-start" }]}>
                  <MaterialCommunityIcons name="alert-circle" size={11} color={DANGER} />
                  <Text style={{ fontSize: 10, fontWeight: "800", color: DANGER }}>
                    {t.cellLeader} e Vice-{t.cellLeader.toLowerCase()} não podem ser a mesma pessoa.
                  </Text>
                </View>
              )}
            </View>
          </Surface>

          {/* ── Galeria ───────────────────────────────────────────────────── */}
          <Surface elevation={0} style={styles.formCard}>
            <View style={[styles.formStrip, { backgroundColor: accent }]} />
            <View style={styles.formBody}>
              <SectionHeader title="Galeria" subtitle={`Opcional. Adicione URLs de imagens extras da ${t.cell.toLowerCase()}.`} />

              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
                <View style={{ flex: 1 }}>
                  <TextInput label="Adicionar imagem (URL)" value={galleryInput} onChangeText={setGalleryInput} mode="outlined" outlineColor={BORDER} activeOutlineColor={accent} placeholder="https://..." style={styles.input} />
                </View>
                <Button mode="contained" onPress={addGalleryUrl} disabled={!isHttpUrl(galleryInput)} style={{ borderRadius: 999, marginBottom: 4 }} buttonColor={accent} textColor="#fff">Add</Button>
              </View>

              {galleryUrls.length === 0 ? (
                <View style={[styles.emptyState, { padding: 16 }]}>
                  <Text style={styles.mutedText}>Galeria vazia.</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {galleryUrls.map((u) => (
                      <Surface key={u} elevation={0} style={styles.galleryThumb}>
                        <Image source={{ uri: u }} style={{ width: "100%", height: "100%" }} />
                        <TouchableRipple onPress={() => removeGalleryUrl(u)} borderless style={styles.galleryRemoveBtn}>
                          <MaterialCommunityIcons name="close" size={12} color="#fff" />
                        </TouchableRipple>
                      </Surface>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          </Surface>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Footer fixo ───────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Button mode="outlined" onPress={() => navigation?.goBack?.()} disabled={saving} style={[styles.footerBtn, { borderColor: BORDER }]} textColor={MUTED}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={onSave}
            loading={saving}
            disabled={!canSave || saving}
            style={[styles.footerBtn, { flex: 1.5 }]}
            buttonColor={accent}
            textColor="#fff"
            icon={isEditMode ? "content-save" : "check"}
          >
            {labelSaveBtn}
          </Button>
        </View>
      </KeyboardAvoidingView>

      <Snackbar visible={snack.visible} onDismiss={() => setSnack({ visible: false, text: "" })} duration={2200} style={{ backgroundColor: NAVY }}>
        {snack.text}
      </Snackbar>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG },
  content:     { padding: 16, paddingBottom: 16, gap: 12 },
  centeredFull:{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" },
  loadingCard: {
    alignItems: "center", padding: 32, borderRadius: 20,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ ios: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 2 } }),
  },
  heroCard: { borderRadius: 20, padding: 18, paddingTop: Platform.OS === "android" ? 20 : 18, overflow: "hidden" },
  blob:     { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  heroTop:  { flexDirection: "row", alignItems: "center", gap: 12, zIndex: 2 },
  heroAvatarPressable: { width: 58, height: 58, position: "relative" },
  heroAvatar:    { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  heroAvatarImg: { width: "100%", height: "100%", borderRadius: 18 },
  heroCameraBadge: { position: "absolute", right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: NAVY },
  heroGreet:  { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.65)" },
  heroTitle:  { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  heroMeta:   { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  heroPills:  { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap", zIndex: 2 },
  heroPill:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  pillDot:    { width: 6, height: 6, borderRadius: 999 },
  heroPillText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  colorMiniPreview: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.30)" },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: DANGER_LIGHT, borderRadius: 16, borderWidth: 1, borderColor: DANGER, padding: 14 },
  errorTitle:  { fontSize: 13, fontWeight: "900", color: NAVY },
  previewCard: {
    backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1.5, overflow: "hidden",
    ...Platform.select({ ios: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 2 } }),
  },
  previewStrip: { height: 4 },
  appearanceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  coverPicker:   { width: 116, height: 116, borderRadius: 28, borderWidth: 1.5, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  coverPickerImage:        { width: "100%", height: "100%", borderRadius: 28 },
  coverPickerFallback:     { alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8 },
  coverPickerFallbackText: { fontSize: 11, fontWeight: "900", textAlign: "center" },
  coverPickerBadge:        { position: "absolute", right: 8, bottom: 8, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: SURFACE },
  previewName:  { fontSize: 18, fontWeight: "900", letterSpacing: -0.4, color: NAVY },
  previewPills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  formCard: {
    backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: "hidden",
    ...Platform.select({ ios: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 2 } }),
  },
  formStrip: { height: 4 },
  formBody:  { padding: 16, gap: 12 },
  input:     { backgroundColor: SURFACE },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },
  fieldLabel:   { fontSize: 12, fontWeight: "800", color: MUTED, marginBottom: 4 },
  mutedText:    { fontSize: 12, color: MUTED, lineHeight: 18 },
  divider:      { backgroundColor: BORDER, marginVertical: 4 },
  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  selectChip:   { borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7 },
  selectChipText: { fontSize: 12, fontWeight: "800" },
  colorOptionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorOption:  { width: "48%", minHeight: 48, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  colorPreviewCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  colorOptionText: { flex: 1, fontSize: 12, fontWeight: "900" },
  selectField:     { borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  selectFieldIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  selectFieldText: { flex: 1, fontSize: 14 },
  cascadePanel:  { borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, borderRadius: 18, padding: 12, marginTop: -4 },
  cascadeTitle:  { fontSize: 14, fontWeight: "900", color: NAVY, marginBottom: 10 },
  cascadeSearch: { borderRadius: 14, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, marginBottom: 10, elevation: 0 },
  cascadeRow:    { padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  loadingRow:    { flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  infoPill:      { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  infoPillText:  { fontSize: 10, fontWeight: "800" },
  memberName:    { fontSize: 13, fontWeight: "900", color: NAVY },
  clearBtn:      { fontSize: 12, fontWeight: "700", color: MUTED, paddingVertical: 4 },
  galleryThumb:  { width: 88, height: 70, borderRadius: 14, overflow: "hidden", backgroundColor: BRAND_LIGHT, borderWidth: 1, borderColor: BORDER },
  galleryRemoveBtn: { position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.4)", width: 22, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  emptyState: { borderWidth: 1.5, borderStyle: "dashed", borderColor: BORDER, borderRadius: 14, alignItems: "center" },
  footer:    { padding: 16, paddingTop: 12, backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER, flexDirection: "row", gap: 10 },
  footerBtn: { flex: 1, borderRadius: 999 },
});
