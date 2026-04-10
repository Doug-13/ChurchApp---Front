import React from "react";
import { View } from "react-native";
import { Card, Text, Switch } from "react-native-paper";

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Card style={{ borderRadius: 16 }}>
        <Card.Content>
          <Text variant="titleLarge">Configurações</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
            <Text>Notificações</Text>
            <Switch value />
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}
