// Implements the workflow from the spec's section 33:
// Camera -> Analyzing -> Identified -> Nutrition research -> Source comparison
// -> Confidence -> Results (editable) -> Add to diary.
// Also supports text entry and barcode lookup as alternate entry points.
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, type as fonts, spacing } from "@/theme";
import { identifyFoodFromImage, identifyFoodFromText } from "@/services/ai/aiService";
import { searchUsdaFoods } from "@/services/nutrition/usdaService";
import { reconcileFoodEstimate } from "@/services/nutrition/verificationService";
import { useAppStore } from "@/store/useAppStore";
import type { FoodEstimate } from "@/types";

// USDA FDC key is free/public-rate-limited — see usdaService.ts header comment.
const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_FDC_API_KEY ?? "";

type Stage = "idle" | "camera" | "analyzing" | "result" | "error";

export function ScanScreen() {
  const [stage, setStage] = useState<Stage>("idle");
  const [textInput, setTextInput] = useState("");
  const [estimate, setEstimate] = useState<FoodEstimate | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const addEntry = useAppStore((s) => s.addTodayEntry);
  const profile = useAppStore((s) => s.profile);

  async function runPipeline(source: { image?: string; description?: string }) {
    setStage("analyzing");
    setErrorMessage("");
    try {
      const identification = source.image
        ? await identifyFoodFromImage(source.image)
        : await identifyFoodFromText(source.description!);

      // Try to verify against USDA. Falls back gracefully if the key is missing
      // or nothing matches — the reconciliation function handles "no match".
      let usdaMatch;
      if (USDA_API_KEY) {
        try {
          const results = await searchUsdaFoods(identification.foodName, USDA_API_KEY, 1);
          if (results[0]) usdaMatch = results[0];
        } catch (e) {
          console.warn("USDA lookup failed, continuing with AI estimate only:", e);
        }
      }

      const aiFacts = (identification as any).aiEstimatedFacts ?? {
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      };

      const reconciled = reconcileFoodEstimate(identification, usdaMatch, aiFacts);
      setEstimate(reconciled);
      setStage("result");
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Something went wrong analyzing that food.");
      setStage("error");
    }
  }

  function handleAddToDiary(meal: "breakfast" | "lunch" | "dinner" | "snack") {
    if (!estimate || !profile) return;
    addEntry({
      id: `local-${Date.now()}`,
      userId: profile.id,
      date: new Date().toISOString().slice(0, 10),
      meal,
      foodName: estimate.name,
      servingDescription: estimate.servingDescription,
      quantity: 1,
      facts: estimate.facts,
      source: estimate.sourcesUsed[0],
      loggedAt: new Date().toISOString(),
    });
    setStage("idle");
    setEstimate(null);
    setTextInput("");
    Alert.alert("Added", `${estimate.name} added to your diary.`);
  }

  if (stage === "camera") {
    if (!permission?.granted) {
      return (
        <View style={styles.center}>
          <Text style={styles.body}>Camera access is needed to scan food.</Text>
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Allow camera</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <CameraView style={{ flex: 1 }} onBarcodeScanned={undefined} />
        <Pressable style={styles.shutter} onPress={() => runPipeline({ image: "BASE64_PLACEHOLDER" })}>
          <Text style={styles.primaryBtnText}>Capture</Text>
        </Pressable>
        {/* NOTE: wiring CameraView.takePictureAsync() to get real base64 is the
            one piece left for you — see README "Suggested next steps". */}
      </View>
    );
  }

  if (stage === "analyzing") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={[styles.body, { marginTop: spacing(4) }]}>
          Identifying food, then checking it against USDA FoodData Central…
        </Text>
      </View>
    );
  }

  if (stage === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{errorMessage}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => setStage("idle")}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (stage === "result" && estimate) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{estimate.name}</Text>
        <Text style={styles.serving}>{estimate.servingDescription}</Text>

        <View style={getConfidenceBadgeStyle(estimate.confidence)}>
          <Text style={styles.confidenceText}>Confidence: {estimate.confidence}</Text>
        </View>

        <View style={styles.factsGrid}>
          <Fact label="Calories" value={`${Math.round(estimate.facts.calories)}`} />
          <Fact label="Protein" value={`${Math.round(estimate.facts.proteinG)}g`} />
          <Fact label="Carbs" value={`${Math.round(estimate.facts.carbsG)}g`} />
          <Fact label="Fat" value={`${Math.round(estimate.facts.fatG)}g`} />
        </View>

        {estimate.discrepancyNote && <Text style={styles.discrepancy}>{estimate.discrepancyNote}</Text>}

        <Text style={styles.sectionLabel}>Why this confidence level</Text>
        {estimate.confidenceReasons.map((r, i) => (
          <Text key={i} style={styles.reason}>
            · {r}
          </Text>
        ))}

        <Text style={styles.sectionLabel}>Sources</Text>
        {estimate.sourcesUsed.map((s, i) => (
          <Text key={i} style={styles.reason}>
            · {s.label}
          </Text>
        ))}

        <Text style={styles.sectionLabel}>Add to</Text>
        <View style={styles.mealRow}>
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
            <Pressable key={m} style={styles.mealBtn} onPress={() => handleAddToDiary(m)}>
              <Text style={styles.mealBtnText}>{m}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => { setStage("idle"); setEstimate(null); }}>
          <Text style={styles.discard}>Discard and start over</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // idle
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Log food</Text>
      <Pressable style={styles.primaryBtn} onPress={() => setStage("camera")}>
        <Text style={styles.primaryBtnText}>Scan with camera</Text>
      </Pressable>
      <Text style={[styles.body, { marginVertical: spacing(4) }]}>or describe what you ate</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 2 eggs, 2 toast, 1 tbsp butter"
        placeholderTextColor={colors.inkMuted}
        value={textInput}
        onChangeText={setTextInput}
      />
      <Pressable
        style={[styles.primaryBtn, !textInput && styles.disabled]}
        disabled={!textInput}
        onPress={() => runPipeline({ description: textInput })}
      >
        <Text style={styles.primaryBtnText}>Analyze</Text>
      </Pressable>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factCell}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

