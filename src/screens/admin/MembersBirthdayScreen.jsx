// src/screens/admin/BirthdaysScreen.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
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
const BG = "#F5F6FA";
const SURFACE = "#FFFFFF";
const BORDER = "#E4E6F0";
const MUTED = "#9198B5";
const SUCCESS = "#2DBF8A";
const SUCCESS_BG = "#E8F9F3";
const DANGER = "#E84D4D";
const DANGER_BG = "#FEECEC";
const WARNING = "#F5A623";
const WARNING_BG = "#FEF5E7";
const ROSE = "#EC4899";
const ROSE_BG = "#FCE7F3";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeStr(value) {
  return String(value ?? "").trim();
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

function pickFirst(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && safeStr(value) !== "") {
      return value;
    }
  }

  return "";
}

function pickBirthDate(raw, user, profile, member) {
  return pickFirst(
    raw?.birthDate,
    raw?.birth_date,
    raw?.birthday,
    raw?.birthDay,
    raw?.dateOfBirth,
    raw?.dataNascimento,
    raw?.nascimento,

    user?.birthDate,
    user?.birth_date,
    user?.birthday,
    user?.birthDay,
    user?.dateOfBirth,
    user?.dataNascimento,
    user?.nascimento,

    profile?.birthDate,
    profile?.birth_date,
    profile?.birthday,
    profile?.birthDay,
    profile?.dateOfBirth,
    profile?.dataNascimento,
    profile?.nascimento,

    member?.birthDate,
    member?.birth_date,
    member?.birthday,
    member?.dateOfBirth,
    member?.dataNascimento
  );
}

function pickPhotoUrl(raw, user, profile, member) {
  return pickFirst(
    raw?.photoUrl,
    raw?.photoURL,
    raw?.avatarUrl,
    raw?.imageUrl,
    raw?.profileImageUrl,
    raw?.profilePhotoUrl,
    raw?.picture,
    raw?.pictureUrl,

    user?.photoUrl,
    user?.photoURL,
    user?.avatarUrl,
    user?.imageUrl,
    user?.profileImageUrl,
    user?.profilePhotoUrl,
    user?.picture,
    user?.pictureUrl,

    profile?.photoUrl,
    profile?.photoURL,
    profile?.avatarUrl,
    profile?.imageUrl,
    profile?.profileImageUrl,
    profile?.profilePhotoUrl,

    member?.photoUrl,
    member?.photoURL,
    member?.avatarUrl,
    member?.imageUrl
  );
}

function parseBirthDateParts(value) {
  if (!value) return null;

  const raw = safeStr(value);
  if (!raw) return null;

  // ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const month = Number(iso[2]);
    const day = Number(iso[3]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        day,
        month,
        original: raw,
      };
    }
  }

  // BR: DD/MM/YYYY ou DD/MM
  const br = raw.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        day,
        month,
        original: raw,
      };
    }
  }

  const d = new Date(raw);

  if (!Number.isNaN(d.getTime())) {
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      original: raw,
    };
  }

  return null;
}

