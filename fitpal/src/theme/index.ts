// Design tokens. See README "Design notes" for the reasoning behind these choices.
// Palette is built around a kitchen/nutrition-label vernacular rather than a generic
// SaaS palette: paper-white base, deep spinach ink, and three distinct macro colors
// that double as the ring-chart colors on the dashboard.

export const colors = {
  base: "#F5F6F2",       // paper white, slightly green-grey — not the generic warm cream
  surface: "#FFFFFF",
  ink: "#1F2A24",         // deep spinach-charcoal, used instead of pure/near black
  inkMuted: "#5B685F",
  hairline: "#DCE0D6",

  brand: "#3D8361",       // fresh herb green — primary actions, "on track" states
  brandDeep: "#28563F",

  protein: "#C1502D",     // paprika/rust
  carbs: "#E1A83A",       // turmeric amber
  fat: "#4A6FA5",         // slate blue
  fiber: "#7A8B5C",       // olive

  warning: "#B23A2E",
  success: "#3D8361",
} as const;

export const type = {
  display: "Fraunces_600SemiBold", // via @expo-google-fonts/fraunces
  displayItalic: "Fraunces_500Medium_Italic",
  body: "PublicSans_400Regular",   // via @expo-google-fonts/public-sans
  bodyMedium: "PublicSans_500Medium",
  bodyBold: "PublicSans_700Bold",
} as const;

export const spacing = (n: number) => n * 4;

export const radius = {
  sm: 4,
  md: 10,
  full: 999,
} as const;
