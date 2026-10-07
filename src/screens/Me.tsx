import { useState } from "react";
import { Camera, Check, ChevronRight, Dumbbell, Scale, TrendingDown } from "lucide-react";
import { Stepper } from "../components/Stepper";
import { Logo } from "../components/Logo";
import { useStore } from "../lib/store";
import { openSnap, useUI } from "../lib/ui";
import { GOAL_DEFAULTS, type GoalType } from "../lib/nutrition";
import { setUserProps, track } from "../lib/analytics";

const DEV = new URLSearchParams(location.search).has("dev") || import.meta.env.DEV;

const GOALS: { id: GoalType; label: string; Icon: typeof Scale }[] = [
  { id: "cut", label: "Lose fat", Icon: TrendingDown },
  { id: "maintain", label: "Maintain", Icon: Scale },
  { id: "bulk", label: "Build", Icon: Dumbbell },
];

export function Me() {
  const s = useStore();
  const showToast = useUI((u) => u.showToast);
  const [goal, setGoal] = useState<GoalType>(s.goal);
  const [kcal, setKcal] = useState(s.kcalTarget);
  const [protein, setProtein] = useState(s.proteinTarget);
  const dirty = goal !== s.goal || kcal !== s.kcalTarget || protein !== s.proteinTarget;

  const save = () => {
    s.setTargets(goal, kcal, protein);
    setUserProps({ goal, kcal_target: kcal, protein_target: protein });
    showToast("Targets saved");
  };

  return (
    <main className="screen">
      <h1 className="title" style={{ margin: "56px 4px 16px" }}>
        Profile
      </h1>

      {s.group === "ai" &&
        (s.pro.unlocked ? (
          <div className="card card--pad row-flex">
            <span className="feature-list__icon">
              <Check size={22} strokeWidth={2.5} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="row-flex" style={{ gap: 8 }}>
                <strong style={{ fontWeight: 700 }}>trackr. Pro</strong>
                <span className="pill pill--accent">Beta</span>
              </div>
              <div className="caption">Free during the beta · no payment details</div>
            </div>
          </div>
        ) : (
          <button
            className="banner"
            style={{ width: "100%", border: 0, textAlign: "left" }}
            onClick={() => {
              track("banner_tapped", { location: "profile" });
              openSnap("profile_upgrade");
            }}
          >
            <span className="banner__icon">
              <Camera size={22} strokeWidth={2.25} />
            </span>
            <span style={{ flex: 1 }}>
              <span className="banner__title" style={{ display: "block" }}>
                Upgrade to Pro
              </span>
              <span className="banner__sub" style={{ display: "block" }}>
                Log meals from a photo with AI
              </span>
            </span>
            <ChevronRight size={20} strokeWidth={2.25} style={{ marginRight: 6 }} />
          </button>
        ))}

      <div className="section-label">Goal</div>
      <div className="seg" role="group" aria-label="Goal">
        {GOALS.map(({ id, label }) => (
          <button
            key={id}
            aria-pressed={goal === id}
            onClick={() => {
              setGoal(id);
              setKcal(GOAL_DEFAULTS[id].kcal);
              setProtein(GOAL_DEFAULTS[id].protein);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="section-label">Daily calories</div>
      <Stepper label="Daily calories" value={kcal} onChange={setKcal} step={50} min={1200} max={6000} suffix="kcal" />
      <div className="section-label">Daily protein</div>
      <Stepper label="Daily protein" value={protein} onChange={setProtein} step={5} min={40} max={400} suffix="g" />
      {dirty && (
        <button className="btn" style={{ marginTop: 16 }} onClick={save}>
          Save targets
        </button>
      )}

      <div className="card card--pad" style={{ marginTop: 24 }}>
        <div className="row-flex" style={{ justifyContent: "space-between" }}>
          <Logo size={22} />
          <span className="caption">v0.1 · test build</span>
        </div>
        <p className="caption" style={{ margin: "10px 0 0" }}>
          This test version covers fruit and vegetables. Nutrition values from USDA FoodData Central.
        </p>
      </div>

      {DEV && (
        <div className="card card--pad" style={{ marginTop: 12, boxShadow: "inset 0 0 0 1.5px var(--fill-strong)", background: "transparent" }}>
          <div className="label">Team tools · hidden from testers</div>
          <div className="caption" style={{ marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            Group <strong>{s.group}</strong> · Pro {String(s.pro.unlocked)} · User {s.userId.slice(0, 8)}
          </div>
          <div className="row-flex" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn btn--soft btn--small" onClick={() => s.set({ group: s.group === "ai" ? "control" : "ai" })}>
              Switch group
            </button>
            <button className="btn btn--soft btn--small" onClick={() => s.set({ pro: { unlocked: false }, announcementSeen: false, bannerDismissed: false })}>
              Reset Pro
            </button>
            <button
              className="btn btn--soft btn--small"
              onClick={() => {
                if (confirm("Erase all local data and restart onboarding?")) s.reset();
              }}
            >
              Reset all
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
