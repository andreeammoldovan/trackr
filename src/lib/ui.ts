import { create } from "zustand";
import type { MealId } from "./nutrition";
import { useStore } from "./store";

export type Tab = "today" | "history" | "me";

export type Overlay =
  | { kind: "add"; meal: MealId }
  | { kind: "photo"; meal: MealId }
  | { kind: "paywall"; source: string; meal: MealId }
  | { kind: "entry"; id: string }
  | { kind: "announcement" }
  | null;

interface UI {
  tab: Tab;
  overlay: Overlay;
  toast: string | null;
  setTab: (tab: Tab) => void;
  open: (o: Overlay) => void;
  close: () => void;
  showToast: (msg: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUI = create<UI>()((set) => ({
  tab: "today",
  overlay: null,
  toast: null,
  setTab: (tab) => set({ tab }),
  open: (overlay) => set({ overlay }),
  close: () => set({ overlay: null }),
  showToast: (toast) => {
    clearTimeout(toastTimer);
    set({ toast });
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
}));

// Entry point for the AI feature: the fake paywall gates it until the user "starts a trial".
export function openSnap(source: string, meal: MealId = suggestMeal()) {
  const { pro } = useStore.getState();
  useUI.getState().open(pro.unlocked ? { kind: "photo", meal } : { kind: "paywall", source, meal });
}

export function suggestMeal(d = new Date()): MealId {
  const h = d.getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h >= 17 && h < 22) return "dinner";
  return "snacks";
}
