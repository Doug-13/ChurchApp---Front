import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

function Pill({ icon, label, tone = "primary" }) {
  const theme = useTheme();

  const bg =
    tone === "success"
      ? theme.colors.secondaryContainer ?? theme.colors.primaryContainer
      : tone === "danger"
      ? theme.colors.errorContainer ?? theme.colors.surfaceVariant
      : theme.colors.primaryContainer;

  const fg =
    tone === "success"
      ? theme.colors.secondary ?? theme.colors.primary
      : tone === "danger"
      ? theme.colors.error
      : theme.colors.primary;

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Icon source={icon} size={16} color={fg} />
      <Text style={{ color: fg, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Icon source={icon} size={18} color={theme.colors.onSurfaceVariant} />
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      </View>
      <Text style={{ fontWeight: "800" }} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

export default function MemberAdminDetailsScreen({ navigation, route }) {
  const theme = useTheme();
  const { id } = route.params || {};

  // 🔧 depois substitua por dados reais (Firestore/API)
  const member = useMemo(
    () => ({
      id,
      name: "Ana Souza",
      photoUrl: null, // "https://..." (Firebase Storage)
      role: "Obreira",
      status: "Ativo", // Ativo | Inativo
      email: "ana.souza@email.com",
      phone: "(51) 99999-9999",
      birthday: "12/09",
      address: "Centro • São Leopoldo",
      cell: { name: "Célula Centro", day: "Quarta 20h" },
      ministries: ["Louvor", "Recepção"],
      joinedAt: "10/2024",
      lastAccess: "Hoje 08:12",
      notes: "Disponível para escalas no domingo à noite.",
    }),
    [id]
  );

  const isActive = String(member.status).toLowerCase().includes("ativ");

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <Card mode="outlined" style={[styles.headerCard, { borderColor: theme.colors.outlineVariant }]}>
          <Card.Content style={{ gap: 12 }}>
            <View style={styles.headerTop}>
              {member.photoUrl ? (
                <Avatar.Image size={64} source={{ uri: member.photoUrl }} />
              ) : (
                <Avatar.Icon
                  size={64}
                  icon="account"
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                  color={theme.colors.primary}
                />
              )}

              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={{ fontWeight: "900" }} numberOfLines={1}>
                  {member.name}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                  ID: {member.id}
                </Text>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Pill icon="account-star-outline" label={member.role} />
                  <Pill
                    icon={isActive ? "check-circle-outline" : "close-circle-outline"}
                    label={member.status}
                    tone={isActive ? "success" : "danger"}
                  />
                </View>
              </View>

              <Button
                mode="text"
                icon="pencil-outline"
                onPress={() => navigation.navigate("MemberForm", { id: member.id })}
              >
                Editar
              </Button>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Button
                mode="contained"
                icon="pencil-outline"
                style={{ flex: 1, borderRadius: 16 }}
                contentStyle={{ height: 50 }}
                onPress={() => navigation.navigate("MemberForm", { id: member.id })}
              >
                Editar
              </Button>

              <Button
                mode="outlined"
                icon="whatsapp"
                style={{ flex: 1, borderRadius: 16 }}
                contentStyle={{ height: 50 }}
                onPress={() => {}}
              >
                WhatsApp
              </Button>
            </View>

            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Informações completas + vínculo com célula e ministérios.
            </Text>
          </Card.Content>
        </Card>

        {/* Informações principais */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Informações do membro
        </Text>

        <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
          <Card.Content style={{ gap: 10 }}>
            <InfoRow icon="email-outline" label="E-mail" value={member.email} />
            <Divider />
            <InfoRow icon="phone-outline" label="Telefone" value={member.phone} />
            <Divider />
            <InfoRow icon="cake-variant-outline" label="Aniversário" value={member.birthday} />
            <Divider />
            <InfoRow icon="map-marker-outline" label="Região" value={member.address} />
            <Divider />
            <InfoRow icon="calendar-outline" label="Membro desde" value={member.joinedAt} />
            <Divider />
            <InfoRow icon="clock-outline" label="Último acesso" value={member.lastAccess} />
          </Card.Content>
        </Card>

        {/* Vínculos */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Vínculos
        </Text>

        <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
          <Card.Content style={{ gap: 10 }}>
            <View style={styles.blockHeader}>
              <View style={[styles.blockIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="home-group" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                  Célula
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {member.cell?.name ? `${member.cell.name} • ${member.cell.day}` : "Sem célula vinculada"}
                </Text>
              </View>
              <Button
                mode="text"
                onPress={() => navigation.navigate("CellsManage")}
                icon="chevron-right"
                contentStyle={{ flexDirection: "row-reverse" }}
              >
                Ver
              </Button>
            </View>

            <Divider />

            <View style={styles.blockHeader}>
              <View style={[styles.blockIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="music-note-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "900" }}>
                  Ministérios
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {member.ministries?.length ? "Vínculos e escalas" : "Sem ministérios"}
                </Text>
              </View>
            </View>

            <View style={styles.chipsWrap}>
              {(member.ministries?.length ? member.ministries : ["—"]).map((m) => (
                <Chip key={m} style={{ borderRadius: 999 }} icon="tag-outline">
                  {m}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Observações */}
        {!!member.notes && (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Observações
            </Text>
            <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
              <Card.Content style={{ gap: 8 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                  {member.notes}
                </Text>
              </Card.Content>
            </Card>
          </>
        )}

        {/* Ações administrativas */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Ações administrativas
        </Text>

        <Surface
          style={[
            styles.adminActions,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
          elevation={0}
        >
          <View style={{ gap: 10 }}>
            <Button
              mode="contained-tonal"
              icon="lock-reset"
              onPress={() => {}}
              style={{ borderRadius: 16 }}
              contentStyle={{ height: 50 }}
            >
              Enviar redefinição de senha
            </Button>

            <Button
              mode="outlined"
              icon={isActive ? "account-off-outline" : "account-check-outline"}
              onPress={() => {}}
              style={{ borderRadius: 16 }}
              contentStyle={{ height: 50 }}
            >
              {isActive ? "Inativar membro" : "Reativar membro"}
            </Button>
          </View>
        </Surface>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, paddingBottom: 28 },

  headerCard: { borderRadius: 22 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  actionsRow: { flexDirection: "row", gap: 12 },

  sectionTitle: { marginTop: 16, marginBottom: 10, fontWeight: "900" },

  card: { borderRadius: 18 },

  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },

  blockHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  blockIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },

  adminActions: { borderWidth: 1, borderRadius: 18, padding: 14 },
});
