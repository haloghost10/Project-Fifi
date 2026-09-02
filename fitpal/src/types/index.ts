// Core domain types shared across the app.

export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"      // little/no exercise
  | "light"          // 1-3 days/week
  | "moderate"       // 3-5 days/week
  | "active"         // 6-7 days/week
  | "very_active";   // hard daily exercise or physical job

export type GoalType = "lose" | "maintain" | "gain";

export type MacroStrategy = "balanced" | "high_protein" | "custom";

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  // lbs per week the user wants to lose/gain. Ignored if goalType === "maintain".
  weeklyRateLb: number;
  macroStrategy: MacroStrategy;
  // only used when macroStrategy === "custom"
  customMacroPercents?: { protein: number; carbs: number; fat: number };
  dietaryPreferences: string[];
  allergies: string[];
}

export interface GoalTargets {
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  // true if we clamped the user's requested rate for safety
  wasAdjustedForSafety: boolean;
  safetyNote?: string;
}

export type NutritionSourceType =
  | "usda_fdc"
  | "restaurant_official"
  | "manufacturer_label"
  | "open_food_facts_barcode"
  | "user_entered"
  | "ai_estimate";

export interface NutritionSource {
  type: NutritionSourceType;
  label: string;      // e.g. "USDA FoodData Central"
  retrievedAt: string; // ISO date
  sourceId?: string;   // e.g. FDC id, barcode, restaurant menu URL
}

export interface NutritionFacts {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface FoodEstimate {
  name: string;
  servingDescription: string; // "1.5 cups", "1 burrito"
  gramsEstimate?: number;
  facts: NutritionFacts;
  perServing: boolean;
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  sourcesUsed: NutritionSource[];
  // if sources disagreed, show it rather than silently averaging
  discrepancyNote?: string;
}

export interface DiaryEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  foodName: string;
  servingDescription: string;
  quantity: number; // multiplier on the serving above
  facts: NutritionFacts; // already scaled by quantity
  source: NutritionSource;
  loggedAt: string; // ISO timestamp
}

export interface WeightEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
}

export interface ExerciseEntry {
  id: string;
  userId: string;
  date: string;
  activity: string;
  durationMin: number;
  distanceKm?: number;
  caloriesBurnedEstimate?: number;
}
