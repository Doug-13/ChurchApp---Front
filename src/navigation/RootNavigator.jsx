import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";

import AppTabs from "./AppTabs";
import ChurchOnboardingStack from "./stacks/ChurchOnboardingStack"; // 👈 novo

const Stack = createNativeStackNavigator();

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}

export default function RootNavigator() {
  const { initializing, user, churchStatus } = useAuth();
  // churchStatus: "checking" | "needs_church" | "pending" | "ready"

  if (initializing || (user && churchStatus === "checking")) return <Loading />;

  // 🔒 Logado, mas sem igreja vinculada (ou pendente)
  if (user && churchStatus !== "ready") {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ChurchGate" component={ChurchOnboardingStack} />
      </Stack.Navigator>
    );
  }

  // ✅ Logado e liberado
  return user ? (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="App" component={AppTabs} />
    </Stack.Navigator>
  ) : (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
