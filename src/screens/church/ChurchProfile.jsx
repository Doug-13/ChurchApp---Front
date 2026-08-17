// src/screens/church/ChurchProfile.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  Icon,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { useIsFocused } from "@react-navigation/native";
import ImagePicker from "react-native-image-crop-picker";
import { getAuth } from "@react-native-firebase/auth";

import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { uploadFile } from "../../services/files";

// ─── Design tokens — alinhados ao Design Manual ChurchApp ─────────────────────
const NAVY        = "#1A2366";   // Hero bg, títulos de seção, texto principal
const BRAND       = "#4158D0";   // Ações primárias, links, botões
const BRAND_LIGHT = "#EEF0FA";   // Fundo de chips, badges
const BG          = "#F5F6FA";   // Fundo geral da tela
const SURFACE     = "#FFFFFF";   // Cards, modais, inputs
const BORDER      = "#E4E6F0";   // Bordas de cards, dividers
const MUTED       = "#9198B5";   // Texto secundário, placeholders
const SUCCESS     = "#2DBF8A";   // Publicado, ativo
const SUCCESS_BG  = "#E8F9F3";
const DANGER      = "#E84D4D";   // Erros, exclusão
const WARNING     = "#F5A623";   // Atenção
const WARNING_BG  = "#FEF5E7";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function canEdit(role) {
  const r = String(role || "").toUpperCase();
  return r === "OWNER" || r === "ADMIN";
}

const safeStr = (v) =>
  v === null || v === undefined ? "" : String(v).trim();

