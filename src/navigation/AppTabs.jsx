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
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StackActions } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "react-native-paper";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { useAuth } from "../context/AuthContext";
import { normalizeRole } from "../utils/permissions";
import { API_BASE_URL } from "../config/api";

import HomeStack          from "./stacks/HomeStack";
import NewsStack          from "./stacks/NewsStack";
import SchedulesStack     from "./stacks/SchedulesStack";
import CellsStack         from "./stacks/CellsStack";
import MoreStack          from "./stacks/MoreStack";
import EventsStack        from "./stacks/EventsStack";
import AdminStack         from "./stacks/AdminStack";
import NotificationsStack from "./stacks/NotificationsStack";

const Tab = createBottomTabNavigator();

// ─── Hook: contagem de notificações não lidas ─────────────────────────────────

function useUnreadCount(isReady) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isReady) return;

    async function fetchCount() {
      try {
        const fbUser = getAuth().currentUser;
        if (!fbUser) return;
        const token = await getIdToken(fbUser, false);
        const res = await global.fetch(`${API_BASE_URL}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCount(data?.count ?? 0);
      } catch { /* silencioso */ }
    }

    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, [isReady]);

  return count;
}

// ─── Listener: reseta o stack ao tocar na tab ativa ──────────────────────────

function popToTopListener(navigation) {
  return {
    tabPress: (e) => {
      if (navigation.isFocused()) {
        e.preventDefault();
        navigation.dispatch(StackActions.popToTop());
      }
    },
  };
}

// ─── Ícones por tab ───────────────────────────────────────────────────────────

function getTabIcon(routeName, focused) {
  const map = {
    HomeTab:          focused ? "home"          : "home-outline",
    NewsTab:          focused ? "newspaper"     : "newspaper-outline",
    Events:           focused ? "calendar"      : "calendar-outline",
    NotificationsTab: focused ? "notifications" : "notifications-outline",
    SchedulesTab:     focused ? "calendar"      : "calendar-outline",
    CellsTab:         focused ? "people"        : "people-outline",
    AdminTab:         focused ? "settings"      : "settings-outline",
    MoreTab:          focused ? "menu"          : "menu-outline",
  };
  return map[routeName] || "ellipse-outline";
}

// ─── AppTabs ──────────────────────────────────────────────────────────────────
//
// Visibilidade de tabs por role:
//   MEMBER  → Início | Avisos | Eventos | Notificações | Mais
//   LEADER  → + Células | Admin
//   ADMIN   → + Escalas | Células | Admin
//   OWNER   → + Escalas | Células | Admin
//
// ─────────────────────────────────────────────────────────────────────────────

export default function AppTabs() {
  const theme = useTheme();

  const {
    role,
    permissions,
    isOwner,
    isAdmin,
    isLeader,
    churchStatus,
    can,
  } = useAuth();

  const isReady = churchStatus === "ready";
  const unreadCount = useUnreadCount(isReady);

  const access = useMemo(() => {
    const safeRole = normalizeRole(role);

    const ownerAccess = isOwner || safeRole === "OWNER";

    const adminAccess =
      ownerAccess ||
      isAdmin ||
      safeRole === "ADMIN" ||
      !!permissions?.isAdmin;

    const leaderAccess =
      adminAccess ||
      isLeader ||
      safeRole === "LEADER" ||
      !!permissions?.isLeader;

    return {
      safeRole,
      canAccessSchedules:
        ownerAccess ||
        adminAccess ||
        can?.("canAccessSchedules") ||
        can?.("canManageSchedules"),

      canAccessCells:
        ownerAccess ||
        leaderAccess ||
        can?.("canAccessCells") ||
        can?.("canManageCells"),

      canAccessAdmin:
        ownerAccess ||
        leaderAccess ||
        can?.("canAccessAdmin"),
    };
  }, [role, permissions, isOwner, isAdmin, isLeader, can]);

  if (__DEV__) {
    console.log("[AppTabs] acessos calculados:", {
      role,
      safeRole: access.safeRole,
      churchStatus,
      isOwner,
      isAdmin,
      isLeader,
      canAccessSchedules: access.canAccessSchedules,
      canAccessCells:     access.canAccessCells,
      canAccessAdmin:     access.canAccessAdmin,
    });
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          height:        64,
          paddingBottom: 10,
          paddingTop:    8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon(route.name, focused);

          // Badge de notificações não lidas
          if (route.name === "NotificationsTab" && unreadCount > 0) {
            return (
              <View style={{ width: size, height: size }}>
                <Ionicons name={iconName} size={size} color={color} />
                <View style={{
                  position:          "absolute",
                  top:               -3,
                  right:             -5,
                  backgroundColor:   "#E84D4D",
                  borderRadius:      9,
                  minWidth:          16,
                  height:            16,
                  alignItems:        "center",
                  justifyContent:    "center",
                  paddingHorizontal: 2,
                  borderWidth:       1.5,
                  borderColor:       "#fff",
                }} />
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
      {/* ── Sempre visíveis — todos os roles ── */}
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: "Início", headerShown: false }}
        listeners={({ navigation }) => popToTopListener(navigation)}
      />

      <Tab.Screen
        name="NewsTab"
        component={NewsStack}
        options={{ title: "Avisos", headerShown: false }}
        listeners={({ navigation }) => popToTopListener(navigation)}
      />

      <Tab.Screen
        name="Events"
        component={EventsStack}
        options={{ title: "Eventos", headerShown: false }}
        listeners={({ navigation }) => popToTopListener(navigation)}
      />

      {/* ── Notificações — tab oculta, acessada pelo sino no hero ──
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStack}
        options={{
          title: "Notificações",
          headerShown: false,
          tabBarButton: () => null,   // oculta da barra inferior
          tabBarStyle: { display: "none" },
        }}
        listeners={({ navigation }) => popToTopListener(navigation)}
      /> */}

      {/* ── Escalas: ADMIN e OWNER ── */}
      {access.canAccessSchedules && (
        <Tab.Screen
          name="SchedulesTab"
          component={SchedulesStack}
          options={{ title: "Escalas", headerShown: false }}
          listeners={({ navigation }) => popToTopListener(navigation)}
        />
      )}

      {/* ── Células: LEADER, ADMIN e OWNER ── */}
      {access.canAccessCells && (
        <Tab.Screen
          name="CellsTab"
          component={CellsStack}
          options={{ title: "Células", headerShown: false }}
          listeners={({ navigation }) => popToTopListener(navigation)}
        />
      )}

      {/* ── Admin: LEADER (painel reduzido), ADMIN e OWNER ── */}
      {access.canAccessAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminStack}
          options={{ title: "Admin", headerShown: false }}
          listeners={({ navigation }) => popToTopListener(navigation)}
        />
      )}

      {/* ── Sempre visível ── */}
      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{ title: "Mais", headerShown: false }}
        listeners={({ navigation }) => popToTopListener(navigation)}
      />
    </Tab.Navigator>
  );
}