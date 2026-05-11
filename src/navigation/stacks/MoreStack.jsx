// src/navigation/stacks/MoreStack.jsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MoreScreen from "../../screens/more/MoreScreen";
import ProfileScreen from "../../screens/more/ProfileScreen";
import ProfileEditScreen from "../../screens/more/ProfileEditScreen";
import SettingsScreen from "../../screens/more/SettingsScreen";
import AboutScreen from "../../screens/more/AboutScreen";     // ✅ novo
import SupportScreen from "../../screens/more/SupportScreen";   // ✅ novo
import ChurchProfile from "../../screens/church/ChurchProfile"; // ✅ novo
import AdminStack from "./AdminStack";

const Stack = createNativeStackNavigator();

export default function MoreStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MoreHome"
        component={MoreScreen}
        options={{ title: "Mais", headerShown: false }}
      />

      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Meu Perfil" }}
      />

      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: "Editar Perfil" }}
      />

      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Configurações" }}
      />

      {/* ✅ Novas telas */}
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Admin"
        component={AdminStack}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChurchProfile"
        component={ChurchProfile}
        options={{ title: "Igreja" }}
      />
    </Stack.Navigator>
  );
}