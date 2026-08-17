// src/screens/admin/EventStatisticsDashboardScreen.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  ActivityIndicator,
  Button,
  Chip,
  Divider,
  Icon,
  IconButton,
  Searchbar,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import { useAuth } from "../../context/AuthContext";

const NAVY = "#1A2366";
const BRAND = "#4158D0";
const BRAND_BG = "#EEF0FA";
const SUCCESS = "#2DBF8A";
const SUCCESS_BG = "#E8F9F3";
const WARNING = "#F5A623";
const WARNING_BG = "#FEF5E7";
const PURPLE = "#7B61FF";
const PURPLE_BG = "#F3F0FF";
const DANGER = "#E84D4D";
const DANGER_BG = "#FEECEC";

const MONTH_NAMES = [
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

const FOLLOW_UP_LABELS = {
  NOT_REQUESTED: "Não solicitado",
  PENDING: "Aguardando contato",
  IN_CONTACT: "Em contato",
  COMPLETED: "Concluído",
  NO_INTEREST: "Sem interesse",
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function monthLabel(key) {
  const [year, month] = String(key || "").split("-").map(Number);
  if (!year || !month) return "Mês";
  return `${MONTH_NAMES[month - 1]} de ${year}`;
}

function shiftMonth(key, amount) {
  const [year, month] = String(key).split("-").map(Number);
  return monthKey(new Date(year, month - 1 + amount, 1));
}

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "");
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

function normalizePhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }
  return digits;
}

function initials(name) {
  return String(name || "V")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
}

function MetricCard({ icon, label, value, helper, color, background }) {
  return (
    <Surface elevation={0} style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: background }]}>
        <Icon source={icon} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{formatNumber(value)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {!!helper && <Text style={[styles.metricHelper, { color }]}>{helper}</Text>}
    </Surface>
  );
}

function InsightRow({ icon, title, description, color = BRAND, last = false }) {
  return (
    <View style={[styles.insightRow, !last && styles.rowBorder]}>
      <View style={[styles.insightIcon, { backgroundColor: `${color}18` }]}>
        <Icon source={icon} size={19} color={color} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightDescription}>{description}</Text>
      </View>
    </View>
  );
}

function LegendItem({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function EventChartRow({ item, maxAttendance }) {
  const totalWidth = maxAttendance
    ? Math.max(4, (Number(item.totalAttendance || 0) / maxAttendance) * 100)
    : 0;
  const visitorWidth = maxAttendance
    ? Math.max(0, (Number(item.visitorsCount || 0) / maxAttendance) * 100)
    : 0;

  return (
    <View style={styles.chartRow}>
      <View style={styles.chartHeader}>
        <View style={styles.flex}>
          <Text style={styles.chartEventTitle} numberOfLines={1}>
            {item.event?.title || "Evento"}
          </Text>
          <Text style={styles.chartEventDate}>{formatDate(item.event?.dateLabel)}</Text>
        </View>
        <Text style={styles.chartTotal}>{formatNumber(item.totalAttendance)}</Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.totalBar, { width: `${totalWidth}%` }]} />
      </View>
      <View style={styles.barTrackSmall}>
        <View style={[styles.visitorBar, { width: `${visitorWidth}%` }]} />
      </View>

      <View style={styles.chartCounts}>
        <Text style={styles.chartCountText}>{item.membersCount} membros</Text>
        <Text style={styles.chartCountText}>{item.visitorsCount} visitantes</Text>
        <Text style={styles.chartCountText}>{item.childrenCount} crianças</Text>
        <Text style={styles.chartCountText}>{item.decisionsCount} decisões</Text>
      </View>
    </View>
  );
}

