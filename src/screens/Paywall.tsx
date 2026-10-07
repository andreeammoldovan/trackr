import { useEffect, useState } from "react";
import { Camera, Check, Loader2, PencilLine, Timer, X } from "lucide-react";
import { LogoMark } from "../components/Logo";
import { useStore, type Plan } from "../lib/store";
import { useUI } from "../lib/ui";
import type { MealId } from "../lib/nutrition";
import { track } from "../lib/analytics";

// Fake door: shows real-looking prices to measure intent, then unlocks Pro for free.
// No payment details are ever collected.
const PLANS: Record<Plan, { title: string; price: string; per: string; badge?: string }> = {
  yearly: { title: "Yearly", price: "€39.99", per: "€3.33 / month, billed yearly", badge: "Save 33%" },
  monthly: { title: "Monthly", price: "€4.99", per: "per month" },
};

const FEATURES = [
  { Icon: Camera, title: "Snap to log", text: "Photo in — calories and macros out." },
  { Icon: PencilLine, title: "Always editable", text: "Fine-tune any estimate before it's saved." },
  { Icon: Timer, title: "10-second logging", text: "No searching, no weighing every item." },
];

export function Paywall({ source, meal }: { source: string; meal: MealId }) {
  const unlockPro = useStore((s) => s.unlockPro);
  const { close, open } = useUI();
  const [plan, setPlan] = useState<Plan>("yearly");
  const [stage, setStage] = useState<"offer" | "processing" | "unlocked">("offer");

  useEffect(() => {
    track("paywall_viewed", { source });
  }, [source]);

  const choose = (p: Plan) => {
    setPlan(p);
    track("paywall_plan_selected", { plan: p, source });
  };

  const start = () => {
    track("paywall_cta_tapped", { plan, source });
    setStage("processing");
    setTimeout(() => {
      unlockPro(plan);
      setStage("unlocked");
    }, 900);
  };

  const dismiss = () => {
    if (stage === "offer") track("paywall_dismissed", { source, plan });
    close();
  };

  if (stage === "unlocked") {
    return (
      <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="unlocked-title">
        <div className="overlay__scrim" />
        <div className="sheet sheet--full sheet--surface">
          <div style={{ flex: 1, padding: "48px var(--gutter) 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", justifyContent: "center" }}>
            <span style={{ width: 80, height: 80, borderRadius: 999, background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center" }}>
              <Check size={40} strokeWidth={3} />
            </span>
            <h1 id="unlocked-title" className="title" style={{ marginTop: 24 }}>
              You're in!
            </h1>
            <p style={{ fontSize: 17, marginTop: 10, maxWidth: 320 }}>
              <strong>Pro is free for you during the beta.</strong>
            </p>
            <p className="muted" style={{ marginTop: 6, maxWidth: 320 }}>
              Nothing was charged and no payment details were taken. Thanks for helping us test trackr.
            </p>
          </div>
          <div style={{ padding: "12px var(--gutter) calc(var(--safe-bottom) + 16px)" }}>
            <button
              className="btn btn--accent"
              onClick={() => {
                track("beta_unlock_confirmed", { plan, source });
                open({ kind: "photo", meal });
              }}
            >
              <Camera size={20} strokeWidth={2.25} /> Snap your first meal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="overlay__scrim" onClick={dismiss} />
      <div className="sheet sheet--full sheet--surface">
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__head">
          <span className="logo">
            <LogoMark size={28} />
            <span className="pill pill--ink">PRO</span>
          </span>
          <button className="icon-btn" onClick={dismiss} aria-label="Not now">
            <X size={20} strokeWidth={2.25} />
          </button>
        </div>
        <div className="sheet__body">
          <h1 id="paywall-title" className="title" style={{ marginTop: 8 }}>
            Snap your meal.
            <br />
            <span className="accent">AI counts it.</span>
          </h1>
          <ul className="feature-list" style={{ marginTop: 24 }}>
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title}>
                <span className="feature-list__icon">
                  <Icon size={20} strokeWidth={2.25} />
                </span>
                <span>
                  <strong style={{ display: "block", fontWeight: 650 }}>{title}</strong>
                  <span className="caption">{text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="stack" style={{ marginTop: 28 }} role="radiogroup" aria-label="Plan">
            {(Object.keys(PLANS) as Plan[]).map((p) => (
              <button key={p} className="plan" role="radio" aria-checked={plan === p} aria-pressed={plan === p} onClick={() => choose(p)}>
                <span className="radio" />
                <span style={{ flex: 1 }}>
                  <span className="row-flex" style={{ gap: 8 }}>
                    <strong style={{ fontWeight: 700, fontSize: 17 }}>{PLANS[p].title}</strong>
                    {PLANS[p].badge && <span className="pill pill--accent">{PLANS[p].badge}</span>}
                  </span>
                  <span className="caption">{PLANS[p].per}</span>
                </span>
                <strong style={{ fontWeight: 700, fontSize: 17, fontVariantNumeric: "tabular-nums" }}>{PLANS[p].price}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="sheet__foot">
          <button className="btn btn--accent" onClick={start} disabled={stage === "processing"}>
            {stage === "processing" ? (
              <>
                <Loader2 className="spin" size={20} strokeWidth={2.25} /> One moment…
              </>
            ) : (
              "Start 7-day free trial"
            )}
          </button>
          <p className="caption" style={{ textAlign: "center", margin: "10px 0 0" }}>
            Cancel anytime · No commitment
          </p>
        </div>
      </div>
    </div>
  );
}
