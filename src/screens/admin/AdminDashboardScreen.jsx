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
  StatusBar,
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
import { useTerms } from "../../context/TerminologyContext";

import {
  getPermissions,
  ROLE_META,
  normalizeRole,
} from "../../utils/permissions";

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

const PURPLE = "#7B61FF";
const PURPLE_BG = "#F3F0FF";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toCount(value) {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  if (typeof value === "object") {
    if (Array.isArray(value.data)) {
      return value.data.length;
    }

    if (Array.isArray(value.items)) {
      return value.items.length;
    }

    if (Array.isArray(value.results)) {
      return value.results.length;
    }

    if (Array.isArray(value.members)) {
      return value.members.length;
    }

    if (Array.isArray(value.cells)) {
      return value.cells.length;
    }

    return toCount(
      value.count ??
        value.total ??
        value.totalCount ??
        value.quantity ??
        value.length ??
        0,
    );
  }

  return 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(
    toCount(value),
  );
}

function normalizeDashboardData({
  dashboardData = {},
  membersData = [],
  cellsData = [],
  eventsData = [],
} = {}) {
  return {
    members: toCount(
      membersData?.members ??
        membersData?.data ??
        membersData?.items ??
        membersData?.results ??
        membersData ??
        dashboardData?.members ??
        dashboardData?.totalMembers ??
        dashboardData?.membersCount ??
        dashboardData?.churchMembers,
    ),

    cells: toCount(
      cellsData?.cells ??
        cellsData?.data ??
        cellsData?.items ??
        cellsData?.results ??
        cellsData ??
        dashboardData?.cells ??
        dashboardData?.totalCells ??
        dashboardData?.cellsCount,
    ),

    eventsPending: toCount(
      eventsData?.events ??
        eventsData?.data ??
        eventsData?.items ??
        eventsData?.results ??
        eventsData ??
        dashboardData?.eventsPending ??
        dashboardData?.pendingEvents ??
        dashboardData?.events ??
        dashboardData?.eventsCount,
    ),

    approvals: toCount(
      dashboardData?.approvals ??
        dashboardData?.pendingApprovals ??
        dashboardData?.approvalsCount ??
        dashboardData?.requestsPending,
    ),
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusPill({
  icon,
  label,
  color,
  bg,
}) {
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg,
        },
      ]}
    >
      <Icon
        source={icon}
        size={12}
        color={color}
      />

      <Text
        style={[
          styles.pillText,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  tc,
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderBar} />

      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        {!!subtitle && (
          <Text
            style={[
              styles.sectionSubtitle,
              {
                color: tc.muted,
              },
            ]}
          >
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
          <Text
            style={[
              styles.sectionActionText,
              {
                color: BRAND_BLUE,
              },
            ]}
          >
            {actionLabel}
          </Text>
        </TouchableRipple>
      )}
    </View>
  );
}

