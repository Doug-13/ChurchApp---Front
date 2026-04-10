import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Icon,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

function StatusPill({ status }) {
  const theme = useTheme();

  const cfg = useMemo(() => {
    const s = String(status || "").toLowerCase();
    if (s.includes("confirm")) {
      return {
        label: "Confirmado",
        icon: "check-circle-outline",
        bg: theme.colors.secondaryContainer ?? theme.colors.primaryContainer,
        fg: theme.colors.secondary ?? theme.colors.primary,
      };
    }
    if (s.includes("cancel")) {
      return {
        label: "Cancelado",
        icon: "close-circle-outline",
        bg: theme.colors.errorContainer ?? theme.colors.surfaceVariant,
        fg: theme.colors.error,
      };
    }
    return {
      label: "Pendente",
      icon: "clock-outline",
      bg: theme.colors.primaryContainer,
      fg: theme.colors.primary,
    };
  }, [status, theme.colors]);

  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Icon source={cfg.icon} size={16} color={cfg.fg} />
      <Text style={{ color: cfg.fg, fontWeight: "800" }}>{cfg.label}</Text>
    </View>
  );
}

function parseTitle(title = "") {
  // "Louvor • Domingo 19h" => { ministry: "Louvor", when: "Domingo 19h" }
  const parts = String(title).split("•").map((p) => p.trim());
  return { ministry: parts[0] || title, when: parts[1] || "" };
}

export default function MySchedulesScreen({ navigation }) {
  const theme = useTheme();

  const items = [
    { id: "s1", title: "Louvor • Domingo 19h", status: "Pendente" },
    { id: "s2", title: "Mídia • Quarta 20h", status: "Confirmado" },
  ];

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchText = !q || it.title.toLowerCase().includes(q);
      const st = String(it.status || "").toLowerCase();

      const matchStatus =
        filter === "Todos" ||
        (filter === "Pendentes" && st.includes("pend")) ||
        (filter === "Confirmados" && st.includes("confirm"));

      return matchText && matchStatus;
    });
  }, [items, query, filter]);

  const totalPendentes = useMemo(() => {
    return items.filter((i) => String(i.status).toLowerCase().includes("pend")).length;
  }, [items]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: "800" }}>
          Minhas escalas
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          {totalPendentes > 0
            ? `Você tem ${totalPendentes} pendente(s) para confirmar.`
            : "Tudo certo! Nenhuma confirmação pendente."}
        </Text>
      </View>

      {/* Search */}
      <TextInput
        mode="outlined"
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por ministério ou dia..."
        left={<TextInput.Icon icon="magnify" />}
        style={styles.search}
      />

      {/* Filters */}
      <View style={styles.chipsRow}>
        {["Todos", "Pendentes", "Confirmados"].map((f) => (
          <Chip
            key={f}
            selected={filter === f}
            onPress={() => setFilter(f)}
            mode={filter === f ? "flat" : "outlined"}
            style={styles.chip}
          >
            {f}
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
            <Icon source="calendar-remove-outline" size={22} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ marginTop: 10 }}>
              Nenhuma escala encontrada
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: "center" }}>
              Tente ajustar a busca ou o filtro.
            </Text>
          </Surface>
        }
        renderItem={({ item }) => {
          const { ministry, when } = parseTitle(item.title);
          const isPending = String(item.status || "").toLowerCase().includes("pend");

          return (
            <Card
              mode="outlined"
              style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
              onPress={() => navigation.navigate("ScheduleDetails", { id: item.id })}
            >
              <Card.Content style={{ gap: 10 }}>
                {/* Top */}
                <View style={styles.topRow}>
                  <View style={styles.leftRow}>
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: theme.colors.primaryContainer },
                      ]}
                    >
                      <Icon source="calendar-check-outline" size={20} color={theme.colors.primary} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ fontWeight: "800" }} numberOfLines={1}>
                        {ministry}
                      </Text>

                      {!!when && (
                        <View style={styles.metaRow}>
                          <Icon source="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
                          <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                            {when}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <StatusPill status={item.status} />
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <Button
                    mode="text"
                    onPress={() => navigation.navigate("ScheduleDetails", { id: item.id })}
                    icon="chevron-right"
                    contentStyle={{ flexDirection: "row-reverse" }}
                  >
                    Ver detalhes
                  </Button>

                  {isPending ? (
                    <Button
                      mode="contained"
                      onPress={() => {}}
                      style={{ borderRadius: 14 }}
                      icon="check"
                    >
                      Confirmar
                    </Button>
                  ) : (
                    <Button mode="outlined" disabled style={{ borderRadius: 14 }}>
                      Confirmado
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        }}
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
    alignItems: "flex-start",
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

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },

  empty: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },
});
