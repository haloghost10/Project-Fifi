import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileFoodEstimate } from "./verificationService.ts";

const baseIdentification = {
  foodName: "Grilled chicken breast",
  likelyIngredients: ["chicken breast"],
  estimatedServingDescription: "1 breast (~150g)",
  estimatedGrams: 150,
};

test("reconcileFoodEstimate: agreement between AI and USDA yields high/medium confidence, no discrepancy note", () => {
  const usdaMatch = {
    description: "Chicken, broilers or fryers, breast, meat only, cooked, grilled",
    facts: { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
    source: { type: "usda_fdc" as const, label: "USDA FoodData Central", retrievedAt: new Date().toISOString() },
  };
  const result = reconcileFoodEstimate(baseIdentification, usdaMatch, { calories: 170, proteinG: 30, carbsG: 0, fatG: 4 });
  assert.equal(result.facts.calories, 165); // USDA value wins, not the AI's
  assert.equal(result.discrepancyNote, undefined);
  assert.notEqual(result.confidence, "low");
});

test("reconcileFoodEstimate: large disagreement produces a visible discrepancy note and medium confidence", () => {
  const usdaMatch = {
    description: "Chicken, broilers or fryers, breast, meat only, cooked, grilled",
    facts: { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
    source: { type: "usda_fdc" as const, label: "USDA FoodData Central", retrievedAt: new Date().toISOString() },
  };
  const result = reconcileFoodEstimate(baseIdentification, usdaMatch, { calories: 400, proteinG: 30, carbsG: 0, fatG: 20 });
  assert.ok(result.discrepancyNote);
  assert.equal(result.confidence, "medium");
});

test("reconcileFoodEstimate: no database match at all falls back to low-confidence AI estimate, clearly labeled", () => {
  const result = reconcileFoodEstimate(baseIdentification, undefined, { calories: 250, proteinG: 30, carbsG: 2, fatG: 12 });
  assert.equal(result.confidence, "low");
  assert.equal(result.facts.calories, 250);
  assert.equal(result.sourcesUsed[0].type, "ai_estimate");
  assert.ok(result.confidenceReasons.some((r) => r.includes("estimate")));
});
