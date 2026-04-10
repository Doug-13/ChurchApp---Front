// ProfileScreen.js
// ✅ Usa apenas /users/me e /users/me/dashboard
// ✅ Mostra: célula do usuário, ministérios, células que lidera/vice
// ✅ Mantém seu layout no padrão (modelo MemberAdminDetailsScreen)
// ✅ Pull-to-refresh + loading + erro

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, RefreshControl } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  Surface,
  Text,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import { getAuth } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// =============================
// CONFIG: endpoints
// =============================
const ME_ENDPOINT = "/users/me";
const DASH_ENDPOINT = "/users/me/dashboard";

// =============================
// Helpers
// =============================
function safeStr(v) {
  return String(v ?? "").trim();
}

function initials(name = "") {
  const parts = safeStr(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && safeStr(v) !== "") return v;
  }
  return "";
}

function formatBRDate(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR").format(d);
  } catch {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
}

function normalizeRole(roleRaw) {
  const r = safeStr(roleRaw).toUpperCase();
  if (r.includes("OWNER")) return { label: "Owner", icon: "crown-outline" };
  if (r.includes("ADMIN")) return { label: "Administrador", icon: "shield-outline" };
  if (r.includes("LEADER")) return { label: "Líder", icon: "account-star-outline" };
  if (r.includes("OBRE") || r.includes("WORKER") || r.includes("AUX")) return { label: "Obreiro", icon: "account-hard-hat" };
  return { label: "Membro", icon: "account-outline" };
}

function normalizeStatus(statusRaw) {
  const s = safeStr(statusRaw).toLowerCase();
  const isActive = s.includes("active") || s.includes("ativo") || s.includes("ativ") || s.includes("true");
  return { label: isActive ? "Ativo" : "Inativo", isActive };
}

function meetingLabel(cell) {
  if (!cell) return "";
  const d = safeStr(cell.meetingDay);
  const t = safeStr(cell.meetingTime);
  const out = [d, t].filter(Boolean).join(" ");
  return out;
}

// =============================
// authedFetch (seu padrão)
// =============================
async function authedFetch(path, { method = "GET", body, signal } = {}, authCtx) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE_URL}${path}`;
  console.log("🌐 [authedFetch] =>", { method, url, body });

  const res = await fetch(url, {
    method,
    headers,
    signal,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  console.log("🌐 [authedFetch] <=", { status: res.status, ok: res.ok, data });

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Erro ao comunicar com o servidor (${res.status}).`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

