// src/screens/admin/ReportsScreen.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Divider,
  Icon,
  Surface,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { useTerms } from "../../context/TerminologyContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND       = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const BG          = "#F5F6FA";
const SURFACE     = "#FFFFFF";
const BORDER      = "#E4E6F0";
const MUTED       = "#9198B5";
const SUCCESS     = "#2DBF8A";
const SUCCESS_BG  = "#E8F9F3";
const WARNING     = "#F5A623";
const WARNING_BG  = "#FEF5E7";
const DANGER      = "#E84D4D";
const DANGER_BG   = "#FEECEC";
const PURPLE      = "#7B61FF";
const PURPLE_BG   = "#F3F0FF";
const CYAN        = "#0EA5E9";
const CYAN_BG     = "#E7F6FE";

const SCREEN_W = Dimensions.get("window").width;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtBR(n) {
  return new Intl.NumberFormat("pt-BR").format(safeNum(n));
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

// ─── Normalização dos dados da API ────────────────────────────────────────────
function normalizeStats(data = {}) {
  return {
    // Membros
    totalMembers:    safeNum(data.totalMembers    ?? data.membersCount  ?? data.members),
    activeMembers:   safeNum(data.activeMembers   ?? data.activeCount),
    newMembersMonth: safeNum(data.newMembersMonth ?? data.newMembers    ?? data.recentMembers),
    pendingApprovals:safeNum(data.pendingApprovals?? data.approvals     ?? data.pending),

    // Células
    totalCells:      safeNum(data.totalCells      ?? data.cellsCount    ?? data.cells),
    activeCells:     safeNum(data.activeCells     ?? data.activeCellsCount),
    totalCellMembers:safeNum(data.totalCellMembers?? data.cellMembersCount),
    meetingsThisMonth:safeNum(data.meetingsThisMonth ?? data.meetings),

    // Presença (array de últimas semanas)
    attendanceWeeks: Array.isArray(data.attendanceWeeks) ? data.attendanceWeeks : [],

    // Eventos
    totalEvents:     safeNum(data.totalEvents     ?? data.eventsCount   ?? data.events),
    upcomingEvents:  safeNum(data.upcomingEvents  ?? data.upcoming),
    avgEventAttendance: safeNum(data.avgEventAttendance ?? data.avgAttendance),

    // Avisos
    totalNews:       safeNum(data.totalNews       ?? data.newsCount     ?? data.news),
    publishedNews:   safeNum(data.publishedNews   ?? data.published),
    newsThisMonth:   safeNum(data.newsThisMonth   ?? data.recentNews),

    // Escalas
    totalSchedules:  safeNum(data.totalSchedules  ?? data.schedulesCount),
    pendingSchedules:safeNum(data.pendingSchedules?? data.pendingAssignments),
  };
}

// ─── Mini bar chart inline (sem lib externa) ──────────────────────────────────
function BarChart({ weeks, color = BRAND }) {
  if (!weeks.length) return null;

  const maxVal  = Math.max(...weeks.map((w) => safeNum(w.count ?? w.value ?? w)), 1);
  const barW    = Math.floor((SCREEN_W - 80) / weeks.length) - 4;
  const barMaxH = 64;

  return (
    <View style={bc.wrap}>
      {weeks.map((w, i) => {
        const val    = safeNum(w.count ?? w.value ?? w);
        const height = Math.max(4, Math.round((val / maxVal) * barMaxH));
        const label  = w.label ?? w.week ?? `S${i + 1}`;
        return (
          <View key={i} style={[bc.col, { width: barW }]}>
            <Text style={bc.valLabel}>{val > 0 ? val : ""}</Text>
            <View style={bc.barTrack}>
              <View style={[bc.bar, { height, backgroundColor: color }]} />
            </View>
            <Text style={bc.weekLabel} numberOfLines={1}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const bc = StyleSheet.create({
  wrap:      { flexDirection: "row", alignItems: "flex-end", gap: 4, paddingTop: 8 },
  col:       { alignItems: "center", gap: 4 },
  barTrack:  { height: 64, justifyContent: "flex-end" },
  bar:       { borderRadius: 6, minHeight: 4 },
  valLabel:  { fontSize: 9, fontWeight: "800", color: NAVY },
  weekLabel: { fontSize: 9, color: MUTED, fontWeight: "600", maxWidth: 36, textAlign: "center" },
});

// ─── Mini progress bar ────────────────────────────────────────────────────────
function ProgressBar({ value, color = BRAND, height = 6 }) {
  const clamped = Math.min(100, Math.max(0, safeNum(value)));
  return (
    <View style={[pb.track, { height }]}>
      <View style={[pb.fill, { width: `${clamped}%`, backgroundColor: color, height }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { backgroundColor: BORDER, borderRadius: 999, overflow: "hidden", width: "100%" },
  fill:  { borderRadius: 999 },
});

// ─── Componentes ─────────────────────────────────────────────────────────────

function SectionLabel({ title }) {
  return <Text style={s.sectionLabel}>{title}</Text>;
}

function SectionHeader({ icon, title, subtitle, iconColor, iconBg }) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionIcon, { backgroundColor: iconBg }]}>
        <Icon source={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// Card de métrica simples — número grande + label
function StatCard({ label, value, icon, color, bg, helper, helperColor }) {
  return (
    <Surface elevation={0} style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Icon source={icon} size={16} color={color} />
      </View>
      <Text style={s.statValue}>{fmtBR(value)}</Text>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
      {!!helper && (
        <Text style={[s.statHelper, { color: helperColor ?? MUTED }]} numberOfLines={1}>
          {helper}
        </Text>
      )}
    </Surface>
  );
}

// Linha de métrica com ícone + label + valor + barra de progresso
function MetricRow({ icon, label, value, total, color, bg, last }) {
  const percentage = pct(value, total);
  return (
    <>
      <View style={s.metricRow}>
        <View style={[s.metricIcon, { backgroundColor: bg }]}>
          <Icon source={icon} size={15} color={color} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={s.metricRowTop}>
            <Text style={s.metricLabel} numberOfLines={1}>{label}</Text>
            <Text style={[s.metricValue, { color }]}>{fmtBR(value)}</Text>
          </View>
          {total > 0 && (
            <View style={s.metricRowBar}>
              <ProgressBar value={percentage} color={color} />
              <Text style={s.metricPct}>{percentage}%</Text>
            </View>
          )}
        </View>
      </View>
      {!last && <Divider style={s.divider} />}
    </>
  );
}

// Card de destaque — layout horizontal compacto: ícone | valor + label
function HighlightCard({ icon, value, label, description, color, bg }) {
  return (
    <Surface elevation={0} style={[s.highlightCard, { borderLeftColor: color }]}>
      <View style={[s.highlightIcon, { backgroundColor: bg }]}>
        <Icon source={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.highlightValue, { color }]} numberOfLines={1}>{fmtBR(value)}</Text>
        <Text style={s.highlightLabel} numberOfLines={1}>{label}</Text>
        {!!description && <Text style={s.highlightDesc} numberOfLines={1}>{description}</Text>}
      </View>
    </Surface>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const { apiFetchAuth, activeChurchId } = useAuth();
  const { t } = useTerms();

  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState("");

  // ── Carregar dados ────────────────────────────────────────────────────────
  const loadReports = useCallback(async ({ isRefresh = false } = {}) => {
    if (!activeChurchId) { setLoading(false); return; }

    isRefresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      // Chamadas paralelas — cada endpoint pode não existir ainda, usamos catch individual
      const [
        dashboardData,
        membersData,
        cellsData,
        eventsData,
        newsData,
        schedulesData,
        attendanceData,
      ] = await Promise.all([
        apiFetchAuth(`/users/me/dashboard`,                                       { method: "GET" }).catch(() => ({})),
        apiFetchAuth(`/users/members`,                                            { method: "GET" }).catch(() => []),
        apiFetchAuth(`/cells?churchId=${encodeURIComponent(activeChurchId)}`,    { method: "GET" }).catch(() => []),
        apiFetchAuth(`/churches/${encodeURIComponent(activeChurchId)}/events`,   { method: "GET" }).catch(() => []),
        apiFetchAuth(`/news?churchId=${encodeURIComponent(activeChurchId)}`,     { method: "GET" }).catch(() => []),
        apiFetchAuth(`/schedules?churchId=${encodeURIComponent(activeChurchId)}`,{ method: "GET" }).catch(() => []),
        apiFetchAuth(`/churches/${encodeURIComponent(activeChurchId)}/attendance`,{ method: "GET" }).catch(() => ({})),
      ]);

      // Normaliza membros
      const membersList  = Array.isArray(membersData) ? membersData : membersData?.items ?? membersData?.members ?? [];
      const cellsList    = Array.isArray(cellsData)   ? cellsData   : cellsData?.items   ?? cellsData?.cells     ?? [];
      const eventsList   = Array.isArray(eventsData)  ? eventsData  : eventsData?.items  ?? eventsData?.events   ?? [];
      const newsList     = Array.isArray(newsData)    ? newsData    : newsData?.items    ?? newsData?.posts      ?? [];
      const schedulesList= Array.isArray(schedulesData)?schedulesData:schedulesData?.items??schedulesData?.schedules??[];

      const now       = new Date();
      const thisMonth = now.getMonth();
      const thisYear  = now.getFullYear();

      const newThisMonth = membersList.filter((m) => {
        const d = new Date(m.createdAt ?? m.joinedAt ?? 0);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length;

      const newsThisMonth = newsList.filter((n) => {
        const d = new Date(n.publishedAt ?? n.createdAt ?? 0);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length;

      const activeCells = cellsList.filter((c) => c.isActive ?? c.active ?? true).length;

      // Weeks de presença — vem do endpoint dedicado ou do dashboard
      const rawWeeks =
        attendanceData?.weeks ??
        attendanceData?.attendanceWeeks ??
        dashboardData?.attendanceWeeks ??
        [];

      setStats(normalizeStats({
        totalMembers:     dashboardData?.membersCount   ?? membersList.length,
        activeMembers:    dashboardData?.activeMembers  ?? membersList.filter((m) => (m.status ?? "ACTIVE") === "ACTIVE").length,
        newMembersMonth:  newThisMonth,
        pendingApprovals: dashboardData?.pendingApprovals ?? dashboardData?.approvals ?? 0,
        totalCells:       dashboardData?.cellsCount     ?? cellsList.length,
        activeCells:      dashboardData?.activeCells    ?? activeCells,
        totalCellMembers: dashboardData?.cellMembersCount ?? cellsList.reduce((s, c) => s + safeNum(c.membersCount ?? c._count?.members), 0),
        meetingsThisMonth:dashboardData?.meetingsThisMonth ?? 0,
        attendanceWeeks:  rawWeeks,
        totalEvents:      dashboardData?.eventsCount    ?? eventsList.length,
        upcomingEvents:   eventsList.filter((e) => new Date(e.dateLabel ?? e.date ?? 0) >= now).length,
        avgEventAttendance: dashboardData?.avgEventAttendance ?? 0,
        totalNews:        dashboardData?.newsCount      ?? newsList.length,
        publishedNews:    newsList.filter((n) => n.active ?? true).length,
        newsThisMonth,
        totalSchedules:   dashboardData?.schedulesCount ?? schedulesList.length,
        pendingSchedules: dashboardData?.pendingSchedules ?? 0,
      }));
    } catch (e) {
      setError(e?.message || "Não foi possível carregar os relatórios.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetchAuth, activeChurchId]);

  useEffect(() => { loadReports(); }, [loadReports]);

  // ── Dados derivados ───────────────────────────────────────────────────────
  const memberActivityPct = useMemo(() => pct(stats?.activeMembers, stats?.totalMembers), [stats]);
  const cellOccupancyPct  = useMemo(() => pct(stats?.totalCellMembers, stats?.totalMembers), [stats]);
  const cellActivePct     = useMemo(() => pct(stats?.activeCells, stats?.totalCells), [stats]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={BRAND} size="large" />
        <Text style={s.loadingText}>Carregando relatórios...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadReports({ isRefresh: true })}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
      >
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={[s.blob, { width: 200, height: 200, top: -60, right: -50 }]} />
          <View style={[s.blob, { width: 130, height: 130, bottom: -50, left: -30, opacity: 0.05 }]} />

          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <Icon source="chart-box-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroGreet}>Painel de</Text>
              <Text style={s.heroTitle}>Relatórios</Text>
            </View>
          </View>

          <Text style={s.heroSubtitle}>
            Visão geral de {t.member.toLowerCase()}s, {t.cell.toLowerCase()}, eventos, {t.news.toLowerCase()} e {t.schedule.toLowerCase()}s.
          </Text>

          {/* Pills de resumo rápido */}
          <View style={s.heroPills}>
            {stats && (
              <>
                <View style={s.heroPill}>
                  <View style={[s.pillDot, { backgroundColor: "#7EFFD4" }]} />
                  <Text style={s.heroPillText}>{fmtBR(stats.totalMembers)} {t.member.toLowerCase()}s</Text>
                </View>
                <View style={s.heroPill}>
                  <View style={[s.pillDot, { backgroundColor: "#A8BFFF" }]} />
                  <Text style={s.heroPillText}>{fmtBR(stats.totalCells)} {t.cell.toLowerCase()}</Text>
                </View>
                <View style={s.heroPill}>
                  <View style={[s.pillDot, { backgroundColor: "#FFD97D" }]} />
                  <Text style={s.heroPillText}>{fmtBR(stats.totalEvents)} eventos</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Erro ──────────────────────────────────────────────────────── */}
        {!!error && (
          <View style={s.errorBanner}>
            <Icon source="alert-circle-outline" size={18} color={DANGER} />
            <Text style={s.errorText}>{error}</Text>
            <TouchableRipple onPress={() => loadReports()} borderless style={s.retryBtn}>
              <Text style={s.retryText}>Tentar</Text>
            </TouchableRipple>
          </View>
        )}

        {stats && (
          <>
            {/* ── Destaques ─────────────────────────────────────────────── */}
            <SectionLabel title="DESTAQUES DO MÊS" />
            <View style={s.highlightGrid}>
              <HighlightCard
                icon="account-plus-outline"
                value={stats.newMembersMonth}
                label={`Novos ${t.member.toLowerCase()}s`}
                description="Entraram este mês"
                color={SUCCESS}
                bg={SUCCESS_BG}
              />
              <HighlightCard
                icon="account-clock-outline"
                value={stats.pendingApprovals}
                label="Aguardando aprovação"
                description={`Solicita${stats.pendingApprovals === 1 ? "ção" : "ções"} pendente${stats.pendingApprovals === 1 ? "" : "s"}`}
                color={stats.pendingApprovals > 0 ? WARNING : MUTED}
                bg={stats.pendingApprovals > 0 ? WARNING_BG : BG}
              />
              <HighlightCard
                icon="home-group"
                value={stats.meetingsThisMonth}
                label={`${t.cellMeeting}s realizadas`}
                description="Este mês"
                color={BRAND}
                bg={BRAND_LIGHT}
              />
              <HighlightCard
                icon="bullhorn-outline"
                value={stats.newsThisMonth}
                label={`${t.news} publicados`}
                description="Este mês"
                color={CYAN}
                bg={CYAN_BG}
              />
            </View>

            {/* ── Membros ───────────────────────────────────────────────── */}
            <SectionLabel title={`${t.member.toUpperCase()}S`} />
            <Surface elevation={0} style={s.card}>
              <SectionHeader
                icon="account-group-outline"
                title={`${t.member}s`}
                subtitle="Cadastro, atividade e aprovações"
                iconColor={BRAND}
                iconBg={BRAND_LIGHT}
              />
              <Divider style={s.divider} />

              {/* Grid 2×2 */}
              <View style={s.statGrid}>
                <StatCard
                  label="Total"
                  value={stats.totalMembers}
                  icon="account-group-outline"
                  color={BRAND} bg={BRAND_LIGHT}
                />
                <StatCard
                  label="Ativos"
                  value={stats.activeMembers}
                  icon="account-check-outline"
                  color={SUCCESS} bg={SUCCESS_BG}
                  helper={`${memberActivityPct}% do total`}
                  helperColor={SUCCESS}
                />
                <StatCard
                  label="Novos este mês"
                  value={stats.newMembersMonth}
                  icon="account-plus-outline"
                  color={WARNING} bg={WARNING_BG}
                />
                <StatCard
                  label="Pendentes"
                  value={stats.pendingApprovals}
                  icon="account-clock-outline"
                  color={stats.pendingApprovals > 0 ? DANGER : MUTED}
                  bg={stats.pendingApprovals > 0 ? DANGER_BG : BG}
                />
              </View>

              <Divider style={[s.divider, { marginTop: 12 }]} />

              {/* Barra de atividade */}
              <View style={s.cardSection}>
                <View style={s.progressRow}>
                  <Text style={s.progressLabel}>Taxa de atividade</Text>
                  <Text style={[s.progressValue, { color: SUCCESS }]}>{memberActivityPct}%</Text>
                </View>
                <ProgressBar value={memberActivityPct} color={SUCCESS} height={8} />
              </View>
            </Surface>

            {/* ── Células ───────────────────────────────────────────────── */}
            <SectionLabel title={t.cell.toUpperCase()} />
            <Surface elevation={0} style={s.card}>
              <SectionHeader
                icon="home-group"
                title={t.cell}
                subtitle={`${t.cellLeader}s, participantes e ${t.cellMeeting.toLowerCase()}s`}
                iconColor={SUCCESS}
                iconBg={SUCCESS_BG}
              />
              <Divider style={s.divider} />

              <View style={s.statGrid}>
                <StatCard
                  label="Total"
                  value={stats.totalCells}
                  icon="home-group"
                  color={SUCCESS} bg={SUCCESS_BG}
                />
                <StatCard
                  label="Ativas"
                  value={stats.activeCells}
                  icon="home-heart-outline"
                  color={BRAND} bg={BRAND_LIGHT}
                  helper={`${cellActivePct}% do total`}
                  helperColor={BRAND}
                />
                <StatCard
                  label={`${t.member}s em ${t.cell.toLowerCase()}`}
                  value={stats.totalCellMembers}
                  icon="account-multiple-outline"
                  color={PURPLE} bg={PURPLE_BG}
                />
                <StatCard
                  label={`${t.cellMeeting}s este mês`}
                  value={stats.meetingsThisMonth}
                  icon="calendar-check-outline"
                  color={WARNING} bg={WARNING_BG}
                />
              </View>

              <Divider style={[s.divider, { marginTop: 12 }]} />

              <View style={s.cardSection}>
                <MetricRow
                  icon="home-group"       label={`${t.cell} ativas`}
                  value={stats.activeCells}     total={stats.totalCells}
                  color={SUCCESS}   bg={SUCCESS_BG}
                />
                <MetricRow
                  icon="account-multiple-outline" label={`${t.member}s engajados em ${t.cell.toLowerCase()}`}
                  value={stats.totalCellMembers} total={stats.totalMembers}
                  color={PURPLE}    bg={PURPLE_BG}   last
                />
              </View>

              {/* Gráfico de presença semanal */}
              {stats.attendanceWeeks?.length > 0 && (
                <>
                  <Divider style={s.divider} />
                  <View style={s.cardSection}>
                    <Text style={s.chartTitle}>Presença nas últimas semanas</Text>
                    <BarChart weeks={stats.attendanceWeeks} color={SUCCESS} />
                  </View>
                </>
              )}
            </Surface>

            {/* ── Eventos ───────────────────────────────────────────────── */}
            <SectionLabel title="EVENTOS" />
            <Surface elevation={0} style={s.card}>
              <SectionHeader
                icon="calendar-star-outline"
                title="Eventos"
                subtitle={`Próximos, realizados e participação média`}
                iconColor={WARNING}
                iconBg={WARNING_BG}
              />
              <Divider style={s.divider} />

              <View style={s.statGrid}>
                <StatCard
                  label="Total"
                  value={stats.totalEvents}
                  icon="calendar-outline"
                  color={WARNING} bg={WARNING_BG}
                />
                <StatCard
                  label="Próximos"
                  value={stats.upcomingEvents}
                  icon="calendar-clock-outline"
                  color={BRAND} bg={BRAND_LIGHT}
                />
                <StatCard
                  label="Participação média"
                  value={stats.avgEventAttendance}
                  icon="account-group-outline"
                  color={SUCCESS} bg={SUCCESS_BG}
                  helper="por evento"
                />
                <StatCard
                  label={`${t.schedule}s pendentes`}
                  value={stats.pendingSchedules}
                  icon="calendar-alert"
                  color={stats.pendingSchedules > 0 ? DANGER : MUTED}
                  bg={stats.pendingSchedules > 0 ? DANGER_BG : BG}
                />
              </View>
            </Surface>

            {/* ── Avisos ────────────────────────────────────────────────── */}
            <SectionLabel title={t.news.toUpperCase()} />
            <Surface elevation={0} style={s.card}>
              <SectionHeader
                icon="bullhorn-outline"
                title={t.news}
                subtitle="Comunicação com a comunidade"
                iconColor={CYAN}
                iconBg={CYAN_BG}
              />
              <Divider style={s.divider} />

              <View style={s.cardSection}>
                <MetricRow
                  icon="text-box-check-outline" label={`${t.news} publicados`}
                  value={stats.publishedNews}    total={stats.totalNews}
                  color={SUCCESS}  bg={SUCCESS_BG}
                />
                <MetricRow
                  icon="calendar-today"           label="Publicados este mês"
                  value={stats.newsThisMonth}     total={stats.totalNews}
                  color={CYAN}     bg={CYAN_BG}   last
                />
              </View>

              <Divider style={s.divider} />

              <View style={s.statGrid}>
                <StatCard
                  label="Total de avisos"
                  value={stats.totalNews}
                  icon="bullhorn-outline"
                  color={CYAN} bg={CYAN_BG}
                />
                <StatCard
                  label="Este mês"
                  value={stats.newsThisMonth}
                  icon="calendar-today"
                  color={BRAND} bg={BRAND_LIGHT}
                />
              </View>
            </Surface>

            {/* ── Escalas ───────────────────────────────────────────────── */}
            <SectionLabel title={`${t.schedule.toUpperCase()}S`} />
            <Surface elevation={0} style={s.card}>
              <SectionHeader
                icon="calendar-check-outline"
                title={`${t.schedule}s`}
                subtitle={`Serviço e voluntariado nos eventos`}
                iconColor={PURPLE}
                iconBg={PURPLE_BG}
              />
              <Divider style={s.divider} />

              <View style={s.statGrid}>
                <StatCard
                  label={`Total de ${t.schedule.toLowerCase()}s`}
                  value={stats.totalSchedules}
                  icon="calendar-check-outline"
                  color={PURPLE} bg={PURPLE_BG}
                />
                <StatCard
                  label="Confirmações pendentes"
                  value={stats.pendingSchedules}
                  icon="calendar-alert"
                  color={stats.pendingSchedules > 0 ? WARNING : MUTED}
                  bg={stats.pendingSchedules > 0 ? WARNING_BG : BG}
                />
              </View>
            </Surface>
          </>
        )}

        {/* Estado vazio quando não há dados */}
        {!stats && !loading && !error && (
          <Surface elevation={0} style={s.emptyCard}>
            <Icon source="chart-box-outline" size={44} color={MUTED} />
            <Text style={s.emptyTitle}>Sem dados disponíveis</Text>
            <Text style={s.emptyDesc}>Os relatórios aparecerão aqui conforme a igreja for sendo utilizada.</Text>
          </Surface>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: BG },
  container: { padding: 16, paddingBottom: 32 },

  loadingText: { marginTop: 12, fontSize: 13, color: MUTED, fontWeight: "600" },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: NAVY,
    borderRadius: 22,
    padding: 18,
    marginBottom: 4,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios:     { shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  blob:     { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  heroTop:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12, zIndex: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  heroGreet:   { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.60)" },
  heroTitle:   { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.5, zIndex: 2 },
  heroSubtitle:{ fontSize: 11, color: "rgba(255,255,255,0.58)", lineHeight: 17, zIndex: 2, marginBottom: 10 },
  heroPills:   { flexDirection: "row", flexWrap: "wrap", gap: 8, zIndex: 2 },
  heroPill:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  pillDot:     { width: 6, height: 6, borderRadius: 999 },
  heroPillText:{ fontSize: 11, fontWeight: "700", color: "#fff" },

  // ── Erro ──────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: DANGER_BG, borderWidth: 1, borderColor: DANGER,
    borderRadius: 14, padding: 14, marginTop: 12,
  },
  errorText: { flex: 1, fontSize: 12, color: DANGER, fontWeight: "600" },
  retryBtn:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  retryText: { fontSize: 12, fontWeight: "800", color: DANGER },

  // ── Section label ─────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: MUTED,
    textTransform: "uppercase", marginTop: 20, marginBottom: 8, marginLeft: 2,
  },

  // ── Card base ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: "hidden",
    ...Platform.select({
      ios:     { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  cardSection: { padding: 14, gap: 10 },
  divider:     { backgroundColor: BORDER },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader:   { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  sectionIcon:     { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionTitle:    { fontSize: 15, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 11, color: MUTED, marginTop: 2 },

  // ── Stat cards (grid 2×2) ─────────────────────────────────────────────────
  statGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    padding: 12, paddingTop: 10,
  },
  statCard: {
    flex: 1, minWidth: "45%", maxWidth: "48%",
    backgroundColor: BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 10, gap: 2,
  },
  statIcon:   { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statValue:  { fontSize: 20, fontWeight: "900", color: NAVY, letterSpacing: -0.4 },
  statLabel:  { fontSize: 10, fontWeight: "700", color: MUTED, lineHeight: 14 },
  statHelper: { fontSize: 10, fontWeight: "700", marginTop: 2 },

  // ── Metric row ────────────────────────────────────────────────────────────
  metricRow:    { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  metricIcon:   { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  metricRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metricRowBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  metricLabel:  { fontSize: 12, fontWeight: "700", color: NAVY, flex: 1 },
  metricValue:  { fontSize: 13, fontWeight: "900" },
  metricPct:    { fontSize: 10, fontWeight: "800", color: MUTED, width: 30, textAlign: "right" },

  // ── Progress bar ──────────────────────────────────────────────────────────
  progressRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: "700", color: NAVY },
  progressValue: { fontSize: 12, fontWeight: "900" },

  // ── Highlight cards — linha horizontal compacta ──────────────────────────
  highlightGrid: { gap: 8 },                          // coluna única, empilhadas
  highlightCard: {
    flexDirection: "row",                              // ícone | textos lado a lado
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    borderLeftWidth: 4, padding: 12,
    ...Platform.select({
      ios:     { shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  highlightIcon:  { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  highlightValue: { fontSize: 18, fontWeight: "900", letterSpacing: -0.4 },
  highlightLabel: { fontSize: 12, fontWeight: "800", color: NAVY, marginTop: 1 },
  highlightDesc:  { fontSize: 10, color: MUTED, marginTop: 1 },

  // ── Chart ─────────────────────────────────────────────────────────────────
  chartTitle: { fontSize: 12, fontWeight: "800", color: NAVY, marginBottom: 4 },

  // ── Empty ─────────────────────────────────────────────────────────────────
  emptyCard: {
    alignItems: "center", gap: 10, padding: 32, marginTop: 16,
    backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1.5,
    borderStyle: "dashed", borderColor: BORDER,
  },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: NAVY },
  emptyDesc:  { fontSize: 12, color: MUTED, textAlign: "center", lineHeight: 19 },
});