function VisitorCard({ visitor, onWhatsApp }) {
  const hasPhone = Boolean(normalizePhone(visitor.phone));
  const status = FOLLOW_UP_LABELS[visitor.followUpStatus] || "Não informado";

  return (
    <Surface elevation={0} style={styles.visitorCard}>
      <View style={styles.visitorTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(visitor.name)}</Text>
        </View>

        <View style={styles.flex}>
          <Text style={styles.visitorName}>{visitor.name || "Visitante"}</Text>
          <Text style={styles.visitorEvent} numberOfLines={1}>
            {visitor.event?.title || "Evento"} • {formatDate(visitor.event?.dateLabel)}
          </Text>
        </View>

        {hasPhone && (
          <IconButton
            icon="whatsapp"
            iconColor="#128C7E"
            containerColor="#E7F8F3"
            size={21}
            onPress={() => onWhatsApp(visitor)}
          />
        )}
      </View>

      <View style={styles.visitorTags}>
        {visitor.firstVisit && (
          <Chip compact icon="account-star-outline" style={styles.tagFirstVisit}>
            Primeira visita
          </Chip>
        )}
        {visitor.wantsContact && (
          <Chip compact icon="account-heart-outline" style={styles.tagContact}>
            {status}
          </Chip>
        )}
      </View>

      {!!visitor.phone && (
        <View style={styles.detailLine}>
          <Icon source="phone-outline" size={16} color="#69708A" />
          <Text style={styles.detailText}>{visitor.phone}</Text>
        </View>
      )}
      {!!visitor.neighborhood && (
        <View style={styles.detailLine}>
          <Icon source="map-marker-outline" size={16} color="#69708A" />
          <Text style={styles.detailText}>{visitor.neighborhood}</Text>
        </View>
      )}
      {!!visitor.howKnewChurch && (
        <View style={styles.detailLine}>
          <Icon source="information-outline" size={16} color="#69708A" />
          <Text style={styles.detailText}>Conheceu por: {visitor.howKnewChurch}</Text>
        </View>
      )}
    </Surface>
  );
}

