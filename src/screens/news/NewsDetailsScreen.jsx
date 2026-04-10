import React from "react";
import { View } from "react-native";
import { Card, Text } from "react-native-paper";

export default function NewsDetailsScreen({ route }) {
  const { id } = route.params || {};
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Card style={{ borderRadius: 16 }}>
        <Card.Content>
          <Text variant="headlineSmall">Detalhe do Post</Text>
          <Text style={{ opacity: 0.7, marginTop: 6 }}>Post ID: {id}</Text>
          <Text style={{ marginTop: 14 }}>
            Conteúdo do comunicado aqui (texto, imagem, links, anexos).
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}
