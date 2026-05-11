import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../../screens/home/HomeScreen";
import DirectoryScreen from "../../screens/admin/MembersManageScreen";
import MemberPublicProfileScreen from "../../screens/home/MemberPublicProfileScreen";
import ChurchProfile from "../../screens/church/ChurchProfile";
import BirthdaysScreen from "../../screens/admin/MembersBirthdayScreen"; // ✅ novo

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Início", headerShown: false }} />
      <Stack.Screen name="Directory" component={DirectoryScreen} options={{ title: "Membros" }} />
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
      {/* ✅ Aniversariantes acessível a todos via HomeStack */}
      <Stack.Screen
        name="Birthdays"
        component={BirthdaysScreen}
        options={{ title: "Aniversariantes" }}
      />
    </Stack.Navigator>
  );
}