export default function EventStatisticsDashboardScreen() {
  const theme = useTheme();
  const {
    activeChurchId,
    apiFetchAuth,
    permissions,
    isOwner,
  } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  const canView =
    isOwner ||
    !!permissions?.canViewEventStatistics ||
    !!permissions?.canManageEventStatistics;

  const load = useCallback(
    async ({ refresh = false } = {}) => {
      if (!activeChurchId || !canView) {
        setLoading(false);
        return;
      }

      refresh ? setRefreshing(true) : setLoading(true);
      setError("");

      try {
        const response = await apiFetchAuth(
          `/churches/${encodeURIComponent(activeChurchId)}/events/statistics/dashboard?month=${encodeURIComponent(selectedMonth)}`,
          { method: "GET" },
        );
        setData(response || null);
      } catch (requestError) {
        setError(
          requestError?.message ||
            "Não foi possível carregar as estatísticas do mês.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeChurchId, apiFetchAuth, canView, selectedMonth],
  );

  useEffect(() => {
    load();
  }, [load]);

  const events = Array.isArray(data?.events) ? data.events : [];
  const visitors = Array.isArray(data?.visitors) ? data.visitors : [];
  const totals = data?.totals || {};
  const indicators = data?.indicators || {};

  const filteredVisitors = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return visitors.filter((visitor) => {
      if (onlyPending && visitor.followUpStatus !== "PENDING") return false;
      if (!term) return true;
      return [
        visitor.name,
        visitor.phone,
        visitor.neighborhood,
        visitor.event?.title,
      ].some((value) =>
        String(value || "").toLocaleLowerCase("pt-BR").includes(term),
      );
    });
  }, [onlyPending, search, visitors]);

  const maxAttendance = useMemo(
    () => Math.max(1, ...events.map((item) => Number(item.totalAttendance || 0))),
    [events],
  );

  const openWhatsApp = async (visitor) => {
    const phone = normalizePhone(visitor.phone);
    if (!phone) {
      Alert.alert("WhatsApp", "Este visitante não possui telefone cadastrado.");
      return;
    }

    const firstName = String(visitor.name || "").trim().split(/\s+/)[0] || "tudo bem";
    const message = encodeURIComponent(
      `Olá, ${firstName}! Tudo bem? Somos da igreja e ficamos felizes com a sua visita. Podemos ajudar em algo?`,
    );
    const url = `https://wa.me/${phone}?text=${message}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Não foi possível abrir o WhatsApp",
        "Confira se o aplicativo está instalado e se o telefone está correto.",
      );
    }
  };

  if (!canView) {
    return (
      <View style={styles.center}>
        <Icon source="shield-lock-outline" size={42} color={DANGER} />
        <Text style={styles.emptyTitle}>Acesso não autorizado</Text>
        <Text style={styles.emptyText}>
          Você não possui permissão para visualizar estatísticas de eventos.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.emptyText}>Carregando estatísticas...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load({ refresh: true })}
          colors={[BRAND]}
        />
      }
    >
      <Surface elevation={0} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon source="chart-timeline-variant" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <Text style={styles.heroTitle}>Estatísticas de eventos</Text>
          <Text style={styles.heroSubtitle}>
            Público, visitantes, decisões e acompanhamento.
          </Text>
        </View>
      </Surface>

      <Surface elevation={0} style={styles.monthSelector}>
        <IconButton
          icon="chevron-left"
          onPress={() => setSelectedMonth((current) => shiftMonth(current, -1))}
        />
        <View style={styles.monthCenter}>
          <Text style={styles.monthLabel}>{monthLabel(selectedMonth)}</Text>
          <Text style={styles.monthHint}>Toque nas setas para alterar</Text>
        </View>
        <IconButton
          icon="chevron-right"
          disabled={selectedMonth >= monthKey(new Date())}
          onPress={() => setSelectedMonth((current) => shiftMonth(current, 1))}
        />
      </Surface>

      {!!error && (
        <Surface elevation={0} style={styles.errorCard}>
          <Icon source="alert-circle-outline" size={22} color={DANGER} />
          <Text style={styles.errorText}>{error}</Text>
          <Button compact onPress={() => load()}>Tentar novamente</Button>
        </Surface>
      )}

      {!error && (
        <>
          <View style={styles.metricGrid}>
            <MetricCard icon="account-group-outline" label="Público total" value={totals.attendance} helper={`${data?.reportsCount || 0} eventos`} color={BRAND} background={BRAND_BG} />
            <MetricCard icon="account-plus-outline" label="Visitantes" value={totals.visitors} helper={`${indicators.visitorPercentage || 0}% do público`} color={PURPLE} background={PURPLE_BG} />
            <MetricCard icon="human-child" label="Crianças" value={totals.children} color={WARNING} background={WARNING_BG} />
            <MetricCard icon="heart-outline" label="Decisões" value={totals.decisions} helper={`${indicators.decisionPercentage || 0}% dos visitantes`} color={SUCCESS} background={SUCCESS_BG} />
          </View>

          <Text style={styles.sectionLabel}>INSIGHTS DO MÊS</Text>
          <Surface elevation={0} style={styles.card}>
            <InsightRow
              icon="chart-line"
              color={indicators.attendanceGrowth >= 0 ? SUCCESS : DANGER}
              title={`${indicators.attendanceGrowth >= 0 ? "+" : ""}${indicators.attendanceGrowth || 0}% no público`}
              description={`Comparação com ${monthLabel(data?.previousMonth).toLowerCase()}.`}
            />
            <InsightRow
              icon="account-star-outline"
              color={PURPLE}
              title={`${indicators.firstVisits || 0} primeiras visitas`}
              description={`${indicators.identificationPercentage || 0}% dos visitantes foram identificados.`}
            />
            <InsightRow
              icon="whatsapp"
              color="#128C7E"
              title={`${indicators.visitorsWithPhone || 0} contatos disponíveis`}
              description={`${indicators.pendingContacts || 0} pessoas aguardando acompanhamento.`}
            />
            <InsightRow
              icon="trophy-outline"
              color={WARNING}
              title={data?.bestEvent?.event?.title || "Sem evento de destaque"}
              description={
                data?.bestEvent
                  ? `Maior público do mês: ${data.bestEvent.totalAttendance} pessoas e ${data.bestEvent.visitorsCount} visitantes.`
                  : "Cadastre estatísticas para gerar este insight."
              }
              last
            />
          </Surface>

          <Text style={styles.sectionLabel}>PÚBLICO POR EVENTO</Text>
          <Surface elevation={0} style={styles.card}>
            <View style={styles.legend}>
              <LegendItem color={BRAND} label="Público total" />
              <LegendItem color={PURPLE} label="Visitantes" />
            </View>
            <Divider />
            {events.length ? (
              events.map((item, index) => (
                <React.Fragment key={item.event?.id || String(index)}>
                  <EventChartRow item={item} maxAttendance={maxAttendance} />
                  {index < events.length - 1 && <Divider />}
                </React.Fragment>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Icon source="chart-bar" size={34} color="#9AA0B6" />
                <Text style={styles.emptyTitle}>Nenhuma estatística neste mês</Text>
                <Text style={styles.emptyText}>
                  Registre os números nos detalhes dos eventos realizados.
                </Text>
              </View>
            )}
          </Surface>

          <View style={styles.visitorSectionHeader}>
            <View style={styles.flex}>
              <Text style={styles.sectionLabelNoMargin}>VISITANTES DO MÊS</Text>
              <Text style={styles.sectionSubtitle}>
                {filteredVisitors.length} de {visitors.length} visitantes identificados
              </Text>
            </View>
            <Chip
              selected={onlyPending}
              onPress={() => setOnlyPending((current) => !current)}
              icon="account-clock-outline"
            >
              Pendentes
            </Chip>
          </View>

          <Searchbar
            placeholder="Buscar nome, telefone, bairro ou evento"
            value={search}
            onChangeText={setSearch}
            style={styles.search}
            inputStyle={styles.searchInput}
          />

          {filteredVisitors.length ? (
            <View style={styles.visitorList}>
              {filteredVisitors.map((visitor) => (
                <VisitorCard
                  key={visitor.id}
                  visitor={visitor}
                  onWhatsApp={openWhatsApp}
                />
              ))}
            </View>
          ) : (
            <Surface elevation={0} style={styles.emptyCardStandalone}>
              <Icon source="account-search-outline" size={36} color="#9AA0B6" />
              <Text style={styles.emptyTitle}>Nenhum visitante encontrado</Text>
              <Text style={styles.emptyText}>
                Altere o mês ou os filtros para consultar outros registros.
              </Text>
            </Surface>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  container: { padding: 16, paddingBottom: 44, gap: 14 },
  hero: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 24, backgroundColor: NAVY },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  heroSubtitle: { color: "rgba(255,255,255,0.72)", marginTop: 3, fontSize: 12 },
  monthSelector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 18, borderWidth: 1, borderColor: "#E2E5EF", backgroundColor: "#FFFFFF" },
  monthCenter: { flex: 1, alignItems: "center" },
  monthLabel: { fontSize: 16, fontWeight: "900", color: NAVY },
  monthHint: { fontSize: 10, color: "#8B91A8", marginTop: 2 },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, backgroundColor: DANGER_BG },
  errorText: { flex: 1, color: DANGER, fontSize: 12 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "48.5%", padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "#E4E6EF", backgroundColor: "#FFFFFF" },
  metricIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  metricValue: { fontSize: 24, lineHeight: 28, fontWeight: "900", color: NAVY },
  metricLabel: { fontSize: 12, fontWeight: "700", color: "#515870", marginTop: 2 },
  metricHelper: { fontSize: 10, fontWeight: "700", marginTop: 5 },
  sectionLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: NAVY, marginTop: 4 },
  sectionLabelNoMargin: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: NAVY },
  sectionSubtitle: { fontSize: 11, color: "#858CA4", marginTop: 3 },
  card: { borderRadius: 20, borderWidth: 1, borderColor: "#E4E6EF", backgroundColor: "#FFFFFF", overflow: "hidden" },
  insightRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EF" },
  insightIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  insightTitle: { fontSize: 13, fontWeight: "900", color: NAVY },
  insightDescription: { fontSize: 11, color: "#737A91", marginTop: 3, lineHeight: 15 },
  legend: { flexDirection: "row", gap: 16, padding: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11, color: "#667088", fontWeight: "700" },
  chartRow: { padding: 14, gap: 7 },
  chartHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  chartEventTitle: { fontSize: 13, fontWeight: "800", color: NAVY },
  chartEventDate: { fontSize: 10, color: "#8A90A7", marginTop: 2 },
  chartTotal: { fontSize: 18, fontWeight: "900", color: BRAND },
  barTrack: { height: 10, borderRadius: 6, backgroundColor: "#EEF0F6", overflow: "hidden" },
  totalBar: { height: "100%", borderRadius: 6, backgroundColor: BRAND },
  barTrackSmall: { height: 5, borderRadius: 4, backgroundColor: "#F1EFFB", overflow: "hidden" },
  visitorBar: { height: "100%", borderRadius: 4, backgroundColor: PURPLE },
  chartCounts: { flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 3 },
  chartCountText: { fontSize: 9, color: "#757C92" },
  visitorSectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 5 },
  search: { borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E5EF", elevation: 0 },
  searchInput: { fontSize: 13, minHeight: 0 },
  visitorList: { gap: 10 },
  visitorCard: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "#E3E6EF", backgroundColor: "#FFFFFF" },
  visitorTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: PURPLE_BG },
  avatarText: { color: PURPLE, fontWeight: "900", fontSize: 13 },
  visitorName: { fontSize: 14, fontWeight: "900", color: NAVY },
  visitorEvent: { fontSize: 10, color: "#7B8299", marginTop: 3 },
  visitorTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tagFirstVisit: { backgroundColor: PURPLE_BG },
  tagContact: { backgroundColor: SUCCESS_BG },
  detailLine: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  detailText: { flex: 1, color: "#626A82", fontSize: 11 },
  emptyCard: { alignItems: "center", padding: 28, gap: 7 },
  emptyCardStandalone: { alignItems: "center", padding: 28, gap: 7, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3E6EF" },
  emptyTitle: { color: NAVY, fontSize: 14, fontWeight: "900", textAlign: "center" },
  emptyText: { color: "#7B8299", fontSize: 12, textAlign: "center", lineHeight: 17 },
});
