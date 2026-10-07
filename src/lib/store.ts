import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dayKey } from "./dates";
import type { GoalType, Macros, MealId } from "./nutrition";

// A/B arms. "control" = manual search only, "ai" = AI photo logging behind the fake paywall.
export type Group = "control" | "ai";
export type Plan = "yearly" | "monthly";

export interface Entry extends Macros {
  id: string;
  date: string;
  meal: MealId;
  createdAt: number;
  source: "search" | "photo";
  name: string;
  foodId?: string;
  grams?: number;
  qtyLabel?: string;
  thumb?: string;
  ai?: { kcal: number; edited: boolean; demo: boolean };
}

interface State {
  userId: string;
  group: Group;
  createdAt: number;
  onboarded: boolean;
  goal: GoalType;
  kcalTarget: number;
  proteinTarget: number;
  pro: { unlocked: boolean; plan?: Plan; at?: number };
  announcementSeen: boolean;
  bannerDismissed: boolean;
  entries: Entry[];
  recentFoodIds: string[];
  lastOpenDay?: string;

  completeOnboarding: (goal: GoalType, kcal: number, protein: number) => void;
  setTargets: (goal: GoalType, kcal: number, protein: number) => void;
  addEntry: (e: Omit<Entry, "id" | "createdAt">) => Entry;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  deleteEntry: (id: string) => void;
  unlockPro: (plan: Plan) => void;
  set: (patch: Partial<State>) => void;
  reset: () => void;
}

const uid = () => crypto.randomUUID();

function initialGroup(): Group {
  const forced = new URLSearchParams(location.search).get("group");
  if (forced === "a" || forced === "control") return "control";
  if (forced === "b" || forced === "ai") return "ai";
  return Math.random() < 0.5 ? "control" : "ai";
}

const fresh = () => ({
  userId: uid(),
  group: initialGroup(),
  createdAt: Date.now(),
  onboarded: false,
  goal: "maintain" as GoalType,
  kcalTarget: 2400,
  proteinTarget: 140,
  pro: { unlocked: false },
  announcementSeen: false,
  bannerDismissed: false,
  entries: [] as Entry[],
  recentFoodIds: [] as string[],
  lastOpenDay: undefined as string | undefined,
});

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...fresh(),
      completeOnboarding: (goal, kcalTarget, proteinTarget) =>
        set({ onboarded: true, goal, kcalTarget, proteinTarget }),
      setTargets: (goal, kcalTarget, proteinTarget) => set({ goal, kcalTarget, proteinTarget }),
      addEntry: (e) => {
        const entry: Entry = { ...e, id: uid(), createdAt: Date.now() };
        set((s) => ({
          entries: [...s.entries, entry],
          recentFoodIds: e.foodId
            ? [e.foodId, ...s.recentFoodIds.filter((id) => id !== e.foodId)].slice(0, 8)
            : s.recentFoodIds,
        }));
        return entry;
      },
      updateEntry: (id, patch) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      unlockPro: (plan) => set({ pro: { unlocked: true, plan, at: Date.now() } }),
      set: (patch) => set(patch),
      reset: () => set(fresh()),
    }),
    {
      name: "trackr-v1",
      // Actions are recreated on load; persist data only.
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function")),
    },
  ),
);

export const entriesFor = (entries: Entry[], date: string) => entries.filter((e) => e.date === date);

export function loggedDays(entries: Entry[]): Set<string> {
  return new Set(entries.map((e) => e.date));
}

// Consecutive days with at least one entry, ending today (or yesterday if today is still empty).
export function streak(entries: Entry[]): number {
  const days = loggedDays(entries);
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
