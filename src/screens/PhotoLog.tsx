import { useRef, useState } from "react";
import { Camera, ChevronDown, ImageIcon, Loader2, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Sheet } from "../components/Sheet";
import { MEALS, fmt, scale, sum, type Macros, type MealId } from "../lib/nutrition";
import { prepareImage } from "../lib/image";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { dayKey } from "../lib/dates";
import { track } from "../lib/analytics";

interface Item extends Macros {
  key: string;
  name: string;
  grams: number;
  per?: Macros; // per-gram values, so portions can be rescaled even after passing through 0 g
}

interface Estimate {
  is_food: boolean;
  meal_name: string;
  items: Omit<Item, "key">[];
  confidence: "low" | "medium" | "high";
  note: string;
}

type Phase =
  | { step: "pick" }
  | { step: "analyzing"; dataUrl: string }
  | { step: "review"; dataUrl: string; thumb: string; estimate: Estimate; demo: boolean; ms: number }
  | { step: "error"; dataUrl?: string; message: string };

let keySeq = 0;
const withKeys = (items: Omit<Item, "key">[]): Item[] => items.map((i) => ({ ...i, key: String(++keySeq) }));

export function PhotoLog({ initialMeal }: { initialMeal: MealId }) {
  const close = useUI((s) => s.close);
  const [phase, setPhase] = useState<Phase>({ step: "pick" });
  const [meal, setMeal] = useState(initialMeal);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined, via: "camera" | "library") => {
    if (!file) return;
    track("photo_selected", { via });
    let prepared: Awaited<ReturnType<typeof prepareImage>>;
    try {
      prepared = await prepareImage(file);
    } catch {
      setPhase({ step: "error", message: "That image couldn't be read. Try a JPEG or PNG photo." });
      return;
    }
    setPhase({ step: "analyzing", dataUrl: prepared.dataUrl });
    const started = performance.now();
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: prepared.base64, mediaType: "image/jpeg" }),
      });
      const data = await res.json();
      const ms = Math.round(performance.now() - started);
      if (!res.ok) throw new Error(data.error ?? "Estimate failed");
      track("ai_estimate_received", {
        ms,
        demo: data.demo,
        is_food: data.estimate.is_food,
        items: data.estimate.items.length,
        confidence: data.estimate.confidence,
        kcal: Math.round(sum(data.estimate.items).kcal),
      });
      setPhase({ step: "review", dataUrl: prepared.dataUrl, thumb: prepared.thumb, estimate: data.estimate, demo: data.demo, ms });
    } catch (err) {
      track("ai_estimate_failed", { error: String(err) });
      setPhase({ step: "error", dataUrl: prepared.dataUrl, message: "The estimate didn't come through. Check your connection and try again." });
    }
  };

  const retake = () => {
    if (cameraInput.current) cameraInput.current.value = "";
    if (libraryInput.current) libraryInput.current.value = "";
    setPhase({ step: "pick" });
  };

  if (phase.step === "review") {
    return <Review {...phase} meal={meal} setMeal={setMeal} onRetake={retake} />;
  }

  return (
    <Sheet
      title="Snap meal"
      onClose={() => {
        if (phase.step === "analyzing") track("ai_estimate_discarded", { stage: "analyzing" });
        close();
      }}
    >
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0], "camera")} />
      <input ref={libraryInput} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0], "library")} />

      {phase.step === "pick" && (
        <>
          <div className="dropzone">
            <div>
              <span className="feature-list__icon" style={{ width: 64, height: 64, borderRadius: 20, margin: "0 auto" }}>
                <Camera size={30} strokeWidth={2} />
              </span>
              <div className="h2" style={{ marginTop: 16 }}>
                Get the whole plate in frame
              </div>
              <p className="caption" style={{ margin: "6px auto 0", maxWidth: 260 }}>
                Shoot from above in good light. Include sauces and drinks — they count too.
              </p>
            </div>
          </div>
          <div className="stack" style={{ marginTop: 16 }}>
            <button className="btn btn--accent" onClick={() => cameraInput.current?.click()}>
              <Camera size={20} strokeWidth={2.25} /> Take photo
            </button>
            <button className="btn btn--soft" onClick={() => libraryInput.current?.click()}>
              <ImageIcon size={20} strokeWidth={2.25} /> Choose from library
            </button>
          </div>
        </>
      )}

      {phase.step === "analyzing" && (
        <div aria-live="polite">
          <div className="photo">
            <img src={phase.dataUrl} alt="Your meal" />
            <div className="photo__scan" />
          </div>
          <div className="row-flex" style={{ marginTop: 20, gap: 10 }}>
            <Loader2 className="spin" size={22} strokeWidth={2.25} color="var(--accent)" />
            <span className="h2">Analyzing your meal…</span>
          </div>
          <p className="caption" style={{ marginTop: 6 }}>
            Identifying foods and estimating portions. Usually 5–15 seconds.
          </p>
        </div>
      )}

      {phase.step === "error" && (
        <div>
          {phase.dataUrl && (
            <div className="photo" style={{ marginBottom: 20 }}>
              <img src={phase.dataUrl} alt="Your meal" />
            </div>
          )}
          <h2 className="h2">That didn't work</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            {phase.message}
          </p>
          <button className="btn" style={{ marginTop: 20 }} onClick={retake}>
            <RotateCcw size={20} strokeWidth={2.25} /> Try again
          </button>
        </div>
      )}
    </Sheet>
  );
}

