// src/navigation/stacks/RepertoiresStack.jsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RepertoiresScreen from "../../screens/repertoires/RepertoiresScreen";
import RepertoireDetailScreen from "../../screens/repertoires/RepertoireDetailScreen";
import RepertoireFormScreen from "../../screens/repertoires/RepertoireFormScreen";
import SongCatalogScreen from "../../screens/repertoires/SongCatalogScreen";
import SongFormScreen from "../../screens/repertoires/SongFormScreen";

const Stack = createNativeStackNavigator();

export default function RepertoiresStack() {
  return (
    <Stack.Navigator
      initialRouteName="RepertoiresList"
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="RepertoiresList"
        component={RepertoiresScreen}
        options={{
          title: "Repertórios",
        }}
      />
      <Stack.Screen name="SongCatalog" component={SongCatalogScreen} options={{ title: "Músicas da igreja" }} />
      <Stack.Screen name="SongForm" component={SongFormScreen} options={{ title: "Música" }} />

      <Stack.Screen
        name="RepertoireDetail"
        component={RepertoireDetailScreen}
        options={{
          title: "Repertório",
        }}
      />

      <Stack.Screen
        name="RepertoireForm"
        component={RepertoireFormScreen}
        options={{
          title: "Novo repertório",
        }}
      />
    </Stack.Navigator>
  );
}
