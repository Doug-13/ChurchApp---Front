import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import Section from "../../components/Section";

function StatusPill({ status = "Pendente" }) {
  const theme = useTheme();

  const cfg = useMemo(() => {
    const s = String(status).toLowerCase();
    if (s.includes("confirm")) {
      return {
        label: "Confirmado",
        icon: "check-circle-outline",
        bg: theme.colors.secondaryContainer ?? theme.colors.primaryContainer,
        fg: theme.colors.secondary ?? theme.colors.primary,
      };
    }
    if (s.includes("cancel")) {
      return {
        label: "Cancelado",
        icon: "close-circle-outline",
        bg: theme.colors.errorContainer ?? theme.colors.surfaceVariant,
        fg: theme.colors.error,
      };
    }
    return {
      label: "Pendente",
      icon: "clock-outline",
      bg: theme.colors.primaryContainer,
      fg: theme.colors.primary,
    };
  }, [status, theme.colors]);

  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Icon source={cfg.icon} size={16} color={cfg.fg} />
      <Text style={{ color: cfg.fg, fontWeight: "900" }}>{cfg.label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Icon source={icon} size={18} color={theme.colors.onSurfaceVariant} />
      <Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Text style={{ fontWeight: "800" }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function ScheduleDetailsScreen({ route, navigation }) {
  const theme = useTheme();
  const { id } = route.params || {};

  // 🔧 depois substitua por dados reais (Firestore/API)
  const schedule = {
    id,
    title: "Culto • Domingo 19:00",
    ministry: "Louvor",
    status: "Pendente",
    dateLabel: "Domingo",
    timeLabel: "19:00",
    location: "Templo Central",
    notes:
      "Chegar 30 min antes para passagem de som. Levar cabo P10 e afinador.",
    myRole: "Vocal",
  };

  const roles = [
    { role: "Vocal", person: "Ana", mine: true },
    { role: "Guitarra", person: "Carlos" },
    { role: "Som", person: "Juliana" },
    { role: "Bateria", person: "Marcos" },
  ];

  const isPending = String(schedule.status).toLowerCase().includes("pend");

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header / Resumo */}
        <Card
          mode="outlined"
          style={[styles.headerCard, { borderColor: theme.colors.outlineVariant }]}
        >
          <Card.Content style={{ gap: 12 }}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
                  Escala
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  ID: {schedule.id}
                </Text>
              </View>

              <StatusPill status={schedule.status} />
            </View>

            <Surface
              style={[
                styles.hero,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
              ]}
              elevation={0}
            >
              <View style={styles.heroLeft}>
                <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Icon source="calendar-check-outline" size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: "900" }} numberOfLines={1}>
                    {schedule.title}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Ministério: {schedule.ministry}
                  </Text>
                </View>
              </View>
            </Surface>

            <View style={{ gap: 8 }}>
              <InfoRow icon="calendar-outline" label="Dia" value={schedule.dateLabel} />
              <InfoRow icon="clock-outline" label="Horário" value={schedule.timeLabel} />
              <InfoRow icon="map-marker-outline" label="Local" value={schedule.location} />
            </View>
          </Card.Content>
        </Card>

        {/* Minha participação */}
        <Section title="Minha participação">
          <Card
            mode="outlined"
            style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
          >
            <Card.Content style={{ gap: 10 }}>
              <View style={styles.myRoleRow}>
                <View style={[styles.roleIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Icon source="account-star-outline" size={20} color={theme.colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                    Função: {schedule.myRole}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Confirme sua presença ou solicite troca
                  </Text>
                </View>
              </View>

              {!!schedule.notes && (
                <>
                  <Divider />
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontWeight: "900" }}>Observações</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                      {schedule.notes}
                    </Text>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        </Section>

        {/* Funções */}
        <Section title="Equipe e funções">
          <Card
            mode="outlined"
            style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
          >
            <Card.Content style={{ gap: 10 }}>
              {roles.map((r, idx) => (
                <View key={r.role}>
                  <View style={styles.roleRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                      <Icon
                        source={r.role === "Som" ? "volume-high" : "music-note-outline"}
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text style={{ fontWeight: "800" }}>{r.role}</Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                        • {r.person}
                      </Text>
                    </View>

                    {r.mine ? (
                      <Chip icon="star" compact style={{ borderRadius: 999 }}>
                        Eu
                      </Chip>
                    ) : null}
                  </View>
                  {idx < roles.length - 1 ? <Divider style={{ marginTop: 10 }} /> : null}
                </View>
              ))}
            </Card.Content>
          </Card>
        </Section>

        {/* Ações */}
        <View style={styles.actionsRow}>
          <Button
            mode="contained"
            style={{ flex: 1, borderRadius: 16 }}
            contentStyle={{ height: 50 }}
            icon="check"
            disabled={!isPending}
            onPress={() => {}}
          >
            Confirmar
          </Button>

          <Button
            mode="outlined"
            style={{ flex: 1, borderRadius: 16 }}
            contentStyle={{ height: 50 }}
            icon="swap-horizontal"
            onPress={() => navigation?.navigate?.("ScheduleSwap", { id: schedule.id })}
          >
            Solicitar troca
          </Button>
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, paddingBottom: 28 },

  headerCard: { borderRadius: 22 },
  headerTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  hero: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  heroLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  card: { borderRadius: 18 },

  myRoleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  roleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
});
