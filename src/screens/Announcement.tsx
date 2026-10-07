import { useEffect } from "react";
import { Camera, PencilLine, Sparkles, X } from "lucide-react";
import { useStore } from "../lib/store";
import { openSnap, useUI } from "../lib/ui";
import { track } from "../lib/analytics";

const STEPS = [
  { Icon: Camera, title: "Snap", text: "Take or upload a photo of your meal" },
  { Icon: Sparkles, title: "Estimate", text: "AI works out calories, protein, carbs & fat" },
  { Icon: PencilLine, title: "Approve", text: "Tweak anything, then log it" },
];

export function Announcement() {
  const set = useStore((s) => s.set);
  const close = useUI((s) => s.close);

  useEffect(() => {
    set({ announcementSeen: true });
    track("announcement_viewed");
  }, [set]);

  const later = () => {
    track("announcement_dismissed");
    close();
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="announce-title">
      <div className="overlay__scrim" onClick={later} />
      <div className="sheet sheet--bottom sheet--surface">
        <div className="sheet__grab" aria-hidden="true" />
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px var(--gutter) 0" }}>
          <button className="icon-btn" onClick={later} aria-label="Close">
            <X size={20} strokeWidth={2.25} />
          </button>
        </div>
        <div style={{ padding: "0 var(--gutter) 8px" }}>
          <span className="pill pill--accent">
            <Sparkles size={12} strokeWidth={2.5} /> New feature
          </span>
          <h2 id="announce-title" className="title" style={{ marginTop: 12 }}>
            Snap your meal.
            <br />
            AI does the math.
          </h2>
          <ul className="feature-list" style={{ marginTop: 20 }}>
            {STEPS.map(({ Icon, title, text }) => (
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
        </div>
        <div style={{ padding: "16px var(--gutter) calc(var(--safe-bottom) + 12px)" }}>
          <button
            className="btn btn--accent"
            onClick={() => {
              track("announcement_cta_tapped");
              openSnap("announcement");
            }}
          >
            Try it now
          </button>
          <button className="text-btn" style={{ display: "block", margin: "4px auto 0" }} onClick={later}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
