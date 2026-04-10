import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "react-native-paper";
import { useAuth } from "../context/AuthContext";

import HomeStack from "./stacks/HomeStack";
import NewsStack from "./stacks/NewsStack";
import SchedulesStack from "./stacks/SchedulesStack";
import CellsStack from "./stacks/CellsStack";
import MoreStack from "./stacks/MoreStack";
import AdminStack from "./stacks/AdminStack"; // crie esse stack (pode ser placeholder)

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  const theme = useTheme();
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarStyle: { height: 64, paddingBottom: 10, paddingTop: 8 },
        tabBarIcon: ({ focused, color, size }) => {
          const map = {
            HomeTab: focused ? "home" : "home-outline",
            NewsTab: focused ? "newspaper" : "newspaper-outline",
            SchedulesTab: focused ? "calendar" : "calendar-outline",
            CellsTab: focused ? "people" : "people-outline",
            AdminTab: focused ? "settings" : "settings-outline",
            MoreTab: focused ? "menu" : "menu-outline",
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: "Início" }} />
      <Tab.Screen name="NewsTab" component={NewsStack} options={{ title: "Novidades" }} />

      {/* Só admin */}
      {isAdmin && (
        <Tab.Screen name="SchedulesTab" component={SchedulesStack} options={{ title: "Escalas" }} />
      )}
      {isAdmin && (
        <Tab.Screen name="CellsTab" component={CellsStack} options={{ title: "Células" }} />
      )}
      {isAdmin && (
        <Tab.Screen name="AdminTab" component={AdminStack} options={{ title: "Admin" }} />
      )}

      <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: "Mais" }} />
    </Tab.Navigator>
  );
}
