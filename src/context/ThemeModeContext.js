// src/context/ThemeModeContext.js
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

const STORAGE_KEY = "@app_theme_mode"; // "light" | "dark" | "system"

export const ThemeModeContext = React.createContext({
  mode: "system",
  setMode: (_mode) => {},
});

export function ThemeModeProvider({ children }) {
  const systemScheme = useColorScheme(); // "light" | "dark"
  const [mode, setModeState] = React.useState("system");

  React.useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") setModeState(saved);
    })();
  }, []);

  const setMode = React.useCallback(async (next) => {
    setModeState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, isDark }}>
      {children}
    </ThemeModeContext.Provider>
  );
}