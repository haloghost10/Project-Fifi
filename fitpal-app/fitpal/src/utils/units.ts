export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const inToCm = (inches: number) => inches * CM_PER_IN;
export const cmToIn = (cm: number) => cm / CM_PER_IN;

// 1 lb of body fat ≈ 3,500 kcal. This is a widely used approximation, not exact
// physiology (real adaptation is more complex) — treat as a planning heuristic.
export const KCAL_PER_LB = 3500;
