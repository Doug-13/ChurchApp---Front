// src/screens/more/ProfileEditScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import storage from "@react-native-firebase/storage";
import { getAuth, updateProfile } from "@react-native-firebase/auth";
import { useIsFocused } from "@react-navigation/native";
import ImagePicker from "react-native-image-crop-picker";

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
    text: "#333F42",
    textMuted: "#707D80",
    border: "#DFE1E1",
    tintBlue: "#E3F7FC",
    danger: "#F95F5C",
    success: "#1DB954",
    warning: "#F3B43A",
  },
  radius: {
    card: 18,
    pill: 999,
  },
  space: (n) => n * 8,
};

// ============================================================================
// Utils (MESMA LÓGICA da tela referência)
// ============================================================================
const safeStr = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return s.trim();
};

const normalizeDateOnlyUTCNoon = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));
};

const formatDatePTBR = (value) => {
  if (!value) return "";
  const safe = normalizeDateOnlyUTCNoon(value);
  return safe.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// "YYYY-MM-DD" OU ISO -> Date seguro (UTC noon)
const parseBirthDate = (value) => {
  if (!value) return normalizeDateOnlyUTCNoon(new Date());

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split("-").map((n) => parseInt(n, 10));
    return new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  }

  return normalizeDateOnlyUTCNoon(value);
};

// ISO seguro para salvar
const birthDateToISO = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return normalizeDateOnlyUTCNoon(d).toISOString();
};

function normalizeRole(roleRaw) {
  const r = safeStr(roleRaw).toUpperCase();
  const map = {
    OWNER: { label: "Dono", icon: "crown" },
    ADMIN: { label: "Administrador", icon: "shield-account" },
    LEADER: { label: "Líder", icon: "account-star" },
    MEMBER: { label: "Membro", icon: "account" },
  };
  return map[r] || { label: safeStr(roleRaw) || "—", icon: "account" };
}

function normalizeStatus(statusRaw) {
  const s = safeStr(statusRaw).toUpperCase();
  const map = {
    ACTIVE: { label: "Ativo", isActive: true, icon: "check-circle" },
    PENDING: { label: "Pendente", isActive: false, icon: "clock-outline" },
    BLOCKED: { label: "Bloqueado", isActive: false, icon: "close-circle" },
    INACTIVE: { label: "Inativo", isActive: false, icon: "minus-circle" },
  };
  return map[s] || { label: safeStr(statusRaw) || "—", isActive: false, icon: "information" };
}

function normalizeCell(me) {
  const raw = me?.cell ?? me?.myCell ?? me?.celula ?? me?.cellMembership ?? null;

  const name =
    safeStr(raw?.name) ||
    safeStr(raw?.nome) ||
    safeStr(me?.cellName) ||
    safeStr(me?.cell?.name) ||
    "";

  const day =
    safeStr(raw?.day) ||
    safeStr(raw?.dia) ||
    safeStr(me?.cellDay) ||
    safeStr(me?.cell?.day) ||
    "";

  return { name, day, raw };
}

// ============================================================================
// Fetch helper
// ============================================================================
async function authedFetch(path, { method = "GET", body } = {}, authCtx) {
  const firebaseToken =
    (await getAuth().currentUser?.getIdToken?.()) || null;

  const ctxToken =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    null;

  const token = ctxToken || firebaseToken;

  const url = `${API_BASE_URL}${path}`;

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  // ✅ LOG REQUEST
  console.log("🛰️ [authedFetch] REQUEST:", {
    method,
    url,
    hasToken: !!token,
    tokenLen: token ? String(token).length : 0,
    body,
  });

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (netErr) {
    console.log("❌ [authedFetch] NETWORK ERROR:", {
      url,
      method,
      message: netErr?.message,
      name: netErr?.name,
    });
    throw netErr;
  }

  const rawText = await res.text();
  let data = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = rawText || null;
  }

  // ✅ LOG RESPONSE
  console.log("📩 [authedFetch] RESPONSE:", {
    method,
    url,
    status: res.status,
    ok: res.ok,
    data,
  });

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `Erro ao comunicar com o servidor (${res.status}).`;

    const err = new Error(
      typeof msg === "string" ? msg : JSON.stringify(msg)
    );
    err.status = res.status;
    err.payload = data;
    err.url = url;
    err.method = method;
    throw err;
  }

  return data;
}


