import React from "react";
import { ScrollView, View } from "react-native";
import { Button, Card, Icon, Surface, Text, useTheme } from "react-native-paper";
import StatCard from "../../components/StatCard";
import Section from "../../components/Section";

function Pill({ icon, label }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: theme.colors.primaryContainer,
      }}
    >
      <Icon source={icon} size={16} color={theme.colors.primary} />
      <Text style={{ color: theme.colors.primary, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

function Shortcut({ title, subtitle, icon, onPress, mode = "outlined" }) {
  const theme = useTheme();
  return (
    <Card
      mode={mode}
      style={[
        {
          width: "48%",
          borderRadius: 18,
          backgroundColor: theme.colors.surface,
        },
        mode === "outlined" && { borderColor: theme.colors.outlineVariant },
      ]}
      onPress={onPress}
    >
      <Card.Content style={{ gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primaryContainer,
          }}
        >
          <Icon source={icon} size={20} color={theme.colors.primary} />
        </View>

        <Text variant="titleMedium" style={{ fontWeight: "900" }} numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
          {subtitle}
        </Text>

        <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Abrir</Text>
          <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
        </View>
      </Card.Content>
    </Card>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const theme = useTheme();
  const styles = createStyles(theme);

  // 🔧 depois você puxa do back (contadores reais)
  const stats = {
    members: 248,
    cells: 12,

    // ✅ antes era schedulesPending
    eventsPending: 7, // ex.: confirmações/participações pendentes em eventos próximos

    approvals: 3,
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineMedium" style={styles.title}>
              Dashboard
            </Text>
            <Text style={styles.subtitle}>Visão geral, pendências e ações rápidas</Text>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Pill icon="shield-outline" label="Admin" />
              <Pill icon="church" label="Minha igreja" />
            </View>
          </View>

          <Button mode="text" onPress={() => navigation.navigate("Reports")} icon="chart-box-outline">
            Relatórios
          </Button>
        </View>

        {/* KPIs */}
        <Section title="Indicadores">
          <View style={styles.statsGrid}>
            <StatCard label="Membros" value={String(stats.members)} />
            <StatCard label="Células" value={String(stats.cells)} />
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="Eventos pendentes" value={String(stats.eventsPending)} />
            <StatCard label="Cadastros p/ aprovar" value={String(stats.approvals)} />
          </View>
        </Section>

        {/* Pendências */}
        <Section title="Pendências">
          <Surface style={styles.pending} elevation={0}>
            <View style={styles.pendingRow}>
              <View style={styles.pendingLeft}>
                <View style={styles.pendingIcon}>
                  <Icon source="calendar-alert" size={20} color={theme.colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                    Confirmações de evento
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {stats.eventsPending} pendente(s) nos próximos dias
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    Crie o evento, escolha os participantes e o app gera as escalas.
                  </Text>
                </View>
              </View>

              <Button
                mode="contained-tonal"
                onPress={() => navigation.navigate("EventsManageScreen")}
                style={{ borderRadius: 14 }}
              >
                Ver
              </Button>
            </View>

            <View style={{ height: 10 }} />

            <View style={styles.pendingRow}>
              <View style={styles.pendingLeft}>
                <View style={styles.pendingIcon}>
                  <Icon source="account-check-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                    Aprovações
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {stats.approvals} solicitação(ões) aguardando
                  </Text>
                </View>
              </View>

              <Button
                mode="contained-tonal"
                onPress={() => navigation.navigate("MembersManage")}
                style={{ borderRadius: 14 }}
              >
                Revisar
              </Button>
            </View>
          </Surface>
        </Section>

        {/* Ações rápidas */}
        <Section title="Gerenciar">
          <View style={styles.shortcutsGrid}>
            <Shortcut
              title="Membros"
              subtitle="Cadastrar, editar e permissões"
              icon="account-group-outline"
              onPress={() => navigation.navigate("MembersManage")}
            />

            {/* ✅ antes: Escalas */}
            <Shortcut
              title="Eventos"
              subtitle="Criar eventos, escolher participantes e gerar escalas"
              icon="calendar-star-outline"
              onPress={() => navigation.navigate("EventComposerScreen")}
            />

            <Shortcut
              title="Células"
              subtitle="Cadastro, líderes e participantes"
              icon="home-group"
              onPress={() => navigation.navigate("CellsManage")}
            />

            <Shortcut
              title="Ministérios"
              subtitle="Criar e gerenciar equipes"
              icon="layers-outline"
              onPress={() => navigation.navigate("MinistriesManage")}
            />

            <Shortcut
              title="Publicar"
              subtitle="Criar aviso/novidade para a igreja"
              icon="bullhorn-outline"
              onPress={() => navigation.navigate("NewsComposer")}
              mode="outlined"
            />
          </View>

          {/* ✅ CTA principal trocada para Eventos (mantém “Publicar” como atalho) */}
          <Card mode="outlined" style={styles.bigAction}>
            <Card.Content style={{ gap: 10 }}>
              <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                Criar evento
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Defina data, selecione participantes e gere as escalas automaticamente.
              </Text>

              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button
                  mode="contained"
                  icon="plus"
                  // se você tiver EventForm, use isso:
                  // onPress={() => navigation.navigate("EventForm")}
                  onPress={() => navigation.navigate("EventsManageScreen")}
                  style={{ borderRadius: 16, alignSelf: "flex-start" }}
                  contentStyle={{ height: 46 }}
                >
                  Novo evento
                </Button>

                <Button
                  mode="contained-tonal"
                  icon="calendar"
                  onPress={() => navigation.navigate("EventsManageScreen")}
                  style={{ borderRadius: 16, alignSelf: "flex-start" }}
                  contentStyle={{ height: 46 }}
                >
                  Ver eventos
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Section>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(theme) {
  return {
    root: { flex: 1, backgroundColor: theme.colors.background },
    container: { padding: 16, paddingBottom: 28 },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 12,
    },
    title: {
      fontWeight: "900",
      letterSpacing: -0.6,
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
      lineHeight: 18,
    },

    statsGrid: { flexDirection: "row", gap: 12, marginTop: 12 },

    pending: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
    },
    pendingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    pendingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    pendingIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primaryContainer,
    },

    shortcutsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },

    bigAction: {
      marginTop: 12,
      borderRadius: 18,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
  };
}