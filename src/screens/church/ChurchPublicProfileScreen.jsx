import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Platform, Alert } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Divider,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
import { joinChurch as joinChurchApi } from "../../services/churchService";
import { useAuth } from "../../context/AuthContext";

// ── Design tokens — alinhados ao Design Manual ────────────────────────────
const NAVY          = "#1A2366";
const BRAND_BLUE    = "#4158D0";
const BRAND_LIGHT   = "#EEF0FA";
const BG            = "#F5F6FA";
const MUTED         = "#9198B5";
const BORDER        = "#E4E6F0";
const SUCCESS       = "#2DBF8A";
const SUCCESS_LIGHT = "#E8F9F3";
const WARNING       = "#F5A623";
const WARNING_LIGHT = "#FEF5E7";

// ── Fetch autenticado (padrão do projeto) ─────────────────────────────────
async function authedGet(path) {
  const fbUser = getAuth().currentUser;
  if (!fbUser) throw new Error("Usuário não autenticado.");
  const token = await getIdToken(fbUser, true);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

// ── Sub-componentes (nível de módulo — padrão Design Manual) ──────────────

function InfoRow({ icon, label, value, color, bg, loading }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: bg ?? BRAND_LIGHT }]}>
        <Icon source={icon} size={16} color={color ?? BRAND_BLUE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        {loading
          ? <ActivityIndicator size="small" color={color ?? BRAND_BLUE} style={{ alignSelf: "flex-start", marginTop: 4 }} />
          : <Text style={styles.infoValue}>{value || "—"}</Text>
        }
      </View>
    </View>
  );
}

function Pill({ label, icon, color, bg }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Icon source={icon} size={11} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled, loading, color }) {
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled || loading}
      borderless
      style={[
        styles.primaryBtn,
        { backgroundColor: color, opacity: disabled || loading ? 0.55 : 1 },
      ]}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.primaryBtnText}>{label}</Text>
      }
    </TouchableRipple>
  );
}

