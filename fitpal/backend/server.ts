import express from "express";
import cors from "cors";
import "dotenv/config";
import { analyzeFoodHandler } from "./routes/analyzeFood.ts";
import { assistantHandler } from "./routes/assistant.ts";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // photos as base64 need headroom

app.get("/health", (_req, res) => res.json({ ok: true }));
app.post("/api/analyze-food", analyzeFoodHandler);
app.post("/api/assistant", assistantHandler);

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`FitPal backend listening on http://localhost:${port}`);
});
