// // src/navigation/AppTabs.jsx
// import React, { useEffect, useState } from "react";
// import { View } from "react-native";
// import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// import { StackActions } from "@react-navigation/native";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import { useTheme } from "react-native-paper";
// import { getAuth, getIdToken } from "@react-native-firebase/auth";
// import { useAuth } from "../context/AuthContext";
// import { normalizeRole, ROLES } from "../utils/permissions";
// import { API_BASE_URL } from "../config/api";

// import HomeStack          from "./stacks/HomeStack";
// import NewsStack          from "./stacks/NewsStack";
// import SchedulesStack     from "./stacks/SchedulesStack";
// import CellsStack         from "./stacks/CellsStack";
// import MoreStack          from "./stacks/MoreStack";
// import EventsStack        from "./stacks/EventsStack";
// import AdminStack         from "./stacks/AdminStack";
// import NotificationsStack from "./stacks/NotificationsStack";

// const Tab = createBottomTabNavigator();

// // ─── Hook: role do usuário buscado de /churches/mine ─────────────────────────
// // Mesmo padrão de MoreScreen e ChurchProfile.
// // isAdmin do AuthContext é o fallback seguro enquanto o fetch não termina.

// function useMyRole(isReady, activeChurchId, isAdminFallback) {
//   const [role, setRole] = useState(
//     isAdminFallback ? ROLES.ADMIN : ROLES.MEMBER
//   );

//   useEffect(() => {
//     if (!isReady) return;
//     let alive = true;

//     async function fetchRole() {
//       try {
//         const fbUser = getAuth().currentUser;
//         if (!fbUser) return;
//         const token = await getIdToken(fbUser, false);
//         const res = await global.fetch(`${API_BASE_URL}/churches/mine`, {
//           headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
//         });
//         if (!res.ok) return;
//         const data = await res.json();

//         const mine     = Array.isArray(data) ? data : (data ? [data] : []);
//         const selected = (activeChurchId && mine.find((c) => c.id === activeChurchId))
//           || mine[0]
//           || null;
//         const rawRole  = selected?.myRole || selected?.role || null;

//         console.log("🟩 [AppTabs] myRole da API:", rawRole);
//         if (alive && rawRole) setRole(normalizeRole(rawRole));
//       } catch (e) {
//         console.log("🟨 [AppTabs] erro ao buscar role:", e?.message);
//       }
//     }

//     fetchRole();
//     return () => { alive = false; };
//   }, [isReady, activeChurchId]);

//   return role;
// }

// // ─── Hook: contagem de notificações não lidas ─────────────────────────────────

// function useUnreadCount(isReady) {
//   const [count, setCount] = useState(0);

//   useEffect(() => {
//     if (!isReady) return;

//     async function fetchCount() {
//       try {
//         const fbUser = getAuth().currentUser;
//         if (!fbUser) return;
//         const token = await getIdToken(fbUser, false);
//         const res = await global.fetch(`${API_BASE_URL}/notifications/unread-count`, {
//           headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
//         });
//         if (!res.ok) return;
//         const data = await res.json();
//         setCount(data?.count ?? 0);
//       } catch { /* silencioso */ }
//     }

//     fetchCount();
//     const id = setInterval(fetchCount, 60_000);
//     return () => clearInterval(id);
//   }, [isReady]);

//   return [count, setCount];
// }

// // ─── Listener: reseta o stack ao tocar na tab ─────────────────────────────────

// function resetOnPress({ navigation }) {
//   return {
//     tabPress: (e) => {
//       const state      = navigation.getState();
//       const currentTab = state.routes[state.index];
//       const stackDepth = currentTab?.state?.index ?? 0;
//       if (stackDepth > 0) {
//         e.preventDefault();
//         navigation.dispatch(StackActions.popToTop());
//       }
//     },
//   };
// }

// // ─── Mapa de ícones ───────────────────────────────────────────────────────────

// const ICON_MAP = {
//   HomeTab:          { default: "home-outline",          focused: "home"          },
//   NewsTab:          { default: "newspaper-outline",     focused: "newspaper"     },
//   Events:           { default: "calendar-outline",      focused: "calendar"      },
//   NotificationsTab: { default: "notifications-outline", focused: "notifications" },
//   SchedulesTab:     { default: "calendar-outline",      focused: "calendar"      },
//   CellsTab:         { default: "people-outline",        focused: "people"        },
//   AdminTab:         { default: "settings-outline",      focused: "settings"      },
//   MoreTab:          { default: "menu-outline",          focused: "menu"          },
// };

// // ─── AppTabs ──────────────────────────────────────────────────────────────────
// //
// // Visibilidade de tabs por role:
// //   MEMBER  → Início | Avisos | Eventos | Notificações | Mais
// //   LEADER  → + Células | Admin
// //   ADMIN   → + Escalas | Células | Admin
// //   OWNER   → + Escalas | Células | Admin
// //
// // ─────────────────────────────────────────────────────────────────────────────

// export default function AppTabs() {
//   const theme                      = useTheme();
//   const { isAdmin, churchStatus, activeChurchId } = useAuth();
//   const isReady                    = churchStatus === "ready";

//   // Busca o role real da API (com isAdmin como valor inicial de fallback)
//   const role = useMyRole(isReady, activeChurchId, isAdmin);

//   const roleWeight = { MEMBER: 1, LEADER: 2, ADMIN: 3, OWNER: 4 };
//   const weight     = roleWeight[role] || 1;

//   const isLeaderOrAbove = weight >= roleWeight.LEADER;
//   const isAdminOrAbove  = weight >= roleWeight.ADMIN;

//   const [unreadCount] = useUnreadCount(isReady);