function getConfidenceBadgeStyle(level: "high" | "medium" | "low") {
  return {
    alignSelf: "flex-start" as const,
    backgroundColor: level === "high" ? colors.brand : level === "medium" ? colors.carbs : colors.warning,
    borderRadius: 999,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    marginBottom: spacing(4),
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.base, padding: spacing(5), paddingTop: spacing(16) },
  content: { padding: spacing(5), paddingTop: spacing(16), paddingBottom: spacing(24) },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), backgroundColor: colors.base },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: spacing(2) },
  serving: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, marginBottom: spacing(3) },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, textAlign: "center" },
  input: {
    borderWidth: 1, borderColor: colors.hairline, borderRadius: 8, padding: spacing(3),
    fontFamily: fonts.body, fontSize: 15, color: colors.ink, backgroundColor: colors.surface, marginBottom: spacing(3),
  },
  primaryBtn: { backgroundColor: colors.brand, borderRadius: 8, paddingVertical: spacing(3.5), alignItems: "center", marginTop: spacing(2) },
  primaryBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" },
  disabled: { opacity: 0.4 },
  shutter: { position: "absolute", bottom: 40, alignSelf: "center", backgroundColor: colors.brand, paddingHorizontal: spacing(8), paddingVertical: spacing(3), borderRadius: 999 },
  confidenceText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: "#FFFFFF" },
  factsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(4), marginBottom: spacing(4) },
  factCell: { width: "45%" },
  factValue: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.ink },
  factLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted },
  discrepancy: { fontFamily: fonts.body, fontSize: 13, color: colors.warning, marginBottom: spacing(4) },
  sectionLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, marginTop: spacing(3), marginBottom: spacing(1) },
  reason: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted },
  mealRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2), marginTop: spacing(2) },
  mealBtn: { borderWidth: 1, borderColor: colors.brand, borderRadius: 8, paddingHorizontal: spacing(3), paddingVertical: spacing(2) },
  mealBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.brand, textTransform: "capitalize" },
  discard: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted, textAlign: "center", marginTop: spacing(6) },
});