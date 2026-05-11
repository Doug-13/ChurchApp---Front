// ProfileScreen.js
// ✅ Usa /users/me + GET /cells?churchId + GET /churches/:id/ministries
// ✅ Mostra: dados pessoais, célula, ministérios
// ✅ Sem liderança, sem /users/me/dashboard

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, RefreshControl, Platform } from "react-native";
import {
  Divider,
  Icon,
  Surface,
  Text,
  useTheme,
  ActivityIndicator,
  TouchableRipple,
  Avatar,
} from "react-native-paper";
import { getAuth } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeStr(v) {
  return String(v ?? "").trim();
}

function initials(name = "") {
  const parts = safeStr(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] || "";
  const last  = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && safeStr(v) !== "") return v;
  }
  return "";
}

function formatBirthdayBR(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return safeStr(dateLike);
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(d);
  } catch {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
}

function normalizeRole(roleRaw) {
  const r = safeStr(roleRaw).toUpperCase();
  if (r.includes("OWNER"))
    return { label: "Owner",         icon: "crown-outline",        color: WARNING,    bg: WARNING_BG  };
  if (r.includes("ADMIN"))
    return { label: "Administrador", icon: "shield-outline",       color: BRAND_BLUE, bg: BRAND_LIGHT };
  if (r.includes("LEADER"))
    return { label: "Líder",         icon: "account-star-outline", color: SUCCESS,    bg: SUCCESS_BG  };
  if (r.includes("OBRE") || r.includes("WORKER"))
    return { label: "Obreiro",       icon: "account-hard-hat",     color: WARNING,    bg: WARNING_BG  };
  return   { label: "Membro",        icon: "account-outline",      color: BRAND_BLUE, bg: BRAND_LIGHT };
}

function meetingLabel(cell) {
  if (!cell) return "";
  const d = safeStr(cell.meetingDay);
  const t = safeStr(cell.meetingTime);
  return [d, t].filter(Boolean).join(" • ");
}

