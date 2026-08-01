// src/screens/admin/MembersManageScreen.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
  Image,
} from "react-native";
import {
  ActivityIndicator,
  Icon,
  Surface,
  Text,
  TextInput,
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
function safeStr(v) {
  return String(v ?? "").trim();
}

function isHttpUrl(value) {
  return /^https?:\/\/\S+/i.test(safeStr(value));
}

function initials(name = "") {
  const parts = safeStr(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";

  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";

  return (first + last).toUpperCase();
}

function getMembersArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.members)) return data.members;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function pickBirthDate(raw, user, profile) {
  const fields = [
    raw?.birthDate,
    raw?.birth_date,
    raw?.birthday,
    raw?.dateOfBirth,
    raw?.dataNascimento,
    raw?.nascimento,

    user?.birthDate,
    user?.birth_date,
    user?.birthday,
    user?.dateOfBirth,
    user?.dataNascimento,

    profile?.birthDate,
    profile?.birth_date,
    profile?.birthday,
    profile?.dateOfBirth,
    profile?.dataNascimento,
  ];

  return fields.find((v) => v !== undefined && v !== null && safeStr(v) !== "") ?? null;
}

function formatBirthdayBR(value) {
  if (!value) return "";

  const raw = safeStr(value);

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}`;

  const br = raw.match(/^(\d{2})\/(\d{2})(?:\/\d{4})?$/);
  if (br) return `${br[1]}/${br[2]}`;

  const d = new Date(raw);

  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  return "";
}

function normalizeStatus(raw) {
  const s = safeStr(raw).toLowerCase();

  if (s.includes("activ") || s.includes("ativ") || s === "approved") return "ACTIVE";
  if (s.includes("pend") || s.includes("waiting") || s.includes("aguard")) return "PENDING";
  if (s.includes("inact") || s.includes("inativ") || s === "disabled" || s === "blocked") return "INACTIVE";

  return "ACTIVE";
}

function normalizeRole(raw) {
  const r = safeStr(raw).toUpperCase();

  if (r.includes("OWNER")) {
    return {
      label: "Owner",
      color: DANGER,
      bg: DANGER_BG,
    };
  }

  if (r.includes("ADMIN")) {
    return {
      label: "Administrador",
      color: BRAND_BLUE,
      bg: BRAND_LIGHT,
    };
  }

  if (r.includes("LEADER") || r.includes("LIDER") || r.includes("LÍDER")) {
    return {
      label: "Líder",
      color: SUCCESS,
      bg: SUCCESS_BG,
    };
  }

  if (r.includes("PASTOR")) {
    return {
      label: "Pastor",
      color: BRAND_BLUE,
      bg: BRAND_LIGHT,
    };
  }

  if (r.includes("OBRE") || r.includes("WORKER")) {
    return {
      label: "Obreiro",
      color: WARNING,
      bg: WARNING_BG,
    };
  }

  return {
    label: "Membro",
    color: BRAND_BLUE,
    bg: BRAND_LIGHT,
  };
}

function pickPhotoUrl(raw, user, profile) {
  return (
    safeStr(raw?.photoUrl) ||
    safeStr(raw?.photoURL) ||
    safeStr(raw?.avatarUrl) ||
    safeStr(raw?.imageUrl) ||
    safeStr(raw?.profileImageUrl) ||
    safeStr(raw?.profilePhotoUrl) ||
    safeStr(raw?.picture) ||
    safeStr(raw?.pictureUrl) ||

    safeStr(user?.photoUrl) ||
    safeStr(user?.photoURL) ||
    safeStr(user?.avatarUrl) ||
    safeStr(user?.imageUrl) ||
    safeStr(user?.profileImageUrl) ||
    safeStr(user?.profilePhotoUrl) ||
    safeStr(user?.picture) ||
    safeStr(user?.pictureUrl) ||

    safeStr(profile?.photoUrl) ||
    safeStr(profile?.photoURL) ||
    safeStr(profile?.avatarUrl) ||
    safeStr(profile?.imageUrl) ||
    safeStr(profile?.profileImageUrl) ||
    safeStr(profile?.profilePhotoUrl) ||
    safeStr(profile?.picture) ||
    safeStr(profile?.pictureUrl) ||
    ""
  );
}

function normalizeMember(raw) {
  const user = raw?.user || {};
  const profile = raw?.profile || {};
  const churchMember = raw?.churchMember || raw?.churchLink || {};

  const id =
    raw?.id ||
    raw?.memberId ||
    raw?.member?.id ||
    churchMember?.id ||
    user?.id ||
    String(Math.random());

  const userId =
    raw?.userId ||
    raw?.user_id ||
    user?.id ||
    churchMember?.userId ||
    raw?.member?.userId ||
    null;

  const name =
    raw?.name ||
    raw?.fullName ||
    raw?.displayName ||
    raw?.member?.fullName ||
    raw?.member?.name ||
    user?.name ||
    user?.displayName ||
    profile?.name ||
    "Membro sem nome";

  const email =
    raw?.email ||
    user?.email ||
    profile?.email ||
    raw?.member?.email ||
    null;

  const phone =
    raw?.phone ||
    raw?.whatsapp ||
    user?.phone ||
    profile?.phone ||
    raw?.member?.phone ||
    null;

  const photoUrl = pickPhotoUrl(raw, user, profile);

  const birthDate = pickBirthDate(raw, user, profile);
  const birthDateLabel = formatBirthdayBR(birthDate);

  const roleRaw =
    raw?.role ||
    raw?.churchRole ||
    churchMember?.role ||
    user?.role ||
    raw?.member?.role ||
    "";

  const statusRaw =
    raw?.status ||
    raw?.churchStatus ||
    churchMember?.status ||
    raw?.member?.status ||
    (raw?.isActive === false || raw?.active === false ? "INACTIVE" : "ACTIVE");

  const roleNorm = normalizeRole(roleRaw);
  const statusKey = normalizeStatus(statusRaw);

  const statusMap = {
    ACTIVE: {
      label: "Ativo",
      color: SUCCESS,
      bg: SUCCESS_BG,
    },
    PENDING: {
      label: "Pendente",
      color: WARNING,
      bg: WARNING_BG,
    },
    INACTIVE: {
      label: "Inativo",
      color: DANGER,
      bg: DANGER_BG,
    },
  };

  const statusNorm = statusMap[statusKey] || statusMap.ACTIVE;

  return {
    ...raw,
    id,
    userId,
    name,
    fullName: name,
    email,
    phone,
    photoUrl,
    birthDate,
    birthDateLabel,
    role: roleNorm.label,
    roleColor: roleNorm.color,
    roleBg: roleNorm.bg,
    status: statusNorm.label,
    statusColor: statusNorm.color,
    statusBg: statusNorm.bg,
    isActive: statusKey === "ACTIVE",
    isPending: statusKey === "PENDING",
  };
}

// ─── AvatarCircle ─────────────────────────────────────────────────────────────
function AvatarCircle({ name, photoUrl, size = 48 }) {
  const radius = size * 0.3;
  const cleanPhotoUrl = safeStr(photoUrl);

  if (isHttpUrl(cleanPhotoUrl)) {
    return (
      <View
        style={[
          styles.avatarImageWrap,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
        ]}
      >
        <Image
          source={{ uri: cleanPhotoUrl }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
          }}
          resizeMode="cover"
          onError={(e) => {
            console.log("🟥 [MembersManageScreen] erro ao carregar foto do membro:", {
              name,
              photoUrl: cleanPhotoUrl,
              error: e?.nativeEvent,
            });
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.avatarInitials, { fontSize: size * 0.34 }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

// ─── MemberCard ───────────────────────────────────────────────────────────────
function MemberCard({ item, onPress, tc }) {
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.outline }]}
    >
      <View style={styles.cardInner}>
        <AvatarCircle name={item.name} photoUrl={item.photoUrl} size={48} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.memberName} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.metaRow}>
            <View style={[styles.rolePill, { backgroundColor: item.roleBg }]}>
              <Text style={[styles.rolePillText, { color: item.roleColor }]}>
                {item.role}
              </Text>
            </View>

            {!!item.birthDateLabel && (
              <View style={styles.birthRow}>
                <Icon source="cake-variant-outline" size={12} color="#9198B5" />
                <Text style={styles.birthText}>{item.birthDateLabel}</Text>
              </View>
            )}
          </View>

          {!!(item.email || item.phone) && (
            <Text style={styles.memberContact} numberOfLines={1}>
              {item.email || item.phone}
            </Text>
          )}
        </View>

        <View style={styles.rightCol}>
          <View style={[styles.statusDot, { backgroundColor: item.statusColor }]} />
          <Icon source="chevron-right" size={18} color={tc.muted} />
        </View>
      </View>
    </TouchableRipple>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MembersManageScreen({ navigation }) {
  const theme = useTheme();
  const { apiFetchAuth } = useAuth();

  const tc = useMemo(
    () => ({
      surface: theme.colors.surface,
      bg: theme.colors.background,
      outline: theme.colors.outlineVariant,
      text: theme.colors.onSurface,
      muted: theme.colors.onSurfaceVariant,
      primary: theme.colors.primary,
    }),
    [theme]
  );

  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMembers = useCallback(
    async ({ showRefresh = false } = {}) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        const data = await apiFetchAuth("/users/members", {
          method: "GET",
        });

        const raw = getMembersArray(data);
        const normalized = raw.map(normalizeMember);

        console.log(
          "🟦 [MembersManageScreen] membros normalizados:",
          normalized.map((m) => ({
            id: m.id,
            userId: m.userId,
            name: m.name,
            photoUrl: m.photoUrl,
          }))
        );

        setMembers(normalized);
      } catch (e) {
        console.log("🟥 [MembersManageScreen] erro ao carregar membros:", {
          code: e?.code,
          status: e?.status,
          message: e?.message,
          payload: e?.payload,
        });

        setErrorMessage(e?.message || "Não foi possível carregar os membros.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiFetchAuth]
  );

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return members;

    return members.filter((m) =>
      [m.name, m.email, m.phone, m.role, m.status, m.birthDateLabel].some((v) =>
        safeStr(v).toLowerCase().includes(q)
      )
    );
  }, [members, query]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: tc.bg }]}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={[styles.loadingText, { color: tc.muted }]}>
          Carregando membros da igreja...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tc.bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMembers({ showRefresh: true })}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={[styles.blob, { width: 180, height: 180, top: -50, right: -40 }]} />
              <View
                style={[
                  styles.blob,
                  {
                    width: 120,
                    height: 120,
                    bottom: -60,
                    left: -30,
                    opacity: 0.05,
                  },
                ]}
              />

              <View style={styles.heroContent}>
                <View style={styles.heroTop}>
                  <View>
                    <Text style={styles.heroTitle}>Membros</Text>
                    <Text style={styles.heroSubtitle}>
                      {members.length} membro{members.length !== 1 ? "s" : ""} cadastrado
                      {members.length !== 1 ? "s" : ""}
                    </Text>
                  </View>

                  {/* <TouchableRipple
                    onPress={() => navigation.navigate("MemberForm")}
                    borderless
                    style={styles.heroAddBtn}
                  >
                    <View style={styles.heroAddBtnInner}>
                      <Icon source="plus" size={16} color={NAVY} />
                      <Text style={styles.heroAddBtnText}>Novo</Text>
                    </View>
                  </TouchableRipple> */}
                </View>

                <View style={styles.heroPills}>
                  <View style={[styles.heroPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                    <View style={[styles.pillDot, { backgroundColor: SUCCESS }]} />
                    <Text style={styles.heroPillText}>
                      {members.filter((m) => m.isActive).length} ativos
                    </Text>
                  </View>

                  <View style={[styles.heroPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                    <View style={[styles.pillDot, { backgroundColor: WARNING }]} />
                    <Text style={styles.heroPillText}>
                      {members.filter((m) => m.isPending).length} pendentes
                    </Text>
                  </View>

                  <View style={[styles.heroPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                    <View style={[styles.pillDot, { backgroundColor: DANGER }]} />
                    <Text style={styles.heroPillText}>
                      {members.filter((m) => !m.isActive && !m.isPending).length} inativos
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.searchWrap, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
              <Icon source="magnify" size={18} color={tc.muted} />

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar por nome, função, status..."
                placeholderTextColor={tc.muted}
                style={[styles.searchInput, { color: tc.text }]}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                mode="flat"
                dense
              />

              {!!query && (
                <TouchableRipple onPress={() => setQuery("")} borderless style={styles.searchClear}>
                  <Icon source="close" size={16} color={tc.muted} />
                </TouchableRipple>
              )}
            </View>

            {!!errorMessage && (
              <Surface
                elevation={0}
                style={[styles.errorCard, { backgroundColor: DANGER_BG, borderColor: DANGER }]}
              >
                <View style={styles.errorContent}>
                  <Icon source="alert-circle-outline" size={18} color={DANGER} />

                  <Text style={[styles.errorText, { color: DANGER }]} numberOfLines={2}>
                    {errorMessage}
                  </Text>

                  <TouchableRipple onPress={() => loadMembers()} borderless style={styles.errorBtn}>
                    <Text style={styles.errorBtnText}>Tentar</Text>
                  </TouchableRipple>
                </View>
              </Surface>
            )}

            {!!query && (
              <Text style={[styles.filterCount, { color: tc.muted }]}>
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para "{query}"
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <Surface
            elevation={0}
            style={[styles.emptyCard, { backgroundColor: tc.surface, borderColor: tc.outline }]}
          >
            <Icon source="account-group-outline" size={36} color={tc.muted} />

            <Text style={[styles.emptyTitle, { color: NAVY }]}>
              {query ? "Nenhum resultado" : "Nenhum membro cadastrado"}
            </Text>

            <Text style={[styles.emptySub, { color: tc.muted }]}>
              {query ? "Tente buscar por outro termo" : "Cadastre o primeiro membro da sua igreja"}
            </Text>

            {!query && (
              <TouchableRipple
                onPress={() => navigation.navigate("MemberForm")}
                borderless
                style={styles.emptyBtn}
              >
                <View style={styles.emptyBtnInner}>
                  <Icon source="plus" size={15} color="#fff" />
                  <Text style={styles.emptyBtnText}>Cadastrar membro</Text>
                </View>
              </TouchableRipple>
            )}
          </Surface>
        }
        renderItem={({ item }) => (
          <MemberCard
            item={item}
            tc={tc}
            onPress={() =>
              navigation.navigate("MemberAdminDetails", {
                id: item.id,
                memberId: item.id,
                userId: item.userId,
                member: item,
              })
            }
          />
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  listContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // ── Hero
  hero: {
    backgroundColor: NAVY,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: {
          width: 0,
          height: 4,
        },
      },
      android: {
        elevation: 3,
      },
    }),
  },

  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  heroContent: {
    padding: 20,
    zIndex: 2,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.6,
  },

  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 3,
  },

  heroAddBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },

  heroAddBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },

  heroAddBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: NAVY,
  },

  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  heroPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },

  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },

  // ── Busca
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
    minHeight: 46,
  },

  searchInput: {
    flex: 1,
    backgroundColor: "transparent",
    fontSize: 14,
    paddingHorizontal: 0,
    height: 36,
  },

  searchClear: {
    padding: 4,
    borderRadius: 8,
  },

  // ── Erro
  errorCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },

  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  errorBtn: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  errorBtnText: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900",
    color: DANGER,
  },

  // ── Filter count
  filterCount: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 2,
  },

  // ── Member card
  card: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: {
          width: 0,
          height: 3,
        },
      },
      android: {
        elevation: 2,
      },
    }),
  },

  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },

  // ── Avatar
  avatarImageWrap: {
    backgroundColor: BRAND_LIGHT,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(65,88,208,0.16)",
  },

  avatarCircle: {
    backgroundColor: BRAND_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitials: {
    fontWeight: "900",
    color: BRAND_BLUE,
    letterSpacing: -0.5,
  },

  // ── Member info
  memberName: {
    fontSize: 14,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.2,
  },

  memberContact: {
    fontSize: 11,
    color: "#9198B5",
    marginTop: 3,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
    flexWrap: "wrap",
  },

  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },

  rolePillText: {
    fontSize: 10,
    fontWeight: "800",
  },

  birthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  birthText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9198B5",
  },

  // ── Right col
  rightCol: {
    alignItems: "center",
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  // ── Empty
  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },

  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },

  emptyBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 6,
  },

  emptyBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: NAVY,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },

  emptyBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
});
