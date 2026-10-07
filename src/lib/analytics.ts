import posthog from "posthog-js";

// Every event the retention test relies on. Keep names stable once testing starts.
export type EventName =
  | "app_opened"
  | "onboarding_step_viewed"
  | "onboarding_completed"
  | "screen_viewed"
  | "food_searched"
  | "meal_logged"
  | "entry_edited"
  | "entry_deleted"
  | "announcement_viewed"
  | "announcement_cta_tapped"
  | "announcement_dismissed"
  | "banner_tapped"
  | "banner_dismissed"
  | "paywall_viewed"
  | "paywall_plan_selected"
  | "paywall_cta_tapped"
  | "paywall_dismissed"
  | "beta_unlock_confirmed"
  | "photo_flow_started"
  | "photo_selected"
  | "ai_estimate_received"
  | "ai_estimate_failed"
  | "ai_estimate_approved"
  | "ai_estimate_discarded";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://eu.i.posthog.com";
let enabled = false;

export function initAnalytics(userId: string, props: Record<string, unknown>) {
  if (enabled) return;
  if (KEY) {
    posthog.init(KEY, {
      api_host: HOST,
      autocapture: false,
      capture_pageview: false,
      person_profiles: "always",
      persistence: "localStorage",
    });
    posthog.identify(userId, props);
    posthog.register(props);
    enabled = true;
  } else if (import.meta.env.DEV) {
    console.info("[analytics] VITE_POSTHOG_KEY not set; logging events to console", props);
  }
}

export function setUserProps(props: Record<string, unknown>) {
  if (enabled) {
    posthog.setPersonProperties(props);
    posthog.register(props);
  }
}

export function track(event: EventName, props?: Record<string, unknown>) {
  if (enabled) posthog.capture(event, props);
  else if (import.meta.env.DEV) console.info(`[analytics] ${event}`, props ?? {});
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
