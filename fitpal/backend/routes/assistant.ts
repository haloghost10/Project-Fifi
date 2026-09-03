// POST /api/assistant
// Grounded nutrition Q&A. Context (remaining calories/macros, etc.) is computed
// client-side from real diary data and passed in — the model never invents the
// user's numbers.

import type { Request, Response } from "express";
import { callClaude } from "../services/anthropicClient.ts";

const SYSTEM_PROMPT = `You are a nutrition assistant inside a calorie-tracking app called FitPal.
You will be given the user's real, current numbers (remaining calories/macros, goal, recent
weight trend) as JSON context. Use them — do not guess or restate generic advice that ignores them.
Keep replies short (3-5 sentences) and practical. Clearly distinguish general nutrition
information from medical advice, and suggest a doctor/dietitian for anything medical
(persistent symptoms, medication interactions, eating disorder concerns, etc.) rather than
answering those yourself.`;

export async function assistantHandler(req: Request, res: Response) {
  try {
    const { message, context } = req.body as { message: string; context: unknown };
    if (!message) return res.status(400).json({ error: "message is required" });

    const reply = await callClaude({
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `User context: ${JSON.stringify(context)}\n\nUser message: ${message}`,
        },
      ],
      maxTokens: 400,
    });

    res.json({ reply });
  } catch (err) {
    console.error("assistant failed:", err);
    res.status(502).json({ error: "The assistant is temporarily unavailable." });
  }
}