function formatDayMonth(day, month) {
  if (!day || !month) return "";

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function getMonthNamePTBR(month) {
  const names = [
    "",
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return names[Number(month)] || "";
}

function getNextBirthdayDate(day, month) {
  const today = new Date();
  const currentYear = today.getFullYear();

  let next = new Date(currentYear, month - 1, day, 12, 0, 0, 0);

  const todayAtNoon = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
    0,
    0,
    0
  );

  if (next.getTime() < todayAtNoon.getTime()) {
    next = new Date(currentYear + 1, month - 1, day, 12, 0, 0, 0);
  }

  return next;
}

function getDaysUntilBirthday(day, month) {
  const today = new Date();
  const todayAtNoon = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
    0,
    0,
    0
  );

  const next = getNextBirthdayDate(day, month);
  const diffMs = next.getTime() - todayAtNoon.getTime();

  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getBirthdayStatus(day, month) {
  const daysUntil = getDaysUntilBirthday(day, month);

  if (daysUntil === 0) {
    return {
      label: "Hoje",
      icon: "party-popper",
      color: SUCCESS,
      bg: SUCCESS_BG,
      priority: 0,
    };
  }

  if (daysUntil === 1) {
    return {
      label: "Amanhã",
      icon: "calendar-star",
      color: WARNING,
      bg: WARNING_BG,
      priority: 1,
    };
  }

  if (daysUntil <= 7) {
    return {
      label: `Em ${daysUntil} dias`,
      icon: "calendar-clock",
      color: ROSE,
      bg: ROSE_BG,
      priority: 2,
    };
  }

  return {
    label: `Em ${daysUntil} dias`,
    icon: "calendar-month-outline",
    color: BRAND_BLUE,
    bg: BRAND_LIGHT,
    priority: 3,
  };
}

function normalizeMember(raw) {
  const user = raw?.user || {};
  const profile = raw?.profile || {};
  const churchMember = raw?.churchMember || raw?.churchLink || {};
  const member = raw?.member || {};

  const id =
    raw?.id ||
    raw?.memberId ||
    member?.id ||
    churchMember?.id ||
    user?.id ||
    String(Math.random());

  const userId =
    raw?.userId ||
    raw?.user_id ||
    user?.id ||
    churchMember?.userId ||
    member?.userId ||
    null;

  const name =
    raw?.name ||
    raw?.fullName ||
    raw?.displayName ||
    member?.fullName ||
    member?.name ||
    user?.name ||
    user?.displayName ||
    profile?.name ||
    "Membro sem nome";

  const email =
    raw?.email ||
    user?.email ||
    profile?.email ||
    member?.email ||
    null;

  const phone =
    raw?.phone ||
    raw?.whatsapp ||
    user?.phone ||
    profile?.phone ||
    member?.phone ||
    null;

  const photoUrl = pickPhotoUrl(raw, user, profile, member);
  const birthRaw = pickBirthDate(raw, user, profile, member);
  const birthParts = parseBirthDateParts(birthRaw);

  if (!birthParts) {
    return {
      ...raw,
      id,
      userId,
      name,
      fullName: name,
      email,
      phone,
      photoUrl,
      birthDate: null,
      birthDay: null,
      birthMonth: null,
      birthDateLabel: "",
      hasBirthday: false,
      daysUntilBirthday: null,
      nextBirthdayDate: null,
      birthdayStatus: null,
    };
  }

  const daysUntilBirthday = getDaysUntilBirthday(birthParts.day, birthParts.month);
  const birthdayStatus = getBirthdayStatus(birthParts.day, birthParts.month);

  return {
    ...raw,
    id,
    userId,
    name,
    fullName: name,
    email,
    phone,
    photoUrl,
    birthDate: birthRaw,
    birthDay: birthParts.day,
    birthMonth: birthParts.month,
    birthDateLabel: formatDayMonth(birthParts.day, birthParts.month),
    birthMonthName: getMonthNamePTBR(birthParts.month),
    hasBirthday: true,
    daysUntilBirthday,
    nextBirthdayDate: getNextBirthdayDate(birthParts.day, birthParts.month),
    birthdayStatus,
  };
}

function groupByMonth(items) {
  const groups = [];

  for (let month = 1; month <= 12; month += 1) {
    const monthItems = items
      .filter((item) => item.birthMonth === month)
      .sort((a, b) => Number(a.birthDay) - Number(b.birthDay));

    if (monthItems.length) {
      groups.push({
        month,
        title: getMonthNamePTBR(month),
        data: monthItems,
      });
    }
  }

  return groups;
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function AvatarCircle({ name, photoUrl, size = 50 }) {
  const radius = size * 0.32;
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
            console.log("🟥 [BirthdaysScreen] erro ao carregar foto:", {
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
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: size * 0.34 }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

function BirthdayChip({ item }) {
  const status = item.birthdayStatus;

  if (!status) return null;

  return (
    <View style={[styles.birthdayChip, { backgroundColor: status.bg }]}>
      <Icon source={status.icon} size={13} color={status.color} />
      <Text style={[styles.birthdayChipText, { color: status.color }]}>
        {status.label}
      </Text>
    </View>
  );
}

function BirthdayCard({ item, onPress }) {
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={styles.card}
    >
      <View style={styles.cardInner}>
        <View style={styles.avatarWrap}>
          <AvatarCircle name={item.name} photoUrl={item.photoUrl} size={52} />

          {item.daysUntilBirthday === 0 && (
            <View style={styles.todayBadge}>
              <Icon source="party-popper" size={12} color="#fff" />
            </View>
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.memberName} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.datePill}>
              <Icon source="cake-variant-outline" size={13} color={ROSE} />
              <Text style={styles.datePillText}>{item.birthDateLabel}</Text>
            </View>

            <BirthdayChip item={item} />
          </View>

          {!!(item.email || item.phone) && (
            <Text style={styles.memberContact} numberOfLines={1}>
              {item.phone || item.email}
            </Text>
          )}
        </View>

        <View style={styles.rightCol}>
          <Text style={styles.dayNumber}>{String(item.birthDay).padStart(2, "0")}</Text>
          <Text style={styles.monthSmall}>{String(item.birthMonth).padStart(2, "0")}</Text>
        </View>
      </View>
    </TouchableRipple>
  );
}

function MonthSection({ title, count }) {
  return (
    <View style={styles.monthSection}>
      <View>
        <Text style={styles.monthTitle}>{title}</Text>
        <Text style={styles.monthSubtitle}>
          {count} aniversariante{count !== 1 ? "s" : ""}
        </Text>
      </View>

      <View style={styles.monthCountPill}>
        <Text style={styles.monthCountText}>{count}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BirthdaysScreen({ navigation }) {
  const theme = useTheme();
  const { apiFetchAuth } = useAuth();

  const tc = useMemo(
    () => ({
      surface: theme.colors.surface || SURFACE,
      bg: theme.colors.background || BG,
      outline: theme.colors.outlineVariant || BORDER,
      text: theme.colors.onSurface || NAVY,
      muted: theme.colors.onSurfaceVariant || MUTED,
      primary: theme.colors.primary || BRAND_BLUE,
    }),
    [theme]
  );

  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("upcoming");
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
          "🟦 [BirthdaysScreen] aniversariantes normalizados:",
          normalized.map((m) => ({
            id: m.id,
            userId: m.userId,
            name: m.name,
            birthDateLabel: m.birthDateLabel,
            photoUrl: m.photoUrl,
          }))
        );

        setMembers(normalized);
      } catch (e) {
        console.log("🟥 [BirthdaysScreen] erro ao carregar membros:", {
          code: e?.code,
          status: e?.status,
          message: e?.message,
          payload: e?.payload,
        });

        setErrorMessage(e?.message || "Não foi possível carregar os aniversariantes.");
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

  const birthdayMembers = useMemo(() => {
    return members
      .filter((item) => item.hasBirthday)
      .sort((a, b) => {
        if (Number(a.daysUntilBirthday) !== Number(b.daysUntilBirthday)) {
          return Number(a.daysUntilBirthday) - Number(b.daysUntilBirthday);
        }

        return safeStr(a.name).localeCompare(safeStr(b.name));
      });
  }, [members]);

  const todayItems = useMemo(
    () => birthdayMembers.filter((item) => item.daysUntilBirthday === 0),
    [birthdayMembers]
  );

  const weekItems = useMemo(
    () =>
      birthdayMembers.filter(
        (item) => item.daysUntilBirthday >= 0 && item.daysUntilBirthday <= 7
      ),
    [birthdayMembers]
  );

  const monthItems = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    return birthdayMembers
      .filter((item) => item.birthMonth === currentMonth)
      .sort((a, b) => Number(a.birthDay) - Number(b.birthDay));
  }, [birthdayMembers]);

  const filteredBase = useMemo(() => {
    if (selectedFilter === "today") return todayItems;
    if (selectedFilter === "week") return weekItems;
    if (selectedFilter === "month") return monthItems;
    if (selectedFilter === "all") {
      return birthdayMembers
        .slice()
        .sort((a, b) => {
          if (Number(a.birthMonth) !== Number(b.birthMonth)) {
            return Number(a.birthMonth) - Number(b.birthMonth);
          }

          if (Number(a.birthDay) !== Number(b.birthDay)) {
            return Number(a.birthDay) - Number(b.birthDay);
          }

          return safeStr(a.name).localeCompare(safeStr(b.name));
        });
    }

    return birthdayMembers;
  }, [birthdayMembers, monthItems, selectedFilter, todayItems, weekItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return filteredBase;

    return filteredBase.filter((m) =>
      [
        m.name,
        m.email,
        m.phone,
        m.birthDateLabel,
        m.birthMonthName,
        m.birthdayStatus?.label,
      ].some((v) => safeStr(v).toLowerCase().includes(q))
    );
  }, [filteredBase, query]);

  const monthlyGroups = useMemo(() => {
    if (selectedFilter !== "all" || query.trim()) return [];
    return groupByMonth(filtered);
  }, [filtered, query, selectedFilter]);

  const listData = useMemo(() => {
    if (monthlyGroups.length) {
      const rows = [];

      monthlyGroups.forEach((group) => {
        rows.push({
          type: "section",
          id: `section-${group.month}`,
          title: group.title,
          count: group.data.length,
        });

        group.data.forEach((item) => {
          rows.push({
            type: "item",
            id: item.id,
            item,
          });
        });
      });

      return rows;
    }

    return filtered.map((item) => ({
      type: "item",
      id: item.id,
      item,
    }));
  }, [filtered, monthlyGroups]);

  const withoutBirthdayCount = useMemo(
    () => members.filter((item) => !item.hasBirthday).length,
    [members]
  );

  const heroSubtitle = useMemo(() => {
    if (!birthdayMembers.length) return "Nenhum aniversário cadastrado";

    if (todayItems.length) {
      return `${todayItems.length} aniversariante${todayItems.length !== 1 ? "s" : ""} hoje`;
    }

    const next = birthdayMembers[0];

    if (!next) return `${birthdayMembers.length} aniversariante${birthdayMembers.length !== 1 ? "s" : ""}`;

    return `Próximo: ${next.name} em ${next.birthDateLabel}`;
  }, [birthdayMembers, todayItems]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: tc.bg }]}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={[styles.loadingText, { color: tc.muted }]}>
          Carregando aniversariantes...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tc.bg }]}>
      <FlatList
        data={listData}
        keyExtractor={(row) => String(row.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={({ leadingItem, trailingItem }) => {
          if (leadingItem?.type === "section" || trailingItem?.type === "section") {
            return <View style={{ height: 8 }} />;
          }

          return <View style={{ height: 10 }} />;
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMembers({ showRefresh: true })}
            colors={[BRAND_BLUE]}
            tintColor={BRAND_BLUE}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={[styles.blob, { width: 190, height: 190, top: -58, right: -48 }]} />
              <View style={[styles.blob, { width: 120, height: 120, bottom: -58, left: -34, opacity: 0.05 }]} />

              <View style={styles.heroContent}>
                <View style={styles.heroTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroTitle}>Aniversariantes</Text>
                    <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
                  </View>

                  <View style={styles.heroIcon}>
                    <Icon source="cake-variant-outline" size={24} color="#fff" />
                  </View>
                </View>

                <View style={styles.heroPills}>
                  <View style={styles.heroPill}>
                    <View style={[styles.pillDot, { backgroundColor: SUCCESS }]} />
                    <Text style={styles.heroPillText}>{todayItems.length} hoje</Text>
                  </View>

                  <View style={styles.heroPill}>
                    <View style={[styles.pillDot, { backgroundColor: WARNING }]} />
                    <Text style={styles.heroPillText}>{weekItems.length} na semana</Text>
                  </View>

                  <View style={styles.heroPill}>
                    <View style={[styles.pillDot, { backgroundColor: ROSE }]} />
                    <Text style={styles.heroPillText}>{monthItems.length} no mês</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.searchWrap, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
              <Icon source="magnify" size={18} color={tc.muted} />

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar aniversariante..."
                placeholderTextColor={tc.muted}
                style={[styles.searchInput, { color: tc.text }]}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                mode="flat"
                dense
              />

              {!!query && (
                <TouchableRipple
                  onPress={() => setQuery("")}
                  borderless
                  style={styles.searchClear}
                >
                  <Icon source="close" size={16} color={tc.muted} />
                </TouchableRipple>
              )}
            </View>

            <View style={styles.filtersRow}>
              <TouchableRipple
                onPress={() => setSelectedFilter("upcoming")}
                borderless
                style={[
                  styles.filterChip,
                  selectedFilter === "upcoming" && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === "upcoming" && styles.filterChipTextActive,
                  ]}
                >
                  Próximos
                </Text>
              </TouchableRipple>

              <TouchableRipple
                onPress={() => setSelectedFilter("today")}
                borderless
                style={[
                  styles.filterChip,
                  selectedFilter === "today" && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === "today" && styles.filterChipTextActive,
                  ]}
                >
                  Hoje
                </Text>
              </TouchableRipple>

              <TouchableRipple
                onPress={() => setSelectedFilter("week")}
                borderless
                style={[
                  styles.filterChip,
                  selectedFilter === "week" && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === "week" && styles.filterChipTextActive,
                  ]}
                >
                  7 dias
                </Text>
              </TouchableRipple>

              <TouchableRipple
                onPress={() => setSelectedFilter("month")}
                borderless
                style={[
                  styles.filterChip,
                  selectedFilter === "month" && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === "month" && styles.filterChipTextActive,
                  ]}
                >
                  Mês
                </Text>
              </TouchableRipple>

              <TouchableRipple
                onPress={() => setSelectedFilter("all")}
                borderless
                style={[
                  styles.filterChip,
                  selectedFilter === "all" && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === "all" && styles.filterChipTextActive,
                  ]}
                >
                  Todos
                </Text>
              </TouchableRipple>
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

                  <TouchableRipple
                    onPress={() => loadMembers()}
                    borderless
                    style={styles.errorBtn}
                  >
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

            {!birthdayMembers.length && withoutBirthdayCount > 0 && (
              <Surface elevation={0} style={styles.warnCard}>
                <Icon source="calendar-alert" size={20} color={WARNING} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.warnTitle}>Nenhum aniversário encontrado</Text>
                  <Text style={styles.warnText}>
                    Existem {withoutBirthdayCount} membro{withoutBirthdayCount !== 1 ? "s" : ""} sem data de nascimento cadastrada.
                  </Text>
                </View>
              </Surface>
            )}
          </View>
        }
        ListEmptyComponent={
          <Surface elevation={0} style={[styles.emptyCard, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
            <Icon source="cake-variant-outline" size={38} color={tc.muted} />

            <Text style={[styles.emptyTitle, { color: NAVY }]}>
              {query ? "Nenhum resultado" : "Nenhum aniversariante"}
            </Text>

            <Text style={[styles.emptySub, { color: tc.muted }]}>
              {query
                ? "Tente buscar por outro nome ou data."
                : "Cadastre a data de nascimento dos membros para visualizar os aniversários."}
            </Text>
          </Surface>
        }
        renderItem={({ item }) => {
          if (item.type === "section") {
            return <MonthSection title={item.title} count={item.count} />;
          }

          return (
            <BirthdayCard
              item={item.item}
              onPress={() =>
                navigation?.navigate?.("MemberAdminDetails", {
                  id: item.item.id,
                  memberId: item.item.id,
                  userId: item.item.userId,
                  member: item.item,
                })
              }
            />
          );
        }}
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

  // Hero
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
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
    color: "rgba(255,255,255,0.68)",
    marginTop: 4,
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
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
    backgroundColor: "rgba(255,255,255,0.15)",
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

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
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

  // Filters
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  filterChip: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  filterChipActive: {
    borderColor: BRAND_BLUE,
    backgroundColor: BRAND_LIGHT,
  },

  filterChipText: {
    color: MUTED,
    fontWeight: "900",
    fontSize: 12,
  },

  filterChipTextActive: {
    color: BRAND_BLUE,
  },

  filterCount: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 2,
  },

  // Cards
  card: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
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

  avatarWrap: {
    position: "relative",
  },

  avatarImageWrap: {
    backgroundColor: BRAND_LIGHT,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(65,88,208,0.16)",
  },

  avatarFallback: {
    backgroundColor: BRAND_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitials: {
    fontWeight: "900",
    color: BRAND_BLUE,
    letterSpacing: -0.5,
  },

  todayBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: SUCCESS,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: SURFACE,
  },

  memberName: {
    fontSize: 14,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.2,
  },

  memberContact: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },

  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: ROSE_BG,
  },

  datePillText: {
    color: ROSE,
    fontSize: 11,
    fontWeight: "900",
  },

  birthdayChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  birthdayChipText: {
    fontSize: 11,
    fontWeight: "900",
  },

  rightCol: {
    width: 42,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: BRAND_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  dayNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: BRAND_BLUE,
    lineHeight: 19,
  },

  monthSmall: {
    fontSize: 10,
    fontWeight: "900",
    color: MUTED,
    lineHeight: 13,
  },

  // Month section
  monthSection: {
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  monthTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.3,
  },

  monthSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 1,
  },

  monthCountPill: {
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },

  monthCountText: {
    fontSize: 12,
    color: BRAND_BLUE,
    fontWeight: "900",
  },

  // Feedback
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

  warnCard: {
    borderWidth: 1,
    borderColor: WARNING,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    backgroundColor: WARNING_BG,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  warnTitle: {
    color: NAVY,
    fontWeight: "900",
    fontSize: 13,
  },

  warnText: {
    color: "#8A6A1F",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },

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
});
