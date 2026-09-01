// Lightweight global state with zustand. Holds only what many screens need at
// once (profile, today's targets, today's diary). Everything else is fetched
// per-screen from Supabase directly.

import { create } from "zustand";
import type { DiaryEntry, GoalTargets, UserProfile } from "@/types";

interface AppState {
  profile: UserProfile | null;
  goalTargets: GoalTargets | null;
  todayEntries: DiaryEntry[];

  setProfile: (p: UserProfile) => void;
  setGoalTargets: (g: GoalTargets) => void;
  setTodayEntries: (entries: DiaryEntry[]) => void;
  addTodayEntry: (entry: DiaryEntry) => void;
  removeTodayEntry: (entryId: string) => void;

  todayTotals: () => { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number };
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  goalTargets: null,
  todayEntries: [],

  setProfile: (profile) => set({ profile }),
  setGoalTargets: (goalTargets) => set({ goalTargets }),
  setTodayEntries: (todayEntries) => set({ todayEntries }),
  addTodayEntry: (entry) => set((s) => ({ todayEntries: [...s.todayEntries, entry] })),
  removeTodayEntry: (entryId) =>
    set((s) => ({ todayEntries: s.todayEntries.filter((e) => e.id !== entryId) })),

  todayTotals: () => {
    const entries = get().todayEntries;
    return entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.facts.calories,
        proteinG: acc.proteinG + e.facts.proteinG,
        carbsG: acc.carbsG + e.facts.carbsG,
        fatG: acc.fatG + e.facts.fatG,
        fiberG: acc.fiberG + (e.facts.fiberG ?? 0),
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
    );
  },
}));
