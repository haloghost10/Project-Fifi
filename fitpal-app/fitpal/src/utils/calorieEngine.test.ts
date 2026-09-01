// Runs with plain Node (no test framework install needed):
//   node --experimental-strip-types --test src/utils/calorieEngine.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacros,
  calculateGoalTargets,
  ACTIVITY_MULTIPLIERS,
} from "./calorieEngine.ts";

test("calculateBMR matches Mifflin-St Jeor for a known male example", () => {
  // 30 y/o male, 80kg, 180cm -> 10*80 + 6.25*180 - 5*30 + 5 = 800+1125-150+5 = 1780
  const bmr = calculateBMR("male", 80, 180, 30);
  assert.equal(bmr, 1780);
});

test("calculateBMR matches Mifflin-St Jeor for a known female example", () => {
  // 28 y/o female, 65kg, 165cm -> 10*65 + 6.25*165 - 5*28 - 161 = 650+1031.25-140-161 = 1380.25
  const bmr = calculateBMR("female", 65, 165, 28);
  assert.equal(bmr, 1380.25);
});

test("calculateTDEE applies the correct activity multiplier", () => {
  assert.equal(calculateTDEE(1800, "sedentary"), 1800 * ACTIVITY_MULTIPLIERS.sedentary);
  assert.equal(calculateTDEE(1800, "very_active"), 1800 * ACTIVITY_MULTIPLIERS.very_active);
});

test("calculateCalorieTarget: maintain returns TDEE unchanged", () => {
  const result = calculateCalorieTarget(2200, "male", "maintain", 0);
  assert.equal(result.calorieTarget, 2200);
  assert.equal(result.wasAdjustedForSafety, false);
});

test("calculateCalorieTarget: 1 lb/week loss creates a ~500 kcal/day deficit", () => {
  const result = calculateCalorieTarget(2400, "male", "lose", 1);
  assert.equal(result.calorieTarget, 2400 - 500);
  assert.equal(result.wasAdjustedForSafety, false);
});

test("calculateCalorieTarget: clamps unsafe requested loss rate to 2 lb/week ceiling", () => {
  // TDEE high enough that the 2 lb/week rate ceiling binds before the 1500 kcal floor does
  const result = calculateCalorieTarget(3200, "male", "lose", 5);
  const expectedDelta = (2 * 3500) / 7; // clamped to 2 lb/week -> 1000 kcal/day deficit
  assert.equal(result.calorieTarget, Math.round(3200 - expectedDelta));
  assert.equal(result.wasAdjustedForSafety, true);
});

test("calculateCalorieTarget: an aggressive rate can trigger both the rate ceiling and the floor", () => {
  const result = calculateCalorieTarget(2400, "male", "lose", 5);
  assert.equal(result.calorieTarget, 1500); // floor wins even after the rate is already capped
  assert.equal(result.wasAdjustedForSafety, true);
});

test("calculateCalorieTarget: never drops a female's target below the 1200 kcal floor", () => {
  const result = calculateCalorieTarget(1300, "female", "lose", 2);
  assert.equal(result.calorieTarget, 1200);
  assert.equal(result.wasAdjustedForSafety, true);
});

test("calculateMacros: balanced strategy sums back to ~the calorie target", () => {
  const macros = calculateMacros(2000, 80, "balanced");
  const reconstructed = macros.proteinG * 4 + macros.carbsG * 4 + macros.fatG * 9;
  assert.ok(Math.abs(reconstructed - 2000) <= 5, `expected ~2000, got ${reconstructed}`);
  assert.equal(macros.proteinG, Math.round(1.6 * 80)); // 128g
});

test("calculateMacros: high_protein strategy gives more protein per kg than balanced", () => {
  const balanced = calculateMacros(2000, 80, "balanced");
  const highProtein = calculateMacros(2000, 80, "high_protein");
  assert.ok(highProtein.proteinG > balanced.proteinG);
});

test("calculateMacros: custom percentages normalize even if they don't sum to 100", () => {
  const macros = calculateMacros(2000, 80, "custom", { protein: 30, carbs: 40, fat: 30 });
  const reconstructed = macros.proteinG * 4 + macros.carbsG * 4 + macros.fatG * 9;
  assert.ok(Math.abs(reconstructed - 2000) <= 5);
});

test("calculateGoalTargets: full pipeline produces internally consistent numbers", () => {
  const targets = calculateGoalTargets({
    id: "u1",
    name: "Test User",
    age: 30,
    sex: "male",
    heightCm: 180,
    currentWeightKg: 80,
    goalWeightKg: 75,
    activityLevel: "moderate",
    goalType: "lose",
    weeklyRateLb: 1,
    macroStrategy: "balanced",
    dietaryPreferences: [],
    allergies: [],
  });
  assert.equal(targets.bmr, 1780);
  assert.equal(targets.tdee, Math.round(1780 * ACTIVITY_MULTIPLIERS.moderate));
  assert.equal(targets.calorieTarget, targets.tdee - 500);
  assert.equal(targets.wasAdjustedForSafety, false);
  assert.ok(targets.fiberG > 0);
});
