import { useEffect, useState } from "react";
import { ChevronLeft, Dumbbell, Scale, TrendingDown } from "lucide-react";
import { Logo } from "../components/Logo";
import { Stepper } from "../components/Stepper";
import { GOAL_DEFAULTS, macroTargets, fmt, type GoalType } from "../lib/nutrition";
import { useStore } from "../lib/store";
import { track } from "../lib/analytics";

const GOALS: { id: GoalType; title: string; sub: string; Icon: typeof Scale }[] = [
  { id: "cut", title: "Lose fat", sub: "Calorie deficit, keep muscle", Icon: TrendingDown },
  { id: "maintain", title: "Maintain", sub: "Hold weight, recomp", Icon: Scale },
  { id: "bulk", title: "Build muscle", sub: "Lean surplus for size & strength", Icon: Dumbbell },
];

const STEPS = 3;

export function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [kcal, setKcal] = useState(2400);
  const [protein, setProtein] = useState(140);

  useEffect(() => {
    track("onboarding_step_viewed", { step });
  }, [step]);

  const pickGoal = (g: GoalType) => {
    setGoal(g);
    setKcal(GOAL_DEFAULTS[g].kcal);
    setProtein(GOAL_DEFAULTS[g].protein);
  };

  const finish = () => {
    completeOnboarding(goal!, kcal, protein);
    track("onboarding_completed", { goal, kcal_target: kcal, protein_target: protein });
  };

  const t = macroTargets(kcal, protein);

  return (
    <div className="app" style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div className="topbar" style={{ padding: "calc(var(--safe-top) + 8px) var(--gutter) 0", marginBottom: 0 }}>
        {step > 0 ? (
          <button className="icon-btn" aria-label="Back" onClick={() => setStep(step - 1)}>
            <ChevronLeft size={22} strokeWidth={2.25} />
          </button>
        ) : (
          <span style={{ width: 40 }} />
        )}
        <div className="progress-dots" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={i <= step ? "is-on" : ""} />
          ))}
        </div>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ flex: 1, padding: "24px var(--gutter)", display: "flex", flexDirection: "column" }}>
        {step === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 40 }}>
            <Logo size={40} />
            <h1 className="title title--xl" style={{ marginTop: 32 }}>
              Track every meal
              <br />
              in <span className="accent">seconds.</span>
            </h1>
            <p className="muted" style={{ fontSize: 17, marginTop: 14, maxWidth: 330 }}>
              Calories and macros without the busywork. Built for people who train and are short on time.
            </p>
          </div>
        )}

        {step === 1 && (
          <>
            <h1 className="title">What's your goal?</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              We'll suggest starting targets. You can change them anytime.
            </p>
            <div className="stack" style={{ marginTop: 24 }}>
              {GOALS.map(({ id, title, sub, Icon }) => (
                <button key={id} className="option" aria-pressed={goal === id} onClick={() => pickGoal(id)}>
                  <span className="option__icon">
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 17 }}>{title}</span>
                    <span className="caption">{sub}</span>
                  </span>
                  <span className="radio" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="title">Your daily targets</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              A solid starting point. Adjust if you already know your numbers.
            </p>
            <div className="label" style={{ margin: "24px 4px 8px" }}>
              Calories
            </div>
            <Stepper label="Daily calories" value={kcal} onChange={setKcal} step={50} min={1200} max={6000} suffix="kcal" />
            <div className="label" style={{ margin: "16px 4px 8px" }}>
              Protein
            </div>
            <Stepper label="Daily protein" value={protein} onChange={setProtein} step={5} min={40} max={400} suffix="g" />
            <div className="card card--pad" style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
              {(
                [
                  ["Protein", t.protein],
                  ["Carbs", t.carbs],
                  ["Fat", t.fat],
                ] as const
              ).map(([l, v]) => (
                <div key={l} style={{ textAlign: "center", flex: 1 }}>
                  <div className="num" style={{ fontSize: 22 }}>
                    {fmt(v)}
                    <span className="unit">g</span>
                  </div>
                  <div className="caption" style={{ marginTop: 4 }}>
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: "12px var(--gutter) calc(var(--safe-bottom) + 16px)" }}>
        {step === 0 && (
          <button className="btn" onClick={() => setStep(1)}>
            Get started
          </button>
        )}
        {step === 1 && (
          <button className="btn" disabled={!goal} onClick={() => setStep(2)}>
            Continue
          </button>
        )}
        {step === 2 && (
          <button className="btn" onClick={finish}>
            Start tracking
          </button>
        )}
      </div>
    </div>
  );
}
