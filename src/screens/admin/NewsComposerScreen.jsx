import React, { useState } from "react";
import { View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";

export default function NewsComposerScreen() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text variant="headlineSmall">Publicar Novidade</Text>

      <Card style={{ borderRadius: 16, marginTop: 12 }}>
        <Card.Content>
          <TextInput label="Título" value={title} onChangeText={setTitle} />
          <TextInput
            style={{ marginTop: 12 }}
            label="Conteúdo"
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={6}
          />
          <Button style={{ marginTop: 14 }} mode="contained" onPress={() => {}}>
            Publicar
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}
