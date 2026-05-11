import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import EventsManageScreen from "../../screens/admin/EventsManageScreen";
import EventComposerScreen from "../../screens/admin/EventComposerScreen";
import EventsCreateScreen from "../../screens/admin/EventsCreateScreen";
import EventsSelectMinistryScreen from "../../screens/admin/EventsSelectMinistryScreen";
import EventsSelectPeopleScreen from "../../screens/admin/EventsSelectPeopleScreen";
import EventsPreviewScreen from "../../screens/admin/EventsPreviewScreen"; // ← só este

const Stack = createNativeStackNavigator();

export default function EventsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="EventsList"
        component={EventsManageScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventComposer"
        component={EventComposerScreen}
        options={{ title: "Evento" }}
      />
      <Stack.Screen
        name="EventsCreate"
        component={EventsCreateScreen}
        options={{ title: "Criar escala" }}
      />
      <Stack.Screen
        name="EventsSelectMinistry"
        component={EventsSelectMinistryScreen}
        options={{ title: "Ministério" }}
      />
      <Stack.Screen
        name="EventsSelectPeople"
        component={EventsSelectPeopleScreen}
        options={{ title: "Equipe" }}
      />
      <Stack.Screen
        name="EventsPreviewScreen"
        component={EventsPreviewScreen}
        options={{ title: "Detalhes do evento" }}
      />
    </Stack.Navigator>
  );
}