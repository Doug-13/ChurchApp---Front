import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Icon,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

function StatusPill({ status }) {
  const theme = useTheme();
  const isActive = String(status || "").toLowerCase().includes("ativ");

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: isActive
            ? theme.colors.secondaryContainer ?? theme.colors.primaryContainer
            : theme.colors.errorContainer ?? theme.colors.surfaceVariant,
        },
      ]}
    >
      <Icon
        source={isActive ? "check-circle-outline" : "close-circle-outline"}
        size={16}
        color={isActive ? theme.colors.secondary ?? theme.colors.primary : theme.colors.error}
      />
      <Text
        style={{
          fontWeight: "900",
          color: isActive ? theme.colors.secondary ?? theme.colors.primary : theme.colors.error,
        }}
      >
        {isActive ? "Ativo" : "Inativo"}
      </Text>
    </View>
  );
}

export default function MembersManageScreen({ navigation }) {
  const theme = useTheme();

  // 🔧 depois substitua por dados reais do Firestore
  const members = [
    {
      id: "m1",
      name: "Ana Souza",
      status: "Ativo",
      photoUrl: null, // "https://..." (Firebase Storage)
      email: "ana@email.com",
      phone: "(51) 99999-9999",
    },
    {
      id: "m2",
      name: "Carlos Lima",
      status: "Ativo",
      photoUrl: null,
      email: "carlos@email.com",
      phone: "(51) 98888-8888",
    },
  ];

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        String(m.email || "").toLowerCase().includes(q) ||
        String(m.phone || "").toLowerCase().includes(q)
    );
  }, [members, query]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Top actions */}
      <View style={styles.topRow}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate("MemberForm")}
          style={{ borderRadius: 16 }}
          contentStyle={{ height: 46 }}
        >
          Novo membro
        </Button>
      </View>

      {/* Search */}
      <TextInput
        mode="outlined"
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por nome, e-mail ou telefone..."
        left={<TextInput.Icon icon="magnify" />}
        style={{ marginBottom: 12 }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <Card
            mode="outlined"
            style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
            onPress={() => navigation.navigate("MemberAdminDetails", { id: item.id })}
          >
            <Card.Content style={styles.row}>
              {/* Foto */}
              {item.photoUrl ? (
                <Avatar.Image size={48} source={{ uri: item.photoUrl }} />
              ) : (
                <Avatar.Icon
                  size={48}
                  icon="account"
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                  color={theme.colors.primary}
                />
              )}

              {/* Infos */}
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "900" }} numberOfLines={1}>
                  {item.name}
                </Text>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                  {!!item.email && (
                    <Chip compact icon="email-outline" style={{ borderRadius: 999 }}>
                      {item.email}
                    </Chip>
                  )}
                  {!!item.phone && (
                    <Chip compact icon="phone-outline" style={{ borderRadius: 999 }}>
                      {item.phone}
                    </Chip>
                  )}
                </View>
              </View>

              {/* Status + chevron */}
              <View style={{ alignItems: "flex-end", gap: 10 }}>
                <StatusPill status={item.status} />
                <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
              </View>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  topRow: { marginBottom: 10 },

  card: { borderRadius: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
});
