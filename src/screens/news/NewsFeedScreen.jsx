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

export default function NewsFeedScreen({ navigation }) {
  const theme = useTheme();

  const posts = [
    { id: "p1", title: "Campanha do Agasalho", date: "Hoje", type: "Ação social" },
    { id: "p2", title: "Culto de Jovens", date: "Sábado", type: "Evento" },
    { id: "p3", title: "Reunião de líderes", date: "Quinta", type: "Aviso" },
  ];

  const filters = ["Todos", "Aviso", "Evento", "Ação social"];
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("Todos");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return posts.filter((p) => {
      const matchText = !q || p.title.toLowerCase().includes(q);
      const matchType =
        active === "Todos" ||
        (active === "Aviso" && p.type === "Aviso") ||
        (active === "Evento" && p.type === "Evento") ||
        (active === "Ação social" && p.type === "Ação social");

      return matchText && matchType;
    });
  }, [posts, query, active]);

  function typeIcon(type) {
    if (type === "Evento") return "calendar-star";
    if (type === "Ação social") return "hand-heart";
    return "bullhorn-outline";
  }

  function typePillBg(type) {
    // usando cores do tema (sem hardcode)
    if (type === "Evento") return theme.colors.secondaryContainer ?? theme.colors.primaryContainer;
    if (type === "Ação social") return theme.colors.tertiaryContainer ?? theme.colors.primaryContainer;
    return theme.colors.primaryContainer;
  }

  function typePillColor(type) {
    if (type === "Evento") return theme.colors.secondary ?? theme.colors.primary;
    if (type === "Ação social") return theme.colors.tertiary ?? theme.colors.primary;
    return theme.colors.primary;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: "800" }}>
          Novidades
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          Avisos, eventos e comunicados da sua igreja
        </Text>
      </View>

      {/* Search */}
      <TextInput
        mode="outlined"
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por título..."
        left={<TextInput.Icon icon="magnify" />}
        style={styles.search}
      />

      {/* Filters */}
      <View style={styles.chipsRow}>
        {filters.map((f) => {
          const selected = active === f;
          return (
            <Chip
              key={f}
              selected={selected}
              onPress={() => setActive(f)}
              style={styles.chip}
              mode={selected ? "flat" : "outlined"}
            >
              {f}
            </Chip>
          );
        })}
      </View>

      {/* List */}
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
            <Icon source="text-search" size={22} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ marginTop: 10 }}>
              Nada por aqui
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: "center" }}>
              Não encontramos posts com esse filtro/busca.
            </Text>
          </Surface>
        }
        renderItem={({ item }) => (
          <Card
            mode="outlined"
            style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
            onPress={() => navigation.navigate("NewsDetails", { id: item.id })}
          >
            <Card.Content style={{ gap: 10 }}>
              {/* Top row */}
              <View style={styles.topRow}>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: typePillBg(item.type) },
                  ]}
                >
                  <Icon source={typeIcon(item.type)} size={16} color={typePillColor(item.type)} />
                  <Text style={{ color: typePillColor(item.type), fontWeight: "700" }}>
                    {item.type}
                  </Text>
                </View>

                <View style={styles.dateRow}>
                  <Icon source="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>{item.date}</Text>
                </View>
              </View>

              {/* Title */}
              <Text variant="titleMedium" style={{ fontWeight: "800" }}>
                {item.title}
              </Text>

              {/* Footer */}
              <View style={styles.footerRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Toque para ver detalhes
                </Text>
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
    gap: 10,
    flexWrap: "wrap",
  },

  pill: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  footerRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  empty: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },
});
