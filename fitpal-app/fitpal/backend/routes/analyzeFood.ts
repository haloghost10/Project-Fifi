// POST /api/analyze-food
// Identifies a food from either a photo or a text description. This is
// IDENTIFICATION only — it does not claim to be the final calorie/macro number.
// The client (src/services/nutrition/verificationService.ts) combines this with
// a USDA lookup before showing anything to the user. See README "Accuracy
// philosophy" for why the split matters.

import type { Request, Response } from "express";
import { callClaude, parseJsonResponse } from "../services/anthropicClient.ts";

const SYSTEM_PROMPT = `You identify food from a photo or text description for a nutrition tracking app.
You are NOT the source of truth for exact nutrition — a database lookup happens after you respond.
Be honest about uncertainty in portion size; do not invent false precision.

Respond with ONLY a JSON object, no other text, in this exact shape:
{
  "foodName": string,               // best generic name to search a nutrition database with, e.g. "grilled chicken breast" not "delicious chicken"
  "likelyIngredients": string[],
  "estimatedServingDescription": string,   // human readable, e.g. "1.5 cups"
  "estimatedGrams": number | null,          // your best guess of total weight in grams, or null if truly not estimable
  "notes": string | null,           // e.g. "portion is hard to judge from this angle" — null if nothing notable
  "roughCalorieGuess": number,      // your own rough estimate, used only to sanity-check against the database
  "roughProteinG": number,
  "roughCarbsG": number,
  "roughFatG": number
}`;

export async function analyzeFoodHandler(req: Request, res: Response) {
  try {
    const { mode, image, description } = req.body as {
      mode: "image" | "text";
      image?: string;
      description?: string;
    };

    if (mode === "image" && !image) {
      return res.status(400).json({ error: "image is required when mode is 'image'" });
    }
    if (mode === "text" && !description) {
      return res.status(400).json({ error: "description is required when mode is 'text'" });
    }

    const userContent =
      mode === "image"
        ? [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: "Identify this food." },
          ]
        : `Identify this food from the description: "${description}"`;

    const raw = await callClaude({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent as any }],
      maxTokens: 600,
    });

    const parsed = parseJsonResponse<{
      foodName: string;
      likelyIngredients: string[];
      estimatedServingDescription: string;
      estimatedGrams: number | null;
      notes: string | null;
      roughCalorieGuess: number;
      roughProteinG: number;
      roughCarbsG: number;
      roughFatG: number;
    }>(raw);

    res.json({
      foodName: parsed.foodName,
      likelyIngredients: parsed.likelyIngredients,
      estimatedServingDescription: parsed.estimatedServingDescription,
      estimatedGrams: parsed.estimatedGrams ?? undefined,
      notes: parsed.notes ?? undefined,
      aiEstimatedFacts: {
        calories: parsed.roughCalorieGuess,
        proteinG: parsed.roughProteinG,
        carbsG: parsed.roughCarbsG,
        fatG: parsed.roughFatG,
      },
    });
  } catch (err) {
    console.error("analyze-food failed:", err);
    res.status(502).json({ error: "Food analysis is temporarily unavailable. You can add this food manually instead." });
  }
}
