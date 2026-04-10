import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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

function FieldCard({ title, subtitle, icon, onPress, rightLabel }) {
  const theme = useTheme();

  return (
    <Card
      mode="outlined"
      style={[styles.fieldCard, { borderColor: theme.colors.outlineVariant }]}
      onPress={onPress}
    >
      <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.fieldIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon source={icon} size={20} color={theme.colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ fontWeight: "900" }} numberOfLines={1}>
            {title}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          {rightLabel ? (
            <Chip compact style={{ borderRadius: 999 }}>
              {rightLabel}
            </Chip>
          ) : null}
          <Icon source="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </View>
      </Card.Content>
    </Card>
  );
}

export default function ScheduleCreateScreen({ navigation, route }) {
  const theme = useTheme();

  const params = (route && route.params) ? route.params : {};

  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");

  const [dateText, setDateText] = useState("");
  const [timeText, setTimeText] = useState("");

  const [ministry, setMinistry] = useState(params.ministry || null);
  const [people, setPeople] = useState(params.people || []);

  // ✅ quando voltar das telas de seleção (navigate("ScheduleCreate", { ministry/people }))
  useEffect(() => {
    if (params.ministry) setMinistry(params.ministry);
    if (params.people) setPeople(params.people);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ministry, params.people]);

  const canSave = useMemo(() => {
    return title.trim().length >= 3 && !!dateText.trim() && !!timeText.trim() && !!ministry;
  }, [title, dateText, timeText, ministry]);

  const summaryLabel = useMemo(() => {
    const parts = [];
    if (ministry) parts.push(ministry.name ? ministry.name : String(ministry));
    if (dateText) parts.push(dateText);
    if (timeText) parts.push(timeText);
    return parts.join(" • ") || "Rascunho";
  }, [ministry, dateText, timeText]);

  const save = async () => {
    const payload = {
      title: title.trim(),
      ministry,
      dateText: dateText.trim(),
      timeText: timeText.trim(),
      place: place.trim() || null,
      notes: notes.trim() || null,
      people,
      status: "Rascunho",
    };

    console.log("SAVE SCHEDULE =>", payload);

    navigation.navigate("SchedulesManage");
  };

  const ministryLabel = ministry
    ? `Selecionado: ${ministry.name ? ministry.name : String(ministry)}`
    : "Escolha o ministério responsável";

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
              Criar escala
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Defina o evento, ministério e equipe
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Chip icon="file-document-edit-outline" compact style={{ borderRadius: 999 }}>
                {summaryLabel}
              </Chip>
              <Chip icon="account-group-outline" compact style={{ borderRadius: 999 }}>
                {(people && people.length) ? people.length : 0} pessoa(s)
              </Chip>
            </View>
          </View>

          <Button
            mode="contained"
            icon="content-save"
            onPress={save}
            disabled={!canSave}
            style={{ borderRadius: 16 }}
            contentStyle={{ height: 46 }}
          >
            Salvar
          </Button>
        </View>

        {/* Form */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Informações
        </Text>

        <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
          <Card.Content style={{ gap: 12 }}>
            <TextInput
              mode="outlined"
              label="Título"
              value={title}
              onChangeText={setTitle}
              placeholder="Ex.: Culto • Domingo 19:00"
              left={<TextInput.Icon icon="calendar-text" />}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  mode="outlined"
                  label="Data"
                  value={dateText}
                  onChangeText={setDateText}
                  placeholder="Ex.: 02/02/2026"
                  left={<TextInput.Icon icon="calendar" />}
                />
              </View>

              <View style={{ flex: 1 }}>
                <TextInput
                  mode="outlined"
                  label="Hora"
                  value={timeText}
                  onChangeText={setTimeText}
                  placeholder="Ex.: 19:00"
                  left={<TextInput.Icon icon="clock-outline" />}
                />
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Local (opcional)"
              value={place}
              onChangeText={setPlace}
              placeholder="Ex.: Templo principal"
              left={<TextInput.Icon icon="map-marker-outline" />}
            />

            <TextInput
              mode="outlined"
              label="Observações (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex.: Chegar 30 min antes • Uniforme"
              left={<TextInput.Icon icon="note-text-outline" />}
              multiline
              numberOfLines={3}
            />
          </Card.Content>
        </Card>

        {/* Definições */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Definições
        </Text>

        <View style={{ gap: 12, marginTop: 10 }}>
          <FieldCard
            icon="church"
            title="Ministério"
            subtitle={ministryLabel}
            rightLabel={ministry ? "OK" : "Pendente"}
            onPress={() => navigation.navigate("ScheduleSelectMinistry", { current: ministry })}
          />

          <FieldCard
            icon="account-group-outline"
            title="Equipe"
            subtitle={
              people && people.length
                ? `Selecionados: ${people.length} pessoa(s)`
                : "Defina quem está escalado e suas funções"
            }
            rightLabel={people && people.length ? String(people.length) : "0"}
            onPress={() => navigation.navigate("ScheduleSelectPeople", { current: people })}
          />

          <FieldCard
            icon="file-document-outline"
            title="Usar template"
            subtitle="Comece por um modelo (culto, célula, recepção...)"
            onPress={() => navigation.navigate("ScheduleTemplates")}
          />

          <FieldCard
            icon="eye-outline"
            title="Prévia"
            subtitle="Veja como vai aparecer para os membros"
            onPress={() =>
              navigation.navigate("SchedulePreview", {
                draft: {
                  title,
                  dateText,
                  timeText,
                  place,
                  notes,
                  ministry,
                  people,
                },
              })
            }
          />
        </View>

        {/* Rodapé */}
        <Surface
          elevation={0}
          style={[
            styles.tip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <Icon source="information-outline" size={20} color={theme.colors.onSurfaceVariant} />
          <Text style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>
            Dica: após salvar você pode <Text style={{ fontWeight: "900" }}>confirmar</Text> a escala e enviar
            notificações para os escalados.
          </Text>
        </Surface>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, paddingBottom: 28 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  sectionTitle: { marginTop: 16, fontWeight: "900" },

  card: { borderRadius: 18, marginTop: 10 },

  fieldCard: { borderRadius: 18 },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  tip: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
});
