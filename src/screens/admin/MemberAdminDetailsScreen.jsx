// src/screens/admin/MemberAdminDetailsScreen.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
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

import { useAuth } from "../../context/AuthContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY = "#1A2366";
const BRAND_BLUE = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const SUCCESS = "#2DBF8A";
const SUCCESS_BG = "#E8F9F3";
const DANGER = "#E84D4D";
const DANGER_BG = "#FEECEC";
const WARNING = "#F5A623";
const WARNING_BG = "#FEF5E7";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeStr(v) { return String(v ?? "").trim(); }

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

function formatBRDate(v) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return new Intl.DateTimeFormat("pt-BR").format(d);
  } catch { return String(v); }
}

function formatBirthday(v) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(d);
  } catch { return String(v); }
}

function normalizeRole(roleRaw) {
  const r = safeStr(roleRaw).toUpperCase();
  if (r.includes("OWNER"))
    return { label: "Owner", icon: "crown-outline", color: WARNING, bg: WARNING_BG };
  if (r.includes("ADMIN"))
    return { label: "Administrador", icon: "shield-outline", color: BRAND_BLUE, bg: BRAND_LIGHT };
  if (r.includes("LEADER") || r.includes("LIDER") || r.includes("LÍDER"))
    return { label: "Líder", icon: "account-star-outline", color: SUCCESS, bg: SUCCESS_BG };
  if (r.includes("OBRE") || r.includes("WORKER") || r.includes("AUX"))
    return { label: "Obreiro", icon: "account-hard-hat", color: WARNING, bg: WARNING_BG };
  if (r.includes("PASTOR"))
    return { label: "Pastor", icon: "account-tie-outline", color: BRAND_BLUE, bg: BRAND_LIGHT };
  return { label: safeStr(roleRaw) || "Membro", icon: "account-outline", color: BRAND_BLUE, bg: BRAND_LIGHT };
}

function normalizeStatus(statusRaw) {
  const s = safeStr(statusRaw).toLowerCase();
  const isActive = s.includes("active") || s.includes("ativo") || s.includes("ativ") || s.includes("approved");
  const isPending = s.includes("pending") || s.includes("pendente") || s.includes("waiting");
  if (isActive) return { label: "Ativo", isActive: true, isPending: false, color: SUCCESS, bg: SUCCESS_BG };
  if (isPending) return { label: "Pendente", isActive: false, isPending: true, color: WARNING, bg: WARNING_BG };
  return { label: "Inativo", isActive: false, isPending: false, color: DANGER, bg: DANGER_BG };
}

function meetingLabel(cell) {
  if (!cell) return "";
  const d = safeStr(cell.meetingDay || cell.day || cell.weekDay || "");
  const t = safeStr(cell.meetingTime || cell.time || cell.hour || "");
  return [d, t].filter(Boolean).join(" • ");
}

function getMembersArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.members)) return data.members;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function buildAddress(obj) {
  const street = pickFirst(obj?.street, obj?.addressStreet);
  const number = pickFirst(obj?.number, obj?.addressNumber);
  const neighborhood = pickFirst(obj?.neighborhood, obj?.district, obj?.addressNeighborhood);
  const city = pickFirst(obj?.city, obj?.addressCity);
  const streetPart = [street, number].filter(Boolean).join(", ");
  const regionPart = [neighborhood, city].filter(Boolean).join(" • ");
  return [streetPart, regionPart].filter(Boolean).join(" — ");
}

function normalizeMinistries(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((m, i) => {
    if (typeof m === "string") return { id: `${m}_${i}`, name: m, roleName: null };
    return {
      id: m?.id || m?.ministryId || `${m?.name || "min"}_${i}`,
      name: m?.name || m?.ministryName || "Ministério",
      roleName: m?.roleName || m?.role || m?.position || null,
    };
  });
}

