// src/screens/more/ChurchProfile.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useIsFocused } from "@react-navigation/native";
import ImagePicker from "react-native-image-crop-picker";
import storage from "@react-native-firebase/storage";
import { getAuth } from "@react-native-firebase/auth";

import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ============================================================================
// Design Tokens (mesmo padrão da sua tela ProfileEdit)
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
// Utils
// ============================================================================
const safeStr = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return s.trim();
};

const normalizeUrl = (value) => {
  const s = safeStr(value);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
};

// ============================================================================
// Fetch helper + LOGS (igual ao seu ProfileEdit)
// ============================================================================
async function authedFetch(path, { method = "GET", body } = {}, authCtx) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const url = `${API_BASE_URL}${path}`;
  const hasToken = !!token;

  console.log("🛰️ [authedFetch] REQUEST:", {
    method,
    url,
    hasToken,
    tokenLen: token ? String(token).length : 0,
    body: body ? body : undefined,
  });

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

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
    const err = new Error(Array.isArray(msg) ? msg.join(",") : msg);
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
    <View
      style={[
        styles.iconCircle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <MaterialCommunityIcons
        name={name}
        size={Math.round(size * 0.52)}
        color={color}
      />
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
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.btnPrimaryText}>{title}</Text>
      )}
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
  autoCapitalize = "sentences",
  placeholder,
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInputRN
          value={value}
          onChangeText={(t) => {
            setValue(t);
            setSaved(false);
            if (error) setError("");
          }}
          placeholder={placeholder || `Digite ${label.toLowerCase()}`}
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
// TextInput RN
// ============================================================================
import { TextInput as TextInputRN } from "react-native";