// ============================================================================
// UI Helpers (sem Paper)
// ============================================================================
function CardView({ children, style }) {
  return <View style={[styles.cardBase, style]}>{children}</View>;
}

function IconCircle({ name, size = 44, bg, color = "#fff" }) {
  return (
    <View style={[styles.iconCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <MaterialCommunityIcons name={name} size={Math.round(size * 0.52)} color={color} />
    </View>
  );
}

function Chip({ icon, label, tone = "default", style }) {
  const toneStyle =
    tone === "success"
      ? { backgroundColor: "#EAF8F0", borderColor: "#CDEEDD", textColor: DS.colors.success }
      : tone === "danger"
        ? { backgroundColor: "#FFF1F1", borderColor: "#FFD4D4", textColor: DS.colors.danger }
        : tone === "warning"
          ? { backgroundColor: "#FFF7E7", borderColor: "#FFE2A8", textColor: DS.colors.warning }
          : { backgroundColor: DS.colors.tintBlue, borderColor: "#CDECF5", textColor: DS.colors.primaryDark };

  return (
    <View style={[styles.chip, { backgroundColor: toneStyle.backgroundColor, borderColor: toneStyle.borderColor }, style]}>
      {!!icon && <MaterialCommunityIcons name={icon} size={16} color={toneStyle.textColor} />}
      <Text style={[styles.chipText, { color: toneStyle.textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function PrimaryButton({ title, onPress, disabled, loading, style }) {
  return (
    <Pressable
      onPress={disabled ? null : onPress}
      style={({ pressed }) => [
        styles.btnPrimary,
        disabled && { opacity: 0.6 },
        pressed && !disabled && { opacity: 0.92 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>{title}</Text>}
    </Pressable>
  );
}

function OutlineButton({ title, onPress, disabled, style }) {
  return (
    <Pressable
      onPress={disabled ? null : onPress}
      style={({ pressed }) => [
        styles.btnOutline,
        disabled && { opacity: 0.6 },
        pressed && !disabled && { opacity: 0.86 },
        style,
      ]}
    >
      <Text style={styles.btnOutlineText}>{title}</Text>
    </Pressable>
  );
}

function SimpleField({
  label,
  value,
  setValue,
  error,
  setError,
  setSaved,
  keyboardType,
  autoCapitalize = "words",
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={(t) => {
            setValue(t);
            setSaved(false);
            if (error) setError("");
          }}
          placeholder={`Digite ${label.toLowerCase()}`}
          placeholderTextColor={DS.colors.textMuted}
          style={styles.input}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

// ============================================================================
// Screen
// ============================================================================
export default function ProfileEditScreen({ navigation }) {
  const authCtx = useAuth();
  const isFocused = useIsFocused();
  const firebaseUser = getAuth().currentUser;

  const mounted = useRef(true);

  const initial = useMemo(() => {
    const me = authCtx?.me || authCtx?.user || null;

    const name = safeStr(me?.name) || safeStr(firebaseUser?.displayName) || "Usuário";
    const email = safeStr(me?.email) || safeStr(firebaseUser?.email) || "";
    const photoUrl = safeStr(me?.photoUrl) || safeStr(firebaseUser?.photoURL) || "";

    const phone = safeStr(me?.phone);

    const birth = me?.birthday || me?.birthDate || null;

    const city = safeStr(me?.city) || safeStr(me?.addressCity);
    const neighborhood = safeStr(me?.neighborhood) || safeStr(me?.addressNeighborhood);
    const street = safeStr(me?.street) || safeStr(me?.addressStreet);
    const number = safeStr(me?.number) || safeStr(me?.addressNumber);

    const roleNorm = normalizeRole(me?.role);
    const statusNorm = normalizeStatus(me?.status);
    const cell = normalizeCell(me);

    return {
      name,
      email,
      photoUrl,
      phone,
      birth,
      city,
      neighborhood,
      street,
      number,
      role: roleNorm.label,
      roleIcon: roleNorm.icon,
      status: statusNorm.label,
      isActive: statusNorm.isActive,
      cell,
    };
  }, [authCtx?.me, authCtx?.user, firebaseUser?.displayName, firebaseUser?.email, firebaseUser?.photoURL]);

  // Editable
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);

  // FOTO: pode ser URL (https://) OU caminho local (file path) do picker
  const [photoUrlOrPath, setPhotoUrlOrPath] = useState(initial.photoUrl);

  // DATA
  const [dateOfBirth, setDateOfBirth] = useState(() => parseBirthDate(initial.birth));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Endereço separado
  const [city, setCity] = useState(initial.city);
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [street, setStreet] = useState(initial.street);
  const [number, setNumber] = useState(initial.number);

  // Read-only
  const [email] = useState(initial.email);
  const [roleLabel, setRoleLabel] = useState(initial.role);
  const [roleIcon, setRoleIcon] = useState(initial.roleIcon);
  const [statusLabel, setStatusLabel] = useState(initial.status);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [cell, setCell] = useState(initial.cell);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // =========================
  // Upload Helpers (IGUAL ao seu exemplo)
  // =========================
  const deleteOldPhotoIfNeeded = useCallback(async (oldUrl, newLocalPathOrUrl) => {
    if (!oldUrl) return;

    if (newLocalPathOrUrl && newLocalPathOrUrl !== oldUrl && /^https?:\/\//i.test(oldUrl)) {
      try {
        await storage().refFromURL(oldUrl).delete();
      } catch { }
    }
  }, []);

  const uploadNewPhotoIfNeeded = useCallback(async (localPathOrUrl, uid) => {
    if (!localPathOrUrl) return null;

    if (/^https?:\/\//i.test(localPathOrUrl)) return localPathOrUrl;

    let uploadUri = localPathOrUrl;
    if (Platform.OS === "ios" && uploadUri.startsWith("file://")) {
      uploadUri = uploadUri.replace("file://", "");
    }

    const fileName = `${uid}-${Date.now()}.jpg`;
    const ref = storage().ref(`images/users/${fileName}`);
    await ref.putFile(uploadUri);
    return await ref.getDownloadURL();
  }, []);

  // =========================
  // Foto: abrir galeria + crop circular
  // =========================
  const handleImagePick = useCallback(() => {
    ImagePicker.openPicker({
      width: 600,
      height: 600,
      cropping: true,
      cropperCircleOverlay: true,
      compressImageQuality: 0.8,
      mediaType: "photo",
      includeBase64: false,
    })
      .then((image) => {
        setPhotoUrlOrPath(image.path);
        setSaved(false);
        if (error) setError("");
      })
      .catch((e) => {
        if (e?.code !== "E_PICKER_CANCELLED") {
          Alert.alert("Erro", "Não foi possível selecionar a imagem");
        }
      });
  }, [error]);

  // =========================
  // Load profile do backend
  // =========================
  const loadProfile = useCallback(async () => {
    setError("");
    setSaved(false);
    setLoadingProfile(true);

    try {
      const me = await authedFetch("/users/me", { method: "GET" }, authCtx);

      setName(safeStr(me?.name));
      setPhone(safeStr(me?.phone));
      setPhotoUrlOrPath(safeStr(me?.photoUrl) || "");

      const birth = me?.birthday || me?.birthDate || null;
      setDateOfBirth(parseBirthDate(birth || Date.now()));

      setCity(safeStr(me?.city) || safeStr(me?.addressCity));
      setNeighborhood(safeStr(me?.neighborhood) || safeStr(me?.addressNeighborhood));
      setStreet(safeStr(me?.street) || safeStr(me?.addressStreet));
      setNumber(safeStr(me?.number) || safeStr(me?.addressNumber));

      const roleNorm = normalizeRole(me?.role);
      const statusNorm = normalizeStatus(me?.status);
      setRoleLabel(roleNorm.label);
      setRoleIcon(roleNorm.icon);
      setStatusLabel(statusNorm.label);
      setIsActive(statusNorm.isActive);
      setCell(normalizeCell(me));
    } catch (e) {
      setError(e?.message || "Não foi possível carregar seu perfil.");
    } finally {
      if (mounted.current) setLoadingProfile(false);
    }
  }, [authCtx]);

  useEffect(() => {
    mounted.current = true;

    if (isFocused) {
      setName(initial.name);
      setPhone(initial.phone);
      setPhotoUrlOrPath(initial.photoUrl);

      setDateOfBirth(parseBirthDate(initial.birth || Date.now()));
      setShowDatePicker(false);

      setCity(initial.city);
      setNeighborhood(initial.neighborhood);
      setStreet(initial.street);
      setNumber(initial.number);

      setRoleLabel(initial.role);
      setRoleIcon(initial.roleIcon);
      setStatusLabel(initial.status);
      setIsActive(initial.isActive);
      setCell(initial.cell);

      setError("");
      setSaved(false);

      loadProfile();
    }

    return () => {
      mounted.current = false;
    };
  }, [isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusTone = isActive ? "success" : statusLabel === "Pendente" ? "warning" : "danger";

  const dirty = useMemo(() => {
    const a = (s) => safeStr(s);
    return (
      a(name) !== a(initial.name) ||
      a(phone) !== a(initial.phone) ||
      a(photoUrlOrPath) !== a(initial.photoUrl) ||
      a(city) !== a(initial.city) ||
      a(neighborhood) !== a(initial.neighborhood) ||
      a(street) !== a(initial.street) ||
      a(number) !== a(initial.number) ||
      birthDateToISO(dateOfBirth) !== birthDateToISO(parseBirthDate(initial.birth || Date.now()))
    );
  }, [name, phone, photoUrlOrPath, city, neighborhood, street, number, dateOfBirth, initial]);

  const validate = useCallback(() => {
    const n = safeStr(name);
    if (n.length < 2) return "Informe um nome válido.";
    return "";
  }, [name]);

  // =========================
  // Submit
  // =========================
  const onSave = useCallback(async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const user = getAuth().currentUser;
      if (!user?.uid) throw new Error("Usuário não autenticado.");

      console.log("🧩 [ProfileEdit] API_BASE_URL:", API_BASE_URL);
      console.log("🧩 [ProfileEdit] Firebase UID:", user.uid);

      const oldPhotoUrl = initial.photoUrl; // URL anterior (se houver)
      const newPhotoLocalOrUrl = photoUrlOrPath; // URL ou path local

      console.log("🖼️ [ProfileEdit] Foto (antes):", {
        oldPhotoUrl,
        newPhotoLocalOrUrl,
        isOldUrl: /^https?:\/\//i.test(oldPhotoUrl || ""),
        isNewUrl: /^https?:\/\//i.test(newPhotoLocalOrUrl || ""),
      });

      // 1) Foto: deleta antiga se necessário + sobe nova se for path local
      await deleteOldPhotoIfNeeded(oldPhotoUrl, newPhotoLocalOrUrl);
      const imageUrl = await uploadNewPhotoIfNeeded(newPhotoLocalOrUrl, user.uid);

      console.log("🖼️ [ProfileEdit] Foto (depois upload):", {
        imageUrl,
        finalPhotoUrl: imageUrl ?? oldPhotoUrl ?? null,
      });

      // 2) Firebase Auth: atualiza displayName/photoURL
      try {
        await updateProfile(user, {
          displayName: safeStr(name),
          photoURL: imageUrl ?? oldPhotoUrl ?? null,
        });
        console.log("✅ [ProfileEdit] Firebase updateProfile OK");
      } catch (e) {
        console.log("⚠️ [ProfileEdit] Firebase updateProfile FAIL:", e?.message);
      }

      // 3) Payload para backend (o que vai no PATCH)
      const payload = {
        name: safeStr(name),
        phone: safeStr(phone) || null,
        photoUrl: imageUrl ?? oldPhotoUrl ?? null,

        // aniversário em ISO "seguro"
        birthday: birthDateToISO(dateOfBirth),

        // endereço desmembrado
        city: safeStr(city) || null,
        neighborhood: safeStr(neighborhood) || null,
        street: safeStr(street) || null,
        number: safeStr(number) || null,
      };

      console.log("🧾 [ProfileEdit] payload PATCH /users/me:", payload);

      // 4) (opcional para debug) testar GET antes do PATCH
      try {
        const meDebug = await authedFetch("/users/me", { method: "GET" }, authCtx);
        console.log("✅ [ProfileEdit] GET /users/me OK (debug):", meDebug);
      } catch (e) {
        console.log("❌ [ProfileEdit] GET /users/me FAIL (debug):", {
          message: e?.message,
          status: e?.status,
          url: e?.url,
          payload: e?.payload,
        });
      }

      // 5) PATCH no backend (com logs de erro completos)
      let result = null;
      try {
        result = await authedFetch("/users/me", { method: "PATCH", body: payload }, authCtx);
        console.log("✅ [ProfileEdit] PATCH /users/me OK:", result);
      } catch (e) {
        console.log("❌ [ProfileEdit] PATCH /users/me FAIL:", {
          message: e?.message,
          status: e?.status,
          url: e?.url,
          method: e?.method,
          payload: e?.payload,
        });
        throw e;
      }

      // 6) Atualiza estado local com URL final (não manter path local após salvar)
      setPhotoUrlOrPath(payload.photoUrl || "");

      setSaved(true);

      // 7) Atualiza AuthContext (se existir)
      if (typeof authCtx?.refreshMe === "function") {
        try {
          await authCtx.refreshMe();
          console.log("✅ [ProfileEdit] authCtx.refreshMe OK");
        } catch (e) {
          console.log("⚠️ [ProfileEdit] authCtx.refreshMe FAIL:", e?.message);
        }
      }

      Alert.alert("Sucesso", "Dados atualizados com sucesso!");
      navigation?.goBack?.();
    } catch (e) {
      console.log("❌ [ProfileEdit] Erro ao salvar (catch geral):", {
        message: e?.message,
        status: e?.status,
        url: e?.url,
        payload: e?.payload,
      });

      setError(e?.message || "Houve um problema ao atualizar seus dados.");
      Alert.alert("Erro", e?.message || "Houve um problema ao atualizar seus dados.");
    } finally {
      setSaving(false);
    }
  }, [
    validate,
    name,
    phone,
    photoUrlOrPath,
    dateOfBirth,
    city,
    neighborhood,
    street,
    number,
    authCtx,
    navigation,
    initial.photoUrl,
    deleteOldPhotoIfNeeded,
    uploadNewPhotoIfNeeded,
  ]);

  const onCancel = useCallback(() => {
    if (dirty) {
      Alert.alert("Descartar alterações?", "Você tem mudanças não salvas.", [
        { text: "Continuar editando", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () => {
            setName(initial.name);
            setPhone(initial.phone);
            setPhotoUrlOrPath(initial.photoUrl);

            setDateOfBirth(parseBirthDate(initial.birth || Date.now()));
            setShowDatePicker(false);

            setCity(initial.city);
            setNeighborhood(initial.neighborhood);
            setStreet(initial.street);
            setNumber(initial.number);

            setError("");
            setSaved(false);
          },
        },
      ]);
      return;
    }
    navigation?.goBack?.();
  }, [dirty, initial, navigation]);

  // ========= UI =========
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <CardView>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Meu perfil</Text>
              <Text style={styles.heroSubtitle}>Atualize seus dados de usuário.</Text>
            </View>
            <IconCircle name="account-edit" size={46} bg={DS.colors.primary} />
          </View>

          {/* Avatar (clicável) */}
          <View style={styles.avatarRow}>
            <Pressable
              onPress={saving ? null : handleImagePick}
              style={({ pressed }) => [
                styles.avatarPressable,
                pressed && !saving && { opacity: 0.92 },
                saving && { opacity: 0.7 },
              ]}
            >
              {photoUrlOrPath ? (
                <Image source={{ uri: photoUrlOrPath }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarImg, styles.avatarFallback]}>
                  <MaterialCommunityIcons name="account" size={34} color="#fff" />
                </View>
              )}

              <View style={styles.avatarBadge}>
                <MaterialCommunityIcons name="camera" size={16} color="#fff" />
              </View>
            </Pressable>

            <View style={{ flex: 1, gap: 8 }}>
              <View>
                <Text style={{ fontWeight: "900", color: DS.colors.text }} numberOfLines={1}>
                  {safeStr(name) || "Usuário"}
                </Text>
                <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                  {email || "—"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Chip icon={roleIcon} label={roleLabel || "—"} />
                <Chip icon={isActive ? "check-circle" : "close-circle"} label={statusLabel || "—"} tone={statusTone} />
              </View>
            </View>
          </View>
        </CardView>

        {loadingProfile && (
          <View style={styles.loadingInline}>
            <ActivityIndicator />
            <Text style={{ color: DS.colors.textMuted }}>Carregando perfil...</Text>
          </View>
        )}

        {!!error && (
          <CardView style={styles.errorCard}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <IconCircle name="alert-circle" size={36} bg={DS.colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: DS.colors.text }}>Atenção</Text>
                <Text style={{ color: DS.colors.textMuted, marginTop: 2 }}>{error}</Text>
              </View>
            </View>
          </CardView>
        )}

        {/* Célula */}
        <CardView>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Célula</Text>
              <Text style={styles.sectionSubtitle}>Informações vinculadas ao seu perfil.</Text>
            </View>
            <IconCircle name="account-group" size={40} bg={DS.colors.accent} />
          </View>

          <View style={{ marginTop: 14, gap: 10 }}>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Nome</Text>
              <Text style={styles.kvValue}>{cell?.name ? cell.name : "—"}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Dia</Text>
              <Text style={styles.kvValue}>{cell?.day ? cell.day : "—"}</Text>
            </View>
          </View>
        </CardView>

        {/* Form */}
        <CardView>
          <View style={{ gap: DS.space(2) }}>
            <Text style={styles.sectionTitle}>Dados</Text>
            <Text style={styles.sectionSubtitle}>Edite apenas o que for necessário.</Text>

            {/* Nome */}
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Nome</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setSaved(false);
                    if (error) setError("");
                  }}
                  placeholder="Digite seu nome"
                  placeholderTextColor={DS.colors.textMuted}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* E-mail (readonly) */}
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>E-mail</Text>
              <View style={[styles.inputWrap, { backgroundColor: "#F3F4F6" }]}>
                <TextInput value={email} editable={false} style={[styles.input, { color: DS.colors.textMuted }]} />
              </View>
            </View>

            {/* Telefone */}
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Telefone</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setSaved(false);
                    if (error) setError("");
                  }}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={DS.colors.textMuted}
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Data de nascimento */}
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Data de nascimento</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }) => [
                  styles.inputWrap,
                  pressed && { opacity: 0.92 },
                  { flexDirection: "row", alignItems: "center", gap: 10 },
                ]}
              >
                <Text style={[styles.input, { flex: 1, paddingVertical: 0 }]}>
                  {formatDatePTBR(dateOfBirth) || ""}
                </Text>
                <MaterialCommunityIcons name="calendar-month-outline" size={18} color={DS.colors.textMuted} />
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth}
                  mode="date"
                  display="default"
                  locale="pt-BR"
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") setShowDatePicker(false);
                    if (event?.type === "dismissed") return;
                    if (selectedDate) {
                      setDateOfBirth(normalizeDateOnlyUTCNoon(selectedDate));
                      setSaved(false);
                      if (error) setError("");
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Endereço */}
            <View style={{ marginTop: 4 }}>
              <Text style={styles.sectionTitle}>Endereço</Text>
              <Text style={styles.sectionSubtitle}>Cidade, bairro, rua e número.</Text>
            </View>

            <SimpleField label="Cidade" value={city} setValue={setCity} error={error} setError={setError} setSaved={setSaved} />
            <SimpleField label="Bairro" value={neighborhood} setValue={setNeighborhood} error={error} setError={setError} setSaved={setSaved} />
            <SimpleField label="Rua" value={street} setValue={setStreet} error={error} setError={setError} setSaved={setSaved} />
            <SimpleField
              label="Número"
              value={number}
              setValue={setNumber}
              error={error}
              setError={setError}
              setSaved={setSaved}
              keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
              autoCapitalize="none"
            />

            {saved && (
              <View style={styles.savedBanner}>
                <MaterialCommunityIcons name="check-circle" size={18} color={DS.colors.success} />
                <Text style={{ color: DS.colors.text, fontWeight: "800" }}>Alterações salvas</Text>
              </View>
            )}

            <View style={styles.actionsRow}>
              <OutlineButton title="Cancelar" onPress={onCancel} style={{ flex: 1 }} />
              <PrimaryButton title="Salvar" onPress={onSave} disabled={!dirty || saving} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </CardView>

        <View style={{ height: DS.space(3) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.colors.bg },
  content: { padding: DS.space(2), gap: DS.space(1.5) },

  cardBase: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.card,
    padding: DS.space(2),
    borderWidth: 1,
    borderColor: DS.colors.border,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
    }),
  },

  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroTitle: { fontSize: 22, fontWeight: "900", color: DS.colors.text, letterSpacing: 0.2 },
  heroSubtitle: { color: DS.colors.textMuted, marginTop: 6, lineHeight: 18 },

  iconCircle: { alignItems: "center", justifyContent: "center" },

  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  avatarPressable: { position: "relative" },
  avatarImg: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#ddd" },
  avatarFallback: { backgroundColor: DS.colors.primary, alignItems: "center", justifyContent: "center" },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DS.colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: DS.colors.card,
  },

  sectionTitle: { fontSize: 16, fontWeight: "900", color: DS.colors.text },
  sectionSubtitle: { color: DS.colors.textMuted, marginTop: 4, lineHeight: 18 },

  label: { color: DS.colors.text, fontWeight: "900" },
  inputWrap: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.card,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    backgroundColor: DS.colors.card,
  },
  input: { padding: 0, color: DS.colors.text },

  actionsRow: { flexDirection: "row", gap: 10 },

  btnPrimary: {
    backgroundColor: DS.colors.primary,
    borderRadius: DS.radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "900" },

  btnOutline: {
    borderWidth: 1,
    borderColor: DS.colors.primary,
    borderRadius: DS.radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  btnOutlineText: { color: DS.colors.primary, fontWeight: "900" },

  errorCard: { borderColor: "#FFE0E0" },

  loadingInline: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6 },

  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7F5E1",
    backgroundColor: "#F3FFF7",
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    maxWidth: "100%",
  },
  chipText: { fontWeight: "900" },

  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  kvKey: { color: DS.colors.textMuted, fontWeight: "900" },
  kvValue: { color: DS.colors.text, fontWeight: "900", flexShrink: 1, textAlign: "right" },
});
