import React, { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { CommonActions } from "@react-navigation/native";

import { joinChurch as joinChurchApi } from "../../services/churchService";
import { useAuth } from "../../context/AuthContext";

function getTopNavigation(navigation) {
  let nav = navigation;
  while (nav?.getParent?.()) nav = nav.getParent();
  return nav;
}

function resetToAppHome(navigation) {
  const top = getTopNavigation(navigation);

  // ✅ Seu RootNavigator usa "App" para o AppTabs
  top.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: "App",
          state: {
            index: 0,
            routes: [{ name: "HomeTab" }],
          },
        },
      ],
    })
  );
}

export default function ChurchPublicProfileScreen({ route, navigation }) {
  const theme = useTheme();
  const { refreshMe } = useAuth();
  const church = route.params?.church;

  const [loading, setLoading] = useState(false);

  const subtitle = useMemo(() => {
    if (!church) return "";
    const c = church.city ?? "";
    const s = church.state ?? "";
    return [c, s].filter(Boolean).join(" • ");
  }, [church]);

  async function handleJoin() {
    try {
      setLoading(true);

      const result = await joinChurchApi(church.id);

      if (result?.status === "PENDING") {
        navigation.replace("PendingApproval", { church });
        return;
      }

      await refreshMe(); // <- isso é o gatilho real do RootNavigator

      // nada de reset aqui
    } catch (e) {
      console.log("JOIN ERROR:", e?.message || e);
    } finally {
      setLoading(false);
    }
  }

  if (!church) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Sem dados da igreja.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Perfil da igreja" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card style={styles.heroCard}>
          <Card.Content style={{ gap: 12 }}>
            <View style={styles.row}>
              {church.photoUrl ? (
                <Avatar.Image size={56} source={{ uri: church.photoUrl }} />
              ) : (
                <Avatar.Icon size={56} icon="church" />
              )}
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text variant="titleLarge" style={{ fontWeight: "900" }}>
                  {church.name}
                </Text>
                <Text style={{ opacity: 0.7 }}>{subtitle}</Text>
              </View>
            </View>

            <View style={styles.rowWrap}>
              <Chip compact icon="account-group">
                {(church.membersCount ?? 0) + " membros"}
              </Chip>

              <Chip
                compact
                icon={church.requiresApproval ? "shield-check" : "check-circle"}
              >
                {church.requiresApproval ? "Aprovação" : "Entrada direta"}
              </Chip>

              <Chip compact icon="eye">
                {church.isPublic ? "Perfil público" : "Privada"}
              </Chip>
            </View>

            <Divider />

            <Text style={{ opacity: 0.8 }}>
              {church.about || "Sem descrição disponível."}
            </Text>
          </Card.Content>
        </Card>

        <Surface style={[styles.actionBox, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <Text style={{ fontWeight: "900" }}>
            {church.requiresApproval ? "Solicitar entrada" : "Entrar na igreja"}
          </Text>
          <Text style={{ opacity: 0.7, marginTop: 6 }}>
            {church.requiresApproval
              ? "Sua solicitação será enviada para aprovação dos responsáveis."
              : "Você terá acesso imediato ao conteúdo e escalas desta igreja."}
          </Text>

          <Button
            mode="contained"
            onPress={handleJoin}
            loading={loading}
            disabled={loading}
            style={{ marginTop: 12 }}
          >
            {church.requiresApproval ? "Solicitar" : "Entrar"}
          </Button>

          <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 4 }}>
            Voltar
          </Button>

          {loading && (
            <View style={styles.centerInline}>
              <ActivityIndicator />
            </View>
          )}
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderRadius: 18 },
  actionBox: { padding: 14, borderRadius: 18 },
  row: { flexDirection: "row", alignItems: "center" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerInline: { paddingVertical: 10, alignItems: "center" },
});
