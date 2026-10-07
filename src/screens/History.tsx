import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { entriesFor, loggedDays, streak, useStore } from "../lib/store";
import { MEALS, fmt, sum } from "../lib/nutrition";
import { addDays, dayKey, daysBetween, fromKey, relativeDay } from "../lib/dates";

const MAX_DAYS = 14;

const dayName = (key: string) => {
  const r = relativeDay(key);
  if (r === "TODAY") return "Today";
  if (r === "YESTERDAY") return "Yesterday";
  return fromKey(key).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

export function History() {
  const { entries, kcalTarget, createdAt } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const today = dayKey();
  // Only days since sign-up: a wall of empty days on day one reads as failure.
  const count = Math.min(MAX_DAYS, daysBetween(dayKey(new Date(createdAt)), today) + 1);
  const days = Array.from({ length: count }, (_, i) => addDays(today, -i));
  const logged = loggedDays(entries);
  const last7 = days.slice(0, 7).filter((d) => logged.has(d));
  const avg = last7.length ? sum(last7.flatMap((d) => entriesFor(entries, d))).kcal / last7.length : 0;

  if (selected) {
    const list = entriesFor(entries, selected);
    const total = sum(list);
    return (
      <main className="screen">
        <header className="topbar">
          <button className="icon-btn" aria-label="Back to history" onClick={() => setSelected(null)}>
            <ChevronLeft size={22} strokeWidth={2.25} />
          </button>
        </header>
        <h1 className="title" style={{ margin: "4px 4px 16px" }}>
          {dayName(selected)}
        </h1>
        <div className="card" style={{ padding: 20 }}>
          <div className="num" style={{ fontSize: 44 }}>
            {fmt(total.kcal)}
            <span className="unit" style={{ fontSize: 15 }}>
              / {fmt(kcalTarget)} kcal
            </span>
          </div>
          <div className="caption" style={{ marginTop: 8 }}>
            Protein {fmt(total.protein)} g · Carbs {fmt(total.carbs)} g · Fat {fmt(total.fat)} g
          </div>
        </div>
        <div className="stack" style={{ marginTop: 12 }}>
          {MEALS.map((m) => {
            const items = list.filter((e) => e.meal === m.id);
            if (!items.length) return null;
            return (
              <div key={m.id} className="card card--list">
                <div className="meal__head">
                  <div>
                    <div className="meal__title">{m.label}</div>
                    <div className="meal__kcal">{fmt(sum(items).kcal)} kcal</div>
                  </div>
                </div>
                {items.map((e) => (
                  <div key={e.id} className="row">
                    {e.thumb && <img className="thumb" src={e.thumb} alt="" />}
                    <div className="row__main">
                      <div className="row__name">{e.name}</div>
                      <div className="row__meta">
                        {e.source === "photo" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Sparkles size={12} strokeWidth={2.25} color="var(--accent)" /> AI estimate
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
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <h1 className="title" style={{ margin: "56px 4px 16px" }}>
        History
      </h1>

      <div className="macros" style={{ marginTop: 0 }}>
        {(
          [
            ["Streak", streak(entries), streak(entries) === 1 ? "day" : "days"],
            ["Logged", last7.length, "/ 7 days"],
            ["Avg / day", avg ? fmt(avg) : "—", avg ? "kcal" : ""],
          ] as const
        ).map(([l, v, u]) => (
          <div key={l} className="card macro">
            <div className="label">{l}</div>
            <div className="num" style={{ fontSize: 26, marginTop: 6 }}>
              {v}
              {u && <span className="unit">{u}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="section-label">{count === 1 ? "Since you joined" : `Last ${count} days`}</div>
      <div className="card card--list">
        {days.map((d) => {
          const list = entriesFor(entries, d);
          const kcal = sum(list).kcal;
          const pct = Math.min(100, (kcal / kcalTarget) * 100);
          const content = (
            <>
              <div className="day-row">
                <span style={{ fontWeight: 600, fontSize: 15 }}>{dayName(d)}</span>
                <div className="bar bar--accent">
                  <div className="bar__fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="row__kcal" style={{ textAlign: "right", color: list.length ? undefined : "var(--ink-3)" }}>
                  {list.length ? fmt(kcal) : "—"}
                </span>
              </div>
              {list.length > 0 && <ChevronRight size={18} strokeWidth={2.25} color="var(--ink-3)" style={{ flex: "none" }} />}
            </>
          );
          return list.length ? (
            <button key={d} className="row" onClick={() => setSelected(d)} aria-label={`${dayName(d)}: ${fmt(kcal)} kcal`}>
              {content}
            </button>
          ) : (
            <div key={d} className="row" style={{ paddingRight: 46 }}>
              {content}
            </div>
          );
        })}
      </div>
      {count < 3 && (
        <p className="caption" style={{ textAlign: "center", marginTop: 16 }}>
          Your history fills up as you log. Come back tomorrow to keep the streak going.
        </p>
      )}
    </main>
  );
}
