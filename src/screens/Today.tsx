import { Camera, Flame, Plus, Sparkles, X } from "lucide-react";
import { Logo } from "../components/Logo";
import { entriesFor, streak, useStore, type Entry } from "../lib/store";
import { MEALS, fmt, macroTargets, sum, type MealId } from "../lib/nutrition";
import { dayKey, fromKey } from "../lib/dates";
import { openSnap, useUI } from "../lib/ui";
import { track } from "../lib/analytics";

export function Today() {
  const { entries, kcalTarget, proteinTarget, group, bannerDismissed, set } = useStore();
  const open = useUI((s) => s.open);
  const today = dayKey();
  const todays = entriesFor(entries, today);
  const eaten = sum(todays);
  const target = macroTargets(kcalTarget, proteinTarget);
  const days = streak(entries);
  const showBanner = group === "ai" && !bannerDismissed && !entries.some((e) => e.source === "photo");
  const dateLabel = fromKey(today).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="screen">
      <header className="topbar">
        <Logo size={26} />
        {days > 0 && (
          <span className="streak" aria-label={`${days}-day logging streak`}>
            <Flame size={16} strokeWidth={2.5} color="var(--accent)" fill="var(--accent)" />
            {days}
          </span>
        )}
      </header>

      <h1 className="title" style={{ margin: "12px 4px 2px" }}>
        Today
      </h1>
      <div className="caption" style={{ margin: "0 4px 16px" }}>
        {dateLabel}
      </div>

      <section aria-label="Calories" className="card summary">
        <CalorieRing eaten={eaten.kcal} target={kcalTarget} />
        <div className="summary__stats">
          <div>
            <div className="label">Eaten</div>
            <div className="num stat__value">
              {fmt(eaten.kcal)}
              <span className="unit">kcal</span>
            </div>
          </div>
          <div>
            <div className="label">Goal</div>
            <div className="num stat__value">
              {fmt(kcalTarget)}
              <span className="unit">kcal</span>
            </div>
          </div>
        </div>
      </section>

      <div className="macros">
        <MacroCard label="Protein" value={eaten.protein} target={target.protein} accent />
        <MacroCard label="Carbs" value={eaten.carbs} target={target.carbs} />
        <MacroCard label="Fat" value={eaten.fat} target={target.fat} />
      </div>

      {showBanner && (
        <div className="banner" style={{ marginTop: 16 }}>
          <button
            className="banner__body"
            onClick={() => {
              track("banner_tapped");
              openSnap("banner");
            }}
          >
            <span className="banner__icon">
              <Camera size={22} strokeWidth={2.25} />
            </span>
            <span>
              <span className="banner__title" style={{ display: "block" }}>
                New: snap your meal
              </span>
              <span className="banner__sub" style={{ display: "block" }}>
                AI counts the calories for you
              </span>
            </span>
          </button>
          <button
            className="banner__close"
            aria-label="Dismiss"
            onClick={() => {
              set({ bannerDismissed: true });
              track("banner_dismissed");
            }}
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>
      )}

      <div className="section-label">Meals</div>
      <section aria-label="Meals" className="stack">
        {MEALS.map((m) => (
          <MealCard
            key={m.id}
            meal={m.id}
            label={m.label}
            entries={todays.filter((e) => e.meal === m.id)}
            onAdd={() => open({ kind: "add", meal: m.id })}
            onSnap={group === "ai" ? () => openSnap("meal_card", m.id) : undefined}
            onEntry={(id) => open({ kind: "entry", id })}
          />
        ))}
      </section>
    </main>
  );
}

function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, eaten / target);
  const remaining = target - eaten;
  const over = remaining < 0;
  return (
    <div
      className={`ring ${over ? "ring--over" : ""}`}
      role="progressbar"
      aria-label="Calories eaten"
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={Math.round(eaten)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          opacity={eaten > 0 ? 1 : 0}
        />
      </svg>
      <div className="ring__center">
        <div className="num ring__num">{fmt(Math.abs(remaining))}</div>
        <div className="caption" style={{ marginTop: 4 }}>
          {over ? "kcal over" : "kcal left"}
        </div>
      </div>
    </div>
  );
}

function MacroCard({ label, value, target, accent }: { label: string; value: number; target: number; accent?: boolean }) {
  return (
    <div className="card macro">
      <div className="label">{label}</div>
      <div className="num macro__value">
        {fmt(value)}
        <span className="unit">/ {fmt(target)}g</span>
      </div>
      <div className={`bar ${accent ? "bar--accent" : ""}`}>
        <div className="bar__fill" style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
      </div>
    </div>
  );
}

function MealCard(props: {
  meal: MealId;
  label: string;
  entries: Entry[];
  onAdd: () => void;
  onSnap?: () => void;
  onEntry: (id: string) => void;
}) {
  const total = sum(props.entries);
  return (
    <div className="card card--list">
      <div className="meal__head">
        <div>
          <div className="meal__title">{props.label}</div>
          <div className="meal__kcal">{props.entries.length ? `${fmt(total.kcal)} kcal` : "Nothing logged yet"}</div>
        </div>
        <div className="row-flex" style={{ gap: 8 }}>
          {props.onSnap && (
            <button className="icon-btn icon-btn--lg icon-btn--accent" aria-label={`Snap photo for ${props.label}`} onClick={props.onSnap}>
              <Camera size={20} strokeWidth={2.25} />
            </button>
          )}
          <button className="icon-btn icon-btn--lg icon-btn--ink" aria-label={`Add food to ${props.label}`} onClick={props.onAdd}>
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      {props.entries.map((e) => (
        <button key={e.id} className="row" onClick={() => props.onEntry(e.id)}>
          {e.thumb && <img className="thumb" src={e.thumb} alt="" />}
          <div className="row__main">
            <div className="row__name">{e.name}</div>
            <div className="row__meta">
              {e.source === "photo" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Sparkles size={12} strokeWidth={2.25} color="var(--accent)" /> AI estimate{e.ai?.edited ? " · edited" : ""}
                </span>
              ) : (
                e.qtyLabel
              )}
            </div>
          </div>
          <div className="row__kcal">
            {fmt(e.kcal)}
            <small>kcal</small>
          </div>
        </button>
      ))}
    </div>
  );
}