function normalizeMember(raw) {
  const user = raw?.user || {};
  const profile = raw?.profile || {};
  const churchMember = raw?.churchMember || raw?.churchLink || {};
  const membership = raw?.membership || raw?.activeMembership || {};

  const id = pickFirst(raw?.id, raw?.memberId, churchMember?.id, membership?.id, user?.id);
  const userId = pickFirst(raw?.userId, user?.id, churchMember?.userId, membership?.userId);
  const name = pickFirst(raw?.name, raw?.fullName, raw?.displayName, user?.name, user?.displayName, profile?.name, "Membro sem nome");
  const email = pickFirst(raw?.email, user?.email, profile?.email);
  const phone = pickFirst(raw?.phone, raw?.whatsapp, raw?.cellphone, user?.phone, profile?.phone);
  const photoUrl = pickFirst(raw?.photoUrl, raw?.photoURL, raw?.avatarUrl, user?.photoUrl, user?.photoURL, profile?.photoUrl) || null;

  const roleRaw = pickFirst(raw?.role, raw?.churchRole, churchMember?.role, membership?.role, user?.role);
  const statusRaw = pickFirst(raw?.status, raw?.churchStatus, churchMember?.status, membership?.status, "ACTIVE");
  const birthdayRaw = pickFirst(raw?.birthday, raw?.birthDay, raw?.birthdate, raw?.birthDate, user?.birthday, profile?.birthday);
  const joinedAtRaw = pickFirst(raw?.joinedAt, raw?.createdAt, churchMember?.createdAt, membership?.createdAt);
  const lastAccessRaw = pickFirst(raw?.lastAccess, raw?.lastLoginAt, raw?.lastSignInAt, user?.lastAccess, user?.lastLoginAt);
  const address = pickFirst(raw?.addressLabel, raw?.address, buildAddress(raw), buildAddress(user), buildAddress(profile));

  const roleNorm = normalizeRole(roleRaw);
  const statusNorm = normalizeStatus(statusRaw);

  return {
    ...raw,
    id: safeStr(id) || "—",
    userId: safeStr(userId) || "",
    name: safeStr(name) || "Membro sem nome",
    photoUrl,
    role: roleNorm.label,
    roleIcon: roleNorm.icon,
    roleColor: roleNorm.color,
    roleBg: roleNorm.bg,
    isActive: statusNorm.isActive,
    isPending: statusNorm.isPending,
    status: statusNorm.label,
    statusColor: statusNorm.color,
    statusBg: statusNorm.bg,
    email: safeStr(email),
    phone: safeStr(phone),
    birthday: formatBirthday(birthdayRaw),
    address: safeStr(address),
    ministriesDetailed: normalizeMinistries(raw?.ministries || raw?.ministriesDetailed || []),
    joinedAt: formatBRDate(joinedAtRaw),
    lastAccess: formatBRDate(lastAccessRaw),
    notes: safeStr(pickFirst(raw?.notes, raw?.about, raw?.bio, raw?.observation)),
  };
}

function resolveCellRole(cell, memberUserId, memberId) {
  const isLeader = cell?.leader?.userId === memberUserId || cell?.leaderId === memberId;
  const isViceLeader = cell?.viceLeader?.userId === memberUserId || cell?.viceLeaderId === memberId;
  if (isLeader) return { label: "Líder", color: SUCCESS, bg: SUCCESS_BG };
  if (isViceLeader) return { label: "Vice-líder", color: WARNING, bg: WARNING_BG };
  return { label: "Membro", color: BRAND_BLUE, bg: BRAND_LIGHT };
}

// ─── SectionHeader com contador ───────────────────────────────────────────────
function SectionHeader({ title, count, countColor, countBg }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <View style={[styles.sectionCount, { backgroundColor: countBg || BRAND_LIGHT }]}>
          <Text style={[styles.sectionCountText, { color: countColor || BRAND_BLUE }]}>
            {count}
          </Text>
        </View>
      )}
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
        <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