function MetricCard({
  label,
  value,
  icon,
  helper,
  color,
  bg,
  tc,
}) {
  return (
    <Surface
      elevation={1}
      style={[
        styles.metricCard,
        {
          backgroundColor: tc.surface,
          borderColor: tc.outline,
        },
      ]}
    >
      <View style={styles.metricTop}>
        <View
          style={[
            styles.metricIconWrap,
            {
              backgroundColor: bg,
            },
          ]}
        >
          <Icon
            source={icon}
            size={15}
            color={color}
          />
        </View>

        <Text
          style={[
            styles.metricLabel,
            {
              color: tc.muted,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      <Text style={styles.metricValue}>
        {formatNumber(value)}
      </Text>

      {!!helper && (
        <Text
          style={[
            styles.metricHelper,
            {
              color: tc.muted,
            },
          ]}
          numberOfLines={1}
        >
          {helper}
        </Text>
      )}
    </Surface>
  );
}

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
      elevation={1}
      style={[
        styles.pendingCard,
        {
          backgroundColor: tc.surface,
          borderColor: tc.outline,
        },
      ]}
    >
      <View style={styles.pendingRow}>
        <View
          style={[
            styles.pendingIconWrap,
            {
              backgroundColor: bg,
            },
          ]}
        >
          <Icon
            source={icon}
            size={18}
            color={color}
          />
        </View>

        <View style={styles.pendingTexts}>
          <Text
            style={styles.pendingTitle}
            numberOfLines={1}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.pendingDesc,
              {
                color: tc.muted,
              },
            ]}
            numberOfLines={1}
          >
            {description}
          </Text>

          {!!helper && (
            <Text
              style={[
                styles.pendingHelper,
                {
                  color: tc.muted,
                },
              ]}
              numberOfLines={1}
            >
              {helper}
            </Text>
          )}
        </View>

        <TouchableRipple
          onPress={onPress}
          borderless
          style={[
            styles.pendingBtn,
            {
              backgroundColor: bg,
            },
          ]}
        >
          <Text
            style={[
              styles.pendingBtnText,
              {
                color,
              },
            ]}
          >
            {buttonLabel}
          </Text>
        </TouchableRipple>
      </View>
    </Surface>
  );
}

