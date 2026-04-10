import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useIsFocused } from "@react-navigation/native";
import { getAuth } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ============================================================================
// Design Tokens (baseado no manual)
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
  },
  radius: {
    card: 18,
    pill: 999,
  },
  space: (n) => n * 8,
};

// ============================================================================
// Ajuste rotas conforme seu navigator
// ============================================================================
const ROUTES = {
  create: "CellCreate",
  details: "CellDetails",
  meeting: "CellMeeting",
  list: "CellsList",
};

// ============================================================================
// Ajuste endpoint conforme seu backend
// ============================================================================
const ENDPOINTS = {
  listCells: (churchId) => `/cells?churchId=${encodeURIComponent(churchId)}`,
};

// ============================================================================
// Fetch helper
// ============================================================================
async function authedFetch(path, { method = "GET", body } = {}, authCtx) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `Erro ao comunicar com o servidor (${res.status}).`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

// ============================================================================
// Normaliza fields
// ============================================================================
function normalizeCell(raw) {
  const leaderName =
    raw?.leader?.name ||
    raw?.leaderName ||
    raw?.leader?.displayName ||
    raw?.leader?.fullName ||
    raw?.leader ||
    null;

  const membersCount =
    raw?.membersCount ??
    raw?._count?.members ??
    raw?._count?.participants ??
    raw?.members?.length ??
    raw?.participants?.length ??
    0;

  const meetingDay = raw?.meetingDay || raw?.day || raw?.weekday || null;
  const meetingTime = raw?.meetingTime || raw?.time || raw?.hour || null;

  return {
    id: raw?.id ?? String(Math.random()),
    name: raw?.name || raw?.title || "Célula",
    neighborhood: raw?.neighborhood || raw?.bairro || raw?.region || null,
    address: raw?.address || raw?.endereco || null,
    leaderName,
    membersCount,
    meetingDay,
    meetingTime,
    isActive: raw?.isActive ?? raw?.active ?? true,
    raw,
  };
}

function formatMeeting(meetingDay, meetingTime) {
  if (!meetingDay && !meetingTime) return null;
  if (meetingDay && meetingTime) return `${meetingDay} • ${meetingTime}`;
  return meetingDay || meetingTime;
}

// ============================================================================
// UI Helpers (sem Paper)
// ============================================================================
function CardView({ children, style }) {
  return <View style={[styles.cardBase, style]}>{children}</View>;
}

function IconCircle({ name, size = 44, bg, color = "#fff" }) {
  return (
    <View style={[styles.iconCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <MaterialCommunityIcons name={name} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

function Pill({ icon, text, bg, color, style, compact = false }) {
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: bg },
        compact && { paddingVertical: 6, paddingHorizontal: 10 },
        style,
      ]}
    >
      {!!icon && (
        <MaterialCommunityIcons name={icon} size={16} color={color} style={{ marginRight: 6 }} />
      )}
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function PrimaryButton({ title, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }, style]}>
      <Text style={styles.btnPrimaryText}>{title}</Text>
    </Pressable>
  );
}

function OutlineButton({ title, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnOutline, pressed && { opacity: 0.85 }, style]}>
      <Text style={styles.btnOutlineText}>{title}</Text>
    </Pressable>
  );
}

function IconBtn({ icon, onPress, color = DS.colors.textMuted }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </Pressable>
  );
}

