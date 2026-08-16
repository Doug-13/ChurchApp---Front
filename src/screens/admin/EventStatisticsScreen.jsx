import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  IconButton,
  Snackbar,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";

const EMPTY_COUNTS = {
  membersCount: "0",
  visitorsCount: "0",
  childrenCount: "0",
  decisionsCount: "0",
  followUpCount: "0",
};

const EMPTY_VISITOR = {
  name: "",
  phone: "",
  email: "",
  neighborhood: "",
  howKnewChurch: "",
  firstVisit: true,
  wantsContact: false,
  followUpStatus: "NOT_REQUESTED",
  notes: "",
};

function onlyNumber(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function toInt(value) {
  const parsed = Number.parseInt(String(value || "0"), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function VisitorCard({ visitor, index, onChange, onRemove, disabled }) {
  const update = (key, value) => onChange(index, { ...visitor, [key]: value });

  return (
    <Card mode="outlined" style={styles.visitorCard}>
      <Card.Title
        title={`Visitante ${index + 1}`}
        subtitle={visitor.name || "Ainda não identificado"}
        right={() => (
          <IconButton
            icon="trash-can-outline"
            disabled={disabled}
            onPress={() => onRemove(index)}
          />
        )}
      />
      <Card.Content style={styles.fields}>
        <TextInput
          mode="outlined"
          label="Nome *"
          value={visitor.name}
          disabled={disabled}
          onChangeText={(value) => update("name", value)}
        />
        <View style={styles.row}>
          <TextInput
            mode="outlined"
            label="Telefone"
            value={visitor.phone}
            disabled={disabled}
            keyboardType="phone-pad"
            onChangeText={(value) => update("phone", value)}
            style={styles.flex}
          />
          <TextInput
            mode="outlined"
            label="E-mail"
            value={visitor.email}
            disabled={disabled}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(value) => update("email", value)}
            style={styles.flex}
          />
        </View>
        <TextInput
          mode="outlined"
          label="Bairro"
          value={visitor.neighborhood}
          disabled={disabled}
          onChangeText={(value) => update("neighborhood", value)}
        />
        <TextInput
          mode="outlined"
          label="Como conheceu a igreja?"
          value={visitor.howKnewChurch}
          disabled={disabled}
          onChangeText={(value) => update("howKnewChurch", value)}
        />
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text variant="titleSmall">Primeira visita</Text>
            <Text variant="bodySmall">Marque quando for a primeira participação.</Text>
          </View>
          <Switch
            value={visitor.firstVisit}
            disabled={disabled}
            onValueChange={(value) => update("firstVisit", value)}
          />
        </View>
        <Divider />
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text variant="titleSmall">Solicitou acompanhamento</Text>
            <Text variant="bodySmall">Registre somente com ciência do visitante.</Text>
          </View>
          <Switch
            value={visitor.wantsContact}
            disabled={disabled}
            onValueChange={(value) => {
              update("wantsContact", value);
              onChange(index, {
                ...visitor,
                wantsContact: value,
                followUpStatus: value ? "PENDING" : "NOT_REQUESTED",
              });
            }}
          />
        </View>
        <TextInput
          mode="outlined"
          label="Observações do visitante"
          value={visitor.notes}
          disabled={disabled}
          multiline
          onChangeText={(value) => update("notes", value)}
        />
      </Card.Content>
    </Card>
  );
}

export default function EventStatisticsScreen({ route, navigation }) {
  const theme = useTheme();
  const { activeChurchId, apiFetchAuth, permissions, isOwner } = useAuth();
  const eventId = route?.params?.eventId || route?.params?.id;
  const initialEvent = route?.params?.event || null;

  const canView =
    isOwner ||
    !!permissions?.canViewEventStatistics ||
    !!permissions?.canManageEventStatistics;
  const canManage = isOwner || !!permissions?.canManageEventStatistics;

  const [event, setEvent] = useState(initialEvent);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [notes, setNotes] = useState("");
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const totalAttendance = useMemo(
    () =>
      toInt(counts.membersCount) +
      toInt(counts.visitorsCount) +
      toInt(counts.childrenCount),
    [counts],
  );

  const load = useCallback(async () => {
    if (!activeChurchId || !eventId || !canView) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await apiFetchAuth(
        `/churches/${encodeURIComponent(activeChurchId)}/events/${encodeURIComponent(eventId)}/statistics`,
      );
      setEvent(data?.event || initialEvent);
      if (data?.report) {
        const report = data.report;
        setCounts({
          membersCount: String(report.membersCount ?? 0),
          visitorsCount: String(report.visitorsCount ?? 0),
          childrenCount: String(report.childrenCount ?? 0),
          decisionsCount: String(report.decisionsCount ?? 0),
          followUpCount: String(report.followUpCount ?? 0),
        });
        setNotes(report.notes || "");
        setVisitors(Array.isArray(report.visitors) ? report.visitors : []);
      }
    } catch (error) {
      setMessage(error?.message || "Não foi possível carregar as estatísticas.");
    } finally {
      setLoading(false);
    }
  }, [activeChurchId, apiFetchAuth, canView, eventId, initialEvent]);

  useEffect(() => {
    load();
  }, [load]);

  const updateCount = (key, value) => {
    setCounts((current) => ({ ...current, [key]: onlyNumber(value) }));
  };

  const updateVisitor = (index, value) => {
    setVisitors((current) => current.map((item, i) => (i === index ? value : item)));
  };

  const removeVisitor = (index) => {
    Alert.alert("Remover visitante", "Deseja remover este visitante do relatório?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => setVisitors((current) => current.filter((_, i) => i !== index)),
      },
    ]);
  };

  const save = async () => {
    if (!canManage) return;
    if (visitors.some((visitor) => !String(visitor.name || "").trim())) {
      setMessage("Preencha o nome de todos os visitantes adicionados.");
      return;
    }
    if (visitors.length > toInt(counts.visitorsCount)) {
      setMessage("Os visitantes identificados não podem superar o total de visitantes.");
      return;
    }

    try {
      setSaving(true);
      await apiFetchAuth(
        `/churches/${encodeURIComponent(activeChurchId)}/events/${encodeURIComponent(eventId)}/statistics`,
        {
          method: "PATCH",
          body: {
            membersCount: toInt(counts.membersCount),
            visitorsCount: toInt(counts.visitorsCount),
            childrenCount: toInt(counts.childrenCount),
            decisionsCount: toInt(counts.decisionsCount),
            followUpCount: toInt(counts.followUpCount),
            notes: notes.trim() || undefined,
            visitors: visitors.map((visitor) => ({
              name: String(visitor.name || "").trim(),
              phone: String(visitor.phone || "").trim() || undefined,
              email: String(visitor.email || "").trim() || undefined,
              neighborhood: String(visitor.neighborhood || "").trim() || undefined,
              howKnewChurch: String(visitor.howKnewChurch || "").trim() || undefined,
              firstVisit: visitor.firstVisit === true,
              wantsContact: visitor.wantsContact === true,
              followUpStatus: visitor.wantsContact ? visitor.followUpStatus || "PENDING" : "NOT_REQUESTED",
              notes: String(visitor.notes || "").trim() || undefined,
            })),
          },
        },
      );
      setMessage("Estatísticas salvas com sucesso.");
      await load();
    } catch (error) {
      setMessage(error?.message || "Não foi possível salvar as estatísticas.");
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Você não possui permissão para visualizar estatísticas.</Text>
        <Button onPress={() => navigation.goBack()}>Voltar</Button>
      </View>
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View>
          <Text variant="headlineSmall">{event?.title || "Estatísticas do evento"}</Text>
          <Text variant="bodyMedium">{event?.dateLabel || "Evento realizado"}</Text>
        </View>

        <Card mode="outlined">
          <Card.Content style={styles.fields}>
            <Text variant="titleMedium">Resumo de público</Text>
            <View style={styles.row}>
              <TextInput mode="outlined" label="Membros" keyboardType="number-pad" disabled={!canManage} value={counts.membersCount} onChangeText={(v) => updateCount("membersCount", v)} style={styles.flex} />
              <TextInput mode="outlined" label="Visitantes" keyboardType="number-pad" disabled={!canManage} value={counts.visitorsCount} onChangeText={(v) => updateCount("visitorsCount", v)} style={styles.flex} />
            </View>
            <View style={styles.row}>
              <TextInput mode="outlined" label="Crianças" keyboardType="number-pad" disabled={!canManage} value={counts.childrenCount} onChangeText={(v) => updateCount("childrenCount", v)} style={styles.flex} />
              <TextInput mode="outlined" label="Decisões/conversões" keyboardType="number-pad" disabled={!canManage} value={counts.decisionsCount} onChangeText={(v) => updateCount("decisionsCount", v)} style={styles.flex} />
            </View>
            <TextInput mode="outlined" label="Pedidos de acompanhamento" keyboardType="number-pad" disabled={!canManage} value={counts.followUpCount} onChangeText={(v) => updateCount("followUpCount", v)} />
            <View style={styles.totalBox}>
              <Text variant="labelLarge">Público total</Text>
              <Text variant="headlineMedium">{totalAttendance}</Text>
              <Text variant="bodySmall">Membros + visitantes + crianças</Text>
            </View>
            <TextInput mode="outlined" label="Observações gerais" value={notes} disabled={!canManage} multiline numberOfLines={4} onChangeText={setNotes} />
          </Card.Content>
        </Card>

        <View style={styles.sectionHeader}>
          <View style={styles.flex}>
            <Text variant="titleLarge">Visitantes identificados</Text>
            <Text variant="bodySmall">Cadastro restrito a este evento.</Text>
          </View>
          {canManage && (
            <Button mode="outlined" icon="account-plus-outline" onPress={() => setVisitors((current) => [...current, { ...EMPTY_VISITOR }])}>
              Adicionar
            </Button>
          )}
        </View>

        {visitors.length === 0 ? (
          <Card mode="outlined"><Card.Content><Text>Nenhum visitante identificado foi cadastrado.</Text></Card.Content></Card>
        ) : (
          visitors.map((visitor, index) => (
            <VisitorCard key={visitor.id || `visitor-${index}`} visitor={visitor} index={index} disabled={!canManage} onChange={updateVisitor} onRemove={removeVisitor} />
          ))
        )}

        {canManage && (
          <Button mode="contained" icon="content-save-outline" loading={saving} disabled={saving} onPress={save} contentStyle={styles.saveContent}>
            Salvar estatísticas
          </Button>
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")} duration={3500}>{message}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  container: { padding: 16, paddingBottom: 40, gap: 16 },
  fields: { gap: 12 },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  totalBox: { alignItems: "center", padding: 16, borderRadius: 16, backgroundColor: "#EEF0FA" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  visitorCard: { overflow: "hidden" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  saveContent: { minHeight: 52 },
});
