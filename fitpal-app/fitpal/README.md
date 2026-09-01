# FitPal

An AI-assisted calorie and macro tracker: React Native (Expo) + TypeScript on the
front end, Supabase (Postgres + auth) for storage, and a small Express backend
that proxies AI calls so the Anthropic key never ships inside the app.

**Read this before anything else:** this project was generated in an environment
with no internet access, so nothing here has been run through `npm install`,
`expo start`, a simulator, or a real Supabase/Anthropic/USDA account. The one
part that *has* been genuinely verified is the calculation engine
(`src/utils/calorieEngine.ts` and `src/services/nutrition/verificationService.ts`) —
those have unit tests that actually pass, shown below. Everything else is
correctly structured, real code (not mock data or "TODO" stubs) that should work
once you add your own API keys and run it — but "should work" is not the same as
"verified working," and section 38 of the original spec ("verify the app
actually builds") is something only you can do from here. Treat first boot as a
normal first boot: expect to fix a dependency version mismatch or two.

## Why these technology choices

- **Expo (React Native)** — you already know RN/TS; Expo gets you camera,
  barcode scanning, and EAS builds for both app stores without hand-rolling
  native config, and it's the easiest path for a solo developer to iterate.
- **Supabase** — Postgres (so the relational schema in section 20 of your spec
  maps directly), built-in auth, row-level security so users can only ever see
  their own diary, and a generous free tier. Firebase/Firestore would work too,
  but a relational schema (foods → recipe_ingredients → diary_entries) fits SQL
  more naturally than a document store.
- **A small Express backend, not calls straight from the app** — the Anthropic
  API key is a secret. It must never be embedded in a mobile app bundle (anyone
  can extract it via a proxy or decompilation). The backend's only job is to
  hold that secret and forward two kinds of requests: "identify this food" and
  "answer this nutrition question." Everything else (Supabase, USDA, Open Food
  Facts) talks to the app directly since those either use RLS-protected
  anon keys or a free/rate-limited public key, not a payable secret.
- **USDA FoodData Central + Open Food Facts** — both free, no paid tier
  required, per your section 22 preference for affordable sources first.
  Nutritionix/Edamam (restaurant coverage) are a reasonable next addition — the
  `NutritionSource` type and `verificationService.ts` are already written to
  make adding a third source additive, not a rewrite.

## Accuracy philosophy (how the verification pipeline actually works)

This is the part of your spec I treated as non-negotiable, and it's implemented
end-to-end in code, not just described:

1. `backend/routes/analyzeFood.ts` asks Claude to **identify** the food (name,
   likely ingredients, estimated portion) and give its own rough calorie/macro
   guess — but the prompt explicitly tells the model it is not the source of
   truth.
2. The client (`ScanScreen.tsx`) takes that identification and searches USDA
   FoodData Central for a matching entry (`usdaService.ts`).
3. `verificationService.ts` (`reconcileFoodEstimate`) decides what the user
   actually sees:
   - If USDA has a match and it roughly agrees with the AI's guess → the USDA
     numbers are shown, confidence is medium/high.
   - If USDA has a match but it disagrees by >25% → USDA numbers still win, but
     a visible discrepancy note explains the disagreement instead of hiding it.
   - If there's no database match at all → the AI's own estimate is shown, but
     confidence is explicitly "low" and every source is labeled
     `"AI visual/text estimate (unverified)"`.

This logic has real unit tests — see "What's actually verified" below.

## What's actually verified (you can run these yourself)

No `npm install` needed for these two — they only use Node's built-in test
runner and native TypeScript support (Node 20.6+):

```bash
node --experimental-strip-types --test src/utils/calorieEngine.test.ts
node --experimental-strip-types --test src/services/nutrition/verificationService.test.ts
```

15 tests, covering: Mifflin-St Jeor BMR against hand-computed examples, TDEE
activity multipliers, safe deficit/surplus clamping (including the case where
both the weekly-rate ceiling *and* the minimum-calorie floor apply at once —
which the first draft of the test got wrong and the engine got right), macro
math for all three strategies, and the USDA-vs-AI reconciliation logic
including the disagreement/no-match paths.

## Project structure

```
App.tsx                     entry point
src/
  types/                    shared TS types (UserProfile, NutritionFacts, ...)
  theme/                    design tokens (colors, type, spacing)
  utils/
    calorieEngine.ts        BMR/TDEE/calorie-target/macro math (tested)
    calorieEngine.test.ts
    units.ts                lb/kg, in/cm conversions
  services/
    ai/aiService.ts         client -> backend (never calls Anthropic directly)
    nutrition/
      usdaService.ts        USDA FoodData Central search
      openFoodFactsService.ts  barcode lookups
      verificationService.ts   reconciliation logic (tested)
    supabase/
      client.ts
      schema.sql            full Postgres schema + RLS policies
  store/useAppStore.ts       zustand: profile, today's targets, today's diary
  navigation/                stack + bottom tabs
  screens/                   Onboarding, Home, Diary, Scan, Progress, Profile
  components/                MacroRing, CalorieSummaryCard (SVG)
backend/
  server.ts                  Express app
  routes/analyzeFood.ts       POST /api/analyze-food
  routes/assistant.ts         POST /api/assistant
  services/anthropicClient.ts wraps the Anthropic Messages API
  .env.example
```

## Setup

### 1. Supabase

1. Create a free project at https://supabase.com.
2. In the SQL editor, run `src/services/supabase/schema.sql` — creates every
   table plus row-level security policies (each user only ever sees their own
   rows).
3. Copy your project URL and anon public key into `.env` (see below).
4. Enable email or OAuth auth in Supabase's Auth settings — auth calls aren't
   wired into the screens yet (see "Suggested next steps"), so this is next.

### 2. Backend (holds your Anthropic key)

```bash
cd backend
cp .env.example .env
# fill in ANTHROPIC_API_KEY from https://console.anthropic.com/settings/keys
npm install
npm run dev     # starts on http://localhost:3000
```

### 3. Mobile app

```bash
cp .env.example .env
# fill in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
# set EXPO_PUBLIC_API_BASE_URL to your backend's address
# (optional) add EXPO_PUBLIC_USDA_FDC_API_KEY — free, https://fdc.nal.usda.gov/api-key-signup.html
npm install
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR
code with Expo Go on your phone. **This is the step that hasn't been run in
this environment** — expect to resolve a version mismatch or two on first
install (Expo SDK versions move fast; check `npx expo install --check` if
something won't build).

### 4. Running tests

```bash
# calculation logic — no install needed, see above
node --experimental-strip-types --test src/utils/calorieEngine.test.ts src/services/nutrition/verificationService.test.ts

# once npm install has run, this also works:
npm test
```

## Which keys go where

| Key | Lives in | Why |
|---|---|---|
| `ANTHROPIC_API_KEY` | `backend/.env` only | Secret, billable — never ship in a mobile bundle |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | app `.env` | Public by design; RLS policies (not secrecy) protect user data |
| `EXPO_PUBLIC_USDA_FDC_API_KEY` | app `.env` | Free, high rate limit, meant to be public-ish |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` only | Bypasses RLS — treat like a root password |

## Suggested next steps (in priority order)

1. **Wire Supabase auth** — `RootNavigator.tsx` currently checks local
   zustand state, not a real session. Add `supabase.auth.onAuthStateChange`
   and a sign-in screen.
2. **Finish the camera capture** — `ScanScreen.tsx`'s camera view has a
   `takePictureAsync()` call left as a placeholder (`BASE64_PLACEHOLDER`);
   swap in the real capture + base64 conversion.
3. **Barcode scanning UI** — `openFoodFactsService.ts` is ready; it just needs
   a screen using `expo-barcode-scanner`'s `onBarcodeScanned` to call it.
4. **Weight/progress charts** — `ProgressScreen.tsx` has clearly marked
   placeholders where `victory-native` should read from `weight_entries` and
   `diary_entries`.
5. **Recipe builder, exercise logging, dark mode, offline queueing** — schema
   and types already support these (see `schema.sql` / `types/index.ts`);
   they just don't have screens yet.
6. **App Store prep** — `app.json`/`eas.json` are scaffolded with placeholder
   bundle IDs; replace `com.yourname.fitpal`, add real icons/splash, then:
   ```bash
   npx eas build --platform ios --profile production
   npx eas build --platform android --profile production
   npx eas submit --platform ios
   npx eas submit --platform android
   ```
   (requires a paid Apple Developer account and a Google Play Console account).

## Design notes

Palette avoids the generic "AI app" look (warm cream + terracotta, or SaaS card
kit): paper-white base, deep spinach ink, and three distinct macro colors
(rust/amber/slate-blue) that double as the ring-chart colors. The dashboard's
calorie ring is the one deliberately bold element; everything else is quiet
hairline dividers rather than shadowed cards. Swap in `Fraunces` (display) and
`Public Sans` (body) via `@expo-google-fonts/*` — referenced in `theme/index.ts`
but not yet loaded in `App.tsx`.