function Review(props: {
  dataUrl: string;
  thumb: string;
  estimate: Estimate;
  demo: boolean;
  ms: number;
  meal: MealId;
  setMeal: (m: MealId) => void;
  onRetake: () => void;
}) {
  const { estimate, demo } = props;
  const addEntry = useStore((s) => s.addEntry);
  const { close, showToast } = useUI();
  const [original] = useState(() => withKeys(estimate.items));
  const [items, setItems] = useState<Item[]>(original);
  const [name, setName] = useState(estimate.meal_name);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const total = sum(items);
  const aiTotal = sum(original);
  const mealLabel = MEALS.find((m) => m.id === props.meal)!.label;

  const edited =
    name !== estimate.meal_name ||
    items.length !== original.length ||
    items.some((it) => {
      const o = original.find((x) => x.key === it.key);
      return !o || (["name", "grams", "kcal", "protein", "carbs", "fat"] as const).some((k) => o[k] !== it[k]);
    });

  const update = (key: string, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  // Changing grams rescales the macros proportionally, which is what users expect when they correct a portion.
  const setGrams = (it: Item, grams: number) => {
    const per = it.per ?? (it.grams > 0 ? scale(it, 1 / it.grams) : undefined);
    update(it.key, per ? { grams, per, ...scale(per, grams) } : { grams });
  };
  const setMacro = (it: Item, key: keyof Macros, v: number) => update(it.key, { [key]: v, per: undefined });

  const approve = () => {
    addEntry({
      ...total,
      date: dayKey(),
      meal: props.meal,
      source: "photo",
      name: name.trim() || "Meal",
      thumb: props.thumb,
      ai: { kcal: aiTotal.kcal, edited, demo },
    });
    track("ai_estimate_approved", {
      meal: props.meal,
      edited,
      demo,
      ai_kcal: Math.round(aiTotal.kcal),
      final_kcal: Math.round(total.kcal),
      kcal_delta_pct: aiTotal.kcal ? Math.round(((total.kcal - aiTotal.kcal) / aiTotal.kcal) * 100) : null,
      items_ai: original.length,
      items_final: items.length,
      confidence: estimate.confidence,
    });
    track("meal_logged", { method: "photo", meal: props.meal, kcal: Math.round(total.kcal), edited });
    showToast(`Logged to ${mealLabel}`);
    close();
  };

  const discard = () => {
    track("ai_estimate_discarded", { stage: "review", edited });
    close();
  };

  if (!estimate.is_food) {
    return (
      <Sheet title="Snap meal" onClose={discard} animate={false}>
        <div className="photo" style={{ marginBottom: 20 }}>
          <img src={props.dataUrl} alt="Your photo" />
        </div>
        <h2 className="h2">No food spotted</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          We couldn't find a meal in this photo. Try again with the plate clearly in frame.
        </p>
        <button className="btn" style={{ marginTop: 20 }} onClick={props.onRetake}>
          <RotateCcw size={20} strokeWidth={2.25} /> Retake
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Review estimate"
      animate={false}
      onClose={discard}
      closeLabel="Discard estimate"
      footer={
        <div className="row-flex" style={{ gap: 10 }}>
          <button className="btn btn--soft" style={{ width: 54, padding: 0, flex: "none" }} onClick={props.onRetake} aria-label="Retake photo">
            <RotateCcw size={20} strokeWidth={2.25} />
          </button>
          <button className="btn btn--accent" onClick={approve} disabled={items.length === 0}>
            Log {fmt(total.kcal)} kcal to {mealLabel}
          </button>
        </div>
      }
    >
      <div className="card" style={{ padding: 12 }}>
        <div className="row-flex" style={{ alignItems: "flex-start" }}>
          <img src={props.dataUrl} alt="Your meal" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 14, flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row-flex" style={{ gap: 6, flexWrap: "wrap" }}>
              <span className="pill pill--accent">
                <Sparkles size={12} strokeWidth={2.5} /> AI estimate
              </span>
              <span className="pill">{estimate.confidence[0].toUpperCase() + estimate.confidence.slice(1)} confidence</span>
            </div>
            <label className="sr-only" htmlFor="meal-name">
              Meal name
            </label>
            <input id="meal-name" className="input input--fill" value={name} onChange={(e) => setName(e.target.value)} style={{ height: 42, marginTop: 8, fontWeight: 650, fontSize: 16 }} />
          </div>
        </div>
        {demo && (
          <div className="caption" style={{ marginTop: 10, padding: "8px 12px", background: "var(--fill)", borderRadius: 10 }}>
            Sample estimate — the AI isn't connected yet.
          </div>
        )}
        {!demo && estimate.note && (
          <div className="caption" style={{ marginTop: 10 }}>
            {estimate.note}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="num" style={{ fontSize: 44 }}>
            {fmt(total.kcal)}
            <span className="unit" style={{ fontSize: 15 }}>
              kcal
            </span>
          </div>
          {edited && <span className="caption">AI: {fmt(aiTotal.kcal)} kcal</span>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {(
            [
              ["Protein", total.protein],
              ["Carbs", total.carbs],
              ["Fat", total.fat],
            ] as const
          ).map(([l, v]) => (
            <div key={l} style={{ flex: 1, background: "var(--fill)", borderRadius: 14, padding: "10px 12px" }}>
              <div className="caption">{l}</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{fmt(v)} g</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-label">Meal</div>
      <div className="seg" role="group" aria-label="Meal">
        {MEALS.map((m) => (
          <button key={m.id} aria-pressed={props.meal === m.id} onClick={() => props.setMeal(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="section-label">What we see · tap to adjust</div>
      <div className="card card--list">
        {items.map((it) => {
          const isOpen = openKey === it.key;
          return (
            <div key={it.key} className="row" style={{ display: "block", padding: 0 }}>
              <button className="row" aria-expanded={isOpen} onClick={() => setOpenKey(isOpen ? null : it.key)}>
                <div className="row__main">
                  <div className="row__name">{it.name || "Unnamed item"}</div>
                  <div className="row__meta">
                    {fmt(it.grams)} g · P {fmt(it.protein)} · C {fmt(it.carbs)} · F {fmt(it.fat)}
                  </div>
                </div>
                <div className="row__kcal">
                  {fmt(it.kcal)}
                  <small>kcal</small>
                </div>
                <ChevronDown size={18} strokeWidth={2.25} color="var(--ink-3)" style={{ transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 200ms" }} />
              </button>
              {isOpen && (
                <div className="item-edit">
                  <Field label="Name" value={it.name} text onChange={(v) => update(it.key, { name: v })} />
                  <div className="item-edit__grid">
                    <Field label="Grams" value={round(it.grams)} onChange={(v) => setGrams(it, Number(v))} />
                    <Field label="Calories (kcal)" value={round(it.kcal)} onChange={(v) => setMacro(it, "kcal", Number(v))} />
                    <Field label="Protein (g)" value={round(it.protein)} onChange={(v) => setMacro(it, "protein", Number(v))} />
                    <Field label="Carbs (g)" value={round(it.carbs)} onChange={(v) => setMacro(it, "carbs", Number(v))} />
                    <Field label="Fat (g)" value={round(it.fat)} onChange={(v) => setMacro(it, "fat", Number(v))} />
                    <button className="btn btn--danger btn--small" style={{ alignSelf: "end", width: "100%", minHeight: 44 }} onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}>
                      <Trash2 size={16} strokeWidth={2.25} /> Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <button
          className="row"
          style={{ color: "var(--accent-text)", fontWeight: 650 }}
          onClick={() => {
            const [blank] = withKeys([{ name: "", grams: 100, kcal: 0, protein: 0, carbs: 0, fat: 0 }]);
            setItems((l) => [...l, blank]);
            setOpenKey(blank.key);
          }}
        >
          <Plus size={20} strokeWidth={2.25} /> Add a missing item
        </button>
      </div>
      <p className="caption" style={{ margin: "12px 4px 0" }}>
        AI estimates can be off by 20% or more. Adjust portions if you know them.
      </p>
    </Sheet>
  );
}

const round = (n: number) => Math.round(n * 10) / 10;

function Field({ label, value, onChange, text }: { label: string; value: number | string; onChange: (v: string) => void; text?: boolean }) {
  // Numeric fields keep a local draft so partial input like "12." survives re-renders.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input
        className="input"
        value={draft ?? String(value)}
        inputMode={text ? "text" : "decimal"}
        onFocus={(e) => !text && e.target.select()}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          if (text) return onChange(e.target.value);
          const v = e.target.value.replace(",", ".");
          if (v !== "" && Number.isNaN(Number(v))) return;
          setDraft(v);
          onChange(v === "" ? "0" : v);
        }}
      />
    </label>
  );
}
