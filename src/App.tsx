import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { QuickLog, TabBar } from "./components/TabBar";
import { Onboarding } from "./screens/Onboarding";
import { Today } from "./screens/Today";
import { History } from "./screens/History";
import { Me } from "./screens/Me";
import { AddFood } from "./screens/AddFood";
import { PhotoLog } from "./screens/PhotoLog";
import { Paywall } from "./screens/Paywall";
import { Announcement } from "./screens/Announcement";
import { EntrySheet } from "./screens/EntrySheet";
import { useStore } from "./lib/store";
import { useUI } from "./lib/ui";
import { initAnalytics, isStandalone, track } from "./lib/analytics";
import { dayKey, daysBetween } from "./lib/dates";

const SESSION_GAP_MS = 30 * 60 * 1000;
let lastOpen = 0; // module-level so StrictMode's double effect run doesn't double-count

export function App() {
  const onboarded = useStore((s) => s.onboarded);
  const group = useStore((s) => s.group);
  const announcementSeen = useStore((s) => s.announcementSeen);
  const { tab, overlay, toast, open } = useUI();

  useAppOpenTracking();

  // The announcement is the AI arm's first exposure to the feature.
  useEffect(() => {
    if (onboarded && group === "ai" && !announcementSeen && !useUI.getState().overlay) {
      const t = setTimeout(() => open({ kind: "announcement" }), 600);
      return () => clearTimeout(t);
    }
  }, [onboarded, group, announcementSeen, open]);

  if (!onboarded) return <Onboarding />;

  return (
    <div className="app">
      {/* inert keeps focus and screen readers inside the open overlay */}
      <div inert={!!overlay}>
        {tab === "today" && <Today />}
        {tab === "history" && <History />}
        {tab === "me" && <Me />}
        {tab === "today" && <QuickLog />}
        <TabBar />
      </div>

      {overlay?.kind === "add" && <AddFood initialMeal={overlay.meal} />}
      {overlay?.kind === "photo" && <PhotoLog initialMeal={overlay.meal} />}
      {overlay?.kind === "paywall" && <Paywall source={overlay.source} meal={overlay.meal} />}
      {overlay?.kind === "announcement" && <Announcement />}
      {overlay?.kind === "entry" && <EntrySheet id={overlay.id} />}

      <div aria-live="polite">
        {toast && (
          <div className="toast">
            <CheckCircle2 size={18} strokeWidth={2.25} color="var(--accent)" /> {toast}
          </div>
        )}
      </div>
    </div>
  );
}

// app_opened is the returning-user event for the retention analysis: once at launch,
// and again when the app comes back to the foreground after a 30-minute gap.
function useAppOpenTracking() {
  useEffect(() => {
    const s = useStore.getState();
    initAnalytics(s.userId, {
      group: s.group,
      app_version: "0.1.0",
      installed: isStandalone(),
      signup_day: dayKey(new Date(s.createdAt)),
    });

    const opened = (trigger: string) => {
      if (Date.now() - lastOpen < SESSION_GAP_MS) return;
      lastOpen = Date.now();
      const st = useStore.getState();
      const today = dayKey();
      track("app_opened", {
        trigger,
        days_since_signup: daysBetween(dayKey(new Date(st.createdAt)), today),
        first_open_today: st.lastOpenDay !== today,
        onboarded: st.onboarded,
        pro_unlocked: st.pro.unlocked,
        installed: isStandalone(),
      });
      st.set({ lastOpenDay: today });
    };

    opened("launch");
    const onVisible = () => document.visibilityState === "visible" && opened("foreground");
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
}
