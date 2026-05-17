import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../../screens/home/HomeScreen";
import DirectoryScreen from "../../screens/home/DirectoryScreen";
import MemberPublicProfileScreen from "../../screens/home/MemberPublicProfileScreen";
import ChurchProfile from "../../screens/church/ChurchProfile";
import NotificationsScreen from "../../screens/notifications/NotificationsScreen";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Início", headerShown: false }} />
      <Stack.Screen name="Directory" component={DirectoryScreen} options={{ title: "Diretório" }} />
      <Stack.Screen
        name="MemberPublicProfile"
        component={MemberPublicProfileScreen}
        options={{ title: "Perfil" }}
      />
      <Stack.Screen
        name="ChurchProfile"
        component={ChurchProfile}
        options={{ title: "Igreja" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notificações", headerShown: false }}
      />
    </Stack.Navigator>
  );
}