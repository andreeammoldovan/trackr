import { useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { Sheet } from "../components/Sheet";
import { Stepper } from "../components/Stepper";
import { MEALS, fmt, scale, type MealId } from "../lib/nutrition";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { track } from "../lib/analytics";

// Edit or delete a logged entry. Portion is edited as a percentage so it works for both search and photo entries.
export function EntrySheet({ id }: { id: string }) {
  const entry = useStore((s) => s.entries.find((e) => e.id === id));
  const { updateEntry, deleteEntry } = useStore();
  const { close, showToast } = useUI();
  const [pct, setPct] = useState(100);
  const [meal, setMeal] = useState<MealId>(entry?.meal ?? "snacks");

  if (!entry) return null;
  const m = scale(entry, pct / 100);
  const changed = pct !== 100 || meal !== entry.meal;

  const save = () => {
    updateEntry(id, {
      ...m,
      meal,
      grams: entry.grams ? entry.grams * (pct / 100) : undefined,
      qtyLabel: pct !== 100 && entry.grams ? `${fmt(entry.grams * (pct / 100))} g` : entry.qtyLabel,
    });
    track("entry_edited", { source: entry.source, portion_pct: pct, meal_changed: meal !== entry.meal });
    showToast("Saved");
    close();
  };

  const remove = () => {
    deleteEntry(id);
    track("entry_deleted", { source: entry.source, kcal: Math.round(entry.kcal) });
    showToast("Deleted");
    close();
  };

  return (
    <Sheet
      variant="bottom"
      surface
      title="Edit entry"
      onClose={close}
      footer={
        <div className="row-flex" style={{ gap: 10 }}>
          <button className="btn btn--danger" style={{ width: 54, padding: 0, flex: "none" }} onClick={remove} aria-label="Delete entry">
            <Trash2 size={20} strokeWidth={2.25} />
          </button>
          <button className="btn" onClick={save} disabled={!changed}>
            Save changes
          </button>
        </div>
      }
    >
      <div className="row-flex">
        {entry.thumb && <img src={entry.thumb} alt="" className="thumb" style={{ width: 56, height: 56 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{entry.name}</div>
          <div className="caption">
            {entry.ai ? (
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <Sparkles size={12} strokeWidth={2.25} color="var(--accent)" /> AI estimated {fmt(entry.ai.kcal)} kcal
              </span>
            ) : (
              entry.qtyLabel
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {(
          [
            ["kcal", m.kcal, ""],
            ["Protein", m.protein, " g"],
            ["Carbs", m.carbs, " g"],
            ["Fat", m.fat, " g"],
          ] as const
        ).map(([l, v, u]) => (
          <div key={l} style={{ flex: 1, background: "var(--fill)", borderRadius: 14, padding: "10px 10px" }}>
            <div className="caption">{l}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              {fmt(v)}
              {u}
            </div>
          </div>
        ))}
      </div>

      <div className="section-label">Portion</div>
      <Stepper label="Portion percent" value={pct} onChange={setPct} step={10} min={10} max={500} suffix="%" />

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
