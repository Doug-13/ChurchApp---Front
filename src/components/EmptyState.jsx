import React from "react";
import { View } from "react-native";
import { Text, Button } from "react-native-paper";

export default function EmptyState({ title, subtitle, actionLabel, onAction }) {
  return (
    <View style={{ padding: 18, borderRadius: 16 }}>
      <Text variant="titleMedium">{title}</Text>
      {subtitle ? <Text style={{ opacity: 0.7, marginTop: 6 }}>{subtitle}</Text> : null}
      {actionLabel ? (
        <Button mode="contained" style={{ marginTop: 14 }} onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