// =============================
// UI Components (modelo)
// =============================
function Pill({ icon, label, tone = "primary" }) {
  const theme = useTheme();

  const bg =
    tone === "success"
      ? theme.colors.secondaryContainer ?? theme.colors.primaryContainer
      : tone === "danger"
      ? theme.colors.errorContainer ?? theme.colors.surfaceVariant
      : theme.colors.primaryContainer;

  const fg =
    tone === "success"
      ? theme.colors.secondary ?? theme.colors.primary
      : tone === "danger"
      ? theme.colors.error
      : theme.colors.primary;

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Icon source={icon} size={16} color={fg} />
      <Text style={{ color: fg, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Icon source={icon} size={18} color={theme.colors.onSurfaceVariant} />
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      </View>
      <Text style={{ fontWeight: "800" }} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

// =============================
// Screen
// =============================
export default function ProfileScreen({ navigation }) {
  const theme = useTheme();
  const authCtx = useAuth();

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [me, setMe] = useState(null);
  const [dash, setDash] = useState(null);

  const load = useCallback(
    async (mode = "load") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      setError("");

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);

      try {
        const [meData, dashData] = await Promise.all([
          authedFetch(ME_ENDPOINT, { signal: controller.signal }, authCtx),
          authedFetch(DASH_ENDPOINT, { signal: controller.signal }, authCtx),
        ]);

        if (!mountedRef.current) return;

        setMe(meData);
        setDash(dashData);
      } catch (e) {
        if (!mountedRef.current) return;
        const msg =
          e?.name === "AbortError"
            ? "Tempo esgotado ao carregar perfil (timeout)."
            : e?.message || "Erro ao carregar perfil.";
        setError(msg);
      } finally {
        clearTimeout(t);
        if (!mountedRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authCtx]
  );

  useEffect(() => {
    load("load");
  }, [load]);

  // =============================
  // MODELO DE DADOS (layout modelo)
  // =============================
  const member = useMemo(() => {
    const id = pickFirst(me?.id, me?.userId, authCtx?.me?.id, authCtx?.user?.id);
    const name = pickFirst(me?.name, me?.fullName, authCtx?.me?.name, authCtx?.user?.name, "Usuário");
    const photoUrl = pickFirst(me?.photoUrl, authCtx?.me?.photoUrl, authCtx?.user?.photoUrl) || null;

    const roleRaw = pickFirst(
      me?.membership?.role,
      me?.activeMembership?.role,
      me?.role,
      authCtx?.membership?.role,
      authCtx?.me?.role,
      authCtx?.role
    );

    const statusRaw = pickFirst(
      me?.membership?.status,
      me?.activeMembership?.status,
      me?.status,
      "ACTIVE"
    );

    const email = pickFirst(me?.email, authCtx?.me?.email, authCtx?.user?.email);
    const phone = pickFirst(me?.phone, me?.member?.phone, authCtx?.me?.phone);

    const birthday = pickFirst(me?.birthday, me?.birthDay, me?.birthdate, me?.birthDate);
    const address = pickFirst(me?.addressLabel, me?.address, me?.member?.addressLabel, me?.member?.address);

    const joinedAtRaw = pickFirst(me?.joinedAt, me?.createdAt, me?.member?.createdAt);
    const joinedAt = joinedAtRaw ? formatBRDate(joinedAtRaw) : "";

    const lastAccess = pickFirst(me?.lastAccess, me?.lastLoginAt, me?.lastSignInAt);

    const notes = pickFirst(me?.notes, me?.about, me?.bio);

    const roleNorm = normalizeRole(roleRaw);
    const statusNorm = normalizeStatus(statusRaw);

    const myCell = dash?.cell || null;
    const cellName = safeStr(myCell?.name);
    const cellDay = meetingLabel(myCell);

    const ministriesArr = Array.isArray(dash?.ministries) ? dash.ministries : [];
    const ministriesDetailed = ministriesArr.map((m) => ({
      id: m?.id || `${m?.name || "min"}_${Math.random()}`,
      name: m?.name || "Ministério",
      roleName: m?.roleName || null,
    }));

    const leaderCells = Array.isArray(dash?.leaderCells) ? dash.leaderCells : [];
    const viceLeaderCells = Array.isArray(dash?.viceLeaderCells) ? dash.viceLeaderCells : [];

    return {
      id: safeStr(id) || "—",
      name: safeStr(name) || "Usuário",
      photoUrl,

      role: roleNorm.label,
      roleIcon: roleNorm.icon,

      status: statusNorm.label,
      isActive: statusNorm.isActive,

      email: safeStr(email),
      phone: safeStr(phone),
      birthday: safeStr(birthday),
      address: safeStr(address),

      cell: { name: cellName, day: cellDay, raw: myCell },

      ministriesDetailed,
      leaderCells,
      viceLeaderCells,

      joinedAt,
      lastAccess: safeStr(lastAccess),

      notes: safeStr(notes),
    };
  }, [me, authCtx, dash]);

  if (loading) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: theme.colors.background, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: theme.colors.onSurfaceVariant }}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} />}
      >
        {!!error && (
          <Card mode="outlined" style={[styles.card, { borderColor: "#FFD6D6", backgroundColor: "#FFF7F7" }]}>
            <Card.Content style={{ gap: 10 }}>
              <Text style={{ fontWeight: "900" }}>Não foi possível carregar</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>{error}</Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button
                  mode="outlined"
                  style={{ flex: 1, borderRadius: 16 }}
                  contentStyle={{ height: 50 }}
                  onPress={() => navigation?.goBack?.()}
                >
                  Voltar
                </Button>
                <Button
                  mode="contained"
                  style={{ flex: 1, borderRadius: 16 }}
                  contentStyle={{ height: 50 }}
                  onPress={() => load("load")}
                >
                  Tentar novamente
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Header card */}
        <Card mode="outlined" style={[styles.headerCard, { borderColor: theme.colors.outlineVariant }]}>
          <Card.Content style={{ gap: 12 }}>
            <View style={styles.headerTop}>
              {member.photoUrl ? (
                <Avatar.Image size={64} source={{ uri: member.photoUrl }} />
              ) : (
                <Avatar.Text
                  size={64}
                  label={initials(member.name)}
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                  color={theme.colors.primary}
                />
              )}

              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={{ fontWeight: "900" }} numberOfLines={1}>
                  {member.name}
                </Text>

                <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                  ID: {member.id}
                </Text>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Pill icon={member.roleIcon || "account-star-outline"} label={member.role} />
                  <Pill
                    icon={member.isActive ? "check-circle-outline" : "close-circle-outline"}
                    label={member.status}
                    tone={member.isActive ? "success" : "danger"}
                  />
                </View>
              </View>

              <Button mode="text" icon="pencil-outline" onPress={() => navigation?.navigate?.("ProfileEdit")}>
                Editar
              </Button>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Button
                mode="contained"
                icon="pencil-outline"
                style={{ flex: 1, borderRadius: 16 }}
                contentStyle={{ height: 50 }}
                onPress={() => navigation?.navigate?.("ProfileEdit")}
              >
                Editar
              </Button>

              <Button
                mode="outlined"
                icon="lock-outline"
                style={{ flex: 1, borderRadius: 16 }}
                contentStyle={{ height: 50 }}
                onPress={() => navigation?.navigate?.("ChangePassword")}
              >
                Senha
              </Button>
            </View>

            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Seus dados + vínculos com célula, ministérios e liderança.
            </Text>
          </Card.Content>
        </Card>

        {/* Informações */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Informações
        </Text>

        <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
          <Card.Content style={{ gap: 10 }}>
            <InfoRow icon="email-outline" label="E-mail" value={member.email} />
            <Divider />
            <InfoRow icon="phone-outline" label="Telefone" value={member.phone} />
            <Divider />
            <InfoRow icon="cake-variant-outline" label="Aniversário" value={member.birthday} />
            <Divider />
            <InfoRow icon="map-marker-outline" label="Região" value={member.address} />
            <Divider />
            <InfoRow icon="calendar-outline" label="Membro desde" value={member.joinedAt} />
            <Divider />
            <InfoRow icon="clock-outline" label="Último acesso" value={member.lastAccess} />
          </Card.Content>
        </Card>

        {/* Vínculos */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Vínculos
        </Text>

        <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
          <Card.Content style={{ gap: 10 }}>
            {/* Célula */}
            <View style={styles.blockHeader}>
              <View style={[styles.blockIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="home-group" size={20} color={theme.colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                  Célula
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {member.cell?.name
                    ? `${member.cell.name}${member.cell.day ? ` • ${member.cell.day}` : ""}`
                    : "Sem célula vinculada"}
                </Text>
              </View>

              <Button
                mode="text"
                onPress={() => navigation?.navigate?.("CellsManage")}
                icon="chevron-right"
                contentStyle={{ flexDirection: "row-reverse" }}
              >
                Ver
              </Button>
            </View>

            <Divider />

            {/* Ministérios */}
            <View style={styles.blockHeader}>
              <View style={[styles.blockIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="music-note-outline" size={20} color={theme.colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                  Ministérios
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {member.ministriesDetailed?.length ? "Vínculos e escalas" : "Sem ministérios"}
                </Text>
              </View>

              <Chip
                style={{ borderRadius: 999, backgroundColor: theme.colors.secondaryContainer }}
                textStyle={{ fontWeight: "900", color: theme.colors.secondary }}
                icon="account-multiple-outline"
              >
                {member.ministriesDetailed?.length || 0}
              </Chip>
            </View>

            <View style={styles.chipsWrap}>
              {(member.ministriesDetailed?.length ? member.ministriesDetailed : [{ id: "empty", name: "—" }]).map((m) => (
                <Chip key={m.id} style={{ borderRadius: 999 }} icon="tag-outline">
                  {m.roleName ? `${m.name} • ${m.roleName}` : m.name}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Liderança */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Liderança
        </Text>

        <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
          <Card.Content style={{ gap: 10 }}>
            <View style={styles.blockHeader}>
              <View style={[styles.blockIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="account-star-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                  Células que lidera
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {member.leaderCells?.length ? "Você é líder destas células" : "Nenhuma"}
                </Text>
              </View>
              <Chip style={{ borderRadius: 999 }} icon="home-group">
                {member.leaderCells?.length || 0}
              </Chip>
            </View>

            {!!member.leaderCells?.length && (
              <View style={styles.listWrap}>
                {member.leaderCells.map((c) => (
                  <Surface
                    key={c.id}
                    elevation={0}
                    style={[styles.cellPill, { borderColor: theme.colors.outlineVariant }]}
                  >
                    <Icon source="home-group" size={16} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ fontWeight: "900" }} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                      {meetingLabel(c) || "—"}
                    </Text>
                    <Button
                      mode="text"
                      icon="chevron-right"
                      contentStyle={{ flexDirection: "row-reverse" }}
                      onPress={() => navigation?.navigate?.("CellDetails", { id: c.id })}
                    >
                      Abrir
                    </Button>
                  </Surface>
                ))}
              </View>
            )}

            <Divider />

            <View style={styles.blockHeader}>
              <View style={[styles.blockIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="account-star-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                  Células que é vice
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {member.viceLeaderCells?.length ? "Você é vice-líder destas células" : "Nenhuma"}
                </Text>
              </View>
              <Chip style={{ borderRadius: 999 }} icon="home-group">
                {member.viceLeaderCells?.length || 0}
              </Chip>
            </View>

            {!!member.viceLeaderCells?.length && (
              <View style={styles.listWrap}>
                {member.viceLeaderCells.map((c) => (
                  <Surface
                    key={c.id}
                    elevation={0}
                    style={[styles.cellPill, { borderColor: theme.colors.outlineVariant }]}
                  >
                    <Icon source="home-group" size={16} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ fontWeight: "900" }} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                      {meetingLabel(c) || "—"}
                    </Text>
                    <Button
                      mode="text"
                      icon="chevron-right"
                      contentStyle={{ flexDirection: "row-reverse" }}
                      onPress={() => navigation?.navigate?.("CellDetails", { id: c.id })}
                    >
                      Abrir
                    </Button>
                  </Surface>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Observações */}
        {!!member.notes && (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Observações
            </Text>

            <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
              <Card.Content style={{ gap: 8 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                  {member.notes}
                </Text>
              </Card.Content>
            </Card>
          </>
        )}

        {/* Ações */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Ações
        </Text>

        <Surface
          style={[
            styles.adminActions,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
          elevation={0}
        >
          <View style={{ gap: 10 }}>
            <Button
              mode="contained-tonal"
              icon="refresh"
              onPress={() => load("refresh")}
              style={{ borderRadius: 16 }}
              contentStyle={{ height: 50 }}
            >
              Atualizar dados
            </Button>

            <Button
              mode="outlined"
              icon="logout"
              onPress={() => authCtx?.signOut?.()}
              style={{ borderRadius: 16 }}
              contentStyle={{ height: 50 }}
            >
              Sair
            </Button>
          </View>
        </Surface>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, paddingBottom: 28 },

  headerCard: { borderRadius: 22 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  actionsRow: { flexDirection: "row", gap: 12 },

  sectionTitle: { marginTop: 16, marginBottom: 10, fontWeight: "900" },

  card: { borderRadius: 18 },

  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },

  blockHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  blockIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },

  adminActions: { borderWidth: 1, borderRadius: 18, padding: 14 },

  listWrap: { gap: 10, marginTop: 6 },
  cellPill: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
});
