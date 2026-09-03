// The reconciliation layer described in the README's accuracy philosophy:
// AI identifies and interprets; USDA/Open Food Facts supply verified numbers;
// this function decides what the user actually sees, and never lets a single
// unverified AI guess masquerade as a precise number.
//
// Priority order (highest confidence first):
//   1. manufacturer_label / restaurant_official (from barcode or a curated table you add)
//   2. usda_fdc match with a close name/description match
//   3. AI estimate alone, clearly labeled low-confidence
//
// This file intentionally has no network calls of its own — it composes the
// results of usdaService / openFoodFactsService / aiService, which callers
// (screens) already have. That keeps it easy to unit test.

import type {
  ConfidenceLevel,
  FoodEstimate,
  NutritionFacts,
  NutritionSource,
} from "@/types";
import type { FoodIdentification } from "@/services/ai/aiService";

interface UsdaMatch {
  description: string;
  facts: NutritionFacts;
  source: NutritionSource;
}

const PERCENT_DIFF_THRESHOLD = 0.25; // >25% disagreement on calories = worth flagging

function pctDiff(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  const denom = Math.max(a, b, 1);
  return Math.abs(a - b) / denom;
}

/**
 * Combines an AI identification with an optional USDA match (already looked up
 * by the caller via usdaService.searchUsdaFoods for identification.foodName) into
 * a single FoodEstimate with an honest confidence level.
 */
export function reconcileFoodEstimate(
  identification: FoodIdentification,
  usdaMatch: UsdaMatch | undefined,
  aiEstimatedFacts: NutritionFacts // the AI's own rough calorie/macro guess, always requested
): FoodEstimate {
  const sourcesUsed: NutritionSource[] = [];
  let facts: NutritionFacts;
  let confidence: ConfidenceLevel;
  const confidenceReasons: string[] = [];
  let discrepancyNote: string | undefined;

  if (usdaMatch) {
    sourcesUsed.push(usdaMatch.source);
    const diff = pctDiff(usdaMatch.facts.calories, aiEstimatedFacts.calories);
    if (diff > PERCENT_DIFF_THRESHOLD) {
      discrepancyNote = `AI's visual estimate (${Math.round(
        aiEstimatedFacts.calories
      )} kcal) and the USDA match for "${usdaMatch.description}" (${Math.round(
        usdaMatch.facts.calories
      )} kcal) disagree by more than 25%. Showing the USDA value as more reliable, but double-check the portion.`;
      confidenceReasons.push("Vision estimate and database value disagreed significantly");
      confidence = "medium";
    } else {
      confidenceReasons.push(`Matched to "${usdaMatch.description}" in USDA FoodData Central`);
      confidence = identification.estimatedGrams ? "high" : "medium";
      if (!identification.estimatedGrams) {
        confidenceReasons.push("Portion size is an estimate, not measured");
      }
    }
    // USDA is the source of truth for the nutrient values themselves.
    facts = usdaMatch.facts;
  } else {
    // No database match at all — we are relying on the AI's estimate alone.
    facts = aiEstimatedFacts;
    confidence = "low";
    confidenceReasons.push("No matching entry found in USDA FoodData Central");
    confidenceReasons.push("Values are an AI estimate only — verify before relying on them");
    sourcesUsed.push({
      type: "ai_estimate",
      label: "AI visual/text estimate (unverified)",
      retrievedAt: new Date().toISOString(),
    });
  }

  if (identification.notes) {
    confidenceReasons.push(identification.notes);
  }

  return {
    name: identification.foodName,
    servingDescription: identification.estimatedServingDescription,
    gramsEstimate: identification.estimatedGrams,
    facts,
    perServing: true,
    confidence,
    confidenceReasons,
    sourcesUsed,
    discrepancyNote,
  };
}
