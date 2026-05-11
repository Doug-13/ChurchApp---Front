// src/screens/news/NewsFormScreen.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import ImagePicker from "react-native-image-crop-picker";
import storage from "@react-native-firebase/storage";
import { getAuth } from "@react-native-firebase/auth";
import {
  Avatar,
  Button,
  Divider,
  Icon,
  IconButton,
  Modal,
  Portal,
  Surface,
  TextInput as PaperTextInput,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";

// ─── Design tokens ────────────────────────────────────────────────────────────

const DS = {
  colors: {
    primary: "#4158D0",
    primaryDark: "#2D3FA6",
    bg: "#F5F6FA",
    card: "#FFFFFF",
    text: "#1A2366",
    textMuted: "#9198B5",
    border: "#E4E6F0",
    danger: "#E84D4D",
    success: "#2DBF8A",
    warning: "#F5A623",
    tint: "#EEF0FA",
    inputBg: "#FAFBFF",
    outline: "#E4E6F0",
    surface: "#FFFFFF",
  },
  radius: {
    sm: 12,
    md: 16,
    card: 20,
    lg: 24,
    xl: 28,
    pill: 999,
    input: 14,
  },
  space: (n) => n * 8,
};

// ─── News types ───────────────────────────────────────────────────────────────

const NEWS_TYPES = [
  {
    value: "GENERAL",
    label: "Geral",
    icon: "bullhorn-outline",
    color: "#2DBF8A",
    bg: "#E8F9F3",
  },
  {
    value: "URGENT",
    label: "Urgente",
    icon: "alert-circle",
    color: "#E84D4D",
    bg: "#FEECEC",
  },
  {
    value: "IMPORTANT",
    label: "Importante",
    icon: "information",
    color: "#4158D0",
    bg: "#EEF0FA",
  },
  {
    value: "WARNING",
    label: "Atenção",
    icon: "alert",
    color: "#F5A623",
    bg: "#FEF5E7",
  },
  {
    value: "INFO",
    label: "Informativo",
    icon: "information-outline",
    color: "#2E8AE5",
    bg: "#E6F4FF",
  },
  {
    value: "EVENT",
    label: "Evento",
    icon: "calendar-star",
    color: "#7C3AED",
    bg: "#F1EAFE",
  },
  {
    value: "SOCIAL_ACTION",
    label: "Ação social",
    icon: "hand-heart",
    color: "#E85D75",
    bg: "#FDECEF",
  },
  {
    value: "MEETING",
    label: "Reunião",
    icon: "account-group",
    color: "#0EA5E9",
    bg: "#E7F6FE",
  },
  {
    value: "LEADERSHIP",
    label: "Liderança",
    icon: "account-tie",
    color: "#6246EA",
    bg: "#EFECFF",
  },
  {
    value: "PRAYER",
    label: "Oração",
    icon: "hands-pray",
    color: "#14B8A6",
    bg: "#E6FFFA",
  },
  {
    value: "WORSHIP",
    label: "Louvor",
    icon: "music-clef-treble",
    color: "#EC4899",
    bg: "#FCE7F3",
  },
  {
    value: "SCALE",
    label: "Escala",
    icon: "clipboard-list-outline",
    color: "#F97316",
    bg: "#FFF3E8",
  },
  {
    value: "TRAINING",
    label: "Treinamento",
    icon: "school-outline",
    color: "#2563EB",
    bg: "#EAF0FF",
  },
  {
    value: "CHILDREN",
    label: "Infantil",
    icon: "baby-face-outline",
    color: "#06B6D4",
    bg: "#E6FAFD",
  },
  {
    value: "YOUTH",
    label: "Jovens",
    icon: "account-star-outline",
    color: "#8B5CF6",
    bg: "#F3EFFF",
  },
  {
    value: "WOMEN",
    label: "Mulheres",
    icon: "human-female",
    color: "#EC4899",
    bg: "#FCE7F3",
  },
  {
    value: "MEN",
    label: "Homens",
    icon: "human-male",
    color: "#2563EB",
    bg: "#EAF0FF",
  },
  {
    value: "FINANCE",
    label: "Financeiro",
    icon: "cash-multiple",
    color: "#16A34A",
    bg: "#EAFBF0",
  },
  {
    value: "VOLUNTEERS",
    label: "Voluntários",
    icon: "account-heart-outline",
    color: "#22C55E",
    bg: "#EAFBF0",
  },
];

const VALID_NEWS_TYPES = new Set(NEWS_TYPES.map((item) => item.value));

const LEGACY_TYPE_MAP = {
  Aviso: "GENERAL",
  Evento: "EVENT",
  "Ação social": "SOCIAL_ACTION",
  "Acao social": "SOCIAL_ACTION",
};

// ─── Helpers gerais ───────────────────────────────────────────────────────────

const safeStr = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const isHttpUrl = (value) => /^https?:\/\//i.test(safeStr(value));

const pad2 = (n) => String(n).padStart(2, "0");

function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeNewsType(value) {
  const clean = safeStr(value);

  if (!clean) return "GENERAL";

  if (LEGACY_TYPE_MAP[clean]) {
    return LEGACY_TYPE_MAP[clean];
  }

  const upper = clean.toUpperCase();

  if (VALID_NEWS_TYPES.has(upper)) {
    return upper;
  }

  return "GENERAL";
}

function normalizeMinistry(ministry) {
  if (!ministry) {
    return {
      id: makeId("ministry"),
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

function dedupeMinistries(list) {
  const map = new Map();

  for (const item of Array.isArray(list) ? list : []) {
    if (!item?.id) continue;
    map.set(String(item.id), item);
  }

  return Array.from(map.values());
}

function dateToInputParts(value) {
  if (!value) {
    return {
      date: "",
      time: "",
    };
  }

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return {
      date: "",
      time: "",
    };
  }

  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

function inputPartsToISO(dateLabel, timeLabel) {
  const date = safeStr(dateLabel);
  const time = safeStr(timeLabel);

  if (!date && !time) return null;
  if (!date) return null;

  const finalTime = time || "23:59";
  const d = new Date(`${date}T${finalTime}:00`);

  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString();
}

function isValidDateInput(value) {
  const s = safeStr(value);

  if (!s) return true;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!m) return false;

  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);

  const d = new Date(yyyy, mm - 1, dd);

  return (
    d.getFullYear() === yyyy &&
    d.getMonth() === mm - 1 &&
    d.getDate() === dd
  );
}

function isValidTimeInput(value) {
  const s = safeStr(value);

  if (!s) return true;

  const m = s.match(/^(\d{2}):(\d{2})$/);

  if (!m) return false;

  const hh = Number(m[1]);
  const mm = Number(m[2]);

  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function authFetch(path, opts = {}) {
  const { method = "GET", body } = opts;

  const fbUser = getAuth().currentUser;

  if (!fbUser) {
    throw new Error("Usuário não autenticado.");
  }

  const token = await fbUser.getIdToken(true);
  const url = `${API_BASE_URL}${path}`;

  if (__DEV__) {
    console.log("➡️ [NewsForm]", method, url, body ?? "");
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text().catch(() => "");

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (__DEV__) {
    console.log("⬅️ [NewsForm]", res.status, url, data);
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(Array.isArray(msg) ? msg.join(", ") : msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

function unwrapApiData(response) {
  if (response?.success && response?.data !== undefined) {
    return response.data;
  }

  return response;
}

// ─── Firebase Storage ─────────────────────────────────────────────────────────

async function deleteCoverImage(url) {
  if (!url || !isHttpUrl(url)) return;

  try {
    await storage().refFromURL(url).delete();

    if (__DEV__) {
      console.log("🗑️ [Storage] Capa antiga deletada:", url);
    }
  } catch (error) {
    if (__DEV__) {
      console.log(
        "⚠️ [Storage] Não foi possível deletar capa antiga:",
        error?.message,
      );
    }
  }
}

async function uploadCoverImage(localUri, newsId, uid, onProgress) {
  let uploadUri = localUri;

  if (Platform.OS === "ios") {
    uploadUri = localUri.replace(/^file:\/\//, "");
  } else if (!uploadUri.startsWith("file://") && uploadUri.startsWith("/")) {
    uploadUri = `file://${uploadUri}`;
  }

  const suffix = `news_${newsId || "new"}_${uid}_${Date.now()}.jpg`;
  const storagePath = `images/news/covers/${suffix}`;

  if (__DEV__) {
    console.log("📤 [Storage] Upload capa:", {
      uploadUri,
      storagePath,
    });
  }

  const ref = storage().ref(storagePath);
  const task = ref.putFile(uploadUri);

  task.on("state_changed", (snap) => {
    const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);

    if (__DEV__) {
      console.log(`📤 [Storage] ${pct}%`);
    }

    onProgress?.(pct);
  });

  await task;

  const url = await ref.getDownloadURL();

  if (__DEV__) {
    console.log("✅ [Storage] Capa enviada:", url);
  }

  return url;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useChurchMinistries({ churchId, enabled, q, apiGet }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reqIdRef = useRef(0);

  const reload = useCallback(async () => {
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

      const term = safeStr(q);

      if (term) {
        qs.set("q", term);
      }

      const json = await apiGet(`/churches/${churchId}/ministries?${qs.toString()}`);

      if (rid !== reqIdRef.current) return;

      const arr = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];

      setItems(dedupeMinistries(arr.map(normalizeMinistry)));
    } catch (err) {
      if (rid !== reqIdRef.current) return;

      setError(String(err?.message || err));
      setItems([]);
    } finally {
      if (rid === reqIdRef.current) {
        setLoading(false);
      }
    }
  }, [apiGet, churchId, enabled, q]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!enabled) return undefined;

    const timer = setTimeout(() => {
      reload();
    }, 300);

    return () => clearTimeout(timer);
  }, [q, enabled, reload]);

  return {
    items,
    loading,
    error,
    reload,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <Text style={styles.label}>
      {children}
      {required && <Text style={{ color: DS.colors.danger }}> *</Text>}
    </Text>
  );
}

function Field({ label, required, children }) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
    </View>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  keyboardType,
  autoCapitalize,
  maxLength,
  editable = true,
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={DS.colors.textMuted}
      style={[
        styles.input,
        multiline && {
          height: numberOfLines ? numberOfLines * 24 : 110,
          textAlignVertical: "top",
        },
        !editable && {
          opacity: 0.65,
          backgroundColor: "#EEF2F7",
        },
      ]}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? "sentences"}
      maxLength={maxLength}
      editable={editable}
      includeFontPadding={false}
    />
  );
}

function TypeSelector({ selected, onSelect, disabled }) {
  return (
    <View style={styles.typeGrid}>
      {NEWS_TYPES.map((item) => {
        const isSelected = selected === item.value;

        return (
          <Pressable
            key={item.value}
            onPress={disabled ? null : () => onSelect(item.value)}
            style={[
              styles.typeChip,
              {
                backgroundColor: isSelected ? item.bg : DS.colors.card,
                borderColor: isSelected ? item.color : DS.colors.border,
              },
              disabled && {
                opacity: 0.6,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={16}
              color={isSelected ? item.color : DS.colors.textMuted}
            />

            <Text
              style={[
                styles.typeChipText,
                {
                  color: isSelected ? item.color : DS.colors.textMuted,
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CoverPicker({
  uri,
  onPick,
  onRemove,
  uploading,
  uploadPercent,
  disabled,
}) {
  return (
    <View style={styles.coverWrap}>
      {uri ? (
        <View style={styles.coverPreviewWrap}>
          <Image source={{ uri }} style={styles.coverPreview} resizeMode="cover" />

          {uploading && (
            <View style={styles.coverOverlay}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.coverOverlayText}>{uploadPercent ?? 0}%</Text>
            </View>
          )}

          {!uploading && (
            <View style={styles.coverActions}>
              <Pressable
                onPress={disabled ? null : onPick}
                style={({ pressed }) => [
                  styles.coverActionBtn,
                  pressed && { opacity: 0.8 },
                  disabled && { opacity: 0.55 },
                ]}
              >
                <MaterialCommunityIcons
                  name="image-edit-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.coverActionText}>Alterar</Text>
              </Pressable>

              <Pressable
                onPress={disabled ? null : onRemove}
                style={({ pressed }) => [
                  styles.coverActionBtn,
                  styles.coverActionBtnDanger,
                  pressed && { opacity: 0.8 },
                  disabled && { opacity: 0.55 },
                ]}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.coverActionText}>Remover</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        <Pressable
          onPress={disabled ? null : onPick}
          style={({ pressed }) => [
            styles.coverPlaceholder,
            pressed && { opacity: 0.8 },
            disabled && { opacity: 0.5 },
          ]}
        >
          <View style={styles.coverPlaceholderIcon}>
            <MaterialCommunityIcons
              name="image-plus"
              size={28}
              color={DS.colors.primary}
            />
          </View>

          <Text style={styles.coverPlaceholderTitle}>
            Adicionar imagem de capa
          </Text>

          <Text style={styles.coverPlaceholderSub}>
            Recomendado: 1200 × 630px • JPG ou PNG
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function StatusToggle({ active, onToggle, disabled }) {
  return (
    <Pressable
      onPress={disabled ? null : onToggle}
      style={[
        styles.statusToggle,
        {
          backgroundColor: active ? "#E8F9F3" : DS.colors.bg,
          borderColor: active ? DS.colors.success : DS.colors.border,
        },
        disabled && {
          opacity: 0.5,
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: active
              ? DS.colors.success
              : DS.colors.textMuted,
          },
        ]}
      />

      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.statusLabel,
            {
              color: active ? DS.colors.success : DS.colors.textMuted,
            },
          ]}
        >
          {active ? "Publicado" : "Rascunho"}
        </Text>

        <Text style={styles.statusSub}>
          {active
            ? "Visível conforme destino e validade."
            : "Não aparece para os membros."}
        </Text>
      </View>

      <View style={[styles.switchFake, active ? styles.switchOn : styles.switchOff]}>
        <View
          style={[
            styles.switchThumb,
            active
              ? { alignSelf: "flex-end" }
              : { alignSelf: "flex-start" },
          ]}
        />
      </View>
    </Pressable>
  );
}

function PrimaryBtn({ title, onPress, disabled, loading }) {
  return (
    <Pressable
      onPress={disabled ? null : onPress}
      style={({ pressed }) => [
        styles.btnPrimary,
        disabled && { opacity: 0.55 },
        pressed && !disabled && { opacity: 0.9 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.btnPrimaryText}>{title}</Text>
      )}
    </Pressable>
  );
}

function OutlineBtn({ title, onPress, disabled }) {
  return (
    <Pressable
      onPress={disabled ? null : onPress}
      style={({ pressed }) => [
        styles.btnOutline,
        disabled && { opacity: 0.55 },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <Text style={styles.btnOutlineText}>{title}</Text>
    </Pressable>
  );
}

function BottomSheet({
  visible,
  onDismiss,
  title,
  subtitle,
  children,
  rightAction,
}) {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        <Surface
          elevation={0}
          style={{
            backgroundColor: DS.colors.card,
            borderTopLeftRadius: DS.radius.xl,
            borderTopRightRadius: DS.radius.xl,
            padding: DS.space(2),
            height: "82%",
            borderWidth: 1,
            borderColor: DS.colors.border,
          }}
        >
          <View style={{ alignItems: "center", paddingBottom: DS.space(1) }}>
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 999,
                backgroundColor: DS.colors.border,
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
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "900",
                  color: DS.colors.text,
                }}
              >
                {title}
              </Text>

              {subtitle ? (
                <Text
                  style={{
                    color: DS.colors.textMuted,
                    marginTop: 2,
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {rightAction}

              <IconButton
                icon="close"
                onPress={onDismiss}
                iconColor={DS.colors.textMuted}
              />
            </View>
          </View>

          <Divider style={{ backgroundColor: DS.colors.border }} />

          <View style={{ marginTop: 12, flex: 1 }}>{children}</View>
        </Surface>
      </Modal>
    </Portal>
  );
}

function SelectField({ label, value, placeholder, leftIcon, onPress }) {
  return (
    <View>
      <PaperTextInput
        mode="outlined"
        label={label}
        value={value || ""}
        placeholder={placeholder}
        editable={false}
        left={
          leftIcon ? (
            <PaperTextInput.Icon icon={leftIcon} color={DS.colors.textMuted} />
          ) : null
        }
        right={<PaperTextInput.Icon icon="chevron-down" color={DS.colors.textMuted} />}
        pointerEvents="none"
        outlineColor={DS.colors.border}
        activeOutlineColor={DS.colors.primary}
        textColor={DS.colors.text}
        placeholderTextColor={DS.colors.textMuted}
        style={{ backgroundColor: DS.colors.inputBg }}
        outlineStyle={{
          borderRadius: DS.radius.sm,
          borderWidth: 1.5,
        }}
      />

      <Pressable
        onPress={onPress}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </View>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Icon source={icon} size={30} color={DS.colors.textMuted} />
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewsFormScreen({ navigation, route }) {
  const existingPost = route?.params?.post ?? null;
  const isEdit = !!existingPost;

  const { activeChurchId, activeChurch, apiFetchAuth } = useAuth();

  const churchId = activeChurchId || activeChurch?.id || existingPost?.churchId || null;

  const mounted = useRef(true);
  const saveInFlightRef = useRef(false);

  const initialExpires = dateToInputParts(existingPost?.expiresAt);
  const initialType = normalizeNewsType(existingPost?.type);

  const initialVisibilityMode = existingPost?.targetDepartmentId
    ? "ministries"
    : "all";

  const initialVisibilityMinistries = existingPost?.targetDepartmentId
    ? [
        normalizeMinistry({
          id: existingPost.targetDepartmentId,
          name: existingPost.targetDepartmentName || "Ministério",
          color: existingPost.targetDepartmentColor || null,
          icon: existingPost.targetDepartmentIcon || null,
        }),
      ]
    : [];

  const [saving, setSaving] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(null);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(safeStr(existingPost?.title));
  const [content, setContent] = useState(safeStr(existingPost?.content));
  const [type, setType] = useState(initialType);
  const [active, setActive] = useState(
    existingPost ? existingPost?.active !== false : true,
  );
  const [coverUri, setCoverUri] = useState(safeStr(existingPost?.coverUrl));

  const [expiresDate, setExpiresDate] = useState(initialExpires.date);
  const [expiresTime, setExpiresTime] = useState(initialExpires.time);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerValue, setPickerValue] = useState(new Date());

  const [visibilityMode, setVisibilityMode] = useState(initialVisibilityMode);
  const [visibilityMinistries, setVisibilityMinistries] = useState(
    dedupeMinistries(initialVisibilityMinistries),
  );
  const [visibilityPickerOpen, setVisibilityPickerOpen] = useState(false);
  const [ministryQuery, setMinistryQuery] = useState("");

  const apiGet = useCallback(
    async (path) => {
      if (typeof apiFetchAuth === "function") {
        const res = await apiFetchAuth(path, { method: "GET" });
        return unwrapApiData(res);
      }

      const res = await authFetch(path, { method: "GET" });
      return unwrapApiData(res);
    },
    [apiFetchAuth],
  );

  const apiPost = useCallback(
    async (path, body) => {
      if (typeof apiFetchAuth === "function") {
        const res = await apiFetchAuth(path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        return unwrapApiData(res);
      }

      const res = await authFetch(path, {
        method: "POST",
        body,
      });

      return unwrapApiData(res);
    },
    [apiFetchAuth],
  );

  const apiPatch = useCallback(
    async (path, body) => {
      if (typeof apiFetchAuth === "function") {
        const res = await apiFetchAuth(path, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        return unwrapApiData(res);
      }

      const res = await authFetch(path, {
        method: "PATCH",
        body,
      });

      return unwrapApiData(res);
    },
    [apiFetchAuth],
  );

  const {
    items: ministries,
    loading: ministriesLoading,
    error: ministriesError,
  } = useChurchMinistries({
    churchId,
    enabled: visibilityPickerOpen,
    q: ministryQuery,
    apiGet,
  });

  const initialRef = useRef({
    title: safeStr(existingPost?.title),
    content: safeStr(existingPost?.content),
    type: initialType,
    active: existingPost ? existingPost?.active !== false : true,
    coverUri: safeStr(existingPost?.coverUrl),
    expiresDate: initialExpires.date,
    expiresTime: initialExpires.time,
    visibilityMode: initialVisibilityMode,
    visibilityMinistries: dedupeMinistries(initialVisibilityMinistries),
  });

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      saveInFlightRef.current = false;
    };
  }, []);

  const selectedType = useMemo(() => {
    return NEWS_TYPES.find((item) => item.value === type) ?? NEWS_TYPES[0];
  }, [type]);

  const uploading = uploadPercent !== null;
  const isDisabled = saving || saveInFlightRef.current;

  const visibilitySummaryLabel = useMemo(() => {
    if (visibilityMode === "all") return "Toda a igreja";

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
  }, [visibilityMode, visibilityMinistries]);

  const selectedVisibilityIdSet = useMemo(() => {
    return new Set(visibilityMinistries.map((m) => String(m.id)));
  }, [visibilityMinistries]);

  const selectedVisibilityKey = useMemo(() => {
    return visibilityMinistries
      .map((m) => `${m.id}:${m.name}`)
      .sort()
      .join("|");
  }, [visibilityMinistries]);

  const dirty = useMemo(() => {
    const initial = initialRef.current;

    const initialVisibilityKey = initial.visibilityMinistries
      .map((m) => `${m.id}:${m.name}`)
      .sort()
      .join("|");

    return (
      title !== initial.title ||
      content !== initial.content ||
      type !== initial.type ||
      active !== initial.active ||
      coverUri !== initial.coverUri ||
      expiresDate !== initial.expiresDate ||
      expiresTime !== initial.expiresTime ||
      visibilityMode !== initial.visibilityMode ||
      selectedVisibilityKey !== initialVisibilityKey
    );
  }, [
    title,
    content,
    type,
    active,
    coverUri,
    expiresDate,
    expiresTime,
    visibilityMode,
    selectedVisibilityKey,
  ]);

  const expiresAtIso = useMemo(() => {
    return inputPartsToISO(expiresDate, expiresTime);
  }, [expiresDate, expiresTime]);

  const handlePickCover = useCallback(() => {
    if (saving || saveInFlightRef.current) return;

    ImagePicker.openPicker({
      width: 1200,
      height: 630,
      cropping: true,
      cropperCircleOverlay: false,
      compressImageQuality: 0.88,
      mediaType: "photo",
      includeBase64: false,
      freeStyleCropEnabled: true,
    })
      .then((img) => {
        setCoverUri(img.path);
        setError("");
      })
      .catch((err) => {
        if (err?.code !== "E_PICKER_CANCELLED") {
          Alert.alert("Erro", "Não foi possível selecionar a imagem.");
        }
      });
  }, [saving]);

  const handleRemoveCover = useCallback(() => {
    if (saving || saveInFlightRef.current) return;

    Alert.alert("Remover capa", "Deseja remover a imagem de capa?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => setCoverUri(""),
      },
    ]);
  }, [saving]);

  const openDatePicker = useCallback(() => {
    if (saving || saveInFlightRef.current) return;

    const base = expiresDate
      ? new Date(`${expiresDate}T${expiresTime || "23:59"}:00`)
      : new Date();

    setPickerValue(Number.isNaN(base.getTime()) ? new Date() : base);
    setDatePickerOpen(true);
  }, [expiresDate, expiresTime, saving]);

  const openTimePicker = useCallback(() => {
    if (saving || saveInFlightRef.current) return;

    const base = expiresDate
      ? new Date(`${expiresDate}T${expiresTime || "23:59"}:00`)
      : new Date();

    setPickerValue(Number.isNaN(base.getTime()) ? new Date() : base);
    setTimePickerOpen(true);
  }, [expiresDate, expiresTime, saving]);

  const clearExpiration = useCallback(() => {
    if (saving || saveInFlightRef.current) return;

    setExpiresDate("");
    setExpiresTime("");
    setError("");
  }, [saving]);

  const setVisibilityAll = useCallback(() => {
    if (saving || saveInFlightRef.current) return;

    setVisibilityMode("all");
    setVisibilityMinistries([]);
    setError("");
  }, [saving]);

  const setVisibilityByMinistry = useCallback(() => {
    if (saving || saveInFlightRef.current) return;

    setVisibilityMode("ministries");
    setError("");
  }, [saving]);

  const toggleVisibilityMinistry = useCallback(
    (ministryRaw) => {
      if (saving || saveInFlightRef.current) return;

      const ministry = normalizeMinistry(ministryRaw);

      setVisibilityMode("ministries");

      setVisibilityMinistries((prev) => {
        const exists = prev.some((item) => String(item.id) === String(ministry.id));

        if (exists) {
          return prev.filter((item) => String(item.id) !== String(ministry.id));
        }

        return dedupeMinistries([
          ...prev,
          {
            id: ministry.id,
            name: ministry.name,
            color: ministry.color,
            icon: ministry.icon,
            description: ministry.description,
          },
        ]);
      });

      setError("");
    },
    [saving],
  );

  const removeVisibilityMinistry = useCallback(
    (id) => {
      if (saving || saveInFlightRef.current) return;

      setVisibilityMinistries((prev) => {
        const next = prev.filter((item) => String(item.id) !== String(id));

        if (next.length === 0) {
          setVisibilityMode("all");
        }

        return next;
      });

      setError("");
    },
    [saving],
  );

  const validate = useCallback(() => {
    if (!churchId) {
      return "Igreja não identificada.";
    }

    if (title.trim().length < 3) {
      return "O título deve ter pelo menos 3 caracteres.";
    }

    if (content.trim().length < 10) {
      return "O conteúdo deve ter pelo menos 10 caracteres.";
    }

    if (!VALID_NEWS_TYPES.has(type)) {
      return "Selecione um tipo de aviso válido.";
    }

    if (visibilityMode === "ministries" && visibilityMinistries.length === 0) {
      return "Selecione ao menos um ministério ou use a opção Toda a igreja.";
    }

    if (expiresDate && !isValidDateInput(expiresDate)) {
      return "A data de expiração está inválida.";
    }

    if (expiresTime && !isValidTimeInput(expiresTime)) {
      return "A hora de expiração está inválida.";
    }

    if (expiresTime && !expiresDate) {
      return "Informe a data de expiração ou remova a hora.";
    }

    if (expiresDate && !expiresAtIso) {
      return "Não foi possível montar a data/hora de expiração.";
    }

    return "";
  }, [
    churchId,
    title,
    content,
    type,
    visibilityMode,
    visibilityMinistries,
    expiresDate,
    expiresTime,
    expiresAtIso,
  ]);

  const onSave = useCallback(async () => {
    if (saveInFlightRef.current || saving) {
      return;
    }

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    saveInFlightRef.current = true;
    setSaving(true);
    setError("");
    setUploadPercent(null);

    try {
      const fbUser = getAuth().currentUser;
      const uid = fbUser?.uid || "anon";

      const oldCoverUrl = safeStr(initialRef.current.coverUri);
      const currentCoverUri = safeStr(coverUri);

      let finalCoverUrl = oldCoverUrl || null;

      const isLocalFile = currentCoverUri && !isHttpUrl(currentCoverUri);

      if (isLocalFile) {
        finalCoverUrl = await uploadCoverImage(
          currentCoverUri,
          existingPost?.id ?? null,
          uid,
          (pct) => {
            if (mounted.current) {
              setUploadPercent(pct);
            }
          },
        );

        if (oldCoverUrl && oldCoverUrl !== finalCoverUrl) {
          await deleteCoverImage(oldCoverUrl);
        }

        if (mounted.current) {
          setUploadPercent(null);
        }
      } else if (!currentCoverUri && oldCoverUrl) {
        await deleteCoverImage(oldCoverUrl);
        finalCoverUrl = null;
      } else if (currentCoverUri && isHttpUrl(currentCoverUri)) {
        finalCoverUrl = currentCoverUri;
      }

      const finalType = normalizeNewsType(type);

      const firstMinistry =
        visibilityMode === "ministries" && visibilityMinistries.length > 0
          ? visibilityMinistries[0]
          : null;

      const payload = {
        churchId,
        title: title.trim(),
        content: content.trim(),
        type: finalType,
        active,
        coverUrl: finalCoverUrl ?? null,
        targetDepartmentId: firstMinistry?.id ?? null,
        targetDepartmentName: firstMinistry?.name ?? null,
        expiresAt: expiresAtIso,
      };

      if (__DEV__) {
        console.log("🧾 [NewsForm] payload:", payload);
        console.log("🧾 [NewsForm] visibilityMinistries:", visibilityMinistries);
      }

      const saved = isEdit
        ? await apiPatch(`/news/${existingPost.id}`, payload)
        : await apiPost("/news", payload);

      const savedPost = unwrapApiData(saved) || payload;

      initialRef.current = {
        title: savedPost.title ?? payload.title,
        content: savedPost.content ?? payload.content,
        type: normalizeNewsType(savedPost.type ?? payload.type),
        active: savedPost.active ?? payload.active,
        coverUri: savedPost.coverUrl || finalCoverUrl || "",
        expiresDate,
        expiresTime,
        visibilityMode,
        visibilityMinistries,
      };

      if (mounted.current) {
        setCoverUri(savedPost.coverUrl || finalCoverUrl || "");
        setType(normalizeNewsType(savedPost.type ?? payload.type));

        Alert.alert(
          isEdit ? "Aviso atualizado" : "Aviso publicado",
          isEdit
            ? "As alterações foram salvas com sucesso."
            : "O aviso foi publicado com sucesso.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.goBack?.();
              },
            },
          ],
        );
      }
    } catch (err) {
      const msg = Array.isArray(err?.payload?.message)
        ? err.payload.message.join(", ")
        : err?.message || "Não foi possível salvar.";

      if (mounted.current) {
        setUploadPercent(null);
        setError(msg);
        Alert.alert("Erro ao salvar", msg);
      }
    } finally {
      saveInFlightRef.current = false;

      if (mounted.current) {
        setSaving(false);
      }
    }
  }, [
    saving,
    validate,
    coverUri,
    existingPost,
    churchId,
    title,
    content,
    type,
    active,
    visibilityMode,
    visibilityMinistries,
    expiresAtIso,
    expiresDate,
    expiresTime,
    isEdit,
    apiPatch,
    apiPost,
    navigation,
  ]);

  const onCancel = useCallback(() => {
    if (saving || saveInFlightRef.current) return;

    if (!dirty) {
      navigation.goBack?.();
      return;
    }

    Alert.alert("Descartar alterações?", "Você tem mudanças não salvas.", [
      {
        text: "Continuar editando",
        style: "cancel",
      },
      {
        text: "Descartar",
        style: "destructive",
        onPress: () => navigation.goBack?.(),
      },
    ]);
  }, [dirty, navigation, saving]);

  const isIOS = Platform.OS === "ios";

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View
            style={[
              styles.pageHeaderIcon,
              {
                backgroundColor: selectedType.bg,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={selectedType.icon}
              size={24}
              color={selectedType.color}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>
              {isEdit ? "Editar aviso" : "Novo aviso"}
            </Text>

            <Text style={styles.pageSubtitle}>
              {isEdit
                ? "Atualize as informações do comunicado."
                : "Crie um comunicado para a sua comunidade."}
            </Text>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={18}
              color={DS.colors.danger}
            />

            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Imagem de capa</Text>
          <Text style={styles.sectionSub}>
            Opcional — aparece no topo do aviso.
          </Text>

          <View style={{ marginTop: 12 }}>
            <CoverPicker
              uri={coverUri}
              onPick={handlePickCover}
              onRemove={handleRemoveCover}
              uploading={uploading}
              uploadPercent={uploadPercent}
              disabled={isDisabled}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Field label="Tipo de aviso" required>
            <TypeSelector
              selected={type}
              onSelect={(value) => {
                setType(normalizeNewsType(value));
                setError("");
              }}
              disabled={isDisabled}
            />
          </Field>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Conteúdo</Text>
          <Text style={styles.sectionSub}>
            O que será exibido para os membros.
          </Text>

          <View style={{ gap: 16, marginTop: 14 }}>
            <Field label="Título" required>
              <StyledInput
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  setError("");
                }}
                placeholder="Ex: Reunião de líderes — domingo às 19h"
                maxLength={120}
                autoCapitalize="sentences"
                editable={!isDisabled}
              />

              <Text style={styles.charCount}>{title.length}/120</Text>
            </Field>

            <Field label="Conteúdo" required>
              <StyledInput
                value={content}
                onChangeText={(text) => {
                  setContent(text);
                  setError("");
                }}
                placeholder="Descreva o aviso com todos os detalhes relevantes para a comunidade..."
                multiline
                numberOfLines={6}
                autoCapitalize="sentences"
                editable={!isDisabled}
              />

              <Text style={styles.charCount}>{content.length} caracteres</Text>
            </Field>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Visibilidade</Text>
          <Text style={styles.sectionSub}>
            Defina quem poderá visualizar este aviso.
          </Text>

          <View style={{ marginTop: 14, gap: 12 }}>
            <SelectField
              label="Quem pode ver"
              value={visibilitySummaryLabel}
              placeholder="Toda a igreja"
              leftIcon="eye-outline"
              onPress={() => {
                if (!isDisabled) {
                  setVisibilityPickerOpen(true);
                }
              }}
            />

            {visibilityMode === "ministries" ? (
              visibilityMinistries.length === 0 ? (
                <Text style={styles.helperText}>
                  Selecione ao menos um ministério ou altere para Toda a igreja.
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {visibilityMinistries.map((ministry) => (
                    <Surface
                      key={String(ministry.id)}
                      elevation={0}
                      style={styles.ministryRow}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          flex: 1,
                        }}
                      >
                        <Avatar.Icon
                          size={44}
                          icon={() => (
                            <Icon
                              source={ministry.icon || "layers-outline"}
                              size={20}
                              color="#fff"
                            />
                          )}
                          style={{
                            backgroundColor:
                              ministry.color || DS.colors.primary,
                          }}
                        />

                        <View style={{ flex: 1 }}>
                          <Text style={styles.ministryName}>
                            {ministry.name || "Ministério"}
                          </Text>

                          <Text style={styles.ministrySub}>Pode ver</Text>
                        </View>
                      </View>

                      <IconButton
                        icon="close"
                        onPress={() => removeVisibilityMinistry(ministry.id)}
                        iconColor={DS.colors.textMuted}
                        disabled={isDisabled}
                      />
                    </Surface>
                  ))}
                </View>
              )
            ) : (
              <View style={styles.infoBox}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={18}
                  color={DS.colors.primary}
                />

                <Text style={styles.infoText}>
                  O aviso será exibido para todos os membros da igreja.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Validade</Text>
          <Text style={styles.sectionSub}>
            Campo opcional. Após esta data e hora, o aviso some da tela dos
            usuários.
          </Text>

          <View style={{ gap: 12, marginTop: 14 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <SelectField
                  label="Data"
                  value={expiresDate}
                  placeholder="Selecionar data"
                  leftIcon="calendar"
                  onPress={openDatePicker}
                />
              </View>

              <View style={{ width: 140 }}>
                <SelectField
                  label="Hora"
                  value={expiresTime}
                  placeholder="Hora"
                  leftIcon="clock-outline"
                  onPress={openTimePicker}
                />
              </View>
            </View>

            <View style={styles.infoBox}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={18}
                color={DS.colors.primary}
              />

              <Text style={styles.infoText}>
                Se informar somente a data, o aviso será considerado válido até
                23:59 desse dia.
              </Text>
            </View>

            {(expiresDate || expiresTime) && (
              <Button
                mode="text"
                icon="close"
                onPress={clearExpiration}
                textColor={DS.colors.danger}
                style={{ alignSelf: "flex-start" }}
                disabled={isDisabled}
              >
                Remover validade
              </Button>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Publicação</Text>
          <Text style={styles.sectionSub}>
            Controle se este aviso estará visível para os membros.
          </Text>

          <View style={{ marginTop: 12 }}>
            <StatusToggle
              active={active}
              onToggle={() => setActive((value) => !value)}
              disabled={isDisabled}
            />
          </View>
        </View>

        {uploading && (
          <View style={styles.uploadProgress}>
            <View style={styles.uploadProgressInner}>
              <MaterialCommunityIcons
                name="cloud-upload-outline"
                size={18}
                color={DS.colors.primary}
              />

              <Text style={styles.uploadProgressText}>
                Enviando imagem... {uploadPercent}%
              </Text>
            </View>

            <View style={styles.uploadProgressBar}>
              <View
                style={[
                  styles.uploadProgressFill,
                  {
                    width: `${uploadPercent}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <OutlineBtn
            title="Cancelar"
            onPress={onCancel}
            disabled={isDisabled}
          />

          <PrimaryBtn
            title={
              uploading
                ? `Enviando ${uploadPercent}%`
                : saving
                ? "Salvando..."
                : isEdit
                ? "Salvar alterações"
                : "Publicar aviso"
            }
            onPress={onSave}
            disabled={isDisabled || !dirty}
            loading={saving && !uploading}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {!isIOS && datePickerOpen ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setDatePickerOpen(false);

            if (event?.type === "set" && selected) {
              const year = selected.getFullYear();
              const month = pad2(selected.getMonth() + 1);
              const day = pad2(selected.getDate());

              setExpiresDate(`${year}-${month}-${day}`);
              setError("");
            }
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

            if (event?.type === "set" && selected) {
              setExpiresTime(
                `${pad2(selected.getHours())}:${pad2(selected.getMinutes())}`,
              );
              setError("");
            }
          }}
        />
      ) : null}

      <Portal>
        <Modal
          visible={isIOS && datePickerOpen}
          onDismiss={() => setDatePickerOpen(false)}
          contentContainerStyle={{ padding: 16 }}
        >
          <Surface elevation={0} style={styles.dialog}>
            <Text style={styles.dialogTitle}>Selecionar data</Text>

            <View style={{ marginTop: 10 }}>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="spinner"
                onChange={(_, selected) => {
                  if (selected) {
                    setPickerValue(selected);
                  }
                }}
              />
            </View>

            <View style={styles.dialogActions}>
              <Button
                onPress={() => setDatePickerOpen(false)}
                textColor={DS.colors.textMuted}
              >
                Cancelar
              </Button>

              <Button
                mode="contained"
                onPress={() => {
                  const year = pickerValue.getFullYear();
                  const month = pad2(pickerValue.getMonth() + 1);
                  const day = pad2(pickerValue.getDate());

                  setExpiresDate(`${year}-${month}-${day}`);
                  setDatePickerOpen(false);
                  setError("");
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

      <Portal>
        <Modal
          visible={isIOS && timePickerOpen}
          onDismiss={() => setTimePickerOpen(false)}
          contentContainerStyle={{ padding: 16 }}
        >
          <Surface elevation={0} style={styles.dialog}>
            <Text style={styles.dialogTitle}>Selecionar hora</Text>

            <View style={{ marginTop: 10 }}>
              <DateTimePicker
                value={pickerValue}
                mode="time"
                is24Hour
                display="spinner"
                onChange={(_, selected) => {
                  if (selected) {
                    setPickerValue(selected);
                  }
                }}
              />
            </View>

            <View style={styles.dialogActions}>
              <Button
                onPress={() => setTimePickerOpen(false)}
                textColor={DS.colors.textMuted}
              >
                Cancelar
              </Button>

              <Button
                mode="contained"
                onPress={() => {
                  setExpiresTime(
                    `${pad2(pickerValue.getHours())}:${pad2(pickerValue.getMinutes())}`,
                  );
                  setTimePickerOpen(false);
                  setError("");
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

      <BottomSheet
        visible={visibilityPickerOpen}
        onDismiss={() => setVisibilityPickerOpen(false)}
        title="Quem pode ver"
        subtitle="Escolha se o aviso será para toda a igreja ou somente para ministérios."
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <Pressable onPress={setVisibilityAll} style={{ marginBottom: 10 }}>
            <Surface
              elevation={0}
              style={[
                styles.sheetRow,
                {
                  backgroundColor:
                    visibilityMode === "all" ? DS.colors.tint : DS.colors.card,
                  borderColor:
                    visibilityMode === "all" ? DS.colors.primary : DS.colors.border,
                },
              ]}
            >
              <View style={styles.sheetRowLeft}>
                <View style={styles.sheetIcon(DS.colors.primary)}>
                  <Icon source="account-group-outline" size={18} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Toda a igreja</Text>
                  <Text style={styles.sheetSub}>
                    Todos os membros poderão visualizar.
                  </Text>
                </View>
              </View>

              {visibilityMode === "all" ? (
                <Icon source="check-circle" size={22} color={DS.colors.primary} />
              ) : null}
            </Surface>
          </Pressable>

          <Pressable onPress={setVisibilityByMinistry} style={{ marginBottom: 12 }}>
            <Surface
              elevation={0}
              style={[
                styles.sheetRow,
                {
                  backgroundColor:
                    visibilityMode === "ministries"
                      ? DS.colors.tint
                      : DS.colors.card,
                  borderColor:
                    visibilityMode === "ministries"
                      ? DS.colors.primary
                      : DS.colors.border,
                },
              ]}
            >
              <View style={styles.sheetRowLeft}>
                <View style={styles.sheetIcon("#6246EA")}>
                  <Icon source="layers-outline" size={18} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Ministérios selecionados</Text>
                  <Text style={styles.sheetSub}>
                    Apenas os ministérios escolhidos poderão visualizar.
                  </Text>
                </View>
              </View>

              {visibilityMode === "ministries" ? (
                <Icon source="check-circle" size={22} color={DS.colors.primary} />
              ) : null}
            </Surface>
          </Pressable>

          {visibilityMode === "ministries" ? (
            <>
              <PaperTextInput
                mode="outlined"
                value={ministryQuery}
                onChangeText={setMinistryQuery}
                placeholder="Buscar ministério..."
                left={
                  <PaperTextInput.Icon
                    icon="magnify"
                    color={DS.colors.textMuted}
                  />
                }
                outlineColor={DS.colors.border}
                activeOutlineColor={DS.colors.primary}
                textColor={DS.colors.text}
                placeholderTextColor={DS.colors.textMuted}
                style={{ backgroundColor: DS.colors.inputBg }}
                outlineStyle={{
                  borderRadius: DS.radius.sm,
                  borderWidth: 1.5,
                }}
              />

              {ministriesError ? (
                <Surface style={styles.noticeBox} elevation={0}>
                  <Icon
                    source="alert-circle-outline"
                    size={18}
                    color={DS.colors.danger}
                  />
                  <Text style={{ color: DS.colors.danger, flex: 1 }}>
                    {ministriesError}
                  </Text>
                </Surface>
              ) : null}

              {ministriesLoading ? (
                <View style={{ paddingTop: 18, alignItems: "center" }}>
                  <ActivityIndicator color={DS.colors.primary} />
                </View>
              ) : ministries.length === 0 ? (
                <EmptyState
                  icon="layers-outline"
                  title="Nenhum ministério"
                  description="Não encontramos ministérios para esta igreja."
                />
              ) : (
                <View style={{ marginTop: 12, gap: 10 }}>
                  {ministries.map((ministry) => {
                    const selected = selectedVisibilityIdSet.has(String(ministry.id));

                    return (
                      <Pressable
                        key={String(ministry.id)}
                        onPress={() => toggleVisibilityMinistry(ministry)}
                      >
                        <Surface
                          elevation={0}
                          style={[
                            styles.sheetRow,
                            {
                              backgroundColor: selected
                                ? DS.colors.tint
                                : DS.colors.card,
                              borderColor: selected
                                ? DS.colors.primary
                                : DS.colors.border,
                            },
                          ]}
                        >
                          <View style={styles.sheetRowLeft}>
                            <View
                              style={styles.sheetIcon(
                                ministry.color || DS.colors.primary,
                              )}
                            >
                              <Icon
                                source={ministry.icon || "layers-outline"}
                                size={18}
                                color="#fff"
                              />
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={styles.sheetTitle}>
                                {ministry.name || "Ministério"}
                              </Text>

                              <Text style={styles.sheetSub} numberOfLines={1}>
                                {ministry.description ||
                                  (selected
                                    ? "Selecionado"
                                    : "Toque para selecionar")}
                              </Text>
                            </View>
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
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },

  scroll: {
    padding: 16,
    gap: 14,
  },

  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 6,
  },

  pageHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: DS.colors.text,
    letterSpacing: -0.4,
  },

  pageSubtitle: {
    fontSize: 13,
    color: DS.colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },

  card: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: DS.colors.border,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: {
          width: 0,
          height: 4,
        },
      },
      android: {
        elevation: 2,
      },
    }),
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: DS.colors.text,
    letterSpacing: -0.2,
  },

  sectionSub: {
    fontSize: 12.5,
    color: DS.colors.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },

  fieldWrap: {
    gap: 8,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: DS.colors.text,
  },

  input: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.input,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 12,
    fontSize: 14,
    color: DS.colors.text,
    backgroundColor: DS.colors.card,
  },

  charCount: {
    fontSize: 11,
    color: DS.colors.textMuted,
    textAlign: "right",
    marginTop: 4,
  },

  helperText: {
    fontSize: 11.5,
    color: DS.colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },

  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },

  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: DS.radius.pill,
    borderWidth: 1.5,
  },

  typeChipText: {
    fontSize: 12.5,
    fontWeight: "800",
  },

  coverWrap: {
    width: "100%",
  },

  coverPreviewWrap: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },

  coverPreview: {
    width: "100%",
    height: "100%",
  },

  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  coverOverlayText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },

  coverActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.38)",
  },

  coverActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  coverActionBtnDanger: {
    backgroundColor: "rgba(232,77,77,0.7)",
  },

  coverActionText: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "800",
  },

  coverPlaceholder: {
    borderWidth: 2,
    borderColor: DS.colors.border,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 8,
    backgroundColor: DS.colors.inputBg,
  },

  coverPlaceholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: DS.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },

  coverPlaceholderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: DS.colors.text,
  },

  coverPlaceholderSub: {
    fontSize: 12,
    color: DS.colors.textMuted,
    textAlign: "center",
  },

  ministryRow: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.lg,
    padding: 12,
    backgroundColor: DS.colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  ministryName: {
    fontWeight: "900",
    color: DS.colors.text,
  },

  ministrySub: {
    color: DS.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: DS.colors.tint,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D5D9F5",
  },

  infoText: {
    flex: 1,
    color: DS.colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
  },

  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF5E7",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F8D7A8",
  },

  warningText: {
    flex: 1,
    color: "#A96A08",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
  },

  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },

  statusLabel: {
    fontSize: 14,
    fontWeight: "900",
  },

  statusSub: {
    fontSize: 12,
    color: DS.colors.textMuted,
    marginTop: 2,
  },

  switchFake: {
    width: 50,
    height: 28,
    borderRadius: 999,
    padding: 3,
    justifyContent: "center",
  },

  switchOn: {
    backgroundColor: "#D7F7EF",
    borderWidth: 1,
    borderColor: "#AEECDD",
  },

  switchOff: {
    backgroundColor: "#EEF2F7",
    borderWidth: 1,
    borderColor: DS.colors.border,
  },

  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: DS.colors.primary,
  },

  uploadProgress: {
    backgroundColor: DS.colors.tint,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#D5D9F5",
  },

  uploadProgressInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  uploadProgressText: {
    fontSize: 13,
    fontWeight: "700",
    color: DS.colors.primary,
  },

  uploadProgressBar: {
    height: 5,
    backgroundColor: "#D5D9F5",
    borderRadius: 999,
    overflow: "hidden",
  },

  uploadProgressFill: {
    height: "100%",
    backgroundColor: DS.colors.primary,
    borderRadius: 999,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEECEC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F5C0C0",
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    color: DS.colors.danger,
    lineHeight: 18,
    fontWeight: "600",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
  },

  btnPrimary: {
    flex: 1,
    backgroundColor: DS.colors.primary,
    borderRadius: DS.radius.pill,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  btnPrimaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },

  btnOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: DS.colors.primary,
    borderRadius: DS.radius.pill,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  btnOutlineText: {
    color: DS.colors.primary,
    fontWeight: "900",
    fontSize: 14,
  },

  dialog: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },

  dialogTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: DS.colors.text,
  },

  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },

  sheetRow: {
    borderWidth: 1.5,
    borderRadius: DS.radius.lg,
    padding: 12,
    backgroundColor: DS.colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },

  sheetRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  sheetIcon: (color) => ({
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: color || DS.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  }),

  sheetTitle: {
    fontWeight: "900",
    color: DS.colors.text,
  },

  sheetSub: {
    color: DS.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  noticeBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: DS.colors.tint,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D5D9F5",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: DS.space(3),
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.tint,
    borderWidth: 1.5,
    borderColor: DS.colors.border,
    borderStyle: "dashed",
    marginTop: 12,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DS.colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "center",
    color: DS.colors.text,
  },

  emptyDescription: {
    color: DS.colors.textMuted,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
});