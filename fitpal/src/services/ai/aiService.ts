// Client-side AI service. Deliberately thin: it only talks to OUR backend
// (backend/routes/analyzeFood.ts), never directly to Anthropic. The Anthropic
// API key is a secret and must never ship inside the mobile app bundle.
//
// This is the "modular AI provider" seam mentioned in the README — if you want
// to swap providers later, you only change backend/services/, not this file
// or any screen that calls it.

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export interface FoodIdentification {
  foodName: string;
  likelyIngredients: string[];
  estimatedServingDescription: string;
  estimatedGrams?: number;
  notes?: string; // e.g. "portion size is hard to judge from this angle"
}

/** Sends a food photo (base64 JPEG) to the backend for AI identification. */
export async function identifyFoodFromImage(base64Image: string): Promise<FoodIdentification> {
  const res = await fetch(`${API_BASE_URL}/api/analyze-food`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "image", image: base64Image }),
  });
  if (!res.ok) throw new Error(`Food identification failed: ${res.status}`);
  return res.json();
}

/** Text-description version, e.g. "2 eggs, 2 toast, 1 tbsp butter". */
export async function identifyFoodFromText(description: string): Promise<FoodIdentification> {
  const res = await fetch(`${API_BASE_URL}/api/analyze-food`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "text", description }),
  });
  if (!res.ok) throw new Error(`Food identification failed: ${res.status}`);
  return res.json();
}

export interface AiAssistantContext {
  calorieTarget: number;
  caloriesRemaining: number;
  proteinTargetG: number;
  proteinRemainingG: number;
  carbsRemainingG: number;
  fatRemainingG: number;
  recentWeightTrendKgPerWeek?: number;
}

/** Free-form nutrition assistant chat, grounded in the user's live numbers. */
export async function askNutritionAssistant(
  message: string,
  context: AiAssistantContext
): Promise<{ reply: string }> {
  const res = await fetch(`${API_BASE_URL}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context }),
  });
  if (!res.ok) throw new Error(`Assistant request failed: ${res.status}`);
  return res.json();
}
