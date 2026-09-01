// Open Food Facts — free, no API key required, community-maintained barcode database.
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
// Coverage is strongest for packaged/branded products; treat missing/sparse entries
// as a real possibility and let the UI fall back to manual entry.

import type { NutritionFacts, NutritionSource } from "@/types";

interface OffProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number>;
}

export interface BarcodeLookupResult {
  found: boolean;
  productName?: string;
  brand?: string;
  servingSize?: string;
  factsPer100g?: NutritionFacts;
  source?: NutritionSource;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode
  )}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open Food Facts request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { status: number; product?: OffProduct };

  if (json.status !== 1 || !json.product) {
    return { found: false };
  }

  const n = json.product.nutriments ?? {};
  const factsPer100g: NutritionFacts = {
    calories: n["energy-kcal_100g"] ?? 0,
    proteinG: n["proteins_100g"] ?? 0,
    carbsG: n["carbohydrates_100g"] ?? 0,
    fatG: n["fat_100g"] ?? 0,
    fiberG: n["fiber_100g"],
    sugarG: n["sugars_100g"],
    sodiumMg: n["sodium_100g"] ? n["sodium_100g"] * 1000 : undefined,
  };

  return {
    found: true,
    productName: json.product.product_name,
    brand: json.product.brands,
    servingSize: json.product.serving_size,
    factsPer100g,
    source: {
      type: "open_food_facts_barcode",
      label: "Open Food Facts",
      retrievedAt: new Date().toISOString(),
      sourceId: barcode,
    },
  };
}
