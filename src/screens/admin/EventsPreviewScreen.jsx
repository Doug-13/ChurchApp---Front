import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ─── Design tokens (alinhados ao Design Manual) ────────────────────────────
const NAVY        = "#1A2366";
const BRAND_BLUE  = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const SUCCESS     = "#2DBF8A";
const SUCCESS_BG  = "#E8F9F3";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function canEdit(role) {
  const r = String(role || "").toUpperCase();
  return r === "OWNER" || r === "ADMIN" || r === "LEADER";
}

async function authFetch(path) {
  const fbUser = getAuth().currentUser;
  if (!fbUser) throw new Error("Não autenticado.");
  const token = await getIdToken(fbUser, true);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

function formatEventDate(raw) {
  if (!raw) return "";
  const match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(raw);
  return `${match[3]}/${match[2]}/${match[1]}`;
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, color, bg, tc }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: bg ?? BRAND_LIGHT }]}>
        <Icon source={icon} size={17} color={color ?? BRAND_BLUE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: tc.muted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: tc.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ title, tc }) {
  return <Text style={[styles.sectionTitle, { color: tc.muted }]}>{title}</Text>;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EventsPreviewScreen({ route, navigation }) {
  const theme = useTheme();
  const { me, activeChurchId, activeChurch } = useAuth();
  const churchId = activeChurchId || activeChurch?.id || null;

  const tc = useMemo(() => ({
    surface: theme.colors.surface,
    bg:      theme.colors.background,
    outline: theme.colors.outlineVariant,
    text:    theme.colors.onSurface,
    muted:   theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
  }), [theme]);

  // ── Evento: aceita objeto completo ou só o id via params ─────────────────
  const paramEvent = route?.params?.event ?? {};
  const eventId    = paramEvent?.id ?? route?.params?.id ?? null;

  const [event,   setEvent]   = useState(paramEvent?.title ? paramEvent : null);
  const [loading, setLoading] = useState(!paramEvent?.title);
  const [error,   setError]   = useState(null);

  // ── Busca dados completos se só veio o id ─────────────────────────────────
  useEffect(() => {
    if (!eventId || !churchId || event?.title) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await authFetch(`/churches/${churchId}/events/${eventId}`);
        if (alive) setEvent(data);
      } catch (e) {
        if (alive) setError(e?.message || "Erro ao carregar evento.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [eventId, churchId]);

  // ── Role do usuário na igreja ─────────────────────────────────────────────
  const [myRole, setMyRole] = useState(null);

  useEffect(() => {
    if (!churchId || !me?.id) return;
    (async () => {
      try {
        const mine = await authFetch("/churches/mine");
        const church = Array.isArray(mine)
          ? mine.find((c) => c.id === churchId)
          : null;
        setMyRole(church?.myRole || church?.role || null);
      } catch { /* silencioso */ }
    })();
  }, [churchId, me?.id]);

  const userCanEdit = canEdit(myRole);

  // ── Navegar para edição ───────────────────────────────────────────────────
  const handleEdit = useCallback(() => {
    navigation.push("EventComposer", { id: event?.id ?? eventId });
  }, [navigation, event, eventId]);

  // ── Header button ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userCanEdit) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableRipple
          borderless
          onPress={handleEdit}
          style={styles.headerBtn}
        >
          <View style={styles.headerBtnInner}>
            <Icon source="pencil-outline" size={18} color={BRAND_BLUE} />
            <Text style={styles.headerBtnText}>Editar</Text>
          </View>
        </TouchableRipple>
      ),
    });
  }, [userCanEdit, handleEdit, navigation]);

  // ── Dados derivados ───────────────────────────────────────────────────────
  const title       = event?.title       || "Evento";
  const dateLabel   = formatEventDate(event?.dateLabel || "");
  const timeLabel   = event?.timeLabel   || "";
  const location    = event?.location    || "";
  const description = event?.description || "";
  const coverImgUrl = event?.coverImageUrl || null;
  const color       = event?.color        || null;
  const blocks      = Array.isArray(event?.blocks)      ? event.blocks      : [];
  const ministries  = Array.isArray(event?.ministries)  ? event.ministries  : [];
  const assignments = Array.isArray(event?.assignments) ? event.assignments : [];
  const dateTimeLabel = [dateLabel, timeLabel].filter(Boolean).join(" • ");

  const now       = Date.now();
  const eventTs   = event?.dateLabel
    ? new Date(event.dateLabel + "T00:00:00").getTime()
    : null;
  const isPast    = eventTs !== null && eventTs < now;
  const statusColor = isPast ? "#9198B5" : SUCCESS;
  const statusBg    = isPast ? "#F0F1F5" : SUCCESS_BG;
  const statusLabel = isPast ? "Realizado" : "Em breve";

  // Acento — cor do evento ou do 1º ministério ou brand
  const accent = color || ministries[0]?.color || BRAND_BLUE;

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: tc.bg }]}>
        <ActivityIndicator color={BRAND_BLUE} />
        <Text style={[styles.loadingText, { color: tc.muted }]}>Carregando evento...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.center, { backgroundColor: tc.bg }]}>
        <Icon source="alert-circle-outline" size={36} color="#E84D4D" />
        <Text style={[styles.loadingText, { color: tc.muted }]}>{error || "Evento não encontrado."}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 16, borderRadius: 16 }} buttonColor={BRAND_BLUE} textColor="#fff">Voltar</Button>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tc.bg }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={[styles.hero, { backgroundColor: NAVY }]}>
          <View style={[styles.blob, { width: 200, height: 200, top: -60, right: -50 }]} />
          <View style={[styles.blob, { width: 130, height: 130, bottom: -70, left: -30, opacity: 0.05 }]} />

          {/* Faixa de acento no topo — alinhado ao card da HomeScreen */}
          <View style={[styles.heroAccentStrip, { backgroundColor: accent }]} />

          <View style={styles.heroTop}>
            <View style={[styles.heroIconWrap, { backgroundColor: `${accent}33` }]}>
              <Icon source={ministries[0]?.icon || "calendar-star-outline"} size={22} color="#fff" />
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{title}</Text>

          {!!dateTimeLabel && (
            <View style={styles.heroPills}>
              <View style={styles.heroPill}>
                <View style={[styles.heroPillDot, { backgroundColor: "#7EFFD4" }]} />
                <Text style={styles.heroPillText}>{dateTimeLabel}</Text>
              </View>
              {!!location && (
                <View style={styles.heroPill}>
                  <View style={[styles.heroPillDot, { backgroundColor: "#FFD97D" }]} />
                  <Text style={styles.heroPillText}>{location}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Detalhes ── */}
        <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
          <SectionHeader title="DETALHES" tc={tc} />
          <InfoRow icon="calendar-outline"   label="Data"    value={dateLabel || "Não definida"} tc={tc} />
          <InfoRow icon="clock-outline"      label="Horário" value={timeLabel}  tc={tc} />
          <InfoRow icon="map-marker-outline" label="Local"   value={location}   color="#E85D75" bg="#FDECEF" tc={tc} />
          {!!description && (
            <View style={styles.descWrap}>
              <Text style={[styles.infoLabel, { color: tc.muted }]}>Descrição</Text>
              <Text style={[styles.descText, { color: tc.text }]}>{description}</Text>
            </View>
          )}
        </Surface>

        {/* ── Ministérios ── */}
        {ministries.length > 0 && (
          <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
            <SectionHeader title="MINISTÉRIOS" tc={tc} />
            <View style={styles.chipRow}>
              {ministries.map((m) => (
                <View key={m.id} style={[styles.ministryChip, { backgroundColor: (m.color || BRAND_BLUE) + "22" }]}>
                  <View style={[styles.ministryDot, { backgroundColor: m.color || BRAND_BLUE }]} />
                  <Text style={[styles.ministryText, { color: m.color || BRAND_BLUE }]}>{m.name}</Text>
                </View>
              ))}
            </View>
          </Surface>
        )}

        {/* ── Escala / Blocos ── */}
        {blocks.length > 0 && (
          <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
            <SectionHeader title="ESCALA" tc={tc} />
            <View style={{ gap: 14 }}>
              {blocks.map((block) => (
                <View key={block.id}>
                  <View style={styles.blockHeader}>
                    <View style={[styles.blockIconWrap, { backgroundColor: BRAND_LIGHT }]}>
                      <Icon source={block.icon || "account-group-outline"} size={15} color={BRAND_BLUE} />
                    </View>
                    <Text style={styles.blockTitle}>{block.title}</Text>
                  </View>
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {(block.people || []).map((p, i) => (
                      <View key={i} style={[styles.personRow, { borderColor: tc.outline }]}>
                        <View style={[styles.personAvatar, { backgroundColor: BRAND_LIGHT }]}>
                          <Text style={[styles.personInitial, { color: BRAND_BLUE }]}>
                            {(p.name || "?")[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.personName}>{p.name}</Text>
                          {!!p.role && <Text style={[styles.personRole, { color: tc.muted }]}>{p.role}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </Surface>
        )}

        {/* ── Confirmações ── */}
        {assignments.length > 0 && (
          <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
            <SectionHeader title="CONFIRMAÇÕES" tc={tc} />
            <View style={{ gap: 8 }}>
              {assignments.map((a) => {
                const confirmed = a.status === "CONFIRMED";
                const aColor = confirmed ? SUCCESS  : "#F5A623";
                const aBg    = confirmed ? SUCCESS_BG : "#FEF5E7";
                return (
                  <View key={a.id} style={[styles.personRow, { borderColor: tc.outline }]}>
                    <View style={[styles.personAvatar, { backgroundColor: aBg }]}>
                      <Text style={[styles.personInitial, { color: aColor }]}>
                        {(a.memberName || "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{a.memberName}</Text>
                      {!!a.roleName && <Text style={[styles.personRole, { color: tc.muted }]}>{a.roleName}</Text>}
                    </View>
                    <View style={[styles.confirmPill, { backgroundColor: aBg }]}>
                      <Text style={[styles.confirmText, { color: aColor }]}>
                        {confirmed ? "Confirmado" : "Pendente"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Surface>
        )}

        {/* ── Botão Editar (rodapé) — visível só para OWNER/ADMIN/LEADER ── */}
        {userCanEdit && (
          <Button
            mode="contained"
            icon="pencil-outline"
            onPress={handleEdit}
            style={styles.editBtn}
            contentStyle={styles.editBtnContent}
            buttonColor={accent}
            textColor="#fff"
          >
            Editar evento
          </Button>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:      { flex: 1 },
  center:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loadingText: { fontSize: 14, marginTop: 8 },

  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios:     { shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },

  heroAccentStrip: {
    height: 4,
    width: "100%",
  },

  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    zIndex: 2,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  heroIconWrap: {
    width: 44, height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusDot:  { width: 6, height: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "800" },

  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
    zIndex: 2,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },

  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 2,
  },

  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.13)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  heroPillDot:  { width: 6, height: 6, borderRadius: 999 },
  heroPillText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    ...Platform.select({
      ios:     { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  // ── InfoRow ───────────────────────────────────────────────────────────────
  infoRow:     { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIconWrap:{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoLabel:   { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  infoValue:   { fontSize: 14, fontWeight: "600" },
  descWrap:    { gap: 4, paddingTop: 4 },
  descText:    { fontSize: 14, lineHeight: 21 },

  // ── Chips ─────────────────────────────────────────────────────────────────
  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ministryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  ministryDot:  { width: 7, height: 7, borderRadius: 999 },
  ministryText: { fontSize: 12, fontWeight: "800" },

  // ── Blocks / People ───────────────────────────────────────────────────────
  blockHeader:  { flexDirection: "row", alignItems: "center", gap: 8 },
  blockIconWrap:{ width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  blockTitle:   { fontSize: 13, fontWeight: "900", color: NAVY, letterSpacing: -0.2 },
  personRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
  personAvatar: { width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  personInitial:{ fontSize: 14, fontWeight: "900" },
  personName:   { fontSize: 13, fontWeight: "800", color: NAVY },
  personRole:   { fontSize: 11, marginTop: 1 },

  // ── Confirmações ──────────────────────────────────────────────────────────
  confirmPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  confirmText: { fontSize: 10, fontWeight: "800" },

  // ── Header button ─────────────────────────────────────────────────────────
  headerBtn: {
    marginRight: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  headerBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: BRAND_LIGHT,
    borderRadius: 12,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: BRAND_BLUE,
  },

  // ── Botão editar rodapé ───────────────────────────────────────────────────
  editBtn:        { borderRadius: 20, marginTop: 4 },
  editBtnContent: { height: 52 },
});