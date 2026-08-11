// src/navigation/stacks/RepertoiresStack.jsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RepertoiresScreen from "../../screens/repertoires/RepertoiresScreen";
import RepertoireDetailScreen from "../../screens/repertoires/RepertoireDetailScreen";
import RepertoireFormScreen from "../../screens/repertoires/RepertoireFormScreen";

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