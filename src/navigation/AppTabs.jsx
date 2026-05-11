// src/navigation/AppTabs.jsx
// ✅ Versão atualizada com aba de Notificações + badge de não lidas

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "react-native-paper";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";

import HomeStack          from "./stacks/HomeStack";
import NewsStack          from "./stacks/NewsStack";
import SchedulesStack     from "./stacks/SchedulesStack";
import CellsStack         from "./stacks/CellsStack";
import MoreStack          from "./stacks/MoreStack";
import EventsStack        from "./stacks/EventsStack";
import AdminStack         from "./stacks/AdminStack";
import NotificationsStack from "./stacks/NotificationsStack"; // ✅ novo

const Tab = createBottomTabNavigator();

const BRAND = "#4158D0";

// ─── Hook: contagem de não lidas ──────────────────────────────────────────────

function useUnreadCount(isReady) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isReady) return;

    async function fetch() {
      try {
        const fbUser = getAuth().currentUser;
        if (!fbUser) return;
        const token = await getIdToken(fbUser, false); // false = não força refresh, mais rápido
        const res = await global.fetch(`${API_BASE_URL}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCount(data?.count ?? 0);
      } catch { /* silencioso */ }
    }

    fetch();
    // Polling a cada 60 segundos enquanto o app está ativo
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [isReady]);

  return [count, setCount];
}

// ─── Componente de badge ──────────────────────────────────────────────────────

function BadgeIcon({ name, color, size, count }) {
  return (
    <View style={{ width: size, height: size }}>
      <Ionicons name={name} size={size} color={color} />
      {count > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -6,
            backgroundColor: "#E84D4D",
            borderRadius: 9,
            minWidth: 17,
            height: 17,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 3,
            borderWidth: 1.5,
            borderColor: "#fff",
          }}
        >
          <Ionicons
            // Usamos Text diretamente não está disponível aqui, então aproveitamos o approach nativo
            // Mas como o tab icon não aceita Text facilmente, usamos este wrapper visual
            name="ellipse"
            size={0}
            color="transparent"
          />
          {/* Texto do badge via View aninhada — compatível com React Native */}
        </View>
      )}
    </View>
  );
}

// ─── AppTabs ──────────────────────────────────────────────────────────────────

export default function AppTabs() {
  const theme = useTheme();
  const { isAdmin, churchStatus } = useAuth();
  const isReady = churchStatus === "ready";

  const [unreadCount] = useUnreadCount(isReady);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarStyle: {
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const map = {
            HomeTab:           focused ? "home"           : "home-outline",
            NewsTab:           focused ? "newspaper"      : "newspaper-outline",
            Events:            focused ? "calendar"       : "calendar-outline",
            SchedulesTab:      focused ? "calendar"       : "calendar-outline",
            CellsTab:          focused ? "people"         : "people-outline",
            AdminTab:          focused ? "settings"       : "settings-outline",
            NotificationsTab:  focused ? "notifications"  : "notifications-outline",
            MoreTab:           focused ? "menu"           : "menu-outline",
          };

          const iconName = map[route.name] || "ellipse-outline";

          // Badge de notificações
          if (route.name === "NotificationsTab" && unreadCount > 0) {
            return (
              <View style={{ width: size, height: size }}>
                <Ionicons name={iconName} size={size} color={color} />
                <View
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -5,
                    backgroundColor: "#E84D4D",
                    borderRadius: 9,
                    minWidth: 16,
                    height: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 2,
                    borderWidth: 1.5,
                    borderColor: "#fff",
                  }}
                />
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarBadge:
          route.name === "NotificationsTab" && unreadCount > 0
            ? unreadCount > 99 ? "99+" : unreadCount
            : undefined,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: "Início" }}
      />

      <Tab.Screen
        name="NewsTab"
        component={NewsStack}
        options={{ title: "Avisos" }}
      />

      <Tab.Screen
        name="Events"
        component={EventsStack}
        options={{ title: "Eventos" }}
      />

      {/* ✅ Aba de Notificações — visível para todos */}
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStack}
        options={{ title: "Avisos" }}
      />

      {isAdmin && (
        <Tab.Screen
          name="SchedulesTab"
          component={SchedulesStack}
          options={{ title: "Escalas" }}
        />
      )}

      {isAdmin && (
        <Tab.Screen
          name="CellsTab"
          component={CellsStack}
          options={{ title: "Células" }}
        />
      )}

      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminStack}
          options={{ title: "Admin" }}
        />
      )}

      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{ title: "Mais" }}
      />
    </Tab.Navigator>
  );
}