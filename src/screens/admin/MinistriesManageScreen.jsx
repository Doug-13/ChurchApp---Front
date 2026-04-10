import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Icon,
  IconButton,
  Searchbar,
  Surface,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";

import { useAuth } from "../../context/AuthContext";

function EmptyState({ theme, title, description }) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        borderRadius: 16,
        backgroundColor: theme.colors.surfaceVariant,
        borderWidth: 2,
        borderColor: theme.colors.outlineVariant,
        borderStyle: "dashed",
        marginTop: 12,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.colors.surface,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Icon source="layers-outline" size={30} color={theme.colors.onSurfaceVariant} />
      </View>

      <Text variant="titleMedium" style={{ fontWeight: "900", textAlign: "center" }}>
        {title}
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 6 }}>
        {description}
      </Text>
    </View>
  );
}

export default function MinistriesManageScreen({ navigation }) {
  // ✅ mantém hooks sempre na mesma ordem
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const styles = createStyles(theme);

  const { activeChurchId, activeChurch, apiFetchAuth } = useAuth();
  const churchId = activeChurchId || activeChurch?.id || null;

  const apiGet = useCallback((path) => apiFetchAuth(path, { method: "GET" }), [apiFetchAuth]);

  const apiPatch = useCallback(
    (path, body) =>
      apiFetchAuth(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    [apiFetchAuth]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!churchId) {
        setItems([]);
        return;
      }

      // ✅ endpoint padrão
      const json = await apiGet(`/churches/${churchId}/ministries`);

      // aceita array puro ou { items: [] }
      const arr = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
      setItems(arr);
    } catch (e) {
      setItems([]);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [apiGet, churchId]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((m) => {
      const name = String(m?.name || "").toLowerCase();
      const desc = String(m?.description || "").toLowerCase();
      return name.includes(s) || desc.includes(s);
    });
  }, [items, q]);

  const onToggle = useCallback(
    async (item) => {
      if (!churchId) return;

      const current = !!(item?.active ?? true);
      const next = !current;

      // otimista
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, active: next } : x)));

      try {
        // ✅ ajuste aqui se seu backend usa outro campo (ex.: isActive)
        await apiPatch(`/churches/${churchId}/ministries/${item.id}`, { active: next });
      } catch (e) {
        // rollback
        setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, active: current } : x)));
      }
    },
    [apiPatch, churchId]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium" style={styles.title}>
            Ministérios
          </Text>
          <Text style={styles.subtitle}>Gerencie os ministérios da igreja e seus detalhes.</Text>
        </View>
        <IconButton icon="refresh" onPress={load} accessibilityLabel="Atualizar" />
      </View>

      {!churchId ? (
        <Surface style={styles.warnBox} elevation={0}>
          <Icon source="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={{ flex: 1, color: theme.colors.error }}>
            Nenhuma igreja ativa no contexto. Defina a igreja ativa antes de gerenciar ministérios.
          </Text>
        </Surface>
      ) : null}

      <View style={styles.topRow}>
        <Searchbar
          style={{ flex: 1 }}
          value={q}
          onChangeText={setQ}
          placeholder="Buscar ministério..."
          elevation={0}
        />

        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate("MinistryForm")}
          disabled={!churchId}
          contentStyle={{ paddingHorizontal: 6 }}
        >
          Novo
        </Button>
      </View>

      {error ? (
        <Surface style={styles.errorBox} elevation={0}>
          <Icon source="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={{ flex: 1, color: theme.colors.error }}>{error}</Text>
        </Surface>
      ) : null}

      {loading && items.length === 0 ? (
        <View style={{ paddingTop: 22, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          theme={theme}
          title={q.trim() ? "Nenhum resultado" : "Nenhum ministério ainda"}
          description={
            q.trim()
              ? "Tente buscar por outro termo."
              : "Crie seu primeiro ministério para começar a organizar equipes e funções."
          }
        />
      ) : (
        <FlatList
          style={{ marginTop: 12 }}
          contentContainerStyle={{ paddingBottom: 18 }}
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          refreshing={loading}
          onRefresh={load}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const isActive = !!(item?.active ?? true);

            return (
              <Card
                mode="outlined"
                style={styles.card}
                onPress={() => navigation.navigate("MinistryForm", { id: item.id })}
              >
                <Card.Title
                  title={item?.name || "Sem nome"}
                  titleStyle={styles.cardTitle}
                  subtitle={
                    item?.description?.trim?.()
                      ? item.description
                      : isActive
                        ? "Ativo"
                        : "Inativo"
                  }
                  subtitleStyle={styles.cardSubtitle}
                  left={() => (
                    <Avatar.Icon
                      size={44}
                      icon={() => <Icon source={item?.icon || "layers-outline"} size={20} color="#fff" />}
                      style={{ backgroundColor: item?.color || theme.colors.primary }}
                    />
                  )}
                  right={() => (
                    <View style={styles.rightArea}>
                      <Text style={styles.badgeText}>{isActive ? "Ativo" : "Inativo"}</Text>
                      <Switch value={isActive} onValueChange={() => onToggle(item)} />
                    </View>
                  )}
                />
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

function createStyles(theme) {
  return {
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.colors.background,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
    },
    title: {
      fontWeight: "900",
      letterSpacing: -0.6,
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
      lineHeight: 18,
    },

    warnBox: {
      marginTop: 10,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
    },

    errorBox: {
      marginTop: 10,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    card: {
      borderRadius: 16,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
    },
    cardTitle: {
      fontWeight: "900",
    },
    cardSubtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },

    rightArea: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 8,
      gap: 10,
    },
    badgeText: {
      opacity: 0.85,
      color: theme.colors.onSurfaceVariant,
      fontWeight: "700",
    },
  };
}