// ─── CellItem ─────────────────────────────────────────────────────────────────
function CellItem({ cell, cellRole, navigation, tc, isLast }) {
  return (
    <TouchableRipple
      onPress={() => navigation?.navigate?.("CellDetails", { id: cell.id, cellId: cell.id, cell })}
      style={{ overflow: "hidden" }}
    >
      <View style={[styles.listItem, isLast && { borderBottomWidth: 0 }]}>
        <View style={[styles.listItemIcon, { backgroundColor: cellRole.bg }]}>
          <Icon source="home-group" size={16} color={cellRole.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.listItemTitle} numberOfLines={1}>{cell.name}</Text>
          {!!meetingLabel(cell) && (
            <Text style={[styles.listItemSub, { color: tc.muted }]} numberOfLines={1}>
              {meetingLabel(cell)}
            </Text>
          )}
        </View>
        <View style={[styles.rolePill, { backgroundColor: cellRole.bg }]}>
          <Text style={[styles.rolePillText, { color: cellRole.color }]}>
            {cellRole.label}
          </Text>
        </View>
        <Icon source="chevron-right" size={16} color={tc.muted} />
      </View>
    </TouchableRipple>
  );
}

// ─── MinistryItem ─────────────────────────────────────────────────────────────
function MinistryItem({ ministry, tc, isLast }) {
  return (
    <View style={[styles.listItem, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.listItemIcon, { backgroundColor: BRAND_LIGHT }]}>
        <Icon source="music-note-outline" size={16} color={BRAND_BLUE} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.listItemTitle} numberOfLines={1}>{ministry.name}</Text>
        {!!ministry.roleName && (
          <Text style={[styles.listItemSub, { color: tc.muted }]} numberOfLines={1}>
            {ministry.roleName}
          </Text>
        )}
      </View>
      {!!ministry.roleName && (
        <View style={[styles.rolePill, { backgroundColor: BRAND_LIGHT }]}>
          <Text style={[styles.rolePillText, { color: BRAND_BLUE }]}>
            {ministry.roleName}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── ActionRow ────────────────────────────────────────────────────────────────
function ActionRow({ icon, iconColor, iconBg, label, labelColor, onPress, tc }) {
  return (
    <TouchableRipple onPress={onPress} style={styles.actionRow}>
      <View style={styles.actionRowInner}>
        <View style={[styles.bindIcon, { backgroundColor: iconBg }]}>
          <Icon source={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.actionLabel, labelColor ? { color: labelColor } : {}]}>
          {label}
        </Text>
        <Icon source="chevron-right" size={18} color={labelColor || tc.muted} />
      </View>
    </TouchableRipple>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ icon, message, tc }) {
  return (
    <View style={styles.emptyState}>
      <Icon source={icon} size={24} color={tc.muted} />
      <Text style={[styles.emptyText, { color: tc.muted }]}>{message}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MemberAdminDetailsScreen({ navigation, route }) {
  const theme = useTheme();
  const { apiFetchAuth } = useAuth();

  const tc = useMemo(() => ({
    surface: theme.colors.surface,
    bg: theme.colors.background,
    outline: theme.colors.outlineVariant,
    text: theme.colors.onSurface,
    muted: theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
  }), [theme]);

  const { id, memberId, userId, member: routeMember } = route.params || {};
  const targetId = id || memberId || userId || routeMember?.id || routeMember?.userId;

  const [member, setMember] = useState(routeMember ? normalizeMember(routeMember) : null);
  const [memberCells, setMemberCells] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(!routeMember);
  const [errorMsg, setErrorMsg] = useState("");

  // ─── Load ──────────────────────────────────────────────────────────────────
  const loadMember = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      let baseMember = null;
      if (routeMember) {
        baseMember = normalizeMember(routeMember);
      } else {
        const data = await apiFetchAuth("/users/members", { method: "GET" });
        const members = getMembersArray(data).map(normalizeMember);
        baseMember = members.find((m) =>
          String(m.id) === String(targetId) ||
          String(m.memberId) === String(targetId) ||
          String(m.userId) === String(targetId)
        );
        if (!baseMember) throw new Error("Membro não encontrado na igreja.");
      }

      // Busca dados completos com endereço
      const memberUserId = baseMember?.userId || baseMember?.id;
      let fullUserData = null;

      if (memberUserId) {
        fullUserData = await apiFetchAuth(
          `/users/members/${encodeURIComponent(memberUserId)}/full`,
          { method: "GET" }
        ).catch((e) => {
          console.log("🟨 [MemberAdminDetails] /members/:id/full falhou:", e?.message);
          return null;
        });

        console.log("🟩 [MemberAdminDetails] fullUserData:", JSON.stringify(fullUserData));
      }

      // Mescla endereço e dados completos no baseMember
      if (fullUserData) {
        baseMember = normalizeMember({
          ...baseMember,
          email: fullUserData.email ?? baseMember.email,
          phone: fullUserData.phone ?? baseMember.phone,
          street: fullUserData.street,
          number: fullUserData.number,
          neighborhood: fullUserData.neighborhood,
          city: fullUserData.city,
          notes: fullUserData.notes ?? fullUserData.about ?? baseMember.notes,
        });
      }

      setMember(baseMember);

      const churchId = pickFirst(
        baseMember?.churchId,
        baseMember?.activeMembership?.churchId,
        baseMember?.membership?.churchId,
        baseMember?.activeChurchId
      );

      if (!churchId || !memberUserId) return;

      const [cellsData, ministriesData] = await Promise.all([
        apiFetchAuth(`/cells?churchId=${encodeURIComponent(churchId)}`, { method: "GET" }).catch(() => null),
        apiFetchAuth(`/churches/${encodeURIComponent(churchId)}/ministries?take=50`, { method: "GET" }).catch(() => null),
      ]);

      const allCells =
        Array.isArray(cellsData) ? cellsData :
          Array.isArray(cellsData?.cells) ? cellsData.cells :
            Array.isArray(cellsData?.data) ? cellsData.data :
              [];

      const cellsWithRole = [];
      await Promise.all(
        allCells.map(async (cell) => {
          const isLeader = cell?.leader?.userId === memberUserId;
          const isViceLeader = cell?.viceLeader?.userId === memberUserId;

          if (isLeader || isViceLeader) {
            cellsWithRole.push({ cell, role: resolveCellRole(cell, memberUserId, null) });
            return;
          }

          try {
            const membersData = await apiFetchAuth(
              `/cells/${cell.id}/members`, { method: "GET" }
            ).catch(() => null);
            const membersArr =
              Array.isArray(membersData) ? membersData :
                Array.isArray(membersData?.members) ? membersData.members :
                  Array.isArray(membersData?.data) ? membersData.data :
                    [];
            const found = membersArr.find((m) =>
              m?.userId === memberUserId || m?.user?.id === memberUserId
            );
            if (found) cellsWithRole.push({
              cell, role: resolveCellRole(cell, memberUserId, found?.id),
            });
          } catch { /* silencioso */ }
        })
      );

      const roleOrder = { "Líder": 0, "Vice-líder": 1, "Membro": 2 };
      cellsWithRole.sort((a, b) => (roleOrder[a.role.label] ?? 3) - (roleOrder[b.role.label] ?? 3));
      setMemberCells(cellsWithRole);

      const allMinistries =
        Array.isArray(ministriesData?.items) ? ministriesData.items :
          Array.isArray(ministriesData) ? ministriesData :
            [];

      const ministryDetails = await Promise.all(
        allMinistries.slice(0, 15).map((m) =>
          apiFetchAuth(
            `/churches/${encodeURIComponent(churchId)}/ministries/${m.id}/members`,
            { method: "GET" }
          ).catch(() => null)
        )
      );

      const myMinistries = [];
      allMinistries.slice(0, 15).forEach((ministry, idx) => {
        const detail = ministryDetails[idx];
        const membersArr =
          Array.isArray(detail?.items) ? detail.items :
            Array.isArray(detail) ? detail :
              [];
        const found = membersArr.find((x) =>
          x?.userId === memberUserId || x?.user?.id === memberUserId
        );
        if (found) {
          myMinistries.push({
            id: ministry.id,
            name: ministry.name,
            roleName: found?.roleName || found?.role || null,
          });
        }
      });

      setMinistries(myMinistries);

    } catch (e) {
      setErrorMsg(e?.message || "Não foi possível carregar os dados do membro.");
    } finally {
      setLoading(false);
    }
  }, [apiFetchAuth, routeMember, targetId]);

  useEffect(() => { loadMember(); }, [loadMember]);

  function handleWhatsApp() {
    const raw = String(member?.phone || "").replace(/\D/g, "");
    if (!raw) return;
    const phone = raw.startsWith("55") ? raw : `55${raw}`;
    Linking.openURL(`https://wa.me/${phone}`).catch(console.warn);
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: tc.bg }]}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={[styles.loadingText, { color: tc.muted }]}>
          Carregando dados do membro...
        </Text>
      </View>
    );
  }

  // ─── Not found ─────────────────────────────────────────────────────────────
  if (!member) {
    return (
      <View style={[styles.center, { backgroundColor: tc.bg }]}>
        <View style={[styles.bindIcon, { backgroundColor: DANGER_BG, width: 56, height: 56, borderRadius: 18 }]}>
          <Icon source="account-alert-outline" size={28} color={DANGER} />
        </View>
        <Text style={[styles.notFoundTitle, { color: DANGER }]}>Membro não encontrado</Text>
        {!!errorMsg && <Text style={[styles.notFoundSub, { color: tc.muted }]}>{errorMsg}</Text>}
        <TouchableRipple onPress={() => navigation.goBack()} borderless style={styles.backBtn}>
          <View style={styles.backBtnInner}>
            <Icon source="arrow-left" size={16} color={NAVY} />
            <Text style={styles.backBtnText}>Voltar</Text>
          </View>
        </TouchableRipple>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tc.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Erro inline ── */}
        {!!errorMsg && (
          <Surface elevation={0} style={[styles.errorCard, { backgroundColor: DANGER_BG, borderColor: DANGER }]}>
            <View style={styles.errorContent}>
              <Icon source="alert-circle-outline" size={20} color={DANGER} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Erro ao carregar</Text>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
              <TouchableRipple onPress={loadMember} borderless style={styles.errorBtn}>
                <Text style={styles.errorBtnText}>Tentar</Text>
              </TouchableRipple>
            </View>
          </Surface>
        )}

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={[styles.blob, { width: 200, height: 200, top: -60, right: -50 }]} />
          <View style={[styles.blob, { width: 130, height: 130, bottom: -70, left: -35, opacity: 0.05 }]} />

          <View style={styles.heroContent}>
            {member.photoUrl ? (
              <Avatar.Image size={68} source={{ uri: member.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials(member.name)}</Text>
              </View>
            )}
            <Text style={styles.heroName} numberOfLines={1}>{member.name}</Text>
            <Text style={styles.heroId}>ID: {member.id}</Text>
            <View style={styles.heroPills}>
              <View style={[styles.heroPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Icon source={member.roleIcon} size={13} color="#fff" />
                <Text style={styles.heroPillText}>{member.role}</Text>
              </View>
              <View style={[styles.heroPill, {
                backgroundColor: member.isActive
                  ? "rgba(45,191,138,0.25)"
                  : member.isPending
                    ? "rgba(245,166,35,0.25)"
                    : "rgba(232,77,77,0.25)",
              }]}>
                <View style={[styles.pillDot, {
                  backgroundColor: member.isActive ? SUCCESS : member.isPending ? WARNING : DANGER,
                }]} />
                <Text style={styles.heroPillText}>{member.status}</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroActions}>
            <TouchableRipple
              onPress={() => navigation.navigate("MemberForm", {
                id: member.id, memberId: member.id, userId: member.userId, member,
              })}
              borderless style={styles.heroBtn}
            >
              <View style={styles.heroBtnInner}>
                <Icon source="pencil-outline" size={14} color={NAVY} />
                <Text style={styles.heroBtnText}>Editar</Text>
              </View>
            </TouchableRipple>

            <TouchableRipple
              onPress={handleWhatsApp}
              borderless
              style={[styles.heroSecBtn, !member.phone && { opacity: 0.4 }]}
              disabled={!member.phone}
            >
              <View style={styles.heroSecBtnInner}>
                <Icon source="whatsapp" size={14} color="#fff" />
                <Text style={styles.heroSecBtnText}>WhatsApp</Text>
              </View>
            </TouchableRipple>
          </View>
        </View>

        {/* ── Informações ── */}
        <SectionHeader title="Informações" />
        <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
          <InfoRow icon="email-outline" label="E-mail" value={member.email} color={BRAND_BLUE} bg={BRAND_LIGHT} tc={tc} />
          {!!member.email && !!member.phone && <Divider style={styles.divider} />}
          <InfoRow icon="phone-outline" label="Telefone" value={member.phone} color={SUCCESS} bg={SUCCESS_BG} tc={tc} />
          {!!member.phone && !!member.birthday && <Divider style={styles.divider} />}
          <InfoRow icon="cake-variant-outline" label="Aniversário" value={member.birthday} color={WARNING} bg={WARNING_BG} tc={tc} />
          {!!member.birthday && !!member.address && <Divider style={styles.divider} />}
          <InfoRow icon="map-marker-outline" label="Endereço" value={member.address} color={DANGER} bg={DANGER_BG} tc={tc} />
          {!!member.address && !!member.joinedAt && <Divider style={styles.divider} />}
          <InfoRow icon="calendar-outline" label="Membro desde" value={member.joinedAt} color={BRAND_BLUE} bg={BRAND_LIGHT} tc={tc} />
          {!!member.joinedAt && !!member.lastAccess && <Divider style={styles.divider} />}
          <InfoRow icon="clock-outline" label="Último acesso" value={member.lastAccess} color={BRAND_BLUE} bg={BRAND_LIGHT} tc={tc} />
        </Surface>

        {/* ── Células ── */}
        <SectionHeader
          title="Células"
          count={memberCells.length}
          countColor={SUCCESS}
          countBg={SUCCESS_BG}
        />
        <Surface
          elevation={0}
          style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline, padding: 0, overflow: "hidden" }]}
        >
          {memberCells.length === 0 ? (
            <EmptyState icon="home-group" message="Sem células vinculadas" tc={tc} />
          ) : (
            memberCells.map(({ cell, role }, i) => (
              <CellItem
                key={cell.id}
                cell={cell}
                cellRole={role}
                navigation={navigation}
                tc={tc}
                isLast={i === memberCells.length - 1}
              />
            ))
          )}
        </Surface>

        {/* ── Ministérios ── */}
        <SectionHeader
          title="Ministérios"
          count={ministries.length}
          countColor={BRAND_BLUE}
          countBg={BRAND_LIGHT}
        />
        <Surface
          elevation={0}
          style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline, padding: 0, overflow: "hidden" }]}
        >
          {ministries.length === 0 ? (
            <EmptyState icon="music-note-outline" message="Sem ministérios vinculados" tc={tc} />
          ) : (
            ministries.map((m, i) => (
              <MinistryItem
                key={m.id}
                ministry={m}
                tc={tc}
                isLast={i === ministries.length - 1}
              />
            ))
          )}
        </Surface>

        {/* ── Observações ── */}
        {!!member.notes && (
          <>
            <SectionHeader title="Observações" />
            <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
              <Text style={[styles.notesText, { color: tc.muted }]}>{member.notes}</Text>
            </Surface>
          </>
        )}

        {/* ── Ações administrativas ── */}
        <SectionHeader title="Ações administrativas" />
        <Surface elevation={0} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
          <ActionRow icon="refresh" iconColor={BRAND_BLUE} iconBg={BRAND_LIGHT} label="Atualizar dados" onPress={loadMember} tc={tc} />
          <Divider style={styles.divider} />
          <ActionRow icon="pencil-outline" iconColor={SUCCESS} iconBg={SUCCESS_BG} label="Editar membro"
            onPress={() => navigation.navigate("MemberForm", { id: member.id, memberId: member.id, userId: member.userId, member })}
            tc={tc}
          />
          <Divider style={styles.divider} />
          <ActionRow icon="lock-reset" iconColor={WARNING} iconBg={WARNING_BG} label="Enviar redefinição de senha" onPress={() => { }} tc={tc} />
          <Divider style={styles.divider} />
          <ActionRow
            icon={member.isActive ? "account-off-outline" : "account-check-outline"}
            iconColor={member.isActive ? DANGER : SUCCESS}
            iconBg={member.isActive ? DANGER_BG : SUCCESS_BG}
            label={member.isActive ? "Inativar membro" : "Reativar membro"}
            labelColor={member.isActive ? DANGER : SUCCESS}
            onPress={() => { }}
            tc={tc}
          />
        </Surface>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },

  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  loadingText: { marginTop: 12, fontSize: 14 },
  notFoundTitle: { fontSize: 18, fontWeight: "900", textAlign: "center", marginTop: 8 },
  notFoundSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  backBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  backBtnInner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: "#E4E6F0",
  },
  backBtnText: { fontSize: 13, fontWeight: "800", color: NAVY },

  // ── Erro
  errorCard: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 14 },
  errorContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  errorTitle: { fontSize: 13, fontWeight: "900", color: DANGER },
  errorText: { fontSize: 12, color: DANGER, marginTop: 2, lineHeight: 16 },
  errorBtn: { borderRadius: 999, overflow: "hidden", backgroundColor: "#fff" },
  errorBtnText: { paddingHorizontal: 12, paddingVertical: 7, fontSize: 12, fontWeight: "900", color: DANGER },

  // ── Hero
  hero: {
    backgroundColor: NAVY, borderRadius: 28, overflow: "hidden",
    position: "relative", marginBottom: 22,
    ...Platform.select({
      ios: { shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  heroContent: { alignItems: "center", paddingTop: 28, paddingBottom: 20, paddingHorizontal: 20, zIndex: 2 },
  avatarFallback: { width: 68, height: 68, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatar: { marginBottom: 12 },
  avatarInitials: { fontSize: 26, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  heroName: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: -0.5, textAlign: "center" },
  heroId: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 3 },
  heroPills: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap", justifyContent: "center" },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  heroPillText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  pillDot: { width: 6, height: 6, borderRadius: 999 },
  heroActions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 20, zIndex: 2 },
  heroBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  heroBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fff", paddingVertical: 10, borderRadius: 14 },
  heroBtnText: { fontSize: 13, fontWeight: "800", color: NAVY },
  heroSecBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  heroSecBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)", paddingVertical: 10, borderRadius: 14 },
  heroSecBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // ── Section header com contador
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.3,
  },
  sectionCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "900",
  },

  // ── Card genérico
  card: {
    borderWidth: 1, borderRadius: 20, padding: 16,
    ...Platform.select({
      ios: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },

  divider: { marginVertical: 10 },

  // ── InfoRow
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  infoValue: { fontSize: 14, fontWeight: "700", color: NAVY, marginTop: 1 },

  // ── Bind (ações)
  bindIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },

  // ── List item (célula / ministério)
  listItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: "#E4E6F0",
  },
  listItemIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  listItemTitle: { fontSize: 13, fontWeight: "800", color: NAVY, letterSpacing: -0.1 },
  listItemSub: { fontSize: 11, marginTop: 1, lineHeight: 15 },

  // ── Role pill
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, flexShrink: 0 },
  rolePillText: { fontSize: 11, fontWeight: "800" },

  // ── Empty state
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 6 },
  emptyText: { fontSize: 13, fontWeight: "600" },

  // ── Observações
  notesText: { fontSize: 14, lineHeight: 21 },

  // ── Action rows
  actionRow: { borderRadius: 8, overflow: "hidden" },
  actionRowInner: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: NAVY },
});