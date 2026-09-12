// Minimal email/password auth. Supabase's email auth is enabled by default on
// new projects (Authentication > Providers > Email in the dashboard, on by
// default) — no extra Supabase setup should be needed for this to work.
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { colors, type as fonts, spacing } from "@/theme";
import { supabase } from "@/services/supabase/client";

export function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } =
        mode === "signIn"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (error) {
        Alert.alert("Couldn't sign in", error.message);
      } else if (mode === "signUp") {
        Alert.alert(
          "Check your email",
          "We sent a confirmation link. Confirm it, then come back and sign in."
        );
        setMode("signIn");
      }
      // On success, RootNavigator's onAuthStateChange listener handles moving
      // the user forward automatically — no manual navigation needed here.
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{mode === "signIn" ? "Welcome back" : "Create your account"}</Text>
      <Text style={styles.subtitle}>Sign in so your progress syncs and is saved.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.inkMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.inkMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.submit} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>{mode === "signIn" ? "Sign in" : "Sign up"}</Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
        <Text style={styles.toggle}>
          {mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base, padding: spacing(6), justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, marginBottom: spacing(1) },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: spacing(6) },
  input: {
    borderWidth: 1, borderColor: colors.hairline, borderRadius: 8, padding: spacing(3),
    fontFamily: fonts.body, fontSize: 15, color: colors.ink, backgroundColor: colors.surface, marginBottom: spacing(3),
  },
  submit: { backgroundColor: colors.brand, borderRadius: 8, paddingVertical: spacing(3.5), alignItems: "center", marginTop: spacing(2) },
  submitText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" },
  toggle: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.brand, textAlign: "center", marginTop: spacing(4) },
});