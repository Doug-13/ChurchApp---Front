import React from "react";
import { ScrollView, View } from "react-native";
import { Card, Chip, Text, useTheme } from "react-native-paper";

export default function SchedulePreviewScreen(props) {
  const theme = useTheme();

  const route = props && props.route ? props.route : null;
  const params = route && route.params ? route.params : {};
  const d = params && params.draft ? params.draft : {};

  const title = d && d.title ? d.title : "—";
  const dateText = d && d.dateText ? d.dateText : "—";
  const timeText = d && d.timeText ? d.timeText : "—";
  const place = d && d.place ? d.place : "—";
  const notes = d && d.notes ? d.notes : null;

  const ministryName =
    d && d.ministry && d.ministry.name
      ? d.ministry.name
      : d && d.ministry
      ? String(d.ministry)
      : "Sem ministério";

  const peopleCount = d && d.people && d.people.length ? d.people.length : 0;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        gap: 12,
        backgroundColor: theme.colors.background,
      }}
    >
      <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
        Prévia
      </Text>

      <Card mode="outlined">
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleLarge" style={{ fontWeight: "900" }}>
            {title}
          </Text>

          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {dateText} • {timeText} • {place}
          </Text>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Chip icon="church" compact style={{ borderRadius: 999 }}>
              {ministryName}
            </Chip>

            <Chip icon="account-group-outline" compact style={{ borderRadius: 999 }}>
              {peopleCount} pessoa(s)
            </Chip>
          </View>

          {notes ? <Text style={{ marginTop: 8 }}>{notes}</Text> : null}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
