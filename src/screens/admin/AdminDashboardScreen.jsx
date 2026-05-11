// src/screens/admin/AdminDashboardScreen.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
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
const WARNING = "#F5A623";
const WARNING_BG = "#FEF5E7";
const DANGER = "#E84D4D";
const DANGER_BG = "#FEECEC";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toCount(value) {
  if (Array.isArray(value)) return value.length;

  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object") {
    if (Array.isArray(value.data)) return value.data.length;
    if (Array.isArray(value.items)) return value.items.length;
    if (Array.isArray(value.results)) return value.results.length;
    if (Array.isArray(value.members)) return value.members.length;
    if (Array.isArray(value.cells)) return value.cells.length;

    return toCount(
      value.count ??
      value.total ??
      value.totalCount ??
      value.quantity ??
      value.length ??
      0
    );
  }

  return 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(toCount(value));
}

function normalizeDashboardData({
  dashboardData = {},
  membersData = [],
  cellsData = [],
  eventsData = [],
} = {}) {
  const members = toCount(
    membersData?.members ??
    membersData?.data ??
    membersData?.items ??
    membersData?.results ??
    membersData ??
    dashboardData?.members ??
    dashboardData?.totalMembers ??
    dashboardData?.membersCount ??
    dashboardData?.churchMembers ??
    dashboardData?.churchMembersCount
  );

  const cells = toCount(
    cellsData?.cells ??
    cellsData?.data ??
    cellsData?.items ??
    cellsData?.results ??
    cellsData ??
    dashboardData?.cells ??
    dashboardData?.totalCells ??
    dashboardData?.cellsCount
  );

  const eventsPending = toCount(
    eventsData?.events ??
    eventsData?.data ??
    eventsData?.items ??
    eventsData?.results ??
    eventsData ??
    dashboardData?.eventsPending ??
    dashboardData?.pendingEvents ??
    dashboardData?.eventsPendingCount ??
    dashboardData?.pendingEventsCount ??
    dashboardData?.events ??
    dashboardData?.eventsCount
  );

  const approvals = toCount(
    dashboardData?.approvals ??
    dashboardData?.pendingApprovals ??
    dashboardData?.approvalsCount ??
    dashboardData?.pendingApprovalsCount ??
    dashboardData?.requestsPending ??
    dashboardData?.pendingRequests
  );

  return {
    members,
    cells,
    eventsPending,
    approvals,
  };
}

// ─── StatusPill ───────────────────────────────────────────────────────────────
function StatusPill({ icon, label, color, bg }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Icon source={icon} size={13} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, actionLabel, onAction, tc }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {!!subtitle && (
          <Text style={[styles.sectionSubtitle, { color: tc.muted }]}>
            {subtitle}
          </Text>
        )}
      </View>

      {!!actionLabel && (
        <TouchableRipple
          onPress={onAction}
          borderless
          style={styles.sectionAction}
        >
          <Text style={[styles.sectionActionText, { color: BRAND_BLUE }]}>
            {actionLabel}
          </Text>
        </TouchableRipple>
      )}
    </View>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, icon, helper, color, bg, tc }) {
  return (
    <Surface
      elevation={2}
      style={[
        styles.metricCard,
        {
          backgroundColor: tc.surface,
          borderColor: tc.outline,
        },
      ]}
    >
      {/* Topo: ícone + valor lado a lado */}
      <View style={styles.metricTop}>
        <View style={[styles.metricIconWrap, { backgroundColor: bg }]}>
          <Icon source={icon} size={18} color={color} />
        </View>
        <Text style={styles.metricValue}>{formatNumber(value)}</Text>
      </View>

      {/* Label + helper empilhados abaixo */}
      <Text style={[styles.metricLabel, { color: tc.text }]}>{label}</Text>

      {!!helper && (
        <Text style={[styles.metricHelper, { color: tc.muted }]}>
          {helper}
        </Text>
      )}
    </Surface>
  );
}

// ─── PendingItem ──────────────────────────────────────────────────────────────
function PendingItem({
  icon,
  title,
  description,
  helper,
  buttonLabel,
  onPress,
  color,
  bg,
  tc,
}) {
  return (
    <Surface
      elevation={0}
      style={[
        styles.pendingCard,
        {
          backgroundColor: tc.surface,
          borderColor: tc.outline,
        },
      ]}
    >
      <View style={styles.pendingContent}>
        <View style={[styles.pendingIconWrap, { backgroundColor: bg }]}>
          <Icon source={icon} size={22} color={color} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.pendingTitle}>{title}</Text>

          <Text style={[styles.pendingDesc, { color: tc.muted }]}>
            {description}
          </Text>

          {!!helper && (
            <Text style={[styles.pendingHelper, { color: tc.muted }]}>
              {helper}
            </Text>
          )}
        </View>
      </View>

      <TouchableRipple
        onPress={onPress}
        borderless
        style={[styles.pendingBtn, { backgroundColor: bg }]}
      >
        <Text style={[styles.pendingBtnText, { color }]}>
          {buttonLabel}
        </Text>
      </TouchableRipple>
    </Surface>
  );
}

