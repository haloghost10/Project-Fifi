// Minimal but functional onboarding: collects the fields calorieEngine.ts needs,
// computes real targets, and writes both to Supabase and local store.
// Not styled to the full design system yet — see README "Suggested next steps".
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { colors, type as fonts, spacing } from "@/theme";
import { calculateGoalTargets } from "@/utils/calorieEngine.ts";
import { lbToKg, inToCm } from "@/utils/units.ts";
import { supabase } from "@/services/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import type { ActivityLevel, GoalType, Sex, UserProfile } from "@/types";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary — little/no exercise" },
  { value: "light", label: "Light — exercise 1-3 days/week" },
  { value: "moderate", label: "Moderate — exercise 3-5 days/week" },
  { value: "active", label: "Active — exercise 6-7 days/week" },
  { value: "very_active", label: "Very active — hard daily exercise / physical job" },
];

export function OnboardingScreen() {
  const setProfile = useAppStore((s) => s.setProfile);
  const setGoalTargets = useAppStore((s) => s.setGoalTargets);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("female");
  const [heightIn, setHeightIn] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [goalWeightLb, setGoalWeightLb] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goalType, setGoalType] = useState<GoalType>("lose");
  const [weeklyRateLb, setWeeklyRateLb] = useState("1");

  const canSubmit = name && age && heightIn && weightLb && goalWeightLb;

  async function handleSubmit() {
    const profile: UserProfile = {
      id: "pending", // replaced with auth.uid() once Supabase auth is wired up
      name,
      age: Number(age),
      sex,
      heightCm: inToCm(Number(heightIn)),
      currentWeightKg: lbToKg(Number(weightLb)),
      goalWeightKg: lbToKg(Number(goalWeightLb)),
      activityLevel,
      goalType,
      weeklyRateLb: Number(weeklyRateLb) || 0,
      macroStrategy: "balanced",
      dietaryPreferences: [],
      allergies: [],
    };

    const targets = calculateGoalTargets(profile);

    try {
      // RootNavigator only shows this screen once a session is confirmed, so
      // this should always succeed — but we still guard against a race.
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        Alert.alert("Session issue", "Please sign out and sign in again.");
        return;
      }
      profile.id = userData.user.id;
      await supabase.from("user_profiles").upsert({
          id: profile.id,
          name: profile.name,
          age: profile.age,
          sex: profile.sex,
          height_cm: profile.heightCm,
          current_weight_kg: profile.currentWeightKg,
          goal_weight_kg: profile.goalWeightKg,
          activity_level: profile.activityLevel,
          goal_type: profile.goalType,
          weekly_rate_lb: profile.weeklyRateLb,
          macro_strategy: profile.macroStrategy,
        });
        await supabase.from("goal_targets").upsert({
          user_id: profile.id,
          bmr: targets.bmr,
          tdee: targets.tdee,
          calorie_target: targets.calorieTarget,
          protein_g: targets.proteinG,
          carbs_g: targets.carbsG,
          fat_g: targets.fatG,
          fiber_g: targets.fiberG,
          was_adjusted_for_safety: targets.wasAdjustedForSafety,
          safety_note: targets.safetyNote,
        });
    } catch (err) {
      // Non-fatal: local state still works, Supabase sync can retry later.
      console.warn("Could not sync profile to Supabase (are your .env keys set?):", err);
    }

    if (targets.wasAdjustedForSafety && targets.safetyNote) {
      Alert.alert("We adjusted your plan", targets.safetyNote);
    }

    setProfile(profile);
    setGoalTargets(targets);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Let's set up your plan</Text>
      <Text style={styles.subtitle}>
        We use the Mifflin-St Jeor equation to calculate your targets — not a guess.
      </Text>

      <Field label="Name" value={name} onChangeText={setName} placeholder="Jordan" />
      <Field label="Age" value={age} onChangeText={setAge} placeholder="30" keyboardType="number-pad" />

      <Text style={styles.label}>Sex (used for the BMR formula)</Text>
      <View style={styles.row}>
        <Choice label="Female" active={sex === "female"} onPress={() => setSex("female")} />
        <Choice label="Male" active={sex === "male"} onPress={() => setSex("male")} />
      </View>

      <Field label="Height (in)" value={heightIn} onChangeText={setHeightIn} placeholder="66" keyboardType="number-pad" />
      <Field label="Current weight (lb)" value={weightLb} onChangeText={setWeightLb} placeholder="160" keyboardType="number-pad" />
      <Field label="Goal weight (lb)" value={goalWeightLb} onChangeText={setGoalWeightLb} placeholder="145" keyboardType="number-pad" />

      <Text style={styles.label}>Activity level</Text>
      {ACTIVITY_OPTIONS.map((opt) => (
        <Choice key={opt.value} label={opt.label} active={activityLevel === opt.value} onPress={() => setActivityLevel(opt.value)} full />
      ))}

      <Text style={styles.label}>Goal</Text>
      <View style={styles.row}>
        <Choice label="Lose" active={goalType === "lose"} onPress={() => setGoalType("lose")} />
        <Choice label="Maintain" active={goalType === "maintain"} onPress={() => setGoalType("maintain")} />
        <Choice label="Gain" active={goalType === "gain"} onPress={() => setGoalType("gain")} />
      </View>

      {goalType !== "maintain" && (
        <Field
          label={`lb per week to ${goalType}`}
          value={weeklyRateLb}
          onChangeText={setWeeklyRateLb}
          placeholder="1"
          keyboardType="decimal-pad"
        />
      )}

      <Pressable style={[styles.submit, !canSubmit && styles.submitDisabled]} disabled={!canSubmit} onPress={handleSubmit}>
        <Text style={styles.submitText}>Calculate my targets</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field(props: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: any }) {
  return (
    <View style={{ marginBottom: spacing(4) }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        keyboardType={props.keyboardType}
        placeholderTextColor={colors.inkMuted}
      />
    </View>
  );
}

function Choice({ label, active, onPress, full }: { label: string; active: boolean; onPress: () => void; full?: boolean }) {
  return (
    <Pressable style={[styles.choice, active && styles.choiceActive, full && { width: "100%" }]} onPress={onPress}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing(5), paddingTop: spacing(16), paddingBottom: spacing(20) },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, marginBottom: spacing(1) },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: spacing(6) },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, marginBottom: spacing(2) },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 8,
    padding: spacing(3),
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", gap: spacing(2), marginBottom: spacing(4), flexWrap: "wrap" },
  choice: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 8,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
  },
  choiceActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  choiceText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  choiceTextActive: { color: "#FFFFFF" },
  submit: { backgroundColor: colors.brand, borderRadius: 8, paddingVertical: spacing(3.5), alignItems: "center", marginTop: spacing(4) },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" },
});