import React from "react";
import { ScrollView } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";

export default function ScheduleSelectMinistryScreen(props) {
  const theme = useTheme();

  const navigation = props && props.navigation ? props.navigation : null;

  const ministries = ["Louvor", "Mídia", "Recepção", "Intercessão"];

  function choose(ministryName) {
    if (!navigation || !navigation.navigate) return;
    navigation.navigate("ScheduleCreate", { ministry: { name: ministryName } });
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        gap: 12,
        backgroundColor: theme.colors.background,
      }}
    >
      <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
        Selecionar ministério
      </Text>

      {ministries.map(function (m) {
        return (
          <Card
            key={m}
            mode="outlined"
            onPress={function () {
              choose(m);
            }}
          >
            <Card.Content
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900" }}>{m}</Text>
              <Button mode="text" onPress={function () { choose(m); }}>
                Escolher
              </Button>
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
}
