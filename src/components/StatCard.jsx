import React from "react";
import { View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

export default function StatCard({ label, value, icon }) {
  const theme = useTheme();
  return (
    <Card style={{ flex: 1, borderRadius: 16 }}>
      <Card.Content>
        <Text style={{ opacity: 0.7 }}>{label}</Text>
        <Text variant="headlineMedium" style={{ color: theme.colors.primary, marginTop: 6 }}>
          {value}
        </Text>
        {icon ? <View style={{ marginTop: 8 }}>{icon}</View> : null}
      </Card.Content>
    </Card>
  );
}
