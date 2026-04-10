import React, { useEffect } from "react";
import { View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => {
      // se for authed, RootNavigator vai trocar automaticamente
      navigation.replace("Login");
    }, 600);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text variant="headlineMedium">ChurchApp</Text>
      <Text style={{ opacity: 0.7, marginTop: 8 }}>Gestão moderna da igreja</Text>
      <ActivityIndicator style={{ marginTop: 18 }} />
    </View>
  );
}
    