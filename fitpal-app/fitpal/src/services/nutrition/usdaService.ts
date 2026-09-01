// USDA FoodData Central — free, no-cost source of truth for generic/whole foods.
// Get a free key at https://fdc.nal.usda.gov/api-key-signup.html (instant, no approval wait).
// Docs: https://fdc.nal.usda.gov/api-guide.html
//
// This talks to USDA directly from the mobile app because the FDC key is free/public-rate-limited
// (not a secret you need to protect the way you'd protect an AI key) — see README "Which keys go
// where" for the reasoning. If you'd rather not ship the key in the client at all, proxy this
// through backend/routes instead.

import type { NutritionFacts, NutritionSource } from "@/types";

const FDC_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

interface FdcSearchResultItem {
  fdcId: number;
  description: string;
  dataType: string; // "Foundation", "SR Legacy", "Branded", "Survey (FNDDS)"
  foodNutrients: Array<{ nutrientName: string; unitName: string; value: number }>;
  servingSize?: number;
  servingSizeUnit?: string;
}

const NUTRIENT_MAP: Record<string, keyof NutritionFacts> = {
  "Energy": "calories",
  "Protein": "proteinG",
  "Carbohydrate, by difference": "carbsG",
  "Total lipid (fat)": "fatG",
  "Fiber, total dietary": "fiberG",
  "Sugars, total including NLEA": "sugarG",
  "Sodium, Na": "sodiumMg",
};

function extractFacts(item: FdcSearchResultItem): NutritionFacts {
  const facts: NutritionFacts = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const n of item.foodNutrients) {
    const key = NUTRIENT_MAP[n.nutrientName];
    if (key) (facts as any)[key] = n.value;
  }
  return facts;
}

/**
 * Searches USDA FoodData Central. Prefers "Foundation"/"SR Legacy" (lab-analyzed,
 * unbranded) results over "Branded" ones for generic ingredient searches, since
 * those are the most reliable per-100g values.
 */
export async function searchUsdaFoods(
  query: string,
  apiKey: string,
  limit = 5
): Promise<Array<{ facts: NutritionFacts; source: NutritionSource; description: string }>> {
  const url = `${FDC_BASE_URL}/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(
    query
  )}&pageSize=${limit}&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS),Branded`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`USDA FoodData Central request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { foods: FdcSearchResultItem[] };

  return json.foods.map((item) => ({
    description: item.description,
    facts: extractFacts(item),
    source: {
      type: "usda_fdc",
      label: "USDA FoodData Central",
      retrievedAt: new Date().toISOString(),
      sourceId: String(item.fdcId),
    },
  }));
}
