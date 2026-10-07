import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Plus, Search, X } from "lucide-react";
import { Sheet } from "../components/Sheet";
import { Stepper } from "../components/Stepper";
import { FOODS, type Food, type FoodCategory } from "../data/foods";
import { MEALS, fmt, forGrams, type MealId } from "../lib/nutrition";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { dayKey } from "../lib/dates";
import { track } from "../lib/analytics";

type Filter = "all" | FoodCategory;

function matches(food: Food, q: string) {
  const hay = [food.name, ...(food.aliases ?? [])].join(" ").toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export function AddFood({ initialMeal }: { initialMeal: MealId }) {
  const close = useUI((s) => s.close);
  const recentIds = useStore((s) => s.recentFoodIds);
  const [meal, setMeal] = useState(initialMeal);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [food, setFood] = useState<Food | null>(null);
  const opened = useRef(false);
  useEffect(() => {
    opened.current = true;
  }, []);

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () => FOODS.filter((f) => (filter === "all" || f.category === filter) && (!q || matches(f, q))),
    [q, filter],
  );
  const recent = recentIds.map((id) => FOODS.find((f) => f.id === id)).filter(Boolean) as Food[];

  // Log the settled query, not every keystroke.
  useEffect(() => {
    if (!q) return;
    const t = setTimeout(() => track("food_searched", { query: q, results: results.length }), 800);
    return () => clearTimeout(t);
  }, [q, results.length]);

  if (food) {
    return <Amount food={food} meal={meal} setMeal={setMeal} onBack={() => setFood(null)} />;
  }

  return (
    <Sheet title="Add food" onClose={close} animate={!opened.current}>
      <div className="search">
        <Search size={20} strokeWidth={2} />
        <input
          className="input"
          type="search"
          placeholder="Search fruit & vegetables"
          aria-label="Search foods"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
        />
        {query && (
          <button className="search__clear" aria-label="Clear search" onClick={() => setQuery("")}>
            <X size={18} strokeWidth={2.25} />
          </button>
        )}
      </div>

      <div className="chips" role="group" aria-label="Category" style={{ margin: "12px 0 4px" }}>
        {(["all", "fruit", "vegetable"] as Filter[]).map((f) => (
          <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "fruit" ? "Fruit" : "Vegetables"}
          </button>
        ))}
      </div>

      {!q && recent.length > 0 && filter === "all" && (
        <>
          <div className="section-label" style={{ marginTop: 16 }}>
            Recent
          </div>
          <FoodList foods={recent} onPick={setFood} />
        </>
      )}

      <div className="section-label" style={{ marginTop: 16 }}>
        {q ? `${results.length} result${results.length === 1 ? "" : "s"}` : "All foods"}
      </div>
      {results.length > 0 ? (
        <FoodList foods={results} onPick={setFood} />
      ) : (
        <div className="card card--pad" style={{ textAlign: "center", padding: "28px 20px" }}>
          <div style={{ fontWeight: 700 }}>No match for “{query}”</div>
          <div className="caption" style={{ marginTop: 4 }}>
            This test version includes fruit and vegetables only.
          </div>
        </div>
      )}
    </Sheet>
  );
}

function FoodList({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  return (
    <div className="card card--list">
      {foods.map((f) => (
        <button key={f.id} className="row" onClick={() => onPick(f)}>
          <div className="row__main">
            <div className="row__name">{f.name}</div>
            <div className="row__meta">
              {fmt((f.per100g.kcal * f.unit.grams) / 100)} kcal · 1 {f.unit.label} ({f.unit.grams} g)
            </div>
          </div>
          <span className="icon-btn" aria-hidden="true" style={{ width: 32, height: 32 }}>
            <Plus size={18} strokeWidth={2.5} />
          </span>
        </button>
      ))}
    </div>
  );
}

function Amount({ food, meal, setMeal, onBack }: { food: Food; meal: MealId; setMeal: (m: MealId) => void; onBack: () => void }) {
  const addEntry = useStore((s) => s.addEntry);
  const { close, showToast } = useUI();
  const [mode, setMode] = useState<"unit" | "grams">("unit");
  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(food.unit.grams);

  const totalGrams = mode === "unit" ? qty * food.unit.grams : grams;
  const m = forGrams(food, totalGrams);
  const mealLabel = MEALS.find((x) => x.id === meal)!.label;

  const add = () => {
    const qtyLabel = mode === "unit" ? `${qty} ${food.unit.label} · ${fmt(totalGrams)} g` : `${fmt(totalGrams)} g`;
    addEntry({ ...m, date: dayKey(), meal, source: "search", name: food.name, foodId: food.id, grams: totalGrams, qtyLabel });
    track("meal_logged", { method: "search", meal, food_id: food.id, kcal: Math.round(m.kcal), grams: Math.round(totalGrams) });
    showToast(`Added to ${mealLabel}`);
    close();
  };

  return (
    <Sheet
      onClose={close}
      animate={false}
      left={
        <button className="icon-btn" aria-label="Back to search" onClick={onBack}>
          <ChevronLeft size={22} strokeWidth={2.25} />
        </button>
      }
      footer={
        <button className="btn" onClick={add} disabled={totalGrams <= 0}>
          Add to {mealLabel}
        </button>
      }
    >
      <div className="caption" style={{ textTransform: "capitalize" }}>
        {food.category}
      </div>
      <h1 className="title" style={{ marginTop: 2 }}>
        {food.name}
      </h1>

      <div className="card" style={{ marginTop: 20, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="num" style={{ fontSize: 48 }}>
            {fmt(m.kcal)}
            <span className="unit" style={{ fontSize: 15 }}>
              kcal
            </span>
          </div>
          <span className="caption">{fmt(totalGrams)} g</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {(
            [
              ["Protein", m.protein],
              ["Carbs", m.carbs],
              ["Fat", m.fat],
            ] as const
          ).map(([l, v]) => (
            <div key={l} style={{ flex: 1, background: "var(--fill)", borderRadius: 14, padding: "10px 12px" }}>
              <div className="caption">{l}</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{v.toFixed(1)} g</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-label">Amount</div>
      <div className="seg" role="group" aria-label="Unit" style={{ marginBottom: 10 }}>
        <button aria-pressed={mode === "unit"} onClick={() => setMode("unit")}>
          {food.unit.label[0].toUpperCase() + food.unit.label.slice(1)} · {food.unit.grams} g
        </button>
        <button
          aria-pressed={mode === "grams"}
          onClick={() => {
            setGrams(Math.round(qty * food.unit.grams));
            setMode("grams");
          }}
        >
          Grams
        </button>
      </div>
      {mode === "unit" ? (
        <Stepper label={`Number of ${food.unit.label}`} value={qty} onChange={setQty} step={0.5} min={0.5} max={50} decimals={1} suffix={`× ${food.unit.label}`} />
      ) : (
        <Stepper label="Grams" value={grams} onChange={setGrams} step={10} min={1} max={5000} suffix="g" />
      )}

      <div className="section-label">Meal</div>
      <div className="seg" role="group" aria-label="Meal">
        {MEALS.map((x) => (
          <button key={x.id} aria-pressed={meal === x.id} onClick={() => setMeal(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
