// src/navigation/stacks/NewsStack.jsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTerms } from "../../context/TerminologyContext";

import NewsFeedScreen    from "../../screens/news/NewsFeedScreen";
import NewsDetailsScreen from "../../screens/news/NewsDetailsScreen";
import NewsFormScreen    from "../../screens/news/NewsFormScreen";

const Stack = createNativeStackNavigator();

export default function NewsStack() {
  const { t } = useTerms();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="NewsFeed"
        component={NewsFeedScreen}
        options={{ title: t.news, headerShown: false }}        // "Avisos" | "Informes"
      />
      <Stack.Screen
        name="NewsForm"
        component={NewsFormScreen}
        options={{ title: `Novo ${t.news.replace(/s$/, "")}`, headerShown: false }} // "Novo Aviso" | "Novo Informe"
      />
      <Stack.Screen
        name="NewsDetails"
        component={NewsDetailsScreen}
        options={{ title: t.news.replace(/s$/, "") }}          // "Aviso" | "Informe"
      />
    </Stack.Navigator>
  );
}