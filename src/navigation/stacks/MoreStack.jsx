import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoreScreen from "../../screens/more/MoreScreen";
import ProfileScreen from "../../screens/more/ProfileScreen";
import SettingsScreen from "../../screens/more/SettingsScreen";
import AdminStack from "./AdminStack";
import ProfileEditScreen from "../../screens/more/ProfileEditScreen";

const Stack = createNativeStackNavigator();

export default function MoreStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="More" component={MoreScreen} options={{ title: "Mais" }} />
       <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Meu Perfil" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Configurações" }} />
      <Stack.Screen name="Admin" component={AdminStack} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
