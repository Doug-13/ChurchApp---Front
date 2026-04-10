import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MySchedulesScreen from "../../screens/schedules/MySchedulesScreen";
import ScheduleDetailsScreen from "../../screens/schedules/ScheduleDetailsScreen";

const Stack = createNativeStackNavigator();
export default function SchedulesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MySchedules" component={MySchedulesScreen} options={{ title: "Minhas Escalas" }} />
      <Stack.Screen name="ScheduleDetails" component={ScheduleDetailsScreen} options={{ title: "Escala" }} />
    </Stack.Navigator>
  );
}
