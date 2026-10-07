import { CalendarDays, Camera, House, Plus, User } from "lucide-react";
import { useStore } from "../lib/store";
import { openSnap, suggestMeal, useUI, type Tab } from "../lib/ui";
import { track } from "../lib/analytics";

const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: "today", label: "Today", Icon: House },
  { id: "history", label: "History", Icon: CalendarDays },
  { id: "me", label: "Profile", Icon: User },
];

export function TabBar() {
  const { tab, setTab } = useUI();
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar__inner">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className="tab"
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setTab(id);
              track("screen_viewed", { screen: id });
            }}
          >
            <Icon size={24} strokeWidth={tab === id ? 2.25 : 1.75} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

// Primary quick-log action. Both arms get one so the only difference between them is the AI feature itself.
export function QuickLog() {
  const group = useStore((s) => s.group);
  const open = useUI((s) => s.open);
  if (group === "ai") {
    return (
      <button className="fab fab--accent" onClick={() => openSnap("fab")}>
        <Camera size={22} strokeWidth={2.25} /> Snap meal
      </button>
    );
  }
  return (
    <button className="fab" onClick={() => open({ kind: "add", meal: suggestMeal() })}>
      <Plus size={22} strokeWidth={2.5} /> Log food
    </button>
  );
}
