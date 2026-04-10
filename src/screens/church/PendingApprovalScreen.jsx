import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Icon,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

export default function PendingApprovalScreen({ route, navigation }) {
  const theme = useTheme();
  const church = route.params?.church;

  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    try {
      setRefreshing(true);

      // TODO: consultar se membership virou active
      // const status = await churchService.getMyMembershipStatus(church.id)
      // if (status === "active") navigation.reset({ index:0, routes:[{name:"HomeTab"}] })

      // MVP: mantém pendente
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate("ChurchOnboarding")} />
        <Appbar.Content title="Aguardando aprovação" />
      </Appbar.Header>

      <View style={{ padding: 16, gap: 12 }}>
        <Card style={{ borderRadius: 18 }}>
          <Card.Content style={{ gap: 10 }}>
            <View style={styles.row}>
              <Icon source="clock-outline" size={22} />
              <Text style={{ fontWeight: "900" }}>Solicitação enviada</Text>
            </View>

            <Text style={{ opacity: 0.75 }}>
              {church?.name
                ? `Sua entrada em “${church.name}” está pendente.`
                : "Sua entrada está pendente."}
            </Text>

            <Text style={{ opacity: 0.75 }}>
              Assim que um responsável aprovar, você terá acesso ao app da igreja.
            </Text>
          </Card.Content>
        </Card>

        <Surface style={[styles.box, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <Button
            mode="contained"
            onPress={handleRefresh}
            loading={refreshing}
            disabled={refreshing}
          >
            Atualizar status
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate("ChurchOnboarding")}
            style={{ marginTop: 6 }}
          >
            Escolher outra igreja
          </Button>

          {refreshing && (
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          )}
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 14, borderRadius: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