const normalizeUrl = (v) => {
  const s = safeStr(v);
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

const isHttpUrl  = (v) => /^https?:\/\//i.test(safeStr(v));
const isFirebase = (v) => safeStr(v).includes("firebasestorage.googleapis.com");

function normalizeUploadUri(uri) {
  let u = safeStr(uri);
  if (!u) return "";
  if (Platform.OS === "ios") u = u.replace(/^file:\/\//, "");
  if (Platform.OS === "android" && !u.startsWith("file://") && u.startsWith("/"))
    u = `file://${u}`;
  return u;
}

async function authedFetch(path, { method = "GET", body } = {}, authCtx) {
  const fbUser = getAuth().currentUser;
  const token  =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await fbUser?.getIdToken?.());
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) {
    const msg = data?.message || data?.error || `Erro ${res.status}`;
    const err = new Error(Array.isArray(msg) ? msg.join(", ") : msg);
    err.status  = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

async function deleteOldLogoIfNeeded(oldUrl, newUrl) {
  const old = safeStr(oldUrl);
  if (!old || old === safeStr(newUrl)) return;

  // Durante a migração, URLs antigas do Firebase são mantidas.
  // A exclusão segura exige a key do objeto no R2 ou uma rotina backend.
  if (isFirebase(old)) {
    console.log("ℹ️ [R2] logo legado do Firebase mantido:", old);
    return;
  }

  console.log("ℹ️ [R2] logo anterior não removido automaticamente; não há key persistida.");
}

async function uploadLogoToStorage(localUri, churchId, uid, onProgress) {
  const uploadUri = normalizeUploadUri(localUri);
  if (!uploadUri) throw new Error("Imagem inválida para envio.");

  onProgress?.(10);

  const uploaded = await uploadFile({
    uri: uploadUri,
    name: `church-${churchId}-logo-${Date.now()}.jpg`,
    type: "image/jpeg",
  });

  onProgress?.(100);

  if (!uploaded?.url) {
    throw new Error("O servidor não retornou a URL do logo.");
  }

  console.log("🟩 [R2] logo concluído:", {
    path: uploaded.path,
    key: uploaded.key,
  });

  return uploaded.url;
}

function buildAddressLine(addr, church) {
  return [
    addr?.street   || church?.street,
    addr?.number   || church?.number,
    addr?.district || church?.neighborhood,
    addr?.city     || church?.city,
    addr?.stateUF  || church?.stateUF || church?.state,
    addr?.zip      || church?.zip,
  ].filter(Boolean).join(", ");
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionLabel({ title }) {
  return <Text style={s.sectionLabel}>{title}</Text>;
}

function InfoRow({ icon, iconColor, iconBg, label, value, onPress, last }) {
  if (!value) return null;
  return (
    <>
      <TouchableRipple onPress={onPress} disabled={!onPress} style={s.infoRowTouch}>
        <View style={s.infoRowInner}>
          <View style={[s.infoIcon, { backgroundColor: iconBg ?? BRAND_LIGHT }]}>
            <Icon source={icon} size={18} color={iconColor ?? BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.infoLabel}>{label}</Text>
            <Text style={[s.infoValue, onPress && { color: BRAND }]} numberOfLines={3}>
              {value}
            </Text>
          </View>
          {!!onPress && <Icon source="open-in-new" size={15} color={MUTED} />}
        </View>
      </TouchableRipple>
      {!last && <Divider style={s.rowDivider} />}
    </>
  );
}

function EditField({ label, value, onChangeText, placeholder, keyboardType,
  autoCapitalize = "sentences", multiline = false, numberOfLines = 1 }) {
  return (
    <TextInput
      mode="outlined"
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
      numberOfLines={multiline ? (numberOfLines || 4) : 1}
      outlineColor={BORDER}
      activeOutlineColor={BRAND}
      textColor={NAVY}
      placeholderTextColor={MUTED}
      style={{ backgroundColor: SURFACE }}
      outlineStyle={{ borderRadius: 14, borderWidth: 1.5 }}
    />
  );
}

function SwitchRow({ label, description, value, onChange }) {
  return (
    <View style={s.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.switchLabel}>{label}</Text>
        {!!description && <Text style={s.switchDesc}>{description}</Text>}
      </View>
      <Pressable
        onPress={() => onChange(!value)}
        style={[s.switchTrack, value ? s.switchOn : s.switchOff]}
        hitSlop={8}
      >
        <View style={[s.switchThumb, value ? s.thumbOn : s.thumbOff]} />
      </Pressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChurchProfile({ navigation, route }) {
  const authCtx   = useAuth();
  const isFocused = useIsFocused();
  const mounted   = useRef(true);

  const churchId =
    route?.params?.id ||
    authCtx?.me?.activeChurchId ||
    authCtx?.user?.activeChurchId ||
    authCtx?.me?.churchId ||
    authCtx?.user?.churchId ||
    null;

  const [church,      setChurch]      = useState(null);
  const [myRole,      setMyRole]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [uploadPct,   setUploadPct]   = useState(null);
  const [error,       setError]       = useState("");

  const [logoPath,         setLogoPath]         = useState("");
  const [name,             setName]             = useState("");
  const [cnpj,             setCnpj]             = useState("");
  const [phone,            setPhone]            = useState("");
  const [email,            setEmail]            = useState("");
  const [site,             setSite]             = useState("");
  const [about,            setAbout]            = useState("");
  const [serviceTimes,     setServiceTimes]     = useState("");
  const [acceptingMembers, setAcceptingMembers] = useState(true);
  const [zip,              setZip]              = useState("");
  const [stateUF,          setStateUF]          = useState("");
  const [city,             setCity]             = useState("");
  const [district,         setDistrict]         = useState("");
  const [street,           setStreet]           = useState("");
  const [number,           setNumber]           = useState("");
  const [instagram,        setInstagram]        = useState("");
  const [youtube,          setYoutube]          = useState("");

  const initialRef  = useRef(null);
  const userCanEdit = canEdit(myRole);

  const applyChurch = useCallback((c) => {
    const addr   = c?.address || {};
    const social = c?.social  || {};
    const snap = {
      logoUrl:          safeStr(c?.logoUrl),
      name:             safeStr(c?.name),
      cnpj:             safeStr(c?.cnpj),
      phone:            safeStr(c?.phone),
      email:            safeStr(c?.email),
      site:             safeStr(c?.site),
      about:            safeStr(c?.about),
      serviceTimes:     safeStr(c?.serviceTimes),
      acceptingMembers: c?.acceptingMembers !== false,
      zip:              safeStr(addr.zip      || c?.zip),
      stateUF:          safeStr(addr.stateUF  || c?.stateUF || c?.state),
      city:             safeStr(addr.city     || c?.city),
      district:         safeStr(addr.district || c?.neighborhood || c?.bairro),
      street:           safeStr(addr.street   || c?.street),
      number:           safeStr(addr.number   || c?.number),
      instagram:        safeStr(social.instagram || c?.instagram),
      youtube:          safeStr(social.youtube   || c?.youtube),
    };
    initialRef.current = snap;
    setLogoPath(snap.logoUrl);    setName(snap.name);
    setCnpj(snap.cnpj);          setPhone(snap.phone);
    setEmail(snap.email);        setSite(snap.site);
    setAbout(snap.about);        setServiceTimes(snap.serviceTimes);
    setAcceptingMembers(snap.acceptingMembers);
    setZip(snap.zip);            setStateUF(snap.stateUF);
    setCity(snap.city);          setDistrict(snap.district);
    setStreet(snap.street);      setNumber(snap.number);
    setInstagram(snap.instagram); setYoutube(snap.youtube);
  }, []);

  const loadChurch = useCallback(async () => {
    if (!churchId) { setError("Igreja não identificada."); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [full, mine] = await Promise.all([
        authedFetch(`/churches/${churchId}`, {}, authCtx),
        authedFetch("/churches/mine", {}, authCtx),
      ]);
      if (!mounted.current) return;
      setChurch(full);
      applyChurch(full);
      const mineChurch = Array.isArray(mine) ? mine.find((c) => c.id === churchId) : null;
      setMyRole(mineChurch?.myRole || mineChurch?.role || null);
    } catch (e) {
      if (mounted.current) setError(e?.message || "Erro ao carregar.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [churchId, authCtx, applyChurch]);

  useEffect(() => {
    mounted.current = true;
    if (isFocused) loadChurch();
    return () => { mounted.current = false; };
  }, [isFocused, loadChurch]);

  useEffect(() => {
    if (!userCanEdit || loading) return;
    navigation.setOptions({
      headerRight: () =>
        editing ? (
          <TouchableRipple borderless onPress={handleCancel} style={s.headerBtn}>
            <View style={s.headerBtnInner}>
              <Icon source="close" size={15} color={MUTED} />
              <Text style={[s.headerBtnText, { color: MUTED }]}>Cancelar</Text>
            </View>
          </TouchableRipple>
        ) : (
          <TouchableRipple borderless onPress={() => setEditing(true)} style={s.headerBtn}>
            <View style={s.headerBtnInner}>
              <Icon source="pencil-outline" size={15} color={BRAND} />
              <Text style={s.headerBtnText}>Editar</Text>
            </View>
          </TouchableRipple>
        ),
    });
  }, [userCanEdit, editing, loading, navigation]);

  const dirty = useMemo(() => {
    const i = initialRef.current;
    if (!i) return false;
    const eq = (a, b) => safeStr(a) === safeStr(b);
    return !(
      eq(logoPath, i.logoUrl)     && eq(name, i.name)           &&
      eq(cnpj, i.cnpj)           && eq(phone, i.phone)          &&
      eq(email, i.email)         && eq(site, i.site)            &&
      eq(about, i.about)         && eq(serviceTimes, i.serviceTimes) &&
      acceptingMembers === i.acceptingMembers &&
      eq(zip, i.zip)             && eq(stateUF, i.stateUF)      &&
      eq(city, i.city)           && eq(district, i.district)    &&
      eq(street, i.street)       && eq(number, i.number)        &&
      eq(instagram, i.instagram) && eq(youtube, i.youtube)
    );
  }, [logoPath, name, cnpj, phone, email, site, about, serviceTimes,
      acceptingMembers, zip, stateUF, city, district, street, number,
      instagram, youtube]);

  const handlePickLogo = useCallback(() => {
    if (saving) return;
    ImagePicker.openPicker({
      width: 700, height: 700, cropping: true,
      cropperCircleOverlay: true, compressImageQuality: 0.85,
      mediaType: "photo", includeBase64: false,
    })
      .then((img) => { setLogoPath(img.path); setError(""); })
      .catch((e) => {
        if (e?.code !== "E_PICKER_CANCELLED")
          Alert.alert("Erro", "Não foi possível selecionar a imagem.");
      });
  }, [saving]);

  const handleCancel = useCallback(() => {
    if (dirty) {
      Alert.alert("Descartar alterações?", "Você tem mudanças não salvas.", [
        { text: "Continuar editando", style: "cancel" },
        { text: "Descartar", style: "destructive",
          onPress: () => { applyChurch(church); setEditing(false); setError(""); } },
      ]);
      return;
    }
    setEditing(false); setError("");
  }, [dirty, church, applyChurch]);

  const handleSave = useCallback(async () => {
    if (safeStr(name).length < 2) { setError("Informe o nome da igreja."); return; }
    if (email && !email.includes("@")) { setError("E-mail inválido."); return; }
    if (site && !/^https?:\/\//i.test(normalizeUrl(site) || "")) {
      setError("Site inválido. Ex: https://suaigreja.com"); return;
    }
    setSaving(true); setError(""); setUploadPct(null);
    try {
      const fbUser = getAuth().currentUser;
      console.log("🔥 [Firebase Auth] currentUser:", { uid: fbUser?.uid });
      if (!fbUser?.uid) throw new Error("Usuário não autenticado no Firebase.");

      const oldLogo = safeStr(initialRef.current?.logoUrl);
      let finalLogo = oldLogo || null;
      const isLocal = logoPath && !isHttpUrl(logoPath);

      if (isLocal) {
        setUploadPct(0);
        console.log("📤 [ChurchProfile] iniciando upload de logo...");
        finalLogo = await uploadLogoToStorage(logoPath, churchId, fbUser.uid,
          (p) => { if (mounted.current) setUploadPct(p); });
        await deleteOldLogoIfNeeded(oldLogo, finalLogo);
      } else if (!logoPath && oldLogo) {
        await deleteOldLogoIfNeeded(oldLogo, null);
        finalLogo = null;
      } else if (isHttpUrl(logoPath)) {
        finalLogo = logoPath;
      }

      const payload = {
        logoUrl:      finalLogo,
        name:         safeStr(name),
        cnpj:         safeStr(cnpj)         || null,
        phone:        safeStr(phone)        || null,
        email:        safeStr(email)        || null,
        site:         normalizeUrl(site),
        about:        safeStr(about)        || null,
        serviceTimes: safeStr(serviceTimes) || null,
        acceptingMembers: !!acceptingMembers,
        address: {
          zip:      safeStr(zip)      || null, stateUF: safeStr(stateUF) || null,
          city:     safeStr(city)     || null, district: safeStr(district) || null,
          street:   safeStr(street)   || null, number: safeStr(number) || null,
        },
        social: {
          instagram: safeStr(instagram) || null,
          youtube:   safeStr(youtube)   || null,
        },
      };

      console.log("🧾 [ChurchProfile] PATCH payload:", payload);

      const updated = await authedFetch(
        `/churches/${churchId}/profile`,
        { method: "PATCH", body: payload },
        authCtx
      );

      console.log("🟩 [ChurchProfile] salvo:", updated);
      if (!mounted.current) return;

      const merged = { ...church, ...updated, myRole };
      setChurch(merged);
      applyChurch(merged);
      setLogoPath(finalLogo || "");
      setEditing(false);
      Alert.alert("✅ Salvo!", "Perfil da igreja atualizado com sucesso.");
    } catch (e) {
      console.log("❌ [ChurchProfile] erro ao salvar:", e?.message);
      const msg = Array.isArray(e?.payload?.message)
        ? e.payload.message.join(", ")
        : e?.message;
      if (mounted.current) {
        setError(msg || "Não foi possível salvar.");
        Alert.alert("Erro", msg || "Não foi possível salvar.");
      }
    } finally {
      if (mounted.current) { setSaving(false); setUploadPct(null); }
    }
  }, [name, cnpj, phone, email, site, about, serviceTimes, acceptingMembers,
      zip, stateUF, city, district, street, number, instagram, youtube,
      logoPath, churchId, church, myRole, authCtx, applyChurch]);

  const cityLine    = [church?.city, church?.state || church?.address?.stateUF].filter(Boolean).join(" • ");
  const addressLine = buildAddressLine(church?.address, church);
  const displayLogo = editing ? (logoPath || church?.logoUrl || null) : (church?.logoUrl || null);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={BRAND} size="large" />
        <Text style={s.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero — NAVY fixo, blobs decorativos, igual ao HomeScreen ─── */}
        <View style={s.hero}>
          <View style={s.heroBlob1} />
          <View style={s.heroBlob2} />

          {/* Logo + nome + pills */}
          <View style={s.heroContent}>
            <TouchableRipple
              borderless
              onPress={editing ? handlePickLogo : undefined}
              disabled={!editing}
              style={{ borderRadius: 20 }}
            >
              <View>
                {displayLogo ? (
                  <Image source={{ uri: displayLogo }} style={s.heroLogo} resizeMode="cover" />
                ) : (
                  <View style={[s.heroLogo, s.heroLogoFallback]}>
                    <Icon source="church" size={30} color="rgba(255,255,255,0.9)" />
                  </View>
                )}
                {editing && (
                  <View style={s.heroCameraBadge}>
                    <Icon source="camera" size={13} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableRipple>

            <View style={{ flex: 1 }}>
              <Text style={s.heroName} numberOfLines={2}>
                {church?.name || "Minha Igreja"}
              </Text>
              {!!cityLine && (
                <View style={s.heroPill}>
                  <View style={[s.heroPillDot, { backgroundColor: "#7EFFD4" }]} />
                  <Text style={s.heroPillText}>{cityLine}</Text>
                </View>
              )}
              {!!myRole && (
                <View style={[s.heroPill, { marginTop: 5 }]}>
                  <View style={[s.heroPillDot, { backgroundColor: "#FFD97D" }]} />
                  <Text style={s.heroPillText}>
                    {myRole === "OWNER" ? "Responsável"
                      : myRole === "ADMIN" ? "Admin" : "Líder"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress bar de upload */}
          {uploadPct !== null && (
            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <View style={[s.progressBar, { width: `${Math.min(100, uploadPct)}%` }]} />
              </View>
              <Text style={s.progressText}>Enviando logo... {uploadPct}%</Text>
            </View>
          )}

          {/* About — só visualização, abaixo das pills com divisor sutil */}
          {!editing && !!church?.about && (
            <View style={s.heroAbout}>
              <Icon source="information-outline" size={13} color="rgba(255,255,255,0.55)" />
              <Text style={s.heroAboutText} numberOfLines={3}>{church.about}</Text>
            </View>
          )}

          {/* Badge "Modo edição" */}
          {editing && (
            <View style={s.editingBadge}>
              <Icon source="pencil" size={11} color={WARNING} />
              <Text style={s.editingBadgeText}>Modo edição</Text>
            </View>
          )}
        </View>

        {/* ── Erro ─────────────────────────────────────────────────────── */}
        {!!error && (
          <Surface elevation={0} style={s.errorBox}>
            <Icon source="alert-circle-outline" size={18} color={DANGER} />
            <Text style={s.errorText}>{error}</Text>
          </Surface>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MODO EDIÇÃO
        ═══════════════════════════════════════════════════════════════ */}
        {editing ? (
          <>
            <SectionLabel title="IDENTIDADE" />
            <Surface elevation={0} style={s.card}>
              <View style={s.cardContent}>
                <EditField label="Nome da igreja *" value={name} onChangeText={setName} autoCapitalize="words" />
                <EditField label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
                <EditField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <EditField label="CNPJ" value={cnpj} onChangeText={setCnpj} keyboardType="numeric" autoCapitalize="none" />
                <EditField label="Site" value={site} onChangeText={setSite} keyboardType="url" autoCapitalize="none" placeholder="https://suaigreja.com" />
              </View>
            </Surface>

            <SectionLabel title="PARA OS MEMBROS" />
            <Surface elevation={0} style={s.card}>
              <View style={s.cardContent}>
                <EditField label="Sobre a igreja" value={about} onChangeText={setAbout} multiline numberOfLines={4} placeholder="Uma família para pertencer..." />
                <EditField label="Horários de cultos" value={serviceTimes} onChangeText={setServiceTimes} placeholder="Dom 19h • Qua 20h" />
                <SwitchRow
                  label="Aceita novos membros"
                  description="Exibe opção de solicitar entrada no app"
                  value={acceptingMembers}
                  onChange={setAcceptingMembers}
                />
              </View>
            </Surface>

            <SectionLabel title="ENDEREÇO" />
            <Surface elevation={0} style={s.card}>
              <View style={s.cardContent}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 2 }}><EditField label="CEP" value={zip} onChangeText={setZip} keyboardType="numeric" autoCapitalize="none" /></View>
                  <View style={{ flex: 1 }}><EditField label="UF" value={stateUF} onChangeText={setStateUF} autoCapitalize="characters" placeholder="RS" /></View>
                </View>
                <EditField label="Cidade" value={city} onChangeText={setCity} autoCapitalize="words" />
                <EditField label="Bairro" value={district} onChangeText={setDistrict} autoCapitalize="words" />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 3 }}><EditField label="Rua" value={street} onChangeText={setStreet} autoCapitalize="words" /></View>
                  <View style={{ flex: 1 }}><EditField label="Nº" value={number} onChangeText={setNumber} keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"} autoCapitalize="none" /></View>
                </View>
              </View>
            </Surface>

            <SectionLabel title="REDES SOCIAIS" />
            <Surface elevation={0} style={s.card}>
              <View style={s.cardContent}>
                <EditField label="Instagram" value={instagram} onChangeText={setInstagram} autoCapitalize="none" placeholder="@suaigreja" />
                <EditField label="YouTube" value={youtube} onChangeText={setYoutube} autoCapitalize="none" placeholder="Canal ou link" />
              </View>
            </Surface>

            {/* Botões */}
            <View style={s.actionsRow}>
              <Button
                mode="outlined" onPress={handleCancel} disabled={saving}
                style={[s.actionBtn, { borderColor: BORDER }]}
                contentStyle={s.actionBtnContent} textColor={MUTED}
              >
                Cancelar
              </Button>
              <Button
                mode="contained" onPress={handleSave} loading={saving}
                disabled={saving || !dirty}
                style={s.actionBtn} contentStyle={s.actionBtnContent}
                buttonColor={BRAND} textColor="#fff"
                icon={saving ? undefined : "check"}
              >
                {uploadPct !== null ? `Enviando ${uploadPct}%` : "Salvar"}
              </Button>
            </View>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
              MODO VISUALIZAÇÃO
          ═══════════════════════════════════════════════════════════════ */
          <>
            {/* Contato */}
            {(church?.phone || church?.email || church?.site || church?.cnpj) && (
              <>
                <SectionLabel title="CONTATO" />
                <Surface elevation={0} style={s.card}>
                  <InfoRow icon="phone-outline" iconColor={SUCCESS} iconBg={SUCCESS_BG} label="Telefone" value={church?.phone}
                    onPress={church?.phone ? () => Linking.openURL(`tel:${church.phone}`) : undefined} />
                  <InfoRow icon="email-outline" iconColor={BRAND} iconBg={BRAND_LIGHT} label="E-mail" value={church?.email}
                    onPress={church?.email ? () => Linking.openURL(`mailto:${church.email}`) : undefined} />
                  <InfoRow icon="web" iconColor="#7C3AED" iconBg="#F1EAFE" label="Site" value={church?.site}
                    onPress={church?.site ? () => Linking.openURL(normalizeUrl(church.site) || "") : undefined} />
                  <InfoRow icon="card-account-details-outline" iconColor={MUTED} iconBg="#F0F1F5" label="CNPJ" value={church?.cnpj} last />
                </Surface>
              </>
            )}

            {/* Para os membros */}
            {(!!church?.serviceTimes || church?.acceptingMembers !== undefined) && (
              <>
                <SectionLabel title="PARA OS MEMBROS" />
                <Surface elevation={0} style={s.card}>
                  <InfoRow icon="clock-outline" iconColor={WARNING} iconBg={WARNING_BG} label="Horários de cultos" value={church?.serviceTimes} />
                  <InfoRow
                    icon={church?.acceptingMembers ? "account-plus-outline" : "account-off-outline"}
                    iconColor={church?.acceptingMembers ? SUCCESS : MUTED}
                    iconBg={church?.acceptingMembers ? SUCCESS_BG : "#F0F1F5"}
                    label="Novos membros"
                    value={church?.acceptingMembers
                      ? "Aceitando novas solicitações"
                      : "Não está aceitando novos membros"}
                    last
                  />
                </Surface>
              </>
            )}

            {/* Endereço */}
            {!!addressLine && (
              <>
                <SectionLabel title="ENDEREÇO" />
                <Surface elevation={0} style={s.card}>
                  <InfoRow
                    icon="map-marker-outline" iconColor="#E85D75" iconBg="#FDECEF"
                    label="Endereço completo" value={addressLine}
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(addressLine)}`)}
                    last
                  />
                </Surface>
              </>
            )}

            {/* Redes sociais */}
            {(!!church?.social?.instagram || !!church?.social?.youtube) && (
              <>
                <SectionLabel title="REDES SOCIAIS" />
                <Surface elevation={0} style={s.card}>
                  <InfoRow
                    icon="instagram" iconColor="#E85D75" iconBg="#FDECEF"
                    label="Instagram" value={church?.social?.instagram}
                    onPress={church?.social?.instagram
                      ? () => Linking.openURL(`https://instagram.com/${church.social.instagram.replace(/^@/, "")}`)
                      : undefined}
                  />
                  <InfoRow
                    icon="youtube" iconColor={DANGER} iconBg="#FEECEC"
                    label="YouTube" value={church?.social?.youtube}
                    onPress={church?.social?.youtube
                      ? () => Linking.openURL(normalizeUrl(church.social.youtube) || "")
                      : undefined}
                    last
                  />
                </Surface>
              </>
            )}

            {/* Empty state */}
            {!church?.phone && !church?.email && !church?.site && !church?.cnpj &&
             !church?.serviceTimes && !addressLine &&
             !church?.social?.instagram && !church?.social?.youtube && (
              <View style={s.emptyState}>
                <View style={[s.emptyIcon, { backgroundColor: BRAND_LIGHT }]}>
                  <Icon source="church" size={28} color={BRAND} />
                </View>
                <Text style={s.emptyTitle}>Perfil incompleto</Text>
                <Text style={s.emptyDesc}>
                  {userCanEdit
                    ? "Toque em Editar para adicionar informações da igreja."
                    : "O administrador ainda não preencheu as informações da igreja."}
                </Text>
              </View>
            )}

            {/* Botão editar rodapé — só OWNER/ADMIN */}
            {userCanEdit && (
              <Button
                mode="contained" icon="pencil-outline"
                onPress={() => setEditing(true)}
                style={s.editBtn} contentStyle={s.editBtnContent}
                buttonColor={BRAND} textColor="#fff"
              >
                Editar dados da igreja
              </Button>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: BG },
  loadingText: { fontSize: 14, color: MUTED, marginTop: 8 },
  container:   { paddingBottom: 32 },

  // ── Hero — NAVY fixo, nunca usa theme.colors ───────────────────────────────
  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 28 : 20,
    paddingBottom: 20,
    overflow: "hidden",
    marginBottom: 8,
  },
  // Blobs decorativos — mesmo padrão do HomeScreen
  heroBlob1: { position: "absolute", width: 220, height: 220, borderRadius: 999, top: -70, right: -60, backgroundColor: "rgba(255,255,255,0.06)" },
  heroBlob2: { position: "absolute", width: 150, height: 150, borderRadius: 999, bottom: -80, left: -40, backgroundColor: "rgba(255,255,255,0.05)" },
  heroContent:     { flexDirection: "row", alignItems: "flex-start", gap: 14, zIndex: 2 },
  heroLogo:        { width: 64, height: 64, borderRadius: 20, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)" },
  heroLogoFallback:{ backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  heroCameraBadge: { position: "absolute", right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: NAVY },
  heroName:        { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.5, lineHeight: 26 },
  heroPill:        { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.13)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  heroPillDot:     { width: 5, height: 5, borderRadius: 999 },
  heroPillText:    { fontSize: 11, fontWeight: "700", color: "#fff" },
  heroAbout:       { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", zIndex: 2 },
  heroAboutText:   { flex: 1, color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 17, fontStyle: "italic" },
  editingBadge:    { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12, alignSelf: "flex-start", backgroundColor: "rgba(245,166,35,0.18)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, zIndex: 2 },
  editingBadgeText:{ fontSize: 11, fontWeight: "800", color: WARNING },
  progressWrap:    { marginTop: 12, gap: 4, zIndex: 2 },
  progressTrack:   { height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" },
  progressBar:     { height: 4, backgroundColor: SUCCESS, borderRadius: 999 },
  progressText:    { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "600" },

  // ── Erro ───────────────────────────────────────────────────────────────────
  errorBox: { marginHorizontal: 16, marginBottom: 4, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: "#FEECEC", borderWidth: 1, borderColor: "#FFCECE" },
  errorText: { flex: 1, fontSize: 13, color: DANGER, lineHeight: 18 },

  // ── Section label — 10px uppercase, letterSpacing 1.2 ─────────────────────
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: MUTED, textTransform: "uppercase", marginTop: 20, marginBottom: 8, marginHorizontal: 20 },

  // ── Card — borderRadius 20px, borderWidth 1, elevation 2 ──────────────────
  card: {
    marginHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    backgroundColor: SURFACE, overflow: "hidden",
    ...Platform.select({ ios: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 2 } }),
  },
  cardContent: { padding: 16, gap: 14 },

  // ── InfoRow ────────────────────────────────────────────────────────────────
  infoRowTouch: { paddingHorizontal: 16, paddingVertical: 13 },
  infoRowInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon:     { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoLabel:    { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: MUTED, marginBottom: 1 },
  infoValue:    { fontSize: 14, fontWeight: "600", color: NAVY },
  rowDivider:   { backgroundColor: BORDER, marginLeft: 64 },

  // ── Switch ─────────────────────────────────────────────────────────────────
  switchRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  switchLabel: { fontSize: 14, fontWeight: "800", color: NAVY },
  switchDesc:  { fontSize: 12, color: MUTED, marginTop: 2 },
  switchTrack: { width: 50, height: 28, borderRadius: 999, padding: 3, justifyContent: "center" },
  switchOn:    { backgroundColor: SUCCESS_BG, borderWidth: 1, borderColor: SUCCESS },
  switchOff:   { backgroundColor: "#F0F1F5", borderWidth: 1, borderColor: BORDER },
  switchThumb: { width: 22, height: 22, borderRadius: 999 },
  thumbOn:     { alignSelf: "flex-end", backgroundColor: SUCCESS },
  thumbOff:    { alignSelf: "flex-start", backgroundColor: MUTED },

  // ── Botões ─────────────────────────────────────────────────────────────────
  actionsRow:      { flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 20 },
  actionBtn:       { flex: 1, borderRadius: 16 },
  actionBtnContent:{ height: 48 },
  editBtn:         { marginHorizontal: 16, marginTop: 20, borderRadius: 20 },
  editBtnContent:  { height: 52 },

  // ── Header button ──────────────────────────────────────────────────────────
  headerBtn:      { marginRight: 8, borderRadius: 12, overflow: "hidden" },
  headerBtnInner: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: BRAND_LIGHT, borderRadius: 12 },
  headerBtnText:  { fontSize: 13, fontWeight: "800", color: BRAND },

  // ── Empty state — borderStyle dashed, alinhado ao manual ──────────────────
  emptyState: { margin: 16, marginTop: 24, alignItems: "center", gap: 10, padding: 24, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", borderColor: BORDER, backgroundColor: SURFACE },
  emptyIcon:  { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },
  emptyDesc:  { fontSize: 13, color: MUTED, textAlign: "center", lineHeight: 19 },
});