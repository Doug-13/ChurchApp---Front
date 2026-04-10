import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../../screens/home/HomeScreen";
import DirectoryScreen from "../../screens/home/DirectoryScreen";
import MemberPublicProfileScreen from "../../screens/home/MemberPublicProfileScreen";

// ✅ Perfil da igreja
import ChurchProfile from "../../screens/church/ChurchProfile";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Início" }} />
      <Stack.Screen name="Directory" component={DirectoryScreen} options={{ title: "Diretório" }} />
      <Stack.Screen
        name="MemberPublicProfile"
        component={MemberPublicProfileScreen}
        options={{ title: "Perfil" }}
      />

      {/* ✅ Adicionado */}
      <Stack.Screen
        name="ChurchProfile"
        component={ChurchProfile}
        options={{ title: "Igreja" }}
      />
    </Stack.Navigator>
  );
}
