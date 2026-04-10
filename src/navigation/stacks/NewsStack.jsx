import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NewsFeedScreen from "../../screens/news/NewsFeedScreen";
import NewsDetailsScreen from "../../screens/news/NewsDetailsScreen";

const Stack = createNativeStackNavigator();
export default function NewsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="NewsFeed" component={NewsFeedScreen} options={{ title: "Novidades" }} />
      <Stack.Screen name="NewsDetails" component={NewsDetailsScreen} options={{ title: "Detalhe" }} />
    </Stack.Navigator>
  );
}
