import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAppStore } from "@/store/useAppStore";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { BottomTabs } from "./BottomTabs";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  // A real app checks Supabase auth + whether user_profiles has a row for this
  // user; this is a simplified placeholder using local store state.
  const profile = useAppStore((s) => s.profile);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {profile ? (
          <Stack.Screen name="Main" component={BottomTabs} />
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
