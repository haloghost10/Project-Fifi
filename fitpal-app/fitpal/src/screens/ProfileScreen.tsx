import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors, type as fonts, spacing } from "@/theme";
import { useAppStore } from "@/store/useAppStore";

export function ProfileScreen() {
  const profile = useAppStore((s) => s.profile);
  const goalTargets = useAppStore((s) => s.goalTargets);
  if (!profile || !goalTargets) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{profile.name}</Text>

      <Text style={styles.sectionLabel}>Your numbers</Text>
      <Row label="BMR" value={`${goalTargets.bmr} kcal/day`} />
      <Row label="TDEE" value={`${goalTargets.tdee} kcal/day`} />
      <Row label="Calorie target" value={`${goalTargets.calorieTarget} kcal/day`} />
      <Row label="Protein target" value={`${goalTargets.proteinG} g`} />
      <Row label="Carbs target" value={`${goalTargets.carbsG} g`} />
      <Row label="Fat target" value={`${goalTargets.fatG} g`} />
      <Row label="Fiber target" value={`${goalTargets.fiberG} g`} />

      {goalTargets.wasAdjustedForSafety && goalTargets.safetyNote && (
        <View style={styles.safetyBox}>
          <Text style={styles.safetyText}>{goalTargets.safetyNote}</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Goal</Text>
      <Row label="Type" value={profile.goalType} />
      <Row label="Rate" value={`${profile.weeklyRateLb} lb/week`} />
      <Row label="Macro strategy" value={profile.macroStrategy} />

      <Text style={styles.note}>
        Editing goals in place, dark mode, and account settings are the next screens to
        build here — the calculation engine underneath (calculateGoalTargets) already
        supports recomputing from any updated profile.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing(5), paddingTop: spacing(16), paddingBottom: spacing(24) },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: spacing(5) },
  sectionLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, marginBottom: spacing(2), marginTop: spacing(4) },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing(2), borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rowLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, textTransform: "capitalize" },
  rowValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  safetyBox: { backgroundColor: "#FCEEE9", borderRadius: 8, padding: spacing(3), marginTop: spacing(3) },
  safetyText: { fontFamily: fonts.body, fontSize: 13, color: colors.warning, lineHeight: 18 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: spacing(8), lineHeight: 18, fontStyle: "italic" },
});
