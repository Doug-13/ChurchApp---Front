// src/navigation/stacks/NotificationsStack.jsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NotificationsScreen from "../../screens/notifications/NotificationsScreen";

const Stack = createNativeStackNavigator();

export default function NotificationsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="NotificationsList"
        component={NotificationsScreen}
        options={{ title: "Notificações", headerShown: false }}
      />
    </Stack.Navigator>
  );
}