// src/services/notificationsService.js

import {
  PermissionsAndroid,
  Platform,
} from "react-native";

import { getApp } from "@react-native-firebase/app";

import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from "@react-native-firebase/messaging";

function getFirebaseMessaging() {
  const app = getApp();
  return getMessaging(app);
}

export async function requestNotificationPermission() {
  const messaging = getFirebaseMessaging();

  if (
    Platform.OS === "android" &&
    Number(Platform.Version) >= 33
  ) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: "Permitir notificações",
        message:
          "O ChurchApp usa notificações para avisar sobre eventos, escalas, repertórios e comunicados da igreja.",
        buttonPositive: "Permitir",
        buttonNegative: "Agora não",
      },
    );

    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  if (Platform.OS === "ios") {
    const status = await requestPermission(messaging);

    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  }

  return true;
}

export async function getNotificationToken() {
  const messaging = getFirebaseMessaging();

  if (Platform.OS === "ios") {
    try {
      await registerDeviceForRemoteMessages(messaging);
    } catch (error) {
      if (__DEV__) {
        console.log(
          "[Notifications] registerDeviceForRemoteMessages:",
          error?.message || error,
        );
      }
    }
  }

  const token = await getToken(messaging);
  return token || null;
}

export async function registerNotificationDevice(apiFetchAuth) {
  if (typeof apiFetchAuth !== "function") {
    throw new Error("apiFetchAuth não informado.");
  }

  const permissionGranted =
    await requestNotificationPermission();

  if (!permissionGranted) {
    if (__DEV__) {
      console.log(
        "[Notifications] usuário não autorizou notificações.",
      );
    }
    return null;
  }

  const token = await getNotificationToken();

  if (!token) {
    if (__DEV__) {
      console.log(
        "[Notifications] token FCM não disponível.",
      );
    }
    return null;
  }

  await apiFetchAuth("/notifications/device", {
    method: "POST",
    body: {
      token,
      platform: Platform.OS,
    },
  });

  if (__DEV__) {
    console.log(
      "[Notifications] dispositivo registrado.",
      {
        platform: Platform.OS,
        token: `${token.slice(0, 15)}...`,
      },
    );
  }

  return token;
}

export async function unregisterNotificationDevice(
  apiFetchAuth,
  token,
) {
  if (
    typeof apiFetchAuth !== "function" ||
    !token
  ) {
    return null;
  }

  return apiFetchAuth(
    "/notifications/device/unregister",
    {
      method: "PATCH",
      body: { token },
    },
  );
}

export function listenNotificationTokenRefresh(
  apiFetchAuth,
) {
  const messaging = getFirebaseMessaging();

  return onTokenRefresh(
    messaging,
    async (token) => {
      try {
        await apiFetchAuth(
          "/notifications/device",
          {
            method: "POST",
            body: {
              token,
              platform: Platform.OS,
            },
          },
        );

        if (__DEV__) {
          console.log(
            "[Notifications] token atualizado.",
          );
        }
      } catch (error) {
        console.log(
          "[Notifications] erro ao atualizar token:",
          error?.message || error,
        );
      }
    },
  );
}

export function listenForegroundNotifications(
  callback,
) {
  const messaging = getFirebaseMessaging();

  return onMessage(
    messaging,
    async (remoteMessage) => {
      if (__DEV__) {
        console.log(
          "[Notifications] foreground:",
          remoteMessage,
        );
      }

      if (typeof callback === "function") {
        callback(remoteMessage);
      }
    },
  );
}

export function listenNotificationOpened(callback) {
  const messaging = getFirebaseMessaging();

  return onNotificationOpenedApp(
    messaging,
    (remoteMessage) => {
      if (__DEV__) {
        console.log(
          "[Notifications] notificação aberta:",
          remoteMessage,
        );
      }

      if (typeof callback === "function") {
        callback(remoteMessage);
      }
    },
  );
}

export async function getInitialPushNotification() {
  const messaging = getFirebaseMessaging();
  return getInitialNotification(messaging);
}

export async function getNotifications(
  apiFetchAuth,
  limit = 40,
) {
  return apiFetchAuth(
    `/notifications?limit=${limit}`,
    { method: "GET" },
  );
}

export async function getUnreadNotificationCount(
  apiFetchAuth,
) {
  const result = await apiFetchAuth(
    "/notifications/unread-count",
    { method: "GET" },
  );

  return Number(result?.count || 0);
}

export async function markNotificationRead(
  apiFetchAuth,
  notificationId,
) {
  if (!notificationId) return null;

  return apiFetchAuth(
    `/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );
}

export async function markAllNotificationsRead(
  apiFetchAuth,
) {
  return apiFetchAuth(
    "/notifications/read-all",
    { method: "PATCH" },
  );
}
