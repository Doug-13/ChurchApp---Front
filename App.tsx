import * as React from "react";
import { PaperProvider } from "react-native-paper";
import {
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RootNavigator from "./src/navigation/RootNavigator";
import { theme } from "./theme/index";
import { AuthProvider } from "./src/context/AuthContext";
import PushNotificationsBootstrap from "./src/components/PushNotificationsBootstrap";

export default function App() {
  const navTheme = React.useMemo(
    () => ({
      ...NavDefaultTheme,
      colors: {
        ...NavDefaultTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.onSurface,
        border: theme.colors.outlineVariant,
        notification: theme.colors.error,
      },
    }),
    [],
  );

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <PushNotificationsBootstrap />

          <NavigationContainer theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
