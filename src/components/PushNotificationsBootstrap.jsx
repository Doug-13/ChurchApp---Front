// src/components/PushNotificationsBootstrap.jsx

import React, {
  useEffect,
  useRef,
} from "react";

import {
  Alert,
  AppState,
} from "react-native";

import { useAuth } from "../context/AuthContext";

import {
  getInitialPushNotification,
  listenForegroundNotifications,
  listenNotificationOpened,
  listenNotificationTokenRefresh,
  registerNotificationDevice,
} from "../services/notificationsService";

export default function PushNotificationsBootstrap() {
  const {
    user,
    me,
    churchStatus,
    apiFetchAuth,
  } = useAuth();

  const initializedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const apiFetchAuthRef = useRef(apiFetchAuth);

  useEffect(() => {
    apiFetchAuthRef.current = apiFetchAuth;
  }, [apiFetchAuth]);

  useEffect(() => {
    if (
      !user ||
      !me ||
      churchStatus !== "ready"
    ) {
      initializedRef.current = false;
      return undefined;
    }

    let mounted = true;
    let unsubscribeTokenRefresh = null;
    let unsubscribeForeground = null;
    let unsubscribeOpened = null;

    async function initializePush() {
      try {
        const token =
          await registerNotificationDevice(
            (...args) =>
              apiFetchAuthRef.current(...args),
          );

        if (!mounted || !token) {
          return;
        }

        initializedRef.current = true;

        unsubscribeTokenRefresh =
          listenNotificationTokenRefresh(
            (...args) =>
              apiFetchAuthRef.current(...args),
          );

        unsubscribeForeground =
          listenForegroundNotifications(
            (remoteMessage) => {
              const title =
                remoteMessage?.notification?.title ||
                remoteMessage?.data?.title ||
                "Nova notificação";

              const body =
                remoteMessage?.notification?.body ||
                remoteMessage?.data?.body ||
                "";

              Alert.alert(title, body);
            },
          );

        unsubscribeOpened =
          listenNotificationOpened(
            (remoteMessage) => {
              if (__DEV__) {
                console.log(
                  "[PushBootstrap] abriu notificação:",
                  remoteMessage?.data,
                );
              }
            },
          );

        const initialNotification =
          await getInitialPushNotification();

        if (
          initialNotification &&
          __DEV__
        ) {
          console.log(
            "[PushBootstrap] app aberto por notificação:",
            initialNotification?.data,
          );
        }
      } catch (error) {
        console.log(
          "[PushBootstrap] erro ao inicializar push:",
          error?.message || error,
        );
      }
    }

    initializePush();

    const appStateSubscription =
      AppState.addEventListener(
        "change",
        async (nextState) => {
          const previous =
            appStateRef.current;

          appStateRef.current =
            nextState;

          if (
            previous !== "active" &&
            nextState === "active" &&
            initializedRef.current
          ) {
            try {
              await registerNotificationDevice(
                (...args) =>
                  apiFetchAuthRef.current(...args),
              );
            } catch (error) {
              if (__DEV__) {
                console.log(
                  "[PushBootstrap] erro ao atualizar dispositivo:",
                  error?.message || error,
                );
              }
            }
          }
        },
      );

    return () => {
      mounted = false;

      appStateSubscription?.remove?.();

      if (
        typeof unsubscribeTokenRefresh ===
        "function"
      ) {
        unsubscribeTokenRefresh();
      }

      if (
        typeof unsubscribeForeground ===
        "function"
      ) {
        unsubscribeForeground();
      }

      if (
        typeof unsubscribeOpened ===
        "function"
      ) {
        unsubscribeOpened();
      }
    };
  }, [
    user?.uid,
    me?.id,
    churchStatus,
  ]);

  return null;
}
