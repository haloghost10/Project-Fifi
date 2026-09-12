import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { calculateGoalTargets } from "@/utils/calorieEngine.ts";
import { colors } from "@/theme";
import { SignInScreen } from "@/screens/SignInScreen";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { BottomTabs } from "./BottomTabs";
import type { UserProfile } from "@/types";

export type RootStackParamList = {
  SignIn: undefined;
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Maps a Supabase user_profiles row (snake_case) back to our UserProfile type.
function rowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    sex: row.sex,
    heightCm: row.height_cm,
    currentWeightKg: row.current_weight_kg,
    goalWeightKg: row.goal_weight_kg,
    activityLevel: row.activity_level,
    goalType: row.goal_type,
    weeklyRateLb: row.weekly_rate_lb,
    macroStrategy: row.macro_strategy,
    customMacroPercents: row.custom_macro_percents ?? undefined,
    dietaryPreferences: row.dietary_preferences ?? [],
    allergies: row.allergies ?? [],
  };
}

export function RootNavigator() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still checking
  const [profileChecked, setProfileChecked] = useState(false);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const setGoalTargets = useAppStore((s) => s.setGoalTargets);

  console.log("[RootNavigator] render — session:", session, "profileChecked:", profileChecked);

  // Safety net: if auth genuinely hangs (bad URL, blocked network, native module
  // issue), don't leave the user stuck on a spinner forever — fail open to SignIn
  // after 8s so at least the rest of the app is testable.
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn("[RootNavigator] TIMEOUT: getSession never resolved after 8s — failing open to SignIn");
      setSession((current) => (current === undefined ? null : current));
      setProfileChecked(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

  // Watch auth state — this also fires immediately with the current session on mount.
  useEffect(() => {
    console.log("[RootNavigator] calling getSession()...");
    supabase.auth.getSession()
      .then(({ data, error }) => {
        console.log("[RootNavigator] getSession() resolved. error:", error, "session exists:", !!data.session);
        if (error) console.error("getSession error:", error.message);
        setSession(data.session ?? null);
      })
      .catch((err) => {
        console.error("[RootNavigator] getSession() THREW:", err);
        setSession(null);
      });
    console.log("[RootNavigator] getSession() call dispatched (this logs before the promise resolves)");

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("[RootNavigator] onAuthStateChange fired:", event, "session exists:", !!newSession);
      setSession(newSession);
      setProfileChecked(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Once signed in, check whether a user_profiles row already exists so a
  // returning user skips onboarding. Depends on a derived key (not session?.user?.id
  // directly) because that stays `undefined` both before auth has loaded and after
  // it resolves to "no user" — using it directly means this effect would never
  // re-fire on that transition, leaving profileChecked stuck at false.
  const profileCheckKey = session === undefined ? "loading" : session?.user?.id ?? "signed-out";

  useEffect(() => {
    if (!session?.user) {
      setProfileChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) console.error("user_profiles lookup error:", error.message);
        if (cancelled) return;
        if (data) {
          const loadedProfile = rowToProfile(data);
          setProfile(loadedProfile);
          setGoalTargets(calculateGoalTargets(loadedProfile));
        }
      } catch (err) {
        console.error("user_profiles lookup threw:", err);
      } finally {
        if (!cancelled) setProfileChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileCheckKey]);

  if (session === undefined || !profileChecked) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.base }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session?.user ? (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        ) : !profile ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={BottomTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}