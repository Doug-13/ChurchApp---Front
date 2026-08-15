// src/navigation/AppTabs.jsx

import React, { useEffect, useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CommonActions, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "react-native-paper";

import { useAuth } from "../context/AuthContext";
import { useTerms } from "../context/TerminologyContext";
import { getPermissions, ROLES } from "../utils/permissions";

import HomeStack from "./stacks/HomeStack";
import NewsStack from "./stacks/NewsStack";
import SchedulesStack from "./stacks/SchedulesStack";
import CellsStack from "./stacks/CellsStack";
import MoreStack from "./stacks/MoreStack";
import EventsStack from "./stacks/EventsStack";
import AdminStack from "./stacks/AdminStack";

const Tab = createBottomTabNavigator();

function NotificationsRedirect() {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate("HomeTab", {
        screen: "Notifications",
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [navigation]);

  return null;
}

const TAB_INITIAL_ROUTES = {
  HomeTab: "Home",
  NewsTab: "NewsFeed",
  Events: "EventsList",
  SchedulesTab: "MySchedules",
  CellsTab: "CellsList",
  AdminTab: "AdminDashboard",
  MoreTab: "MoreHome",
};

function makeTabListeners(tabName) {
  return ({ navigation }) => ({
    tabPress: (e) => {
      e.preventDefault();

      const initialRoute = TAB_INITIAL_ROUTES[tabName];

      navigation.dispatch(
        CommonActions.navigate({
          name: tabName,
          params: {},
        }),
      );

      requestAnimationFrame(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: tabName,
                state: {
                  index: 0,
                  routes: [{ name: initialRoute }],
                },
              },
            ],
          }),
        );
      });
    },
  });
}

export default function AppTabs() {
  const theme = useTheme();
  const auth = useAuth();
  const { t } = useTerms();

  const currentRole = useMemo(() => {
    if (auth?.myRole) return auth.myRole;
    if (auth?.role) return auth.role;
    if (auth?.user?.myRole) return auth.user.myRole;
    if (auth?.user?.role) return auth.user.role;
    if (auth?.currentChurch?.myRole) return auth.currentChurch.myRole;
    if (auth?.selectedChurch?.myRole) return auth.selectedChurch.myRole;
    if (auth?.isAdmin) return ROLES.ADMIN;

    return ROLES.MEMBER;
  }, [
    auth?.myRole,
    auth?.role,
    auth?.user?.myRole,
    auth?.user?.role,
    auth?.currentChurch?.myRole,
    auth?.selectedChurch?.myRole,
    auth?.isAdmin,
  ]);

  const extraPermissions = useMemo(() => {
    if (auth?.extraPermissions) return auth.extraPermissions;
    if (auth?.user?.extraPermissions) {
      return auth.user.extraPermissions;
    }

    if (auth?.currentChurch?.extraPermissions) {
      return auth.currentChurch.extraPermissions;
    }

    if (auth?.selectedChurch?.extraPermissions) {
      return auth.selectedChurch.extraPermissions;
    }

    return {};
  }, [
    auth?.extraPermissions,
    auth?.user?.extraPermissions,
    auth?.currentChurch?.extraPermissions,
    auth?.selectedChurch?.extraPermissions,
  ]);

  const perms = useMemo(() => {
    return getPermissions(currentRole, extraPermissions);
  }, [currentRole, extraPermissions]);

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
            HomeTab: focused ? "home" : "home-outline",
            NewsTab: focused
              ? "newspaper"
              : "newspaper-outline",
            Events: focused
              ? "calendar"
              : "calendar-outline",
            SchedulesTab: focused
              ? "calendar"
              : "calendar-outline",
            CellsTab: focused
              ? "people"
              : "people-outline",
            AdminTab: focused
              ? "settings"
              : "settings-outline",
            MoreTab: focused
              ? "menu"
              : "menu-outline",
          };

          return (
            <Ionicons
              name={map[route.name] || "ellipse-outline"}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Início",
          headerShown: false,
        }}
        listeners={makeTabListeners("HomeTab")}
      />

      <Tab.Screen
        name="NewsTab"
        component={NewsStack}
        options={{
          title: t.news,
          headerShown: false,
        }}
        listeners={makeTabListeners("NewsTab")}
      />

      <Tab.Screen
        name="Events"
        component={EventsStack}
        options={{
          title: "Eventos",
          headerShown: false,
        }}
        listeners={makeTabListeners("Events")}
      />

      {perms?.canAccessSchedules && (
        <Tab.Screen
          name="SchedulesTab"
          component={SchedulesStack}
          options={{
            title: `${t.schedule}s`,
            headerShown: false,
          }}
          listeners={makeTabListeners("SchedulesTab")}
        />
      )}

      {perms?.canAccessCells && (
        <Tab.Screen
          name="CellsTab"
          component={CellsStack}
          options={{
            title: t.cell,
            headerShown: false,
          }}
          listeners={makeTabListeners("CellsTab")}
        />
      )}

      {perms?.canAccessAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminStack}
          options={{
            title: "Admin",
            headerShown: false,
          }}
          listeners={makeTabListeners("AdminTab")}
        />
      )}

      {/*
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsRedirect}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: {
            display: "none",
          },
        }}
      />
      */}

      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{
          title: "Mais",
          headerShown: false,
        }}
        listeners={makeTabListeners("MoreTab")}
      />
    </Tab.Navigator>
  );
}