import React, { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { Avatar, Card, Searchbar, Text } from "react-native-paper";

export default function DirectoryScreen({ navigation }) {
  const [q, setQ] = useState("");

  const data = useMemo(
    () => [
      { id: "1", name: "Ana Souza", role: "Membro" },
      { id: "2", name: "Carlos Lima", role: "Líder" },
      { id: "3", name: "Juliana Rocha", role: "Obreira" },
    ].filter((x) => x.name.toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Searchbar value={q} onChangeText={setQ} placeholder="Buscar membro..." />

      <FlatList
        style={{ marginTop: 12 }}
        data={data}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Card
            style={{ borderRadius: 16 }}
            onPress={() => navigation.navigate("MemberPublicProfile", { id: item.id })}
          >
            <Card.Title
              title={item.name}
              subtitle={item.role}
              left={() => <Avatar.Text size={42} label={item.name.slice(0, 2).toUpperCase()} />}
            />
          </Card>
        )}
      />
    </View>
  );
}
