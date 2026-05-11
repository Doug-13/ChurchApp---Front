import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NewsFeedScreen from "../../screens/news/NewsFeedScreen";
import NewsDetailsScreen from "../../screens/news/NewsDetailsScreen";
import NewsFormScreen from "../../screens/news/NewsFormScreen";

const Stack = createNativeStackNavigator();
export default function NewsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="NewsFeed" component={NewsFeedScreen} options={{ title: "Avisos", headerShown: false, }} />
      <Stack.Screen name="NewsForm" component={NewsFormScreen} options={{ title: "Criar", headerShown: false, }} />
      <Stack.Screen name="NewsDetails" component={NewsDetailsScreen} options={{ title: "Detalhe" }} />
    </Stack.Navigator>
  );
}
