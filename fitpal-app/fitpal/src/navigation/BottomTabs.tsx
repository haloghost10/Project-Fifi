import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors, type as fonts } from "@/theme";
import { HomeScreen } from "@/screens/HomeScreen";
import { DiaryScreen } from "@/screens/DiaryScreen";
import { ScanScreen } from "@/screens/ScanScreen";
import { ProgressScreen } from "@/screens/ProgressScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.hairline },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Diary" component={DiaryScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
