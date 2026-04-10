import React from "react";
import { View } from "react-native";
import { Avatar, Card, Text } from "react-native-paper";
import Section from "../../components/Section";

export default function MemberPublicProfileScreen({ route }) {
  const { id } = route.params || {};

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Card style={{ borderRadius: 16 }}>
        <Card.Content style={{ alignItems: "center", paddingVertical: 18 }}>
          <Avatar.Text size={72} label="AS" />
          <Text variant="titleLarge" style={{ marginTop: 10 }}>
            Ana Souza
          </Text>
          <Text style={{ opacity: 0.7 }}>Membro • Célula: Centro</Text>
        </Card.Content>
      </Card>

      <Section title="Contato">
        <Card style={{ borderRadius: 16 }}>
          <Card.Content>
            <Text>Telefone: (51) 99999-9999</Text>
            <Text style={{ marginTop: 6 }}>E-mail: ana@email.com</Text>
          </Card.Content>
        </Card>
      </Section>

      <Section title="Informações">
        <Card style={{ borderRadius: 16 }}>
          <Card.Content>
            <Text>ID: {id}</Text>
            <Text style={{ marginTop: 6 }}>Status: Ativo</Text>
          </Card.Content>
        </Card>
      </Section>
    </View>
  );
}
