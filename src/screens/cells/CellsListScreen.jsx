import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Card,
  Chip,
  Icon,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

function CellCard({ item, onPress }) {
  const theme = useTheme();

  return (
    <Card
      mode="outlined"
      style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
      onPress={onPress}
    >
      <Card.Content style={{ gap: 10 }}>
        {/* Top */}
        <View style={styles.topRow}>
          <View style={styles.leftRow}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
              <Icon source="home-group" size={20} color={theme.colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: "800" }} numberOfLines={1}>
                {item.name}
              </Text>

              <View style={styles.metaRow}>
                <Icon source="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                  {item.day}
                </Text>
              </View>
            </View>
          </View>

          <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
        </View>

        {/* Extra info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Icon source="map-marker-outline" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {item.region}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Icon source="account-star-outline" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {item.leader}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Icon source="account-group-outline" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {item.members} membros
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function CellsListScreen({ navigation }) {
  const theme = useTheme();

  // 🔧 depois você puxa do Firestore
  const cells = [
    { id: "c1", name: "Célula Centro", day: "Quarta 20h", region: "Centro", leader: "Ana Souza", members: 18, type: "Adultos" },
    { id: "c2", name: "Célula Zona Sul", day: "Terça 19h", region: "Zona Sul", leader: "Carlos Lima", members: 12, type: "Jovens" },
    { id: "c3", name: "Célula Norte", day: "Sexta 20h", region: "Zona Norte", leader: "Mariana Silva", members: 15, type: "Famílias" },
  ];

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todas");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return cells.filter((c) => {
      const matchText =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.leader.toLowerCase().includes(q);

      const matchType = filter === "Todas" || c.type === filter;
      return matchText && matchType;
    });
  }, [cells, query, filter]);

  const types = useMemo(() => {
    const unique = Array.from(new Set(cells.map((c) => c.type)));
    return ["Todas", ...unique];
  }, [cells]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: "800" }}>
          Células
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          Encontre sua célula, veja líderes e horários
        </Text>
      </View>

      {/* Search */}
      <TextInput
        mode="outlined"
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por nome, região ou líder..."
        left={<TextInput.Icon icon="magnify" />}
        style={styles.search}
      />

      {/* Filters */}
      <View style={styles.chipsRow}>
        {types.map((t) => (
          <Chip
            key={t}
            selected={filter === t}
            onPress={() => setFilter(t)}
            mode={filter === t ? "flat" : "outlined"}
            style={styles.chip}
          >
            {t}
          </Chip>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <Surface
            style={[
              styles.empty,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
            ]}
            elevation={0}
          >
            <Icon source="home-search-outline" size={22} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ marginTop: 10 }}>
              Nenhuma célula encontrada
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: "center" }}>
              Ajuste a busca ou selecione outro filtro.
            </Text>
          </Surface>
        }
        renderItem={({ item }) => (
          <CellCard
            item={item}
            onPress={() => navigation.navigate("CellDetails", { id: item.id })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },

  header: { marginBottom: 12 },
  search: { marginTop: 6 },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: { borderRadius: 999 },

  card: { borderRadius: 18 },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  leftRow: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },

  empty: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },
});
