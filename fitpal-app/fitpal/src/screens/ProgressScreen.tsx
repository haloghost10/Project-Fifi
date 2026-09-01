// Weight + adherence trends. Chart wiring with victory-native is left as a
// clearly marked next step (see README) since it needs real historical data
// from Supabase, which isn't available in this environment to test against.
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors, type as fonts, spacing } from "@/theme";
import { useAppStore } from "@/store/useAppStore";
import { kgToLb } from "@/utils/units.ts";

export function ProgressScreen() {
  const profile = useAppStore((s) => s.profile);
  if (!profile) return null;

  const startLb = kgToLb(profile.currentWeightKg);
  const goalLb = kgToLb(profile.goalWeightKg);
  const remainingLb = Math.abs(startLb - goalLb);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>

      <View style={styles.summaryRow}>
        <SummaryStat label="Current" value={`${startLb.toFixed(1)} lb`} />
        <SummaryStat label="Goal" value={`${goalLb.toFixed(1)} lb`} />
        <SummaryStat label="To go" value={`${remainingLb.toFixed(1)} lb`} />
      </View>

      <Text style={styles.sectionLabel}>Weight trend</Text>
      <View style={styles.chartPlaceholder}>
        <Text style={styles.placeholderText}>
          Chart renders here once weight_entries has real history — wire this to
          victory-native's VictoryLine reading from Supabase (see README).
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Adherence (7 / 30 / 90 days)</Text>
      <View style={styles.chartPlaceholder}>
        <Text style={styles.placeholderText}>
          Average daily calories vs. target, and protein-goal adherence rate —
          computed from diary_entries once you have logged history.
        </Text>
      </View>
    </ScrollView>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing(5), paddingTop: spacing(16), paddingBottom: spacing(24) },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: spacing(5) },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing(6) },
  stat: { alignItems: "center" },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  sectionLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, marginBottom: spacing(2), marginTop: spacing(4) },
  chartPlaceholder: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 10, padding: spacing(4), backgroundColor: colors.surface },
  placeholderText: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, lineHeight: 19 },
});