// ============================================================================
// Screen
// ============================================================================
export default function ChurchProfile({ navigation, route }) {
  const authCtx = useAuth();
  const isFocused = useIsFocused();

  const mounted = useRef(true);

  const churchId = route?.params?.id || authCtx?.me?.activeChurchId || authCtx?.user?.activeChurchId;

  // -----------------------------
  // State
  // -----------------------------
  const [loadingChurch, setLoadingChurch] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Logo: URL (https) ou path local (crop-picker)
  const [logoUrlOrPath, setLogoUrlOrPath] = useState("");

  // Campos básicos
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [site, setSite] = useState("");

  const [about, setAbout] = useState("");
  const [serviceTimes, setServiceTimes] = useState("");
  const [acceptingMembers, setAcceptingMembers] = useState(true);

  // Endereço (desmembrado)
  const [zip, setZip] = useState("");
  const [stateUF, setStateUF] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");

  // Redes sociais
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");

  // snapshot inicial p/ dirty compare
  const initialRef = useRef(null);

  // -----------------------------
  // Upload helpers (igual seu ProfileEdit)
  // -----------------------------
  const deleteOldLogoIfNeeded = useCallback(async (oldUrl, newLocalPathOrUrl) => {
    if (!oldUrl) return;

    if (
      newLocalPathOrUrl &&
      newLocalPathOrUrl !== oldUrl &&
      /^https?:\/\//i.test(oldUrl)
    ) {
      try {
        await storage().refFromURL(oldUrl).delete();
      } catch {}
    }
  }, []);

  const uploadNewLogoIfNeeded = useCallback(async (localPathOrUrl, uid, churchIdForPath) => {
    if (!localPathOrUrl) return null;

    // já é URL
    if (/^https?:\/\//i.test(localPathOrUrl)) return localPathOrUrl;

    let uploadUri = localPathOrUrl;

    if (Platform.OS === "ios" && uploadUri.startsWith("file://")) {
      uploadUri = uploadUri.replace("file://", "");
    }

    const fileName = `${churchIdForPath}-${uid}-${Date.now()}.jpg`;
    const ref = storage().ref(`images/churches/${fileName}`);
    await ref.putFile(uploadUri);
    return await ref.getDownloadURL();
  }, []);

  // -----------------------------
  // Picker do logo (galeria + crop)
  // -----------------------------
  const handlePickLogo = useCallback(() => {
    ImagePicker.openPicker({
      width: 700,
      height: 700,
      cropping: true,
      cropperCircleOverlay: true,
      compressImageQuality: 0.85,
      mediaType: "photo",
      includeBase64: false,
    })
      .then((image) => {
        setLogoUrlOrPath(image.path);
        setSaved(false);
        if (error) setError("");
      })
      .catch((e) => {
        if (e?.code !== "E_PICKER_CANCELLED") {
          Alert.alert("Erro", "Não foi possível selecionar a imagem");
        }
      });
  }, [error]);

  // -----------------------------
  // Load igreja
  // -----------------------------
  const loadChurch = useCallback(async () => {
    if (!churchId) {
      setError("Não foi possível identificar a igreja ativa.");
      return;
    }

    setError("");
    setSaved(false);
    setLoadingChurch(true);

    try {
      const church = await authedFetch(`/churches/${churchId}`, { method: "GET" }, authCtx);

      console.log("⛪ [ChurchProfile] church loaded:", church);

      // aplica no state
      setLogoUrlOrPath(safeStr(church?.logoUrl) || "");
      setName(safeStr(church?.name));
      setCnpj(safeStr(church?.cnpj));
      setPhone(safeStr(church?.phone));
      setEmail(safeStr(church?.email));
      setSite(safeStr(church?.site));

      setAbout(safeStr(church?.about));
      setServiceTimes(safeStr(church?.serviceTimes));
      setAcceptingMembers(!!church?.acceptingMembers);

      // Se seu schema usa address Json, pode vir como objeto
      const addr = church?.address || {};
      setZip(safeStr(addr?.zip || church?.zip));
      setStateUF(safeStr(addr?.stateUF || church?.state));
      setCity(safeStr(addr?.city || church?.city));
      setDistrict(safeStr(addr?.district || church?.district || church?.neighborhood));
      setStreet(safeStr(addr?.street || church?.street));
      setNumber(safeStr(addr?.number || church?.number));

      const soc = church?.social || {};
      setInstagram(safeStr(soc?.instagram || church?.instagram));
      setYoutube(safeStr(soc?.youtube || church?.youtube));

      // snapshot inicial (para dirty)
      initialRef.current = {
        logoUrl: safeStr(church?.logoUrl) || "",
        name: safeStr(church?.name),
        cnpj: safeStr(church?.cnpj),
        phone: safeStr(church?.phone),
        email: safeStr(church?.email),
        site: safeStr(church?.site),
        about: safeStr(church?.about),
        serviceTimes: safeStr(church?.serviceTimes),
        acceptingMembers: !!church?.acceptingMembers,
        zip: safeStr(addr?.zip || church?.zip),
        stateUF: safeStr(addr?.stateUF || church?.state),
        city: safeStr(addr?.city || church?.city),
        district: safeStr(addr?.district || church?.district || church?.neighborhood),
        street: safeStr(addr?.street || church?.street),
        number: safeStr(addr?.number || church?.number),
        instagram: safeStr(soc?.instagram || church?.instagram),
        youtube: safeStr(soc?.youtube || church?.youtube),
      };
    } catch (e) {
      setError(e?.message || "Não foi possível carregar a igreja.");
    } finally {
      if (mounted.current) setLoadingChurch(false);
    }
  }, [authCtx, churchId]);

  useEffect(() => {
    mounted.current = true;
    if (isFocused) loadChurch();
    return () => {
      mounted.current = false;
    };
  }, [isFocused, loadChurch]);

  // -----------------------------
  // dirty
  // -----------------------------
  const dirty = useMemo(() => {
    const i = initialRef.current;
    if (!i) return false;

    const eq = (a, b) => safeStr(a) === safeStr(b);

    const siteNorm = normalizeUrl(site) || "";
    const iSiteNorm = normalizeUrl(i.site) || "";

    return !(
      eq(logoUrlOrPath, i.logoUrl) &&
      eq(name, i.name) &&
      eq(cnpj, i.cnpj) &&
      eq(phone, i.phone) &&
      eq(email, i.email) &&
      eq(siteNorm, iSiteNorm) &&
      eq(about, i.about) &&
      eq(serviceTimes, i.serviceTimes) &&
      acceptingMembers === i.acceptingMembers &&
      eq(zip, i.zip) &&
      eq(stateUF, i.stateUF) &&
      eq(city, i.city) &&
      eq(district, i.district) &&
      eq(street, i.street) &&
      eq(number, i.number) &&
      eq(instagram, i.instagram) &&
      eq(youtube, i.youtube)
    );
  }, [
    logoUrlOrPath,
    name,
    cnpj,
    phone,
    email,
    site,
    about,
    serviceTimes,
    acceptingMembers,
    zip,
    stateUF,
    city,
    district,
    street,
    number,
    instagram,
    youtube,
  ]);

  // -----------------------------
  // validate
  // -----------------------------
  const validate = useCallback(() => {
    const n = safeStr(name);
    if (n.length < 2) return "Informe o nome da igreja.";

    const em = safeStr(email);
    if (em && !em.includes("@")) return "E-mail inválido.";

    const s = safeStr(site);
    if (s) {
      const sNorm = normalizeUrl(s);
      if (!/^https?:\/\//i.test(sNorm || "")) return "Site inválido. Ex: https://suaigreja.com";
    }

    return "";
  }, [name, email, site]);

  // -----------------------------
  // onSave (com logs)
  // -----------------------------
  const onSave = useCallback(async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    if (!churchId) {
      setError("Igreja não identificada.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const firebaseUser = getAuth().currentUser;

      console.log("🧩 [ChurchProfile] API_BASE_URL:", API_BASE_URL);
      console.log("🧩 [ChurchProfile] churchId:", churchId);
      console.log("🧩 [ChurchProfile] Firebase UID:", firebaseUser?.uid);

      const oldLogoUrl = safeStr(initialRef.current?.logoUrl) || "";
      const newLogoLocalOrUrl = safeStr(logoUrlOrPath) || "";

      console.log("🖼️ [ChurchProfile] Logo (antes):", {
        oldLogoUrl,
        newLogoLocalOrUrl,
        isOldUrl: /^https?:\/\//i.test(oldLogoUrl),
        isNewUrl: /^https?:\/\//i.test(newLogoLocalOrUrl),
      });

      // upload/delete (se mudou)
      const uid = firebaseUser?.uid || "anon";
      await deleteOldLogoIfNeeded(oldLogoUrl, newLogoLocalOrUrl);

      const uploadedLogoUrl = await uploadNewLogoIfNeeded(newLogoLocalOrUrl, uid, churchId);
      const finalLogoUrl = uploadedLogoUrl ?? (oldLogoUrl || null);

      console.log("🖼️ [ChurchProfile] Logo (depois upload):", {
        uploadedLogoUrl,
        finalLogoUrl,
      });

      // ✅ normalize URL (evita "site must be a URL address")
      const siteNorm = normalizeUrl(site);

      // ⚠️ DTO: se seu UpdateChurchProfileDto NÃO permite city/state no root,
      // então NÃO envie city/state. Use address Json no dto.
      const payload = {
        logoUrl: finalLogoUrl,
        name: safeStr(name),

        cnpj: safeStr(cnpj) || null,
        phone: safeStr(phone) || null,
        email: safeStr(email) || null,
        site: siteNorm,

        about: safeStr(about) || null,
        serviceTimes: safeStr(serviceTimes) || null,
        acceptingMembers: !!acceptingMembers,

        // ✅ recomendado: mandar tudo em address (Json)
        address: {
          zip: safeStr(zip) || null,
          stateUF: safeStr(stateUF) || null,
          city: safeStr(city) || null,
          district: safeStr(district) || null,
          street: safeStr(street) || null,
          number: safeStr(number) || null,
        },

        social: {
          instagram: safeStr(instagram) || null,
          youtube: safeStr(youtube) || null,
        },
      };

      console.log("🧾 [ChurchProfile] payload PATCH /churches/:id/profile", payload);

      const updated = await authedFetch(
        `/churches/${churchId}/profile`,
        { method: "PATCH", body: payload },
        authCtx
      );

      console.log("✅ [ChurchProfile] PATCH OK:", updated);

      // atualiza snapshot inicial com valores finais
      initialRef.current = {
        logoUrl: finalLogoUrl || "",
        name: safeStr(payload.name),
        cnpj: safeStr(payload.cnpj),
        phone: safeStr(payload.phone),
        email: safeStr(payload.email),
        site: safeStr(payload.site),
        about: safeStr(payload.about),
        serviceTimes: safeStr(payload.serviceTimes),
        acceptingMembers: !!payload.acceptingMembers,
        zip: safeStr(payload.address?.zip),
        stateUF: safeStr(payload.address?.stateUF),
        city: safeStr(payload.address?.city),
        district: safeStr(payload.address?.district),
        street: safeStr(payload.address?.street),
        number: safeStr(payload.address?.number),
        instagram: safeStr(payload.social?.instagram),
        youtube: safeStr(payload.social?.youtube),
      };

      // garante que não fica path local após salvar
      setLogoUrlOrPath(finalLogoUrl || "");

      setSaved(true);
      Alert.alert("Sucesso", "Perfil da igreja atualizado!");
      navigation.goBack?.();
    } catch (e) {
      console.log("❌ [ChurchProfile] Erro ao salvar:", {
        message: e?.message,
        status: e?.status,
        url: e?.url,
        payload: e?.payload,
      });

      // mostra mensagem do backend (array -> string)
      const apiMsg =
        Array.isArray(e?.payload?.message) ? e.payload.message.join(", ") : e?.message;

      setError(apiMsg || "Não foi possível salvar. Tente novamente.");
      Alert.alert("Erro", apiMsg || "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }, [
    validate,
    churchId,
    logoUrlOrPath,
    name,
    cnpj,
    phone,
    email,
    site,
    about,
    serviceTimes,
    acceptingMembers,
    zip,
    stateUF,
    city,
    district,
    street,
    number,
    instagram,
    youtube,
    authCtx,
    navigation,
    deleteOldLogoIfNeeded,
    uploadNewLogoIfNeeded,
  ]);

  const onCancel = useCallback(() => {
    if (dirty) {
      Alert.alert("Descartar alterações?", "Você tem mudanças não salvas.", [
        { text: "Continuar editando", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () => {
            const i = initialRef.current || {};
            setLogoUrlOrPath(i.logoUrl || "");
            setName(i.name || "");
            setCnpj(i.cnpj || "");
            setPhone(i.phone || "");
            setEmail(i.email || "");
            setSite(i.site || "");
            setAbout(i.about || "");
            setServiceTimes(i.serviceTimes || "");
            setAcceptingMembers(!!i.acceptingMembers);

            setZip(i.zip || "");
            setStateUF(i.stateUF || "");
            setCity(i.city || "");
            setDistrict(i.district || "");
            setStreet(i.street || "");
            setNumber(i.number || "");

            setInstagram(i.instagram || "");
            setYoutube(i.youtube || "");

            setError("");
            setSaved(false);
          },
        },
      ]);
      return;
    }
    navigation.goBack?.();
  }, [dirty, navigation]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <CardView>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Perfil da Igreja</Text>
              <Text style={styles.heroSubtitle}>Edite as informações exibidas para os membros.</Text>
            </View>
            <IconCircle name="church" size={46} bg={DS.colors.primary} />
          </View>

          {/* Logo (clicável) */}
          <View style={styles.avatarRow}>
            <Pressable
              onPress={saving ? null : handlePickLogo}
              style={({ pressed }) => [
                styles.avatarPressable,
                pressed && !saving && { opacity: 0.92 },
                saving && { opacity: 0.7 },
              ]}
            >
              {logoUrlOrPath ? (
                <Image source={{ uri: logoUrlOrPath }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarImg, styles.avatarFallback]}>
                  <MaterialCommunityIcons name="church" size={30} color="#fff" />
                </View>
              )}

              <View style={styles.avatarBadge}>
                <MaterialCommunityIcons name="camera" size={16} color="#fff" />
              </View>
            </Pressable>

            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "900", color: DS.colors.text }} numberOfLines={1}>
                {safeStr(name) || "Igreja"}
              </Text>
              <Text style={{ color: DS.colors.textMuted }} numberOfLines={2}>
                Toque no logo para alterar
              </Text>
            </View>
          </View>
        </CardView>

        {loadingChurch && (
          <View style={styles.loadingInline}>
            <ActivityIndicator />
            <Text style={{ color: DS.colors.textMuted }}>Carregando igreja...</Text>
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

        {/* Form: Identidade */}
        <CardView>
          <View style={{ gap: DS.space(2) }}>
            <Text style={styles.sectionTitle}>Identidade</Text>
            <Text style={styles.sectionSubtitle}>Nome e informações básicas.</Text>

            <SimpleField
              label="Nome da igreja"
              value={name}
              setValue={setName}
              error={error}
              setError={setError}
              setSaved={setSaved}
              autoCapitalize="words"
            />

            <SimpleField
              label="Telefone (opcional)"
              value={phone}
              setValue={setPhone}
              error={error}
              setError={setError}
              setSaved={setSaved}
              keyboardType="phone-pad"
            />

            <SimpleField
              label="E-mail (opcional)"
              value={email}
              setValue={setEmail}
              error={error}
              setError={setError}
              setSaved={setSaved}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <SimpleField
              label="CNPJ (opcional)"
              value={cnpj}
              setValue={setCnpj}
              error={error}
              setError={setError}
              setSaved={setSaved}
              keyboardType="numeric"
              autoCapitalize="none"
            />

            <SimpleField
              label="Site (opcional)"
              value={site}
              setValue={setSite}
              error={error}
              setError={setError}
              setSaved={setSaved}
              placeholder="https://suaigreja.com"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </CardView>

        {/* Informações para membros */}
        <CardView>
          <View style={{ gap: DS.space(2) }}>
            <Text style={styles.sectionTitle}>Informações para os membros</Text>
            <Text style={styles.sectionSubtitle}>O que aparece no app para a comunidade.</Text>

            <SimpleField
              label="Descrição (sobre a igreja)"
              value={about}
              setValue={setAbout}
              error={error}
              setError={setError}
              setSaved={setSaved}
              placeholder="Uma família para pertencer..."
            />

            <SimpleField
              label="Horários de cultos / programação"
              value={serviceTimes}
              setValue={setServiceTimes}
              error={error}
              setError={setError}
              setSaved={setSaved}
              placeholder="Dom 19h • Qua 20h"
            />

            {/* Switch "aceita novos membros" (sem Paper) */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: DS.colors.text }}>Aceita novos membros</Text>
                <Text style={{ color: DS.colors.textMuted, marginTop: 2 }}>
                  Exibe opção de solicitar entrada no app
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  setAcceptingMembers((v) => !v);
                  setSaved(false);
                  if (error) setError("");
                }}
                style={[
                  styles.switchFake,
                  acceptingMembers ? styles.switchOn : styles.switchOff,
                ]}
              >
                <View
                  style={[
                    styles.switchThumb,
                    acceptingMembers ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" },
                  ]}
                />
              </Pressable>
            </View>
          </View>
        </CardView>

        {/* Endereço */}
        <CardView>
          <View style={{ gap: DS.space(2) }}>
            <Text style={styles.sectionTitle}>Endereço</Text>
            <Text style={styles.sectionSubtitle}>Ajuda membros a encontrar a igreja.</Text>

            <SimpleField
              label="CEP"
              value={zip}
              setValue={setZip}
              error={error}
              setError={setError}
              setSaved={setSaved}
              keyboardType="numeric"
              autoCapitalize="none"
            />

            <SimpleField
              label="UF"
              value={stateUF}
              setValue={setStateUF}
              error={error}
              setError={setError}
              setSaved={setSaved}
              autoCapitalize="characters"
              placeholder="RS"
            />

            <SimpleField
              label="Cidade"
              value={city}
              setValue={setCity}
              error={error}
              setError={setError}
              setSaved={setSaved}
              autoCapitalize="words"
            />

            <SimpleField
              label="Bairro"
              value={district}
              setValue={setDistrict}
              error={error}
              setError={setError}
              setSaved={setSaved}
              autoCapitalize="words"
            />

            <SimpleField
              label="Rua"
              value={street}
              setValue={setStreet}
              error={error}
              setError={setError}
              setSaved={setSaved}
              autoCapitalize="words"
            />

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
          </View>
        </CardView>

        {/* Redes sociais */}
        <CardView>
          <View style={{ gap: DS.space(2) }}>
            <Text style={styles.sectionTitle}>Redes sociais</Text>
            <Text style={styles.sectionSubtitle}>Links úteis para a comunidade.</Text>

            <SimpleField
              label="Instagram (opcional)"
              value={instagram}
              setValue={setInstagram}
              error={error}
              setError={setError}
              setSaved={setSaved}
              autoCapitalize="none"
              placeholder="@suaigreja"
            />

            <SimpleField
              label="YouTube (opcional)"
              value={youtube}
              setValue={setYoutube}
              error={error}
              setError={setError}
              setSaved={setSaved}
              autoCapitalize="none"
              placeholder="Canal ou link"
            />
          </View>
        </CardView>

        {saved && (
          <CardView style={{ borderColor: "#D7F5E1" }}>
            <View style={styles.savedBanner}>
              <MaterialCommunityIcons name="check-circle" size={18} color={DS.colors.success} />
              <Text style={{ color: DS.colors.text, fontWeight: "800" }}>Alterações salvas</Text>
            </View>
          </CardView>
        )}

        <View style={styles.actionsRow}>
          <OutlineButton title="Cancelar" onPress={onCancel} style={{ flex: 1 }} disabled={saving} />
          <PrimaryButton
            title="Salvar"
            onPress={onSave}
            style={{ flex: 1 }}
            disabled={!dirty || saving}
            loading={saving}
          />
        </View>

        <View style={{ height: DS.space(3) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// Styles
// ============================================================================
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
  avatarImg: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#ddd" },
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

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 2 },

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

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 6,
  },

  // switch simples (sem Paper)
  switchFake: {
    width: 54,
    height: 32,
    borderRadius: 999,
    padding: 4,
    justifyContent: "center",
  },
  switchOn: { backgroundColor: "#D7F7EF", borderWidth: 1, borderColor: "#AEECDD" },
  switchOff: { backgroundColor: "#EEF2F7", borderWidth: 1, borderColor: "#D7DEE7" },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: DS.colors.primary,
  },
});
