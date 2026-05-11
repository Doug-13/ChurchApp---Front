// src/screens/admin/MemberFormScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Divider,
  Icon,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

import { useAuth } from "../../context/AuthContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND_BLUE  = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const SUCCESS     = "#2DBF8A";
const SUCCESS_BG  = "#E8F9F3";
const DANGER      = "#E84D4D";
const DANGER_BG   = "#FEECEC";
const WARNING     = "#F5A623";
const WARNING_BG  = "#FEF5E7";

const ROLES = ["MEMBER", "LEADER", "ADMIN", "OWNER"];
const ROLE_LABELS = { MEMBER: "Membro", LEADER: "Líder", ADMIN: "Admin", OWNER: "Owner" };
const ROLE_COLORS = {
  MEMBER: { color: BRAND_BLUE, bg: BRAND_LIGHT },
  LEADER: { color: SUCCESS,    bg: SUCCESS_BG  },
  ADMIN:  { color: WARNING,    bg: WARNING_BG  },
  OWNER:  { color: DANGER,     bg: DANGER_BG   },
};

const STATUSES = ["ACTIVE", "INACTIVE"];
const STATUS_LABELS = { ACTIVE: "Ativo", INACTIVE: "Inativo" };
const STATUS_COLORS = {
  ACTIVE:   { color: SUCCESS, bg: SUCCESS_BG },
  INACTIVE: { color: DANGER,  bg: DANGER_BG  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeStr(v) { return String(v ?? "").trim(); }

function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && safeStr(v) !== "") return v;
  }
  return "";
}

function initials(name = "") {
  const parts = safeStr(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] || "";
  const last  = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function normalizeRoleKey(raw) {
  const r = safeStr(raw).toUpperCase();
  if (r.includes("OWNER"))  return "OWNER";
  if (r.includes("ADMIN"))  return "ADMIN";
  if (r.includes("LEADER") || r.includes("LIDER")) return "LEADER";
  return "MEMBER";
}

function normalizeStatusKey(raw) {
  const s = safeStr(raw).toLowerCase();
  if (s.includes("active") || s.includes("ativo") || s.includes("ativ")) return "ACTIVE";
  return "INACTIVE";
}

function getMembersArray(data) {
  if (Array.isArray(data))          return data;
  if (Array.isArray(data?.members)) return data.members;
  if (Array.isArray(data?.data))    return data.data;
  if (Array.isArray(data?.items))   return data.items;
  return [];
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── ChipSelector ─────────────────────────────────────────────────────────────
function ChipSelector({ options, labels, colors, value, onChange }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const selected = value === opt;
        const c = colors[opt] || { color: BRAND_BLUE, bg: BRAND_LIGHT };
        return (
          <TouchableRipple
            key={opt}
            onPress={() => onChange(opt)}
            borderless
            style={[
              styles.chip,
              selected
                ? { backgroundColor: c.bg, borderColor: c.color, borderWidth: 1.5 }
                : { backgroundColor: "transparent", borderColor: "#E4E6F0", borderWidth: 1 },
            ]}
          >
            <Text style={[styles.chipText, { color: selected ? c.color : "#9198B5" }]}>
              {labels[opt] || opt}
            </Text>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

// ─── StyledInput ──────────────────────────────────────────────────────────────
function StyledInput({
  label, value, onChangeText, icon, iconColor, iconBg,
  keyboardType, autoCapitalize, tc, multiline, numberOfLines,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[
      styles.inputWrap,
      {
        borderColor:     focused ? BRAND_BLUE : tc.outline,
        backgroundColor: tc.surface,
      },
    ]}>
      <View style={[styles.inputIcon, { backgroundColor: iconBg || BRAND_LIGHT }]}>
        <Icon source={icon} size={16} color={iconColor || BRAND_BLUE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.inputLabel, { color: tc.muted }]}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType || "default"}
          autoCapitalize={autoCapitalize || "sentences"}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[styles.inputField, { color: tc.text }]}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          mode="flat"
          dense
        />
      </View>
    </View>
  );
}

