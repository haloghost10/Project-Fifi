import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors, type as fonts, spacing } from "@/theme";
import { useAppStore } from "@/store/useAppStore";
import { CalorieSummaryCard } from "@/components/CalorieSummaryCard";
import { MacroRing } from "@/components/MacroRing";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

export function HomeScreen() {
  const goalTargets = useAppStore((s) => s.goalTargets);
  const entries = useAppStore((s) => s.todayEntries);

  // Computed with useMemo from the raw entries array (a stable reference unless
  // entries actually changes) rather than calling a store method that builds a
  // new object on every call — that pattern breaks Zustand/React's snapshot
  // equality check and causes an infinite render loop.
  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({
          calories: acc.calories + e.facts.calories,
          proteinG: acc.proteinG + e.facts.proteinG,
          carbsG: acc.carbsG + e.facts.carbsG,
          fatG: acc.fatG + e.facts.fatG,
          fiberG: acc.fiberG + (e.facts.fiberG ?? 0),
        }),
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
      ),
    [entries]
  );

  if (!goalTargets) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.date}>Today</Text>

      <CalorieSummaryCard consumed={totals.calories} target={goalTargets.calorieTarget} />

      <View style={styles.ringsRow}>
        <MacroRing label="Protein" valueG={totals.proteinG} targetG={goalTargets.proteinG} color={colors.protein} />
        <MacroRing label="Carbs" valueG={totals.carbsG} targetG={goalTargets.carbsG} color={colors.carbs} />
        <MacroRing label="Fat" valueG={totals.fatG} targetG={goalTargets.fatG} color={colors.fat} />
      </View>

      {MEALS.map((meal) => {
        const mealEntries = entries.filter((e) => e.meal === meal);
        const mealCalories = mealEntries.reduce((sum, e) => sum + e.facts.calories, 0);
        return (
          <View key={meal} style={styles.mealBlock}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealName}>{meal[0].toUpperCase() + meal.slice(1)}</Text>
              <Text style={styles.mealCalories}>{Math.round(mealCalories)} kcal</Text>
            </View>
            {mealEntries.length === 0 ? (
              <Text style={styles.emptyMeal}>Nothing logged yet</Text>
            ) : (
              mealEntries.map((e) => (
                <View key={e.id} style={styles.foodRow}>
                  <Text style={styles.foodName}>{e.foodName}</Text>
                  <Text style={styles.foodDetail}>
                    {e.servingDescription} · {Math.round(e.facts.calories)} kcal
                  </Text>
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing(5), paddingTop: spacing(16), paddingBottom: spacing(24) },
  date: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: spacing(2) },
  ringsRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: spacing(6) },
  mealBlock: { marginBottom: spacing(5), borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: spacing(3) },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing(2) },
  mealName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  mealCalories: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted },
  emptyMeal: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, fontStyle: "italic" },
  foodRow: { paddingVertical: spacing(1.5) },
  foodName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  foodDetail: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted },
});