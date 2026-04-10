import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ChurchOnboardingScreen from "../../screens/church/ChurchOnboardingScreen";
import ChurchPublicProfileScreen from "../../screens/church/ChurchPublicProfileScreen";
import ChurchProfileScreen from "../../screens/church/ChurchProfile";
import PendingApprovalScreen from "../../screens/church/PendingApprovalScreen";

const Stack = createNativeStackNavigator();

export default function ChurchOnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChurchOnboarding" component={ChurchOnboardingScreen} />
      <Stack.Screen name="ChurchPublicProfile" component={ChurchPublicProfileScreen} />
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      <Stack.Screen name="ChurchProfile" component={ChurchProfileScreen} />
    </Stack.Navigator>
  );
}
