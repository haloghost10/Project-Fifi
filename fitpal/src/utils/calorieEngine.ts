// The goal engine: BMR -> TDEE -> calorie target -> macro targets.
// Formulas are explicit and testable on purpose (see calorieEngine.test.ts) —
// nothing here is decided by an LLM, per the app's accuracy philosophy.

import { KCAL_PER_LB } from "./units.ts";
import type {
  ActivityLevel,
  GoalTargets,
  GoalType,
  MacroStrategy,
  Sex,
  UserProfile,
} from "@/types";

// --- Activity multipliers (standard values used alongside Mifflin-St Jeor) ---
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// --- Safety limits ---
// We will not generate a plan below these floors or above these deficit/surplus
// rates, regardless of what the user requests. The UI should explain when a
// value has been clamped (see wasAdjustedForSafety / safetyNote).
const MIN_CALORIES_FEMALE = 1200;
const MIN_CALORIES_MALE = 1500;
const MAX_SAFE_WEEKLY_LOSS_LB = 2; // > this is not recommended without supervision
const MAX_SAFE_WEEKLY_GAIN_LB = 1;

/**
 * Mifflin-St Jeor Basal Metabolic Rate, in kcal/day.
 * Men:   10*kg + 6.25*cm - 5*age + 5
 * Women: 10*kg + 6.25*cm - 5*age - 161
 */
export function calculateBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export interface CalorieTargetResult {
  calorieTarget: number;
  wasAdjustedForSafety: boolean;
  safetyNote?: string;
}

/**
 * Applies the user's goal (lose/maintain/gain) and desired weekly rate to TDEE,
 * clamping to safe bounds.
 */
export function calculateCalorieTarget(
  tdee: number,
  sex: Sex,
  goalType: GoalType,
  weeklyRateLb: number
): CalorieTargetResult {
  if (goalType === "maintain") {
    return { calorieTarget: Math.round(tdee), wasAdjustedForSafety: false };
  }

  const maxRate = goalType === "lose" ? MAX_SAFE_WEEKLY_LOSS_LB : MAX_SAFE_WEEKLY_GAIN_LB;
  const requestedRate = Math.max(0, weeklyRateLb);
  const clampedRate = Math.min(requestedRate, maxRate);
  const wasRateClamped = clampedRate !== requestedRate;

  const dailyDelta = (clampedRate * KCAL_PER_LB) / 7;
  const signedDelta = goalType === "lose" ? -dailyDelta : dailyDelta;

  let calorieTarget = tdee + signedDelta;

  const floor = sex === "male" ? MIN_CALORIES_MALE : MIN_CALORIES_FEMALE;
  let wasFloorClamped = false;
  if (goalType === "lose" && calorieTarget < floor) {
    calorieTarget = floor;
    wasFloorClamped = true;
  }

  const wasAdjustedForSafety = wasRateClamped || wasFloorClamped;
  let safetyNote: string | undefined;
  if (wasFloorClamped) {
    safetyNote = `Your requested rate would put you below a safe minimum (${floor} kcal/day), so we've raised your target. A rate this aggressive should be supervised by a doctor or dietitian.`;
  } else if (wasRateClamped) {
    safetyNote = `${maxRate} lb/week is our safety ceiling for ${goalType === "lose" ? "loss" : "gain"}; we've capped your rate there instead of ${requestedRate} lb/week.`;
  }

  return { calorieTarget: Math.round(calorieTarget), wasAdjustedForSafety, safetyNote };
}

export interface MacroGrams {
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

/**
 * Macro targets in grams for a given calorie target.
 * - balanced:     protein 1.6 g/kg bodyweight, fat 30% of calories, carbs = remainder
 * - high_protein: protein 2.2 g/kg bodyweight, fat 25% of calories, carbs = remainder
 * - custom:       user-specified percentages of total calories
 * Fiber target uses the common 14g per 1,000 kcal guideline (IOM-derived heuristic).
 */
export function calculateMacros(
  calorieTarget: number,
  bodyWeightKg: number,
  strategy: MacroStrategy,
  customPercents?: { protein: number; carbs: number; fat: number }
): MacroGrams {
  const fiberG = Math.round((calorieTarget / 1000) * 14);

  if (strategy === "custom" && customPercents) {
    const total = customPercents.protein + customPercents.carbs + customPercents.fat;
    // normalize in case the three percentages don't sum to exactly 100
    const norm = (p: number) => p / total;
    const proteinG = Math.round((calorieTarget * norm(customPercents.protein)) / 4);
    const carbsG = Math.round((calorieTarget * norm(customPercents.carbs)) / 4);
    const fatG = Math.round((calorieTarget * norm(customPercents.fat)) / 9);
    return { proteinG, carbsG, fatG, fiberG };
  }

  const proteinPerKg = strategy === "high_protein" ? 2.2 : 1.6;
  const fatPercent = strategy === "high_protein" ? 0.25 : 0.3;

  const proteinG = Math.round(proteinPerKg * bodyWeightKg);
  const proteinCals = proteinG * 4;

  const fatCals = calorieTarget * fatPercent;
  const fatG = Math.round(fatCals / 9);

  const remainingCals = Math.max(0, calorieTarget - proteinCals - fatCals);
  const carbsG = Math.round(remainingCals / 4);

  return { proteinG, carbsG, fatG, fiberG };
}

/** Full pipeline: profile in -> complete GoalTargets out. */
export function calculateGoalTargets(profile: UserProfile): GoalTargets {
  const bmr = calculateBMR(profile.sex, profile.currentWeightKg, profile.heightCm, profile.age);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const { calorieTarget, wasAdjustedForSafety, safetyNote } = calculateCalorieTarget(
    tdee,
    profile.sex,
    profile.goalType,
    profile.weeklyRateLb
  );
  const macros = calculateMacros(
    calorieTarget,
    profile.currentWeightKg,
    profile.macroStrategy,
    profile.customMacroPercents
  );

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieTarget,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fiberG: macros.fiberG,
    wasAdjustedForSafety,
    safetyNote,
  };
}