// ─── ShortcutCard ─────────────────────────────────────────────────────────────
function ShortcutCard({ title, subtitle, icon, onPress, color, bg, tc }) {
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={[
        styles.shortcutCard,
        {
          backgroundColor: tc.surface,
          borderColor: tc.outline,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.shortcutTop}>
          <View style={[styles.shortcutIconWrap, { backgroundColor: bg }]}>
            <Icon source={icon} size={20} color={color} />
          </View>

          <Icon source="chevron-right" size={20} color={tc.muted} />
        </View>

        <Text style={styles.shortcutTitle} numberOfLines={1}>
          {title}
        </Text>

        <Text
          style={[styles.shortcutSubtitle, { color: tc.muted }]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableRipple>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminDashboardScreen({ navigation }) {
  const theme = useTheme();
  const { apiFetchAuth, activeChurchId } = useAuth();

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

  const [stats, setStats] = useState({
    members: 0,
    cells: 0,
    eventsPending: 0,
    approvals: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(
    async ({ showRefresh = false } = {}) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        console.log("🟦 [AdminDashboardScreen] carregando dashboard...");
        console.log("🟦 [AdminDashboardScreen] activeChurchId:", activeChurchId);

        const cellsPath = activeChurchId
          ? `/cells?churchId=${encodeURIComponent(activeChurchId)}`
          : null;

        const eventsPath = activeChurchId
          ? `/churches/${encodeURIComponent(activeChurchId)}/events`
          : null;

        const [dashboardData, membersData, cellsData, eventsData] =
          await Promise.all([
            apiFetchAuth("/users/me/dashboard", {
              method: "GET",
            }).catch((error) => {
              console.log(
                "🟨 [AdminDashboardScreen] erro em /users/me/dashboard:",
                error?.message
              );
              return {};
            }),

            apiFetchAuth("/users/members", {
              method: "GET",
            }).catch((error) => {
              console.log(
                "🟨 [AdminDashboardScreen] erro em /users/members:",
                error?.message
              );
              return [];
            }),

            cellsPath
              ? apiFetchAuth(cellsPath, {
                method: "GET",
              }).catch((error) => {
                console.log(
                  "🟨 [AdminDashboardScreen] erro em /cells:",
                  error?.message
                );
                return [];
              })
              : Promise.resolve([]),

            eventsPath
              ? apiFetchAuth(eventsPath, {
                method: "GET",
              }).catch((error) => {
                console.log(
                  "🟨 [AdminDashboardScreen] erro em /churches/:churchId/events:",
                  error?.message
                );
                return [];
              })
              : Promise.resolve([]),
          ]);

        console.log("🟩 [AdminDashboardScreen] dashboardData:", dashboardData);
        console.log("🟩 [AdminDashboardScreen] membersData:", membersData);
        console.log("🟩 [AdminDashboardScreen] cellsData:", cellsData);
        console.log("🟩 [AdminDashboardScreen] eventsData:", eventsData);

        const normalizedStats = normalizeDashboardData({
          dashboardData,
          membersData,
          cellsData,
          eventsData,
        });

        console.log(
          "🟩 [AdminDashboardScreen] stats normalizados:",
          normalizedStats
        );

        setStats(normalizedStats);
      } catch (error) {
        console.log("🟥 [AdminDashboardScreen] erro geral:", error);

        setErrorMessage(
          error?.message || "Não foi possível carregar os dados do painel."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiFetchAuth, activeChurchId]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: tc.bg }]}>
        <ActivityIndicator size="large" />

        <Text style={[styles.loadingText, { color: tc.muted }]}>
          Carregando painel da igreja...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tc.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard({ showRefresh: true })}
          />
        }
      >
        {!!errorMessage && (
          <Surface
            elevation={0}
            style={[
              styles.errorCard,
              {
                backgroundColor: DANGER_BG,
                borderColor: DANGER,
              },
            ]}
          >
            <View style={styles.errorContent}>
              <Icon source="alert-circle-outline" size={22} color={DANGER} />

              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Erro ao carregar painel</Text>

                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>

              <TouchableRipple
                onPress={() => loadDashboard()}
                borderless
                style={styles.errorButton}
              >
                <Text style={styles.errorButtonText}>Tentar</Text>
              </TouchableRipple>
            </View>
          </Surface>
        )}

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View
            style={[
              styles.blob,
              {
                width: 220,
                height: 220,
                top: -70,
                right: -60,
              },
            ]}
          />

          <View
            style={[
              styles.blob,
              {
                width: 150,
                height: 150,
                bottom: -80,
                left: -40,
                opacity: 0.05,
              },
            ]}
          />

          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <Icon source="church" size={24} color="#fff" />
            </View>

            <TouchableRipple
              onPress={() => navigation.navigate("Reports")}
              borderless
              style={styles.heroReportBtn}
            >
              <View style={styles.heroReportBtnInner}>
                <Icon source="chart-box-outline" size={14} color="#fff" />

                <Text style={styles.heroReportBtnText}>Relatórios</Text>
              </View>
            </TouchableRipple>
          </View>

          <Text style={styles.heroTitle}>Painel da igreja</Text>

          <Text style={styles.heroSubtitle}>
            Acompanhe membros, células, eventos e solicitações em um só lugar.
          </Text>

          <View style={styles.heroPills}>
            <StatusPill
              icon="shield-check-outline"
              label="Administrador"
              color={BRAND_LIGHT}
              bg="rgba(255,255,255,0.15)"
            />

            <StatusPill
              icon="account-group-outline"
              label={`${formatNumber(stats.members)} membros`}
              color="#7EFFD4"
              bg="rgba(255,255,255,0.12)"
            />
          </View>
        </View>

        {/* ── Indicadores ── */}
        <SectionHeader
          title="Indicadores"
          subtitle="Resumo rápido da operação"
          tc={tc}
        />

        <View style={styles.metricsGrid}>
          <MetricCard
            label="Membros"
            value={stats.members}
            icon="account-group-outline"
            helper="ativos na igreja"
            color={BRAND_BLUE}
            bg={BRAND_LIGHT}
            tc={tc}
          />

          <MetricCard
            label="Células"
            value={stats.cells}
            icon="home-group"
            helper="em acompanhamento"
            color={SUCCESS}
            bg={SUCCESS_BG}
            tc={tc}
          />

          <MetricCard
            label="Eventos"
            value={stats.eventsPending}
            icon="calendar-alert"
            helper="pendentes"
            color={WARNING}
            bg={WARNING_BG}
            tc={tc}
          />

          <MetricCard
            label="Aprovações"
            value={stats.approvals}
            icon="account-check-outline"
            helper="aguardando revisão"
            color={DANGER}
            bg={DANGER_BG}
            tc={tc}
          />
        </View>

        {/* ── Pendências ── */}
        <SectionHeader
          title="Pendências"
          subtitle="Itens que precisam de atenção"
          tc={tc}
        />

        <View style={styles.pendingList}>
          <PendingItem
            icon="calendar-alert"
            title="Confirmações de evento"
            description={`${formatNumber(
              stats.eventsPending
            )} pendente(s) nos próximos dias`}
            helper="Confira participantes, datas e escalas geradas."
            buttonLabel="Ver eventos"
            color={WARNING}
            bg={WARNING_BG}
            tc={tc}
            onPress={() => navigation.navigate("EventsManageScreen")}
          />

          <PendingItem
            icon="account-check-outline"
            title="Aprovações de cadastro"
            description={`${formatNumber(
              stats.approvals
            )} solicitação(ões) aguardando`}
            helper="Revise novos membros antes de liberar o acesso."
            buttonLabel="Revisar"
            color={BRAND_BLUE}
            bg={BRAND_LIGHT}
            tc={tc}
            onPress={() => navigation.navigate("MembersManage")}
          />
        </View>

        {/* ── Gerenciar ── */}
        <SectionHeader
          title="Gerenciar"
          subtitle="Ações rápidas do dia a dia"
          tc={tc}
        />

        <View style={styles.shortcutsGrid}>
          <ShortcutCard
            title="Membros"
            subtitle="Cadastrar, editar e permissões"
            icon="account-group-outline"
            color={BRAND_BLUE}
            bg={BRAND_LIGHT}
            tc={tc}
            onPress={() => navigation.navigate("MembersManage")}
          />

          <ShortcutCard
            title="Eventos"
            subtitle="Criar eventos e gerar escalas"
            icon="calendar-star-outline"
            color={WARNING}
            bg={WARNING_BG}
            tc={tc}
            onPress={() => navigation.navigate("EventComposerScreen")}
          />

          <ShortcutCard
            title="Células"
            subtitle="Líderes e participantes"
            icon="home-group"
            color={SUCCESS}
            bg={SUCCESS_BG}
            tc={tc}
            onPress={() => navigation.navigate("CellsManage")}
          />

          <ShortcutCard
            title="Ministérios"
            subtitle="Equipes e departamentos"
            icon="layers-outline"
            color={BRAND_BLUE}
            bg={BRAND_LIGHT}
            tc={tc}
            onPress={() => navigation.navigate("MinistriesManage")}
          />

          <ShortcutCard
            title="Publicar aviso"
            subtitle="Avisos e novidades"
            icon="bullhorn-outline"
            color={WARNING}
            bg={WARNING_BG}
            tc={tc}
            onPress={() => navigation.navigate("NewsComposer")}
          />
        </View>

        {/* ── CTA ── */}
        <View style={styles.ctaCard}>
          <View
            style={[
              styles.blob,
              {
                width: 180,
                height: 180,
                top: -50,
                right: -40,
              },
            ]}
          />

          <View style={styles.ctaContent}>
            <View style={styles.ctaIconWrap}>
              <Icon source="calendar-plus" size={24} color="#fff" />
            </View>

            <Text style={styles.ctaTitle}>Organize o próximo evento</Text>

            <Text style={styles.ctaSubtitle}>
              Defina data, participantes e gere as escalas de forma simples.
            </Text>

            <View style={styles.ctaActions}>
              <TouchableRipple
                onPress={() => navigation.navigate("EventsManageScreen")}
                borderless
                style={styles.ctaMainBtn}
              >
                <View style={styles.ctaBtnInner}>
                  <Icon source="plus" size={15} color={NAVY} />

                  <Text style={[styles.ctaBtnText, { color: NAVY }]}>
                    Novo evento
                  </Text>
                </View>
              </TouchableRipple>

              <TouchableRipple
                onPress={() => navigation.navigate("EventsManageScreen")}
                borderless
                style={styles.ctaSecondaryBtn}
              >
                <Text style={styles.ctaSecondaryText}>Ver eventos</Text>
              </TouchableRipple>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  errorCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },

  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: DANGER,
  },

  errorText: {
    marginTop: 2,
    fontSize: 12,
    color: DANGER,
    lineHeight: 16,
  },

  errorButton: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  errorButtonText: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "900",
    color: DANGER,
  },

  // Hero
  hero: {
    backgroundColor: NAVY,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 22,
    overflow: "hidden",
    position: "relative",
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

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    zIndex: 2,
  },

  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroReportBtn: {
    borderRadius: 999,
    overflow: "hidden",
  },

  heroReportBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },

  heroReportBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.6,
    zIndex: 2,
  },

  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 19,
    zIndex: 2,
  },

  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    zIndex: 2,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  pillText: {
    fontSize: 11,
    fontWeight: "800",
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 18,
    gap: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
  },

  sectionAction: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  sectionActionText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Metrics
  // No StyleSheet, substitua as entradas de metricCard, metricIconWrap, metricValue, metricLabel, metricHelper:

  metricCard: {
    width: "48%",   // ← era "47.5%", o gap de 12 consumia espaço demais
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
    }),
  },

  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.6,
    lineHeight: 26,
  },

  metricLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.1,
  },

  metricHelper: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 4,
  },



  // Pending
  pendingList: {
    gap: 12,
    marginBottom: 4,
  },

  pendingCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: {
          width: 0,
          height: 4,
        },
      },
      android: {
        elevation: 2,
      },
    }),
  },

  pendingContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  pendingIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  pendingTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.2,
  },

  pendingDesc: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },

  pendingHelper: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },

  pendingBtn: {
    alignSelf: "flex-start",
    borderRadius: 14,
    overflow: "hidden",
  },

  pendingBtnText: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "800",
  },

  // Shortcuts
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 4,
  },

  shortcutCard: {
    width: "47.5%",
    minHeight: 126,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: {
          width: 0,
          height: 4,
        },
      },
      android: {
        elevation: 2,
      },
    }),
  },

  shortcutTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  shortcutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  shortcutTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.2,
  },

  shortcutSubtitle: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 16,
  },

  // CTA
  ctaCard: {
    backgroundColor: NAVY,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    marginTop: 18,
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

  ctaContent: {
    padding: 20,
    zIndex: 2,
  },

  ctaIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  ctaTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },

  ctaSubtitle: {
    marginTop: 5,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 19,
  },

  ctaActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },

  ctaMainBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },

  ctaBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },

  ctaBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },

  ctaSecondaryBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },

  ctaSecondaryText: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.80)",
  },
});