function SearchInput({ value, onChangeText, placeholder }) {
  return (
    <View style={styles.searchWrap}>
      <MaterialCommunityIcons name="magnify" size={20} color={DS.colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={DS.colors.textMuted}
        style={styles.searchInput}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {!!value && <IconBtn icon="close" onPress={() => onChangeText("")} color={DS.colors.textMuted} />}
    </View>
  );
}

function DividerLine() {
  return <View style={styles.divider} />;
}

// ============================================================================
// Screen
// ============================================================================
export default function CellsManageScreen({ navigation }) {
  const authCtx = useAuth();
  const isFocused = useIsFocused();

  const churchId =
    authCtx?.activeChurch?.id ||
    authCtx?.church?.id ||
    authCtx?.me?.activeChurchId ||
    authCtx?.user?.activeChurchId ||
    authCtx?.activeChurchId ||
    null;

  const [query, setQuery] = useState("");
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!churchId) {
      setCells([]);
      setLoading(false);
      setError("Nenhuma igreja ativa encontrada no app.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const data = await authedFetch(ENDPOINTS.listCells(churchId), {}, authCtx);

      const list = Array.isArray(data) ? data : data?.items || data?.cells || [];
      const normalized = (list || []).map(normalizeCell);

      normalized.sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return String(a.name).localeCompare(String(b.name));
      });

      setCells(normalized);
    } catch (e) {
      setError(e?.message || "Erro ao carregar células.");
    } finally {
      setLoading(false);
    }
  }, [churchId, authCtx]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return cells;

    return cells.filter((c) => {
      const hay = [c.name, c.neighborhood, c.address, c.leaderName, c.meetingDay, c.meetingTime]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cells, query]);

  const header = (
    <View style={{ gap: DS.space(2) }}>
      <CardView style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Células</Text>
            <Text style={styles.heroSubtitle}>Veja todas as células da igreja, líderes, membros e reuniões.</Text>
          </View>

          <IconCircle name="account-group" size={46} bg={DS.colors.primary} />
        </View>

        <View style={styles.heroActions}>
          <PrimaryButton title="Nova célula" onPress={() => navigation.navigate(ROUTES.create)} style={{ flex: 1 }} />
          <OutlineButton title="Atualizar" onPress={onRefresh} style={{ flex: 1 }} />
        </View>
      </CardView>

      <SearchInput
        placeholder="Buscar célula, bairro, líder..."
        value={query}
        onChangeText={setQuery}
      />

      {!!error && (
        <CardView style={styles.errorCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <IconCircle name="alert-circle" size={36} bg={DS.colors.danger} />

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: DS.colors.text }}>Não foi possível carregar</Text>
              <Text style={{ color: DS.colors.textMuted, marginTop: 2 }}>{error}</Text>
            </View>

            <IconBtn icon="refresh" onPress={load} color={DS.colors.primary} />
          </View>
        </CardView>
      )}

      <View style={styles.statsRow}>
        <Pill
          icon="database"
          text={`${cells.length} total`}
          bg={DS.colors.tintBlue}
          color={DS.colors.primary}
          style={{}}
        />
        <Pill
          icon="check-circle"
          text={`${cells.filter((c) => c.isActive).length} ativas`}
          bg="#ECFBF9"
          color={DS.colors.accent}
        />
        <Pill
          icon="pause-circle"
          text={`${cells.filter((c) => !c.isActive).length} inativas`}
          bg="#FFF1F1"
          color={DS.colors.danger}
        />
      </View>

      <DividerLine />
    </View>
  );

  const renderItem = ({ item }) => {
    const meeting = formatMeeting(item.meetingDay, item.meetingTime);

    return (
      <Pressable
        onPress={() => navigation?.navigate?.(ROUTES.details, { cellId: item.id })}
        style={({ pressed }) => [pressed && { opacity: 0.96 }]}
      >
        <CardView style={styles.cellCard}>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <IconCircle
                name={item.isActive ? "home-group" : "home-off"}
                size={44}
                bg={item.isActive ? DS.colors.primary : DS.colors.textMuted}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.cellTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cellSubtitle} numberOfLines={1}>
                  {item.neighborhood || item.address || "Sem localização informada"}
                </Text>
              </View>

              <IconBtn
                icon="chevron-right"
                onPress={() => navigation?.navigate?.(ROUTES.details, { cellId: item.id })}
                color={DS.colors.textMuted}
              />
            </View>

            <View style={styles.metaRow}>
              {!!meeting && (
                <Pill
                  compact
                  icon="calendar-clock"
                  text={meeting}
                  bg={DS.colors.tintBlue}
                  color={DS.colors.primary}
                />
              )}

              <Pill
                compact
                icon="account"
                text={item.leaderName ? `Líder: ${item.leaderName}` : "Sem líder"}
                bg="#F1F1F1"
                color={DS.colors.text}
              />

              <Pill
                compact
                icon="account-multiple"
                text={`${item.membersCount} membros`}
                bg="#F1F1F1"
                color={DS.colors.text}
              />

              {!item.isActive && (
                <Pill
                  compact
                  icon="pause"
                  text="Inativa"
                  bg="#FFF1F1"
                  color={DS.colors.danger}
                />
              )}
            </View>
          </View>
        </CardView>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10, color: DS.colors.textMuted }}>Carregando células...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <CardView style={styles.emptyCard}>
              <View style={{ alignItems: "center", gap: 10 }}>
                <IconCircle name="home-search" size={54} bg={DS.colors.primary} />
                <Text style={{ fontWeight: "900", color: DS.colors.text }}>
                  {query ? "Nenhuma célula encontrada" : "Nenhuma célula cadastrada"}
                </Text>
                <Text style={{ color: DS.colors.textMuted, textAlign: "center" }}>
                  {query
                    ? "Tente buscar por outro nome, bairro ou líder."
                    : "Crie a primeira célula para começar a organizar líderes, membros e reuniões."}
                </Text>

                <PrimaryButton
                  title="Nova célula"
                  onPress={() => navigation?.navigate?.(ROUTES.create)}
                  style={{ marginTop: 6, alignSelf: "stretch" }}
                />
              </View>
            </CardView>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },

  listContent: {
    padding: DS.space(2),
    paddingBottom: DS.space(3),
    gap: DS.space(1.5),
  },

  // Base card (substitui Card do paper)
  cardBase: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.card,
    padding: DS.space(2),
    borderWidth: 1,
    borderColor: DS.colors.border,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },

  heroCard: {},
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: DS.colors.text,
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    color: DS.colors.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  // Search (substitui Searchbar)
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: DS.radius.card,
    backgroundColor: DS.colors.card,
    borderWidth: 1,
    borderColor: DS.colors.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },
  searchInput: {
    flex: 1,
    color: DS.colors.text,
    padding: 0,
  },

  // Pills (substitui Chip)
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: DS.radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pillText: {
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: DS.colors.border,
  },

  // Icons/buttons
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // Buttons (substitui Button)
  btnPrimary: {
    backgroundColor: DS.colors.primary,
    borderRadius: DS.radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "900",
  },
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
  btnOutlineText: {
    color: DS.colors.primary,
    fontWeight: "900",
  },

  errorCard: {
    borderColor: "#FFE0E0",
  },

  cellCard: {},

  cellTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: DS.colors.text,
  },
  cellSubtitle: {
    color: DS.colors.textMuted,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  emptyCard: {
    marginTop: 10,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
