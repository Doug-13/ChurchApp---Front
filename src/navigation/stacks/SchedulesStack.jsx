// src/navigation/stacks/SchedulesStack.jsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTerms } from "../../context/TerminologyContext";

import MySchedulesScreen    from "../../screens/schedules/MySchedulesScreen";
import ScheduleDetailsScreen from "../../screens/schedules/ScheduleDetailsScreen";

const Stack = createNativeStackNavigator();

export default function SchedulesStack() {
  const { t } = useTerms();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MySchedules"
        component={MySchedulesScreen}
        options={{ title: `Minhas ${t.schedule}s`, headerShown: false }} // "Minhas Escalas" | "Meus Serviços"
      />
      <Stack.Screen
        name="ScheduleDetails"
        component={ScheduleDetailsScreen}
        options={{ title: t.schedule }}                                   // "Escala" | "Serviço"
      />
    </Stack.Navigator>
  );
}