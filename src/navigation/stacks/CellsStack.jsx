import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CellsManageScreen from "../../screens/admin/CellsManageScreen"; // ✅ use o manage aqui
import CellDetailsScreen from "../../screens/cells/CellDetailsScreen";
import CellMeetingScreen from "../../screens/cells/CellMeetingScreen";
import CellCreateScreen from "../../screens/cells/CellCreateScreen";
import CellReportsScreen from "../../screens/cells/CellReportsScreen";

const Stack = createNativeStackNavigator();

export default function CellsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CellsList" component={CellsManageScreen} options={{ title: "Células" }} />
      <Stack.Screen name="CellDetails" component={CellDetailsScreen} options={{ title: "Célula" }} />
      <Stack.Screen name="CellMeeting" component={CellMeetingScreen} options={{ title: "Encontro" }} />
      <Stack.Screen name="CellCreate" component={CellCreateScreen} options={{ title: "Criar" }} />
      <Stack.Screen name="CellReports" component={CellReportsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}