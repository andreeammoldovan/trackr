import type { Food } from "../data/foods";

export type MealId = "breakfast" | "lunch" | "dinner" | "snacks";
export type GoalType = "cut" | "maintain" | "bulk";

export const MEALS: { id: MealId; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
];

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function forGrams(food: Food, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: food.per100g.kcal * f,
    protein: food.per100g.protein * f,
    carbs: food.per100g.carbs * f,
    fat: food.per100g.fat * f,
  };
}

export function sum(list: Macros[]): Macros {
  return list.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    ZERO,
  );
}

export function scale(m: Macros, factor: number): Macros {
  return { kcal: m.kcal * factor, protein: m.protein * factor, carbs: m.carbs * factor, fat: m.fat * factor };
}

export const GOAL_DEFAULTS: Record<GoalType, { kcal: number; protein: number }> = {
  cut: { kcal: 1900, protein: 160 },
  maintain: { kcal: 2400, protein: 140 },
  bulk: { kcal: 2900, protein: 170 },
};

// Fat gets 25% of energy, carbs fill what protein and fat leave.
export function macroTargets(kcal: number, protein: number): Macros {
  const fat = (kcal * 0.25) / 9;
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  return { kcal, protein, carbs, fat };
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toString();