function OutlineButton({ label, icon, onPress }) {
  return (
    <TouchableRipple onPress={onPress} borderless style={styles.outlineBtn}>
      <View style={styles.outlineBtnInner}>
        {!!icon && <Icon source={icon} size={16} color={NAVY} />}
        <Text style={styles.outlineBtnText}>{label}</Text>
      </View>
    </TouchableRipple>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────

export default function ChurchPublicProfileScreen({ route, navigation }) {
  const theme = useTheme();
  const { refreshMe } = useAuth();
  const church = route.params?.church;

  const [joining,      setJoining]      = useState(false);
  const [error,        setError]        = useState("");
  const [membersCount, setMembersCount] = useState(church?.membersCount ?? null);
  const [loadingCount, setLoadingCount] = useState(false);

  // tc centralizado — padrão Design Manual
  const tc = useMemo(() => ({
    surface: theme.colors.surface,
    bg:      theme.colors.background,
    outline: theme.colors.outlineVariant,
    text:    theme.colors.onSurface,
    muted:   theme.colors.onSurfaceVariant,
  }), [theme]);

  const subtitle = useMemo(() => {
    if (!church) return "";
    return [church.city, church.state].filter(Boolean).join(" • ");
  }, [church]);

  const accent      = church?.requiresApproval ? WARNING       : SUCCESS;
  const accentLight = church?.requiresApproval ? WARNING_LIGHT : SUCCESS_LIGHT;

  // ── Busca membersCount via GET /churches/:id (não requer membership) ──────
  // O backend retorna membersCount no nível raiz após o patch do getChurchById.
  const fetchMembersCount = useCallback(async () => {
    if (!church?.id) return;
    setLoadingCount(true);
    try {
      const data = await authedGet(`/churches/${encodeURIComponent(church.id)}`);
      // Backend retorna membersCount no raiz após o patch
      const count =
        data?.membersCount ??
        data?._count?.members ??
        data?.memberCount ??
        data?.totalMembers ??
        null;
      if (count !== null) setMembersCount(count);
    } catch (e) {
      console.log("[membersCount] fetch failed:", e?.message);
    } finally {
      setLoadingCount(false);
    }
  }, [church?.id]);

  useEffect(() => { fetchMembersCount(); }, [fetchMembersCount]);


  // ── Join ──────────────────────────────────────────────────────────────
  async function handleJoin() {
    setError("");
    try {
      setJoining(true);
      const result = await joinChurchApi(church.id);
      if (result?.status === "PENDING") {
        navigation.replace("PendingApproval", { church });
        return;
      }
      await refreshMe();
    } catch (e) {
      const msg = e?.message || "Não foi possível entrar na igreja. Tente novamente.";
      setError(msg);
      Alert.alert("Erro", msg);
    } finally {
      setJoining(false);
    }
  }

  // ── Sem dados ─────────────────────────────────────────────────────────
  if (!church) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <View style={styles.emptyIcon}>
          <Icon source="church-outline" size={28} color={BRAND_BLUE} />
        </View>
        <Text style={styles.emptyTitle}>Dados não encontrados</Text>
        <Text style={styles.emptyDesc}>Não foi possível carregar o perfil da igreja.</Text>
        <OutlineButton label="Voltar" icon="arrow-left" onPress={() => navigation.goBack()} />
      </View>
    );
  }


  const membersLabel = membersCount !== null
    ? `${membersCount} ${membersCount === 1 ? "membro ativo" : "membros ativos"}`
    : "—";

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>

      {/* ── Hero (NAVY fixo — Design Manual) ── */}
      <View style={styles.hero}>
        <View style={[styles.blob, { width: 200, height: 200, top: -60, right: -50, backgroundColor: "rgba(255,255,255,0.07)" }]} />
        <View style={[styles.blob, { width: 130, height: 130, bottom: -70, left: -30, backgroundColor: "rgba(255,255,255,0.05)" }]} />

        <TouchableRipple borderless onPress={() => navigation.goBack()} style={styles.backBtn}>
          <View style={styles.backBtnInner}>
            <Icon source="arrow-left" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.backBtnText}>Voltar</Text>
          </View>
        </TouchableRipple>

        <View style={styles.heroBody}>
          {/* Normaliza os vários campos de imagem que o backend pode retornar */}
          {(church.logoUrl || church.photoUrl || church.imageUrl || church.avatarUrl || church.coverUrl || church.photo) ? (
            <Avatar.Image
              size={56}
              source={{ uri: church.logoUrl || church.photoUrl || church.imageUrl || church.avatarUrl || church.coverUrl || church.photo }}
              style={styles.heroAvatar}
            />
          ) : (
            <View style={styles.heroAvatarFallback}>
              <Icon source="church" size={26} color="#fff" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle} numberOfLines={2}>{church.name}</Text>
            {!!subtitle && (
              <View style={styles.heroPillRow}>
                <View style={styles.heroPill}>
                  <View style={[styles.heroPillDot, { backgroundColor: "#7EFFD4" }]} />
                  <Text style={styles.heroPillText}>{subtitle}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.heroPillsRow}>
          <Pill
            label={church.isPublic ? "Pública" : "Privada"}
            icon={church.isPublic ? "eye-outline" : "eye-off-outline"}
            color={church.isPublic ? SUCCESS : MUTED}
            bg="rgba(255,255,255,0.12)"
          />
          <Pill
            label={church.requiresApproval ? "Requer aprovação" : "Entrada direta"}
            icon={church.requiresApproval ? "shield-check-outline" : "check-circle-outline"}
            color={church.requiresApproval ? WARNING : SUCCESS}
            bg="rgba(255,255,255,0.12)"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Card de detalhes ── */}
        <Surface style={[styles.card, { backgroundColor: tc.surface }]} elevation={0}>
          <View style={[styles.cardStrip, { backgroundColor: BRAND_BLUE }]} />
          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: BRAND_LIGHT }]}>
                <Icon source="information-outline" size={18} color={BRAND_BLUE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Sobre a igreja</Text>
                <Text style={styles.cardDesc} numberOfLines={3}>
                  {church.about || "Sem descrição disponível."}
                </Text>
              </View>
            </View>

            <Divider style={[styles.divider, { backgroundColor: BORDER }]} />

            <InfoRow
              icon="map-marker-outline"
              label="Localização"
              value={subtitle || "Não informado"}
              color={BRAND_BLUE}
              bg={BRAND_LIGHT}
            />
            <InfoRow
              icon="account-group-outline"
              label="Membros ativos"
              value={membersLabel}
              color={SUCCESS}
              bg={SUCCESS_LIGHT}
              loading={loadingCount}
            />
            <InfoRow
              icon="clock-outline"
              label="Horários de culto"
              value={church.serviceTimes || "Não informado"}
              color={BRAND_BLUE}
              bg={BRAND_LIGHT}
            />
            <InfoRow
              icon={church.requiresApproval ? "shield-check-outline" : "check-circle-outline"}
              label="Entrada"
              value={church.requiresApproval
                ? "Sua solicitação será enviada para aprovação dos responsáveis."
                : "Você terá acesso imediato ao conteúdo desta igreja."}
              color={accent}
              bg={accentLight}
            />
          </View>
        </Surface>

        {/* ── Card de ação ── */}
        <Surface style={[styles.card, { backgroundColor: tc.surface }]} elevation={0}>
          <View style={[styles.cardStrip, { backgroundColor: accent }]} />
          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: accentLight }]}>
                <Icon
                  source={church.requiresApproval ? "account-clock-outline" : "login-variant"}
                  size={18}
                  color={accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {church.requiresApproval ? "Solicitar entrada" : "Entrar na igreja"}
                </Text>
                <Text style={styles.cardDesc}>
                  {church.requiresApproval
                    ? "Envie sua solicitação e aguarde a aprovação dos líderes."
                    : "Você terá acesso imediato a eventos, escalas e avisos."}
                </Text>
              </View>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Icon source="alert-circle-outline" size={15} color="#E84D4D" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <PrimaryButton
              label={church.requiresApproval ? "Solicitar entrada" : "Entrar agora"}
              onPress={handleJoin}
              disabled={joining}
              loading={joining}
              color={accent}
            />
            <OutlineButton label="Cancelar" icon="close" onPress={() => navigation.goBack()} />
          </View>
        </Surface>

        <View style={styles.infoBadge}>
          <Icon source="shield-lock-outline" size={13} color={BRAND_BLUE} />
          <Text style={styles.infoBadgeText}>
            Seus dados são usados apenas para identificação dentro da igreja.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 36 : 22,
    paddingBottom: 20,
    overflow: "hidden",
  },
  blob: { position: "absolute", borderRadius: 999 },

  backBtn:      { alignSelf: "flex-start", borderRadius: 999, marginBottom: 16, zIndex: 2 },
  backBtnInner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999 },
  backBtnText:  { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.85)" },

  heroBody:          { flexDirection: "row", alignItems: "center", gap: 14, zIndex: 2, marginBottom: 14 },
  heroAvatarFallback: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  heroAvatar:        { borderRadius: 18 },
  heroTitle:         { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.5, flex: 1 },
  heroPillRow:       { flexDirection: "row", marginTop: 6 },
  heroPill:          { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  heroPillDot:       { width: 6, height: 6, borderRadius: 999 },
  heroPillText:      { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  heroPillsRow:      { flexDirection: "row", gap: 8, flexWrap: "wrap", zIndex: 2 },

  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },

  card: {
    borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      ios:     { shadowColor: NAVY, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  cardStrip:    { height: 4 },
  cardBody:     { padding: 16, gap: 12 },
  cardHeader:   { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  cardTitle:    { fontSize: 15, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },
  cardDesc:     { fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 18 },
  divider:      { height: 1, marginVertical: 4 },

  infoRow:      { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 1 },
  infoLabel:    { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, color: MUTED },
  infoValue:    { fontSize: 13, fontWeight: "600", color: NAVY, marginTop: 2, lineHeight: 19 },

  pill:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "700" },

  primaryBtn:     { borderRadius: 16, height: 52, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryBtnText: { fontSize: 15, fontWeight: "900", color: "#fff", letterSpacing: -0.2 },

  outlineBtn:      { borderRadius: 16, height: 48, borderWidth: 1.5, borderColor: BORDER, alignItems: "center", justifyContent: "center", marginTop: 4 },
  outlineBtnInner: { flexDirection: "row", alignItems: "center", gap: 7 },
  outlineBtnText:  { fontSize: 14, fontWeight: "800", color: NAVY },

  errorBox:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEECEC", borderRadius: 12, borderWidth: 1, borderColor: "#FECACA", padding: 12 },
  errorText: { fontSize: 13, color: "#E84D4D", flex: 1, lineHeight: 18, fontWeight: "600" },

  infoBadge:     { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: BRAND_LIGHT, borderRadius: 12, padding: 10 },
  infoBadgeText: { flex: 1, fontSize: 11.5, color: BRAND_BLUE, lineHeight: 17, fontWeight: "600" },

  center:     { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: BRAND_LIGHT, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: NAVY },
  emptyDesc:  { fontSize: 13, color: MUTED, textAlign: "center", lineHeight: 20 },
});