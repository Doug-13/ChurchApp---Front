import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

export default function Section({ title, children }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text variant="titleMedium" style={{ marginBottom: 10 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}
