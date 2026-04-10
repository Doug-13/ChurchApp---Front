import React, { useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { Button, Card, Checkbox, Text, useTheme } from "react-native-paper";

export default function ScheduleSelectPeopleScreen(props) {
  const theme = useTheme();

  const navigation = props && props.navigation ? props.navigation : null;
  const route = props && props.route ? props.route : null;
  const params = route && route.params ? route.params : {};

  const initial = params && params.current ? params.current : [];
  const [selected, setSelected] = useState(initial);

  const people = ["Ana", "Bruno", "Carlos", "Débora", "Eduardo"];

  function toggle(name) {
    setSelected(function (prev) {
      if (prev.includes(name)) {
        return prev.filter(function (x) {
          return x !== name;
        });
      }
      return prev.concat([name]);
    });
  }

  const count = useMemo(function () {
    return selected.length;
  }, [selected]);

  function confirm() {
    if (!navigation || !navigation.navigate) return;
    navigation.navigate("ScheduleCreate", { people: selected });
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        gap: 12,
        backgroundColor: theme.colors.background,
      }}
    >
      <Text variant="headlineSmall" style={{ fontWeight: "900" }}>
        Selecionar equipe
      </Text>

      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        {count} selecionado(s)
      </Text>

      {people.map(function (p) {
        const checked = selected.includes(p);
        return (
          <Card key={p} mode="outlined" onPress={function () { toggle(p); }}>
            <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Checkbox status={checked ? "checked" : "unchecked"} />
              <Text style={{ fontWeight: "800" }}>{p}</Text>
            </Card.Content>
          </Card>
        );
      })}

      <Button
        mode="contained"
        icon="check"
        onPress={confirm}
        style={{ borderRadius: 16, marginTop: 8 }}
        contentStyle={{ height: 46 }}
      >
        Confirmar seleção
      </Button>
    </ScrollView>
  );
}