// ─── authedFetch ──────────────────────────────────────────────────────────────
async function authedFetch(path, { method = "GET", signal } = {}, authCtx) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res  = await fetch(`${API_BASE_URL}${path}`, { method, headers, signal });
  const text = await res.text();
  let data   = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Erro ${res.status}`;
    const err = new Error(msg);
    err.status  = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, color, bg, tc }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: bg || BRAND_LIGHT }]}>
        <Icon source={icon} size={16} color={color || BRAND_BLUE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: tc.muted }]}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const theme   = useTheme();
  const authCtx = useAuth();

  const tc = useMemo(() => ({
    surface: theme.colors.surface,
    bg:      theme.colors.background,
    outline: theme.colors.outlineVariant,
    text:    theme.colors.onSurface,
    muted:   theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
  }), [theme]);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState("");
  const [me,         setMe]         = useState(null);

  // ─── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (mode = "load") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError("");

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);

    try {
      // 1. Dados pessoais
      const meData = await authedFetch(
        "/users/me",
        { signal: controller.signal },
        authCtx
      );
      if (!mountedRef.current) return;

      const churchId = meData?.activeChurchId || authCtx?.activeChurchId;

      // 2. Células e ministérios em paralelo — falha silenciosa
      const [cellsData, ministriesData] = await Promise.all([
        churchId
          ? authedFetch(
              `/cells?churchId=${encodeURIComponent(churchId)}`,
              { signal: controller.signal },
              authCtx
            ).catch(() => null)
          : Promise.resolve(null),

        churchId
          ? authedFetch(
              `/churches/${encodeURIComponent(churchId)}/ministries?take=50`,
              { signal: controller.signal },
              authCtx
            ).catch(() => null)
          : Promise.resolve(null),
      ]);

      console.log("🟩 [ProfileScreen] meData:", JSON.stringify(meData));
      console.log("🟩 [ProfileScreen] cellsData:", JSON.stringify(cellsData));
      console.log("🟩 [ProfileScreen] ministriesData:", JSON.stringify(ministriesData));

      if (!mountedRef.current) return;

      setMe({
        ...meData,
        _cellsData:      cellsData,
        _ministriesData: ministriesData,
      });

    } catch (e) {
      if (!mountedRef.current) return;
      setError(
        e?.name === "AbortError"
          ? "Tempo esgotado. Verifique sua conexão."
          : e?.message || "Erro ao carregar perfil."
      );
    } finally {
      clearTimeout(t);
      if (!mountedRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [authCtx]);

  useEffect(() => { load("load"); }, [load]);

  // ─── Normalizar dados ──────────────────────────────────────────────────────
  const member = useMemo(() => {
    if (!me) return null;

    const userId   = me?.id;
    const name     = pickFirst(me.name, me.fullName, "Usuário");
    const photoUrl = pickFirst(me.photoUrl) || null;

    const roleRaw = pickFirst(
      me?.membership?.role, me?.activeMembership?.role, me?.role,
      authCtx?.membership?.role, authCtx?.role
    );
    const statusRaw = pickFirst(
      me?.membership?.status, me?.activeMembership?.status, me?.status, "ACTIVE"
    );
    const isActive =
      safeStr(statusRaw).toLowerCase().includes("activ") ||
      safeStr(statusRaw).toLowerCase().includes("ativ");

    const email    = pickFirst(me.email, authCtx?.user?.email);
    const phone    = pickFirst(me.phone);
    const birthday = formatBirthdayBR(pickFirst(me.birthday, me.birthDate, me.birthdate));

    const addressParts = [me.street, me.number, me.neighborhood, me.city]
      .map(safeStr).filter(Boolean);
    const address = addressParts.join(", ");

    const roleNorm = normalizeRole(roleRaw);

    // ── Célula ──────────────────────────────────────────────────────────────
    // GET /cells retorna leader.userId e viceLeader.userId
    // Procura célula onde o user é líder ou vice-líder
    const allCells =
      Array.isArray(me?._cellsData)       ? me._cellsData :
      Array.isArray(me?._cellsData?.cells) ? me._cellsData.cells :
      Array.isArray(me?._cellsData?.data)  ? me._cellsData.data :
      [];

    const myCell = allCells.find((c) => {
      return (
        c?.leader?.userId     === userId ||
        c?.viceLeader?.userId === userId
      );
    }) || me?.cell || me?.membership?.cell || null;

    const cellName = safeStr(myCell?.name);
    const cellDay  = meetingLabel(myCell);
    const cellId   = myCell?.id || null;

    // ── Ministérios ─────────────────────────────────────────────────────────
    // GET /churches/:id/ministries retorna { items, nextCursor }
    // Cada item NÃO tem members — apenas contagem.
    // Por ora listamos todos da igreja; ajuste quando tiver endpoint filtrado.
    const allMinistries =
      Array.isArray(me?._ministriesData?.items) ? me._ministriesData.items :
      Array.isArray(me?._ministriesData)         ? me._ministriesData :
      [];

    const ministries = allMinistries.map((m) => ({
      id:       m?.id || String(Math.random()),
      name:     m?.name || "Ministério",
      roleName: null,
    }));

    return {
      name, photoUrl,
      role: roleNorm.label, roleIcon: roleNorm.icon,
      roleColor: roleNorm.color, roleBg: roleNorm.bg,
      isActive,
      email, phone, birthday, address,
      cell: { name: cellName, day: cellDay, id: cellId },
      ministries,
    };
  }, [me, authCtx]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: tc.bg }]}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={[styles.loadingText, { color: tc.muted }]}>
          Carregando perfil...
        </Text>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tc.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load("refresh")}
          />
        }
      >
        {/* ── Erro ── */}
        {!!error && (
          <Surface
            elevation={0}
            style={[styles.errorCard, { backgroundColor: DANGER_BG, borderColor: DANGER }]}
          >
            <View style={styles.errorContent}>
              <Icon source="alert-circle-outline" size={20} color={DANGER} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Erro ao carregar</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
              <TouchableRipple
                onPress={() => load("load")}
                borderless
                style={styles.errorBtn}
              >
                <Text style={styles.errorBtnText}>Tentar</Text>
              </TouchableRipple>
            </View>
          </Surface>
        )}

        {!!member && (
          <>
            {/* ── Hero ── */}
            <View style={styles.hero}>
              <View style={[styles.blob, { width: 200, height: 200, top: -60, right: -50 }]} />
              <View style={[styles.blob, { width: 130, height: 130, bottom: -70, left: -35, opacity: 0.05 }]} />

              <View style={styles.heroContent}>
                {member.photoUrl ? (
                  <Avatar.Image
                    size={68}
                    source={{ uri: member.photoUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initials(member.name)}</Text>
                  </View>
                )}

                <Text style={styles.heroName} numberOfLines={1}>
                  {member.name}
                </Text>

                <View style={styles.heroPills}>
                  <View style={[styles.heroPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                    <Icon source={member.roleIcon} size={13} color="#fff" />
                    <Text style={styles.heroPillText}>{member.role}</Text>
                  </View>
                  <View style={[styles.heroPill, {
                    backgroundColor: member.isActive
                      ? "rgba(45,191,138,0.25)"
                      : "rgba(232,77,77,0.25)",
                  }]}>
                    <View style={[styles.pillDot, {
                      backgroundColor: member.isActive ? SUCCESS : DANGER,
                    }]} />
                    <Text style={styles.heroPillText}>
                      {member.isActive ? "Ativo" : "Inativo"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroActions}>
                <TouchableRipple
                  onPress={() => navigation?.navigate?.("ProfileEdit")}
                  borderless
                  style={styles.heroBtn}
                >
                  <View style={styles.heroBtnInner}>
                    <Icon source="pencil-outline" size={14} color={NAVY} />
                    <Text style={styles.heroBtnText}>Editar perfil</Text>
                  </View>
                </TouchableRipple>

                <TouchableRipple
                  onPress={() => authCtx?.signOut?.()}
                  borderless
                  style={styles.heroSecBtn}
                >
                  <Text style={styles.heroSecBtnText}>Sair</Text>
                </TouchableRipple>
              </View>
            </View>

            {/* ── Informações pessoais ── */}
            <SectionHeader title="Informações" />

            <Surface
              elevation={0}
              style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}
            >
              <InfoRow
                icon="email-outline" label="E-mail" value={member.email}
                color={BRAND_BLUE} bg={BRAND_LIGHT} tc={tc}
              />
              {!!member.email && !!member.phone && <Divider style={styles.divider} />}
              <InfoRow
                icon="phone-outline" label="Telefone" value={member.phone}
                color={SUCCESS} bg={SUCCESS_BG} tc={tc}
              />
              {!!member.phone && !!member.birthday && <Divider style={styles.divider} />}
              <InfoRow
                icon="cake-variant-outline" label="Aniversário" value={member.birthday}
                color={WARNING} bg={WARNING_BG} tc={tc}
              />
              {!!member.birthday && !!member.address && <Divider style={styles.divider} />}
              <InfoRow
                icon="map-marker-outline" label="Endereço" value={member.address}
                color={DANGER} bg={DANGER_BG} tc={tc}
              />
            </Surface>

            {/* ── Célula ── */}
            <SectionHeader title="Célula" />

            <Surface
              elevation={0}
              style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}
            >
              <View style={styles.bindRow}>
                <View style={[styles.bindIcon, { backgroundColor: SUCCESS_BG }]}>
                  <Icon source="home-group" size={20} color={SUCCESS} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bindTitle}>
                    {member.cell?.name || "Sem célula vinculada"}
                  </Text>
                  {!!member.cell?.day && (
                    <Text style={[styles.bindSub, { color: tc.muted }]}>
                      {member.cell.day}
                    </Text>
                  )}
                </View>
                {!!member.cell?.name && (
                  <TouchableRipple
                    onPress={() =>
                      navigation?.navigate?.("CellsManage", { cellId: member.cell.id })
                    }
                    borderless
                    style={styles.bindChevron}
                  >
                    <Icon source="chevron-right" size={20} color={tc.muted} />
                  </TouchableRipple>
                )}
              </View>
            </Surface>

            {/* ── Ministérios ── */}
            <SectionHeader title="Ministérios" />

            <Surface
              elevation={0}
              style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}
            >
              {member.ministries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon source="music-note-outline" size={28} color={tc.muted} />
                  <Text style={[styles.emptyText, { color: tc.muted }]}>
                    Sem ministérios vinculados
                  </Text>
                </View>
              ) : (
                member.ministries.map((m, i) => (
                  <View key={m.id}>
                    {i > 0 && <Divider style={styles.divider} />}
                    <View style={styles.bindRow}>
                      <View style={[styles.bindIcon, { backgroundColor: BRAND_LIGHT }]}>
                        <Icon source="music-note-outline" size={18} color={BRAND_BLUE} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bindTitle}>{m.name}</Text>
                        {!!m.roleName && (
                          <Text style={[styles.bindSub, { color: tc.muted }]}>
                            {m.roleName}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </Surface>

            {/* ── Conta ── */}
            <SectionHeader title="Conta" />

            <Surface
              elevation={0}
              style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}
            >
              <TouchableRipple
                onPress={() => load("refresh")}
                style={styles.actionRow}
              >
                <View style={styles.actionRowInner}>
                  <View style={[styles.bindIcon, { backgroundColor: BRAND_LIGHT }]}>
                    <Icon source="refresh" size={18} color={BRAND_BLUE} />
                  </View>
                  <Text style={styles.actionLabel}>Atualizar dados</Text>
                  <Icon source="chevron-right" size={18} color={tc.muted} />
                </View>
              </TouchableRipple>

              <Divider style={styles.divider} />

              <TouchableRipple
                onPress={() => navigation?.navigate?.("ChangePassword")}
                style={styles.actionRow}
              >
                <View style={styles.actionRowInner}>
                  <View style={[styles.bindIcon, { backgroundColor: WARNING_BG }]}>
                    <Icon source="lock-outline" size={18} color={WARNING} />
                  </View>
                  <Text style={styles.actionLabel}>Alterar senha</Text>
                  <Icon source="chevron-right" size={18} color={tc.muted} />
                </View>
              </TouchableRipple>

              <Divider style={styles.divider} />

              <TouchableRipple
                onPress={() => authCtx?.signOut?.()}
                style={styles.actionRow}
              >
                <View style={styles.actionRowInner}>
                  <View style={[styles.bindIcon, { backgroundColor: DANGER_BG }]}>
                    <Icon source="logout" size={18} color={DANGER} />
                  </View>
                  <Text style={[styles.actionLabel, { color: DANGER }]}>Sair da conta</Text>
                  <Icon source="chevron-right" size={18} color={DANGER} />
                </View>
              </TouchableRipple>
            </Surface>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  loadingText: { marginTop: 12, fontSize: 14 },

  // ── Erro
  errorCard:     { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 14 },
  errorContent:  { flexDirection: "row", alignItems: "center", gap: 10 },
  errorTitle:    { fontSize: 13, fontWeight: "900", color: DANGER },
  errorText:     { fontSize: 12, color: DANGER, marginTop: 2, lineHeight: 16 },
  errorBtn:      { borderRadius: 999, overflow: "hidden", backgroundColor: "#fff" },
  errorBtnText:  { paddingHorizontal: 12, paddingVertical: 7, fontSize: 12, fontWeight: "900", color: DANGER },

  // ── Hero
  hero: {
    backgroundColor: NAVY,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    marginBottom: 22,
    ...Platform.select({
      ios:     { shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  heroContent: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  avatarFallback: {
    width: 68, height: 68,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatar:         { marginBottom: 12 },
  avatarInitials: { fontSize: 26, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  heroName: {
    fontSize: 22, fontWeight: "900", color: "#fff",
    letterSpacing: -0.5, textAlign: "center",
  },
  heroPills: {
    flexDirection: "row", gap: 8, marginTop: 12,
    flexWrap: "wrap", justifyContent: "center",
  },
  heroPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  heroPillText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  pillDot:      { width: 6, height: 6, borderRadius: 999 },

  heroActions: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 20, paddingBottom: 20, zIndex: 2,
  },
  heroBtn:      { flex: 1, borderRadius: 14, overflow: "hidden" },
  heroBtnInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#fff", paddingVertical: 10, borderRadius: 14,
  },
  heroBtnText:    { fontSize: 13, fontWeight: "800", color: NAVY },
  heroSecBtn:     { borderRadius: 14, overflow: "hidden" },
  heroSecBtnText: {
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.75)",
  },

  // ── Section header
  sectionHeader: { marginTop: 18, marginBottom: 10 },
  sectionTitle:  { fontSize: 16, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },

  // ── Card genérico
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios:     { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },

  divider: { marginVertical: 10 },

  // ── InfoRow
  infoRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon:  { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  infoValue: { fontSize: 14, fontWeight: "700", color: NAVY, marginTop: 1 },

  // ── Bind row (célula / ministério)
  bindRow:     { flexDirection: "row", alignItems: "center", gap: 12 },
  bindIcon:    { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  bindTitle:   { fontSize: 14, fontWeight: "900", color: NAVY, letterSpacing: -0.2 },
  bindSub:     { fontSize: 12, marginTop: 2, lineHeight: 16 },
  bindChevron: { padding: 4, borderRadius: 8 },

  // ── Empty state
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyText:  { fontSize: 13, fontWeight: "600" },

  // ── Action rows
  actionRow:      { borderRadius: 8, overflow: "hidden" },
  actionRowInner: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  actionLabel:    { flex: 1, fontSize: 14, fontWeight: "700", color: NAVY },
});