// ─── AvatarCircle ─────────────────────────────────────────────────────────────
function AvatarCircle({ name }) {
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitials}>{initials(name || "?")}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MemberFormScreen({ navigation, route }) {
  const theme        = useTheme();
  const { apiFetchAuth } = useAuth();

  const tc = useMemo(() => ({
    surface: theme.colors.surface,
    bg:      theme.colors.background,
    outline: theme.colors.outlineVariant,
    text:    theme.colors.onSurface,
    muted:   theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
  }), [theme]);

  const { id, memberId, userId, member: routeMember } = route.params || {};
  const targetId  = id || memberId || userId || routeMember?.id || routeMember?.userId;
  const isEditing = !!targetId;

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // ─── Form state ───────────────────────────────────────────────────────────
  const [loadingData,    setLoadingData]    = useState(isEditing);
  const [saving,         setSaving]         = useState(false);
  const [errorMsg,       setErrorMsg]       = useState("");
  const [successMsg,     setSuccessMsg]     = useState("");
  const [originalMember, setOriginalMember] = useState(null);

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [street,       setStreet]       = useState("");
  const [number,       setNumber]       = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city,         setCity]         = useState("");
  const [role,         setRole]         = useState("MEMBER");
  const [status,       setStatus]       = useState("ACTIVE");
  const [notes,        setNotes]        = useState("");

  // ─── fillForm ─────────────────────────────────────────────────────────────
  const fillForm = useCallback((raw) => {
    console.log("🟦 [MemberForm] fillForm raw:", JSON.stringify(raw));

    const user         = raw?.user         || {};
    const churchMember = raw?.churchMember || raw?.churchLink  || {};
    const membership   = raw?.membership   || raw?.activeMembership || {};

    setName(safeStr(pickFirst(
      raw?.name, raw?.fullName, raw?.displayName,
      user?.name, user?.fullName, ""
    )));

    setEmail(safeStr(pickFirst(
      raw?.email, user?.email, ""
    )));

    setPhone(safeStr(pickFirst(
      raw?.phone, raw?.whatsapp,
      user?.phone, user?.whatsapp, ""
    )));

    // Endereço — vem do fullUserData mesclado
    const addrObj     = raw?.address  && typeof raw.address  === "object" ? raw.address  : null;
    const userAddrObj = user?.address && typeof user.address === "object" ? user.address : null;

    setStreet(safeStr(pickFirst(
      raw?.street,       raw?.addressStreet,
      user?.street,      user?.addressStreet,
      addrObj?.street,   userAddrObj?.street, ""
    )));

    setNumber(safeStr(pickFirst(
      raw?.number,       raw?.addressNumber,
      user?.number,      user?.addressNumber,
      addrObj?.number,   userAddrObj?.number, ""
    )));

    setNeighborhood(safeStr(pickFirst(
      raw?.neighborhood,       raw?.district,     raw?.addressNeighborhood,
      user?.neighborhood,      user?.district,    user?.addressNeighborhood,
      addrObj?.neighborhood,   userAddrObj?.neighborhood, ""
    )));

    setCity(safeStr(pickFirst(
      raw?.city,       raw?.addressCity,
      user?.city,      user?.addressCity,
      addrObj?.city,   userAddrObj?.city, ""
    )));

    setNotes(safeStr(pickFirst(
      raw?.notes, raw?.about, raw?.bio, raw?.observation,
      user?.notes, ""
    )));

    const roleRaw   = pickFirst(raw?.role, raw?.churchRole, churchMember?.role, membership?.role, user?.role);
    const statusRaw = pickFirst(raw?.status, raw?.churchStatus, churchMember?.status, membership?.status, "ACTIVE");
    setRole(normalizeRoleKey(roleRaw));
    setStatus(normalizeStatusKey(statusRaw));
  }, []);

  // ─── loadMember ───────────────────────────────────────────────────────────
  const loadMember = useCallback(async () => {
    try {
      setLoadingData(true);
      setErrorMsg("");

      let baseMember = null;

      if (routeMember) {
        baseMember = routeMember;
      } else {
        const data    = await apiFetchAuth("/users/members", { method: "GET" });
        const members = getMembersArray(data);
        baseMember    = members.find((m) =>
          String(m.id)       === String(targetId) ||
          String(m.memberId) === String(targetId) ||
          String(m.userId)   === String(targetId)
        );
        if (!baseMember) throw new Error("Membro não encontrado.");
      }

      console.log("🟩 [MemberForm] baseMember:", JSON.stringify(baseMember));

      // userId do membro alvo para buscar dados completos com endereço
      const memberUserId = baseMember?.userId || baseMember?.id;
      let fullUserData   = null;

      if (memberUserId) {
        fullUserData = await apiFetchAuth(
          `/users/members/${encodeURIComponent(memberUserId)}/full`,
          { method: "GET" }
        ).catch((e) => {
          console.log("🟨 [MemberForm] /members/:id/full falhou:", e?.message);
          return null;
        });

        console.log("🟩 [MemberForm] fullUserData:", JSON.stringify(fullUserData));
      }

      if (!mountedRef.current) return;

      // Mescla baseMember + dados completos do User (com endereço)
      const merged = {
        ...baseMember,
        ...(fullUserData ? {
          email:        fullUserData.email        ?? baseMember?.user?.email        ?? baseMember?.email,
          phone:        fullUserData.phone        ?? baseMember?.user?.phone        ?? baseMember?.phone,
          street:       fullUserData.street,
          number:       fullUserData.number,
          neighborhood: fullUserData.neighborhood,
          city:         fullUserData.city,
          notes:        fullUserData.notes        ?? fullUserData.about ?? fullUserData.bio,
          role:         fullUserData.role         ?? baseMember?.role,
          status:       fullUserData.status       ?? baseMember?.status,
        } : {
          // fallback sem fullUserData: usa o que veio do baseMember
          email: baseMember?.email ?? baseMember?.user?.email,
          phone: baseMember?.phone ?? baseMember?.user?.phone,
        }),
      };

      console.log("🟩 [MemberForm] merged final:", JSON.stringify(merged));

      setOriginalMember(merged);
      fillForm(merged);

    } catch (e) {
      if (!mountedRef.current) return;
      console.log("🟥 [MemberForm] erro:", e);
      setErrorMsg(e?.message || "Não foi possível carregar os dados.");
    } finally {
      if (!mountedRef.current) return;
      setLoadingData(false);
    }
  }, [apiFetchAuth, routeMember, targetId, fillForm]);

  useEffect(() => {
    if (isEditing) loadMember();
  }, [isEditing, loadMember]);

  // ─── Validação ────────────────────────────────────────────────────────────
  const canSave = useMemo(() => {
    const n = name.trim();
    const e = email.trim();
    return n.length >= 2 && (!e || e.includes("@")) && !saving;
  }, [name, email, saving]);

  // ─── Salvar ───────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setErrorMsg("");
    setSuccessMsg("");

    const n = name.trim();
    const e = email.trim();

    if (n.length < 2) return setErrorMsg("Informe o nome do membro (mínimo 2 caracteres).");
    if (e && !e.includes("@")) return setErrorMsg("E-mail inválido.");

    try {
      setSaving(true);

      const payload = {
        name:         n,
        email:        e                   || undefined,
        phone:        phone.trim()        || undefined,
        street:       street.trim()       || undefined,
        number:       number.trim()       || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city:         city.trim()         || undefined,
        role,
        status,
        notes:        notes.trim()        || undefined,
      };

      console.log("🟦 [MemberForm] payload:", JSON.stringify(payload));

      const patchId = originalMember?.userId || originalMember?.id || targetId;

      if (isEditing && patchId) {
        await apiFetchAuth(`/users/members/${patchId}`, {
          method: "PATCH",
          body:   JSON.stringify(payload),
        });
      } else {
        await apiFetchAuth("/users/members", {
          method: "POST",
          body:   JSON.stringify(payload),
        });
      }

      setSuccessMsg("Dados salvos com sucesso!");
      setTimeout(() => {
        if (mountedRef.current) navigation.goBack?.();
      }, 1200);

    } catch (e) {
      console.log("🟥 [MemberForm] erro ao salvar:", e);
      setErrorMsg(e?.message || "Não foi possível salvar. Tente novamente.");
    } finally {
      if (!mountedRef.current) return;
      setSaving(false);
    }
  }, [
    name, email, phone, street, number, neighborhood,
    city, role, status, notes,
    originalMember, targetId, isEditing, apiFetchAuth, navigation,
  ]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <View style={[styles.center, { backgroundColor: tc.bg }]}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={[styles.loadingText, { color: tc.muted }]}>
          Carregando dados do membro...
        </Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tc.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={[styles.blob, { width: 180, height: 180, top: -50, right: -40 }]} />
          <View style={[styles.blob, { width: 120, height: 120, bottom: -60, left: -30, opacity: 0.05 }]} />

          <View style={styles.heroContent}>
            <AvatarCircle name={name} />
            <Text style={styles.heroTitle}>
              {isEditing ? "Editar membro" : "Novo membro"}
            </Text>
            {!!name && (
              <Text style={styles.heroSubtitle}>{name}</Text>
            )}
            <Text style={styles.heroDesc}>
              {isEditing
                ? "Atualize os dados, cargo e status do membro"
                : "Preencha os dados para cadastrar um novo membro"}
            </Text>
          </View>
        </View>

        {/* ── Erro ── */}
        {!!errorMsg && (
          <Surface elevation={0} style={[styles.feedbackCard, { backgroundColor: DANGER_BG, borderColor: DANGER }]}>
            <View style={styles.feedbackContent}>
              <Icon source="alert-circle-outline" size={18} color={DANGER} />
              <Text style={[styles.feedbackText, { color: DANGER }]} numberOfLines={3}>
                {errorMsg}
              </Text>
              <TouchableRipple onPress={() => setErrorMsg("")} borderless style={styles.feedbackClose}>
                <Icon source="close" size={16} color={DANGER} />
              </TouchableRipple>
            </View>
          </Surface>
        )}

        {/* ── Sucesso ── */}
        {!!successMsg && (
          <Surface elevation={0} style={[styles.feedbackCard, { backgroundColor: SUCCESS_BG, borderColor: SUCCESS }]}>
            <View style={styles.feedbackContent}>
              <Icon source="check-circle-outline" size={18} color={SUCCESS} />
              <Text style={[styles.feedbackText, { color: SUCCESS }]}>{successMsg}</Text>
            </View>
          </Surface>
        )}

        {/* ── Dados pessoais ── */}
        <SectionHeader title="Dados pessoais" />

        <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
          <StyledInput
            label="Nome completo *"
            value={name}
            onChangeText={setName}
            icon="account-outline"
            iconColor={BRAND_BLUE}
            iconBg={BRAND_LIGHT}
            tc={tc}
          />
          <Divider style={styles.divider} />
          <StyledInput
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            icon="email-outline"
            iconColor={BRAND_BLUE}
            iconBg={BRAND_LIGHT}
            keyboardType="email-address"
            autoCapitalize="none"
            tc={tc}
          />
          <Divider style={styles.divider} />
          <StyledInput
            label="Telefone / WhatsApp"
            value={phone}
            onChangeText={setPhone}
            icon="phone-outline"
            iconColor={SUCCESS}
            iconBg={SUCCESS_BG}
            keyboardType="phone-pad"
            tc={tc}
          />
        </Surface>

        {/* ── Endereço ── */}
        <SectionHeader title="Endereço" />

        <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
          <StyledInput
            label="Rua / Logradouro"
            value={street}
            onChangeText={setStreet}
            icon="map-marker-outline"
            iconColor={DANGER}
            iconBg={DANGER_BG}
            tc={tc}
          />
          <Divider style={styles.divider} />
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <StyledInput
                label="Número"
                value={number}
                onChangeText={setNumber}
                icon="numeric"
                iconColor={DANGER}
                iconBg={DANGER_BG}
                keyboardType="numeric"
                tc={tc}
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 2 }}>
              <StyledInput
                label="Bairro"
                value={neighborhood}
                onChangeText={setNeighborhood}
                icon="home-city-outline"
                iconColor={DANGER}
                iconBg={DANGER_BG}
                tc={tc}
              />
            </View>
          </View>
          <Divider style={styles.divider} />
          <StyledInput
            label="Cidade"
            value={city}
            onChangeText={setCity}
            icon="city-variant-outline"
            iconColor={DANGER}
            iconBg={DANGER_BG}
            tc={tc}
          />
        </Surface>

        {/* ── Cargo ── */}
        <SectionHeader title="Cargo na igreja" />

        <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
          <View style={styles.cardLabelRow}>
            <View style={[styles.cardLabelIcon, { backgroundColor: WARNING_BG }]}>
              <Icon source="shield-outline" size={16} color={WARNING} />
            </View>
            <Text style={[styles.cardLabel, { color: tc.muted }]}>
              Selecione o cargo do membro
            </Text>
          </View>
          <ChipSelector
            options={ROLES}
            labels={ROLE_LABELS}
            colors={ROLE_COLORS}
            value={role}
            onChange={setRole}
          />
        </Surface>

        {/* ── Status ── */}
        <SectionHeader title="Status" />

        <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
          <View style={styles.cardLabelRow}>
            <View style={[styles.cardLabelIcon, { backgroundColor: SUCCESS_BG }]}>
              <Icon source="check-circle-outline" size={16} color={SUCCESS} />
            </View>
            <Text style={[styles.cardLabel, { color: tc.muted }]}>
              Situação atual do membro
            </Text>
          </View>
          <ChipSelector
            options={STATUSES}
            labels={STATUS_LABELS}
            colors={STATUS_COLORS}
            value={status}
            onChange={setStatus}
          />
        </Surface>

        {/* ── Observações ── */}
        <SectionHeader title="Observações" />

        <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
          <StyledInput
            label="Observações internas (opcional)"
            value={notes}
            onChangeText={setNotes}
            icon="note-outline"
            iconColor={BRAND_BLUE}
            iconBg={BRAND_LIGHT}
            multiline
            numberOfLines={3}
            tc={tc}
          />
        </Surface>

        {/* ── Botões ── */}
        <View style={styles.actionsRow}>
          <TouchableRipple
            onPress={() => navigation.goBack?.()}
            borderless
            style={[styles.cancelBtn, { borderColor: tc.outline }]}
          >
            <Text style={[styles.cancelBtnText, { color: tc.muted }]}>Cancelar</Text>
          </TouchableRipple>

          <TouchableRipple
            onPress={handleSave}
            borderless
            style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}
            disabled={!canSave}
          >
            <View style={styles.saveBtnInner}>
              {saving
                ? <ActivityIndicator size={16} color={NAVY} />
                : <Icon source="content-save-outline" size={16} color={NAVY} />
              }
              <Text style={styles.saveBtnText}>
                {saving ? "Salvando..." : "Salvar"}
              </Text>
            </View>
          </TouchableRipple>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:        { flex: 1 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  loadingText: { marginTop: 12, fontSize: 14 },

  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  // ── Hero
  hero: {
    backgroundColor: NAVY, borderRadius: 28, overflow: "hidden",
    position: "relative", marginBottom: 22,
    ...Platform.select({
      ios:     { shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  blob:        { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  heroContent: { alignItems: "center", paddingTop: 28, paddingBottom: 24, paddingHorizontal: 20, zIndex: 2 },
  heroTitle:   { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.5, textAlign: "center", marginTop: 14 },
  heroSubtitle:{ fontSize: 16, fontWeight: "900", color: "rgba(255,255,255,0.90)", textAlign: "center", marginTop: 4, letterSpacing: -0.3 },
  heroDesc:    { fontSize: 12, color: "rgba(255,255,255,0.55)", textAlign: "center", marginTop: 4, lineHeight: 18 },

  // ── Avatar
  avatarFallback: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  avatarInitials: { fontSize: 26, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },

  // ── Feedback
  feedbackCard:    { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12 },
  feedbackContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  feedbackText:    { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  feedbackClose:   { padding: 4, borderRadius: 8 },

  // ── Section header
  sectionHeader: { marginTop: 18, marginBottom: 10 },
  sectionTitle:  { fontSize: 16, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },

  // ── Card genérico
  card: {
    borderWidth: 1, borderRadius: 20, padding: 16,
    ...Platform.select({
      ios:     { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },

  divider: { marginVertical: 10 },

  // ── Card label row
  cardLabelRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  cardLabelIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  cardLabel:     { fontSize: 13, fontWeight: "600" },

  // ── StyledInput
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8, minHeight: 54,
  },
  inputIcon:  { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  inputLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  inputField: { backgroundColor: "transparent", fontSize: 14, fontWeight: "600", paddingHorizontal: 0, height: 26 },

  // ── Row inputs (número + bairro)
  rowInputs: { flexDirection: "row", alignItems: "flex-start" },

  // ── ChipSelector
  chipRow:  { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "800" },

  // ── Botões de ação
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 22 },

  cancelBtn: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    alignItems: "center", justifyContent: "center", paddingVertical: 13,
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700" },

  saveBtn:      { flex: 2, borderRadius: 14, overflow: "hidden" },
  saveBtnInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, backgroundColor: "#fff", paddingVertical: 13,
    borderRadius: 14, borderWidth: 1.5, borderColor: NAVY,
  },
  saveBtnText: { fontSize: 14, fontWeight: "800", color: NAVY },
});