//   return (
//     <Tab.Navigator
//       screenOptions={({ route }) => ({
//         headerShown: false,
//         tabBarActiveTintColor:   theme.colors.primary,
//         tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
//         tabBarStyle: {
//           height:        64,
//           paddingBottom: 10,
//           paddingTop:    8,
//         },
//         tabBarIcon: ({ focused, color, size }) => {
//           const icons    = ICON_MAP[route.name];
//           const iconName = icons
//             ? focused ? icons.focused : icons.default
//             : "ellipse-outline";

//           if (route.name === "NotificationsTab" && unreadCount > 0) {
//             return (
//               <View style={{ width: size, height: size }}>
//                 <Ionicons name={iconName} size={size} color={color} />
//                 <View style={{
//                   position: "absolute", top: -3, right: -5,
//                   backgroundColor: "#E84D4D", borderRadius: 9,
//                   minWidth: 16, height: 16,
//                   alignItems: "center", justifyContent: "center",
//                   paddingHorizontal: 2, borderWidth: 1.5, borderColor: "#fff",
//                 }} />
//               </View>
//             );
//           }

//           return <Ionicons name={iconName} size={size} color={color} />;
//         },
//         tabBarBadge:
//           route.name === "NotificationsTab" && unreadCount > 0
//             ? unreadCount > 99 ? "99+" : unreadCount
//             : undefined,
//       })}
//     >
//       {/* ── Sempre visíveis ── */}
//       <Tab.Screen name="HomeTab"          component={HomeStack}          options={{ title: "Início" }}        listeners={resetOnPress} />
//       <Tab.Screen name="NewsTab"          component={NewsStack}          options={{ title: "Avisos" }}        listeners={resetOnPress} />
//       <Tab.Screen name="Events"           component={EventsStack}        options={{ title: "Eventos" }}       listeners={resetOnPress} />
//       <Tab.Screen name="NotificationsTab" component={NotificationsStack} options={{ title: "Notificações" }} listeners={resetOnPress} />

//       {/* ── Escalas: ADMIN e OWNER ── */}
//       {/* {isAdminOrAbove && ( */}
//         <Tab.Screen name="SchedulesTab" component={SchedulesStack} options={{ title: "Escalas" }} listeners={resetOnPress} />
//       {/* )} */}

//       {/* ── Células: LEADER, ADMIN e OWNER ── */}
//       {/* {isLeaderOrAbove && ( */}
//         <Tab.Screen name="CellsTab" component={CellsStack} options={{ title: "Células" }} listeners={resetOnPress} />
//       {/* )} */}

//       {/* ── Admin: LEADER (painel reduzido), ADMIN e OWNER ── */}
//       {isLeaderOrAbove && (
//         <Tab.Screen name="AdminTab" component={AdminStack} options={{ title: "Admin" }} listeners={resetOnPress} />
//       )}

//       {/* ── Sempre visível ── */}
//       <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: "Mais" }} listeners={resetOnPress} />
//     </Tab.Navigator>
//   );
// }


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

// ─── Componente redirect — ao ser montado navega para Notifications no HomeTab ──
// Usado como tela fantasma da NotificationsTab para que a rota exista no navigator
// sem ocupar espaço na tab bar.
function NotificationsRedirect() {
  const navigation = useNavigation();

  useEffect(() => {
    // Navega para a tela Notifications que está dentro do HomeStack
    const timer = setTimeout(() => {
      navigation.navigate("HomeTab", { screen: "Notifications" });
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
        })
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
          })
        );
      });
    },
  });
}

export default function AppTabs() {
  const theme = useTheme();
  const auth = useAuth();
  const { t } = useTerms();

  /**
   * Compatibilidade com diferentes formatos do AuthContext.
   *
   * Em alguns pontos do app, o role pode vir como:
   * - auth.myRole
   * - auth.role
   * - auth.user.role
   * - auth.user.myRole
   * - auth.currentChurch.myRole
   * - auth.selectedChurch.myRole
   *
   * Caso nenhum role venha no contexto, usamos:
   * - ADMIN se auth.isAdmin for true
   * - MEMBER como padrão
   *
   * Isso evita quebrar o app e permite que membros novos vejam a aba Células,
   * desde que o permissions.js tenha canAccessCells: true para MEMBER.
   */
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

  /**
   * Compatibilidade com extraPermissions.
   *
   * Caso futuramente o usuário tenha permissões específicas no banco,
   * elas serão aplicadas por cima das permissões padrão do role.
   */
  const extraPermissions = useMemo(() => {
    if (auth?.extraPermissions) return auth.extraPermissions;
    if (auth?.user?.extraPermissions) return auth.user.extraPermissions;
    if (auth?.currentChurch?.extraPermissions) return auth.currentChurch.extraPermissions;
    if (auth?.selectedChurch?.extraPermissions) return auth.selectedChurch.extraPermissions;

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
            NewsTab: focused ? "newspaper" : "newspaper-outline",
            Events: focused ? "calendar" : "calendar-outline",
            SchedulesTab: focused ? "calendar" : "calendar-outline",
            CellsTab: focused ? "people" : "people-outline",
            AdminTab: focused ? "settings" : "settings-outline",
            MoreTab: focused ? "menu" : "menu-outline",
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
        NotificationsTab — rota registrada para que navigation.navigate("NotificationsTab")
        não lance erro. O componente NotificationsRedirect redireciona imediatamente para
        a tela Notifications dentro do HomeStack. tabBarButton: () => null com
        tabBarItemStyle: { display: "none" } garante que nenhum espaço apareça na barra.
      */}
      {/* <Tab.Screen
        name="NotificationsTab"
        component={NotificationsRedirect}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      /> */}

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