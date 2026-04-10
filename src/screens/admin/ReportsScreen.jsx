import React from "react";
import { View } from "react-native";
import { Card, Text } from "react-native-paper";

export default function ReportsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Card style={{ borderRadius: 16 }}>
        <Card.Content>
          <Text variant="headlineSmall">Relatórios</Text>
          <Text style={{ opacity: 0.7, marginTop: 6 }}>
            Presença, crescimento, células, escalas e comunicados.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}
