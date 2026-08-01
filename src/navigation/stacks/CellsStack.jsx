// src/navigation/stacks/CellsStack.jsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTerms } from "../../context/TerminologyContext";

import CellsManageScreen from "../../screens/admin/CellsManageScreen";
import CellDetailsScreen from "../../screens/cells/CellDetailsScreen";
import CellMeetingScreen from "../../screens/cells/CellMeetingScreen";
import CellCreateScreen  from "../../screens/cells/CellCreateScreen";
import CellReportsScreen from "../../screens/cells/CellReportsScreen";

const Stack = createNativeStackNavigator();

export default function CellsStack() {
  const { t } = useTerms();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CellsList"
        component={CellsManageScreen}
        options={{ title: t.cell, headerShown: false }}   // "Grupos" | "Células"
      />
      <Stack.Screen
        name="CellDetails"
        component={CellDetailsScreen}
        options={{ title: t.cell }}                       // "Grupo" | "Célula"
      />
      <Stack.Screen
        name="CellMeeting"
        component={CellMeetingScreen}
        options={{ title: t.cellMeeting }}                // "Encontro" | "Reunião"
      />
      <Stack.Screen
        name="CellCreate"
        component={CellCreateScreen}
        options={{ title: `Nova ${t.cell}` }}             // "Nova Grupo" | "Nova Célula"
      />
      <Stack.Screen
        name="CellReports"
        component={CellReportsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}