function ShortcutCard({
  title,
  subtitle,
  icon,
  onPress,
  color,
  bg,
  tc,
}) {
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
          <View
            style={[
              styles.shortcutIconWrap,
              {
                backgroundColor: bg,
              },
            ]}
          >
            <Icon
              source={icon}
              size={17}
              color={color}
            />
          </View>

          <Text
            style={styles.shortcutTitle}
            numberOfLines={1}
          >
            {title}
          </Text>

          <Icon
            source="chevron-right"
            size={15}
            color={tc.muted}
          />
        </View>

        <Text
          style={[
            styles.shortcutSubtitle,
            {
              color: tc.muted,
            },
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableRipple>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AdminDashboardScreen({
  navigation,
}) {
  const theme = useTheme();

  const {
    apiFetchAuth,
    activeChurchId,
    permissions: authPermissions,
  } = useAuth();

  const { t } = useTerms();

  const tc = useMemo(
    () => ({
      surface: theme.colors.surface,
      bg: theme.colors.background,
      outline: theme.colors.outlineVariant,
      text: theme.colors.onSurface,
      muted: theme.colors.onSurfaceVariant,
      primary: theme.colors.primary,
    }),
    [theme],
  );

  const [myRole, setMyRole] =
    useState(null);

  const [stats, setStats] =
    useState({
      members: 0,
      cells: 0,
      eventsPending: 0,
      approvals: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const perms =
    authPermissions ||
    getPermissions(myRole);

  const roleMeta =
    ROLE_META[
      normalizeRole(myRole)
    ] ?? ROLE_META.MEMBER;

  const loadDashboard =
    useCallback(
      async ({
        showRefresh = false,
      } = {}) => {
        try {
          if (showRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setErrorMessage("");

          const cellsPath =
            activeChurchId
              ? `/cells?churchId=${encodeURIComponent(
                  activeChurchId,
                )}`
              : null;

          const eventsPath =
            activeChurchId
              ? `/churches/${encodeURIComponent(
                  activeChurchId,
                )}/events`
              : null;

          const [
            mineData,
            dashboardData,
            membersData,
            cellsData,
            eventsData,
          ] = await Promise.all([
            apiFetchAuth(
              "/churches/mine",
              {
                method: "GET",
              },
            ).catch(() => null),

            apiFetchAuth(
              "/users/me/dashboard",
              {
                method: "GET",
              },
            ).catch(() => ({})),

            apiFetchAuth(
              "/users/members",
              {
                method: "GET",
              },
            ).catch(() => []),

            cellsPath
              ? apiFetchAuth(
                  cellsPath,
                  {
                    method: "GET",
                  },
                ).catch(() => [])
              : Promise.resolve([]),

            eventsPath
              ? apiFetchAuth(
                  eventsPath,
                  {
                    method: "GET",
                  },
                ).catch(() => [])
              : Promise.resolve([]),
          ]);

          const mine =
            Array.isArray(mineData)
              ? mineData
              : mineData
                ? [mineData]
                : [];

          const selected =
            (
              activeChurchId &&
              mine.find(
                (c) =>
                  c.id ===
                  activeChurchId,
              )
            ) ||
            mine[0] ||
            null;

          const roleRaw =
            selected?.myRole ||
            selected?.role ||
            null;

          setMyRole(roleRaw);

          setStats(
            normalizeDashboardData({
              dashboardData,
              membersData,
              cellsData,
              eventsData,
            }),
          );
        } catch (error) {
          setErrorMessage(
            error?.message ||
              "Não foi possível carregar os dados do painel.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        apiFetchAuth,
        activeChurchId,
      ],
    );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingRoot,
          {
            backgroundColor: tc.bg,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={BRAND_BLUE}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color: tc.muted,
            },
          ]}
        >
          Carregando painel...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: tc.bg,
        },
      ]}
    >
      <StatusBar
        backgroundColor={NAVY}
        barStyle="light-content"
      />

      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              loadDashboard({
                showRefresh: true,
              })
            }
            colors={[BRAND_BLUE]}
            tintColor={BRAND_BLUE}
          />
        }
      >
        {/* ── Erro ───────────────────────────────────────────── */}

        {!!errorMessage && (
          <View
            style={styles.errorCard}
          >
            <Icon
              source="alert-circle-outline"
              size={16}
              color={DANGER}
            />

            <Text
              style={
                styles.errorText
              }
            >
              {errorMessage}
            </Text>

            <TouchableRipple
              onPress={() =>
                loadDashboard()
              }
              borderless
              style={styles.errorBtn}
            >
              <Text
                style={
                  styles.errorBtnText
                }
              >
                Tentar
              </Text>
            </TouchableRipple>
          </View>
        )}

        {/* ── Hero ───────────────────────────────────────────── */}

        <View style={styles.hero}>
          <View
            style={[
              styles.blob,
              {
                width: 200,
                height: 200,
                top: -60,
                right: -50,
              },
            ]}
          />

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

          <View
            style={styles.heroTop}
          >
            <View
              style={
                styles.heroIconWrap
              }
            >
              <Icon
                source="church"
                size={20}
                color="#fff"
              />
            </View>

            {perms.canViewReports && (
              <TouchableRipple
                onPress={() =>
                  navigation.navigate(
                    "Reports",
                  )
                }
                borderless
              >
                <View
                  style={
                    styles.heroReportBtn
                  }
                >
                  <Icon
                    source="chart-box-outline"
                    size={13}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.heroReportBtnText
                    }
                  >
                    Relatórios
                  </Text>
                </View>
              </TouchableRipple>
            )}
          </View>

          <Text
            style={styles.heroTitle}
          >
            Painel da igreja
          </Text>

          <Text
            style={
              styles.heroSubtitle
            }
          >
            {`${t.member}s, ${t.cell.toLowerCase()}, eventos e solicitações em um só lugar.`}
          </Text>

          <View
            style={
              styles.heroPills
            }
          >
            <StatusPill
              icon={roleMeta.icon}
              label={roleMeta.label}
              color={BRAND_LIGHT}
              bg="rgba(255,255,255,0.15)"
            />

            <StatusPill
              icon="account-group-outline"
              label={`${formatNumber(
                stats.members,
              )} ${t.member.toLowerCase()}s`}
              color="#7EFFD4"
              bg="rgba(255,255,255,0.12)"
            />
          </View>
        </View>

        {/* ── Gerenciar ─────────────────────────────────────── */}

        <SectionHeader
          title="Gerenciar"
          subtitle="Ações rápidas do dia a dia"
          tc={tc}
        />

        <View
          style={
            styles.shortcutsGrid
          }
        >
          {perms.canManageMembers && (
            <ShortcutCard
              title={`${t.member}s`}
              subtitle="Cadastrar, editar e permissões"
              icon="account-group-outline"
              color={BRAND_BLUE}
              bg={BRAND_LIGHT}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "MembersManage",
                )
              }
            />
          )}

          {perms.canViewMembers &&
            !perms.canManageMembers && (
              <ShortcutCard
                title={`${t.member}s`}
                subtitle={`Visualizar lista de ${t.member.toLowerCase()}s`}
                icon="account-group-outline"
                color={BRAND_BLUE}
                bg={BRAND_LIGHT}
                tc={tc}
                onPress={() =>
                  navigation.navigate(
                    "MembersManage",
                  )
                }
              />
            )}

          {perms.canCreateEvent && (
            <ShortcutCard
              title="Eventos"
              subtitle={
                perms.canDeleteEvent
                  ? `Ver e criar eventos e ${t.schedule.toLowerCase()}s`
                  : "Ver e criar eventos"
              }
              icon="calendar-star-outline"
              color={WARNING}
              bg={WARNING_BG}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "EventsManageScreen",
                )
              }
            />
          )}

          {perms.canManageCells && (
            <ShortcutCard
              title={t.cell}
              subtitle={`${t.cellLeader}s e participantes`}
              icon="home-group"
              color={SUCCESS}
              bg={SUCCESS_BG}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "CellsManage",
                )
              }
            />
          )}

          {perms.canRegisterMeeting &&
            !perms.canManageCells && (
              <ShortcutCard
                title={`Minha ${t.cell}`}
                subtitle={`${t.cellMeeting}s e presença`}
                icon="home-group"
                color={SUCCESS}
                bg={SUCCESS_BG}
                tc={tc}
                onPress={() =>
                  navigation.navigate(
                    "CellsManage",
                  )
                }
              />
            )}

          {perms.canManageMinistries && (
            <ShortcutCard
              title={`${t.ministry}s`}
              subtitle="Equipes e departamentos"
              icon="layers-outline"
              color={BRAND_BLUE}
              bg={BRAND_LIGHT}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "MinistriesManage",
                )
              }
            />
          )}

          {perms.canViewMinistries &&
            !perms.canManageMinistries && (
              <ShortcutCard
                title={`${t.ministry}s`}
                subtitle="Visualizar equipes"
                icon="layers-outline"
                color={BRAND_BLUE}
                bg={BRAND_LIGHT}
                tc={tc}
                onPress={() =>
                  navigation.navigate(
                    "MinistriesManage",
                  )
                }
              />
            )}

          {/* ── NOVO: Repertórios ───────────────────────────── */}

          <ShortcutCard
            title="Repertórios"
            subtitle="Músicas, tons e repertórios"
            icon="playlist-music-outline"
            color={PURPLE}
            bg={PURPLE_BG}
            tc={tc}
            onPress={() =>
              navigation.navigate(
                "Repertoires",
                {
                  screen:
                    "RepertoiresList",
                },
              )
            }
          />

          {/* ── Avisos ──────────────────────────────────────── */}

          {perms.canPublishNews && (
            <ShortcutCard
              title={t.news}
              subtitle={
                perms.canDeleteNews
                  ? `Gerenciar ${t.news.toLowerCase()}`
                  : `Ver ${t.news.toLowerCase()}`
              }
              icon="bullhorn-outline"
              color={WARNING}
              bg={WARNING_BG}
              tc={tc}
              onPress={() => {
                const parent =
                  navigation.getParent?.();

                (
                  parent ||
                  navigation
                ).navigate(
                  "NewsTab",
                  {
                    screen:
                      "NewsFeed",
                  },
                );
              }}
            />
          )}

          {perms.canViewBirthdays && (
            <ShortcutCard
              title="Aniversariantes"
              subtitle={`Celebre os ${t.member.toLowerCase()}s`}
              icon="cake-variant-outline"
              color={SUCCESS}
              bg={SUCCESS_BG}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "Birthdays",
                )
              }
            />
          )}

          {perms.canViewReports && (
            <ShortcutCard
              title="Relatórios"
              subtitle="Indicadores e histórico"
              icon="chart-box-outline"
              color={BRAND_BLUE}
              bg={BRAND_LIGHT}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "Reports",
                )
              }
            />
          )}

          {(perms.canViewEventStatistics ||
            perms.canManageEventStatistics) && (
            <ShortcutCard
              title="Estatísticas de eventos"
              subtitle="Público, visitantes e decisões"
              icon="chart-timeline-variant"
              color={SUCCESS}
              bg={SUCCESS_BG}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "Reports",
                )
              }
            />
          )}

          {perms.canManageChurchProfile && (
            <ShortcutCard
              title="Perfil da Igreja"
              subtitle="Editar dados e imagem"
              icon="church"
              color={NAVY}
              bg={BRAND_LIGHT}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "ChurchProfile",
                )
              }
            />
          )}

          {perms.canManageChurchProfile && (
            <ShortcutCard
              title="Terminologia"
              subtitle="Personalizar nomes e vocabulário"
              icon="translate"
              color={PURPLE}
              bg={PURPLE_BG}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "Terminology",
                )
              }
            />
          )}
        </View>

        {/* ── Indicadores ───────────────────────────────────── */}

        <SectionHeader
          title="Indicadores"
          subtitle="Resumo rápido da operação"
          tc={tc}
        />

        <View
          style={
            styles.metricsGrid
          }
        >
          {perms.canViewMembers && (
            <MetricCard
              label={`${t.member}s`}
              value={stats.members}
              icon="account-group-outline"
              helper="ativos"
              color={BRAND_BLUE}
              bg={BRAND_LIGHT}
              tc={tc}
            />
          )}

          {perms.canAccessCells && (
            <MetricCard
              label={t.cell}
              value={stats.cells}
              icon="home-group"
              helper="ativas"
              color={SUCCESS}
              bg={SUCCESS_BG}
              tc={tc}
            />
          )}

          <MetricCard
            label="Eventos"
            value={
              stats.eventsPending
            }
            icon="calendar-alert"
            helper="pendentes"
            color={WARNING}
            bg={WARNING_BG}
            tc={tc}
          />

          {perms.canApproveMember && (
            <MetricCard
              label="Aprovações"
              value={stats.approvals}
              icon="account-check-outline"
              helper="aguardando"
              color={DANGER}
              bg={DANGER_BG}
              tc={tc}
            />
          )}
        </View>

        {/* ── Pendências ────────────────────────────────────── */}

        <SectionHeader
          title="Pendências"
          subtitle="Itens que precisam de atenção"
          tc={tc}
        />

        <View
          style={styles.pendingList}
        >
          {perms.canCreateEvent && (
            <PendingItem
              icon="calendar-alert"
              title="Confirmações de evento"
              description={`${formatNumber(
                stats.eventsPending,
              )} pendente(s) nos próximos dias`}
              helper={`Confira participantes e ${t.schedule.toLowerCase()}s.`}
              buttonLabel="Ver"
              color={WARNING}
              bg={WARNING_BG}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "EventsManageScreen",
                )
              }
            />
          )}

          {perms.canViewReports && (
            <PendingItem
              icon="chart-box-outline"
              title="Relatórios da igreja"
              description="Crescimento, presença e indicadores"
              helper="Acompanhe a evolução da comunidade."
              buttonLabel="Ver"
              color={BRAND_BLUE}
              bg={BRAND_LIGHT}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "Reports",
                )
              }
            />
          )}

          {perms.canApproveMember && (
            <PendingItem
              icon="account-check-outline"
              title={`Aprovações de ${t.member.toLowerCase()}`}
              description={`${formatNumber(
                stats.approvals,
              )} solicitação(ões) aguardando`}
              helper={`Revise novos ${t.member.toLowerCase()}s.`}
              buttonLabel="Revisar"
              color={BRAND_BLUE}
              bg={BRAND_LIGHT}
              tc={tc}
              onPress={() =>
                navigation.navigate(
                  "MembersManage",
                )
              }
            />
          )}

          {!perms.canCreateEvent &&
            !perms.canApproveMember && (
              <PendingItem
                icon="check-circle-outline"
                title="Tudo em ordem"
                description="Sem pendências para o seu perfil."
                helper=""
                buttonLabel="Relatórios"
                color={SUCCESS}
                bg={SUCCESS_BG}
                tc={tc}
                onPress={() =>
                  navigation.navigate(
                    "Reports",
                  )
                }
              />
            )}
        </View>

        {/* ── CTA ───────────────────────────────────────────── */}

        {perms.canCreateEvent && (
          <View
            style={styles.ctaCard}
          >
            <View
              style={[
                styles.blob,
                {
                  width: 160,
                  height: 160,
                  top: -40,
                  right: -30,
                },
              ]}
            />

            <View
              style={
                styles.ctaContent
              }
            >
              <View
                style={styles.ctaTop}
              >
                <View
                  style={
                    styles.ctaIconWrap
                  }
                >
                  <Icon
                    source="calendar-plus"
                    size={20}
                    color="#fff"
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.ctaTitle
                    }
                  >
                    {perms.canManageEventScales
                      ? "Organize o próximo evento"
                      : "Crie um novo evento"}
                  </Text>

                  <Text
                    style={
                      styles.ctaSubtitle
                    }
                  >
                    {perms.canManageEventScales
                      ? `Defina data, participantes e ${t.schedule.toLowerCase()}s.`
                      : "Defina data, local e participantes."}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.ctaActions
                }
              >
                <TouchableRipple
                  onPress={() =>
                    navigation.navigate(
                      "EventComposerScreen",
                    )
                  }
                  borderless
                  style={
                    styles.ctaMainBtn
                  }
                >
                  <View
                    style={
                      styles.ctaBtnInner
                    }
                  >
                    <Icon
                      source="plus"
                      size={14}
                      color={NAVY}
                    />

                    <Text
                      style={
                        styles.ctaBtnText
                      }
                    >
                      Novo evento
                    </Text>
                  </View>
                </TouchableRipple>

                <TouchableRipple
                  onPress={() =>
                    navigation.navigate(
                      "EventsManageScreen",
                    )
                  }
                  borderless
                  style={
                    styles.ctaSecondaryBtn
                  }
                >
                  <Text
                    style={
                      styles.ctaSecondaryText
                    }
                  >
                    Ver eventos
                  </Text>
                </TouchableRipple>
              </View>
            </View>
          </View>
        )}

        <View
          style={{
            height: 32,
          }}
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles =
  StyleSheet.create({
    root: {
      flex: 1,
    },

    loadingRoot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 10,
      fontSize: 13,
      fontWeight: "600",
    },

    container: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
    },

    errorCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: DANGER_BG,
      borderWidth: 1,
      borderColor: DANGER,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
    },

    errorText: {
      flex: 1,
      fontSize: 12,
      color: DANGER,
      fontWeight: "600",
    },

    errorBtn: {
      borderRadius: 8,
      overflow: "hidden",
    },

    errorBtnText: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      fontSize: 12,
      fontWeight: "800",
      color: DANGER,
    },

    hero: {
      backgroundColor: NAVY,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 18,
      marginBottom: 20,
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
      backgroundColor:
        "rgba(255,255,255,0.07)",
    },

    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 14,
      zIndex: 2,
    },

    heroIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor:
        "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },

    heroReportBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor:
        "rgba(255,255,255,0.15)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },

    heroReportBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#fff",
    },

    heroTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: "#fff",
      letterSpacing: -0.5,
      zIndex: 2,
    },

    heroSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color:
        "rgba(255,255,255,0.60)",
      lineHeight: 18,
      zIndex: 2,
    },

    heroPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
      zIndex: 2,
    },

    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
    },

    pillText: {
      fontSize: 11,
      fontWeight: "800",
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 18,
      marginBottom: 10,
    },

    sectionHeaderBar: {
      width: 3,
      height: 16,
      borderRadius: 999,
      backgroundColor:
        BRAND_BLUE,
    },

    sectionTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: NAVY,
      letterSpacing: -0.2,
    },

    sectionSubtitle: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 1,
    },

    sectionAction: {
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },

    sectionActionText: {
      fontSize: 12,
      fontWeight: "700",
    },

    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 2,
    },

    metricCard: {
      flex: 1,
      minWidth: "47%",
      maxWidth: "48.5%",
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,

      ...Platform.select({
        ios: {
          shadowOpacity: 0.05,
          shadowRadius: 6,
          shadowOffset: {
            width: 0,
            height: 3,
          },
        },

        android: {
          elevation: 1,
        },
      }),
    },

    metricTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 8,
    },

    metricIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },

    metricValue: {
      fontSize: 22,
      fontWeight: "900",
      color: NAVY,
      letterSpacing: -0.5,
    },

    metricLabel: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: NAVY,
      letterSpacing: -0.1,
    },

    metricHelper: {
      fontSize: 10,
      lineHeight: 14,
      marginTop: 2,
    },

    pendingList: {
      gap: 8,
      marginBottom: 2,
    },

    pendingCard: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 11,

      ...Platform.select({
        ios: {
          shadowOpacity: 0.04,
          shadowRadius: 5,
          shadowOffset: {
            width: 0,
            height: 2,
          },
        },

        android: {
          elevation: 1,
        },
      }),
    },

    pendingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    pendingIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },

    pendingTexts: {
      flex: 1,
      minWidth: 0,
    },

    pendingTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: NAVY,
      letterSpacing: -0.2,
    },

    pendingDesc: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 1,
    },

    pendingHelper: {
      fontSize: 10,
      lineHeight: 15,
      marginTop: 1,
    },

    pendingBtn: {
      borderRadius: 10,
      overflow: "hidden",
      flexShrink: 0,
    },

    pendingBtnText: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 11,
      fontWeight: "800",
    },

    shortcutsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 2,
    },

    shortcutCard: {
      width: "48%",
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      overflow: "hidden",

      ...Platform.select({
        ios: {
          shadowOpacity: 0.04,
          shadowRadius: 6,
          shadowOffset: {
            width: 0,
            height: 3,
          },
        },

        android: {
          elevation: 1,
        },
      }),
    },

    shortcutTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },

    shortcutIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },

    shortcutTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: "900",
      color: NAVY,
      letterSpacing: -0.2,
    },

    shortcutSubtitle: {
      fontSize: 11,
      lineHeight: 15,
      paddingLeft: 40,
    },

    ctaCard: {
      backgroundColor: NAVY,
      borderRadius: 22,
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
      padding: 16,
      zIndex: 2,
    },

    ctaTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 14,
    },

    ctaIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },

    ctaTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: "#fff",
      letterSpacing: -0.4,
    },

    ctaSubtitle: {
      marginTop: 3,
      fontSize: 12,
      color:
        "rgba(255,255,255,0.60)",
      lineHeight: 17,
    },

    ctaActions: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },

    ctaMainBtn: {
      borderRadius: 12,
      overflow: "hidden",
    },

    ctaBtnInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#fff",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
    },

    ctaBtnText: {
      fontSize: 13,
      fontWeight: "800",
      color: NAVY,
    },

    ctaSecondaryBtn: {
      borderRadius: 12,
      overflow: "hidden",
    },

    ctaSecondaryText: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      fontWeight: "700",
      color:
        "rgba(255,255,255,0.80)",
    },
  });
