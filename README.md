# trackr.

A calorie and macro tracker prototype for a 7-day retention test: **does AI photo logging (a "Pro" feature) bring users back more often?**

It runs as an installable iPhone web app: testers open a link in Safari and tap **Share → Add to Home Screen**. No App Store or TestFlight is needed.

## The experiment

Each new user is randomly assigned, 50/50, to one of two groups on first launch:

| | Control (`control`) | Variant (`ai`) |
|---|---|---|
| Manual food search (fruit & veg) | ✓ | ✓ |
| Floating quick-log button | "Log food" (search) | "Snap meal" (camera) |
| "New feature" announcement and banner | — | ✓ |
| Fake paywall (€4.99/mo · €39.99/yr) | — | ✓ before first AI use |
| AI photo → editable estimate → approve | — | ✓ |

**Fake paywall.** Tapping "Start 7-day free trial" shows *"You're in! Pro is free for you during the beta"*. No payment details are ever asked for or collected. This measures purchase intent without charging anyone.

**Primary metric:** Day 1, 3 and 7 retention per group, based on the `app_opened` event.
**Secondary metrics:** meals logged per active day, paywall conversion (`paywall_cta_tapped` ÷ `paywall_viewed`), AI acceptance rate and how often users edit the AI estimate (`ai_estimate_approved.edited`, `kcal_delta_pct`).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Add `?group=a` (control) or `?group=b` (AI) to the first URL to force a group. In dev, the **Profile** tab has team tools for switching group, resetting Pro and resetting all data. In production, add `?dev` to the URL to see them.

Without credentials, the photo flow returns a **clearly labelled sample estimate**, so the whole flow can be demoed. Analytics events print to the browser console.

## Before real testers: three things to set up

1. **Anthropic API key.** Create one at console.anthropic.com and set `ANTHROPIC_API_KEY`. The app calls Claude (`claude-opus-5-5`) from a server function, so the key never reaches the phone. A photo costs roughly 1–2 cents.
2. **PostHog (EU cloud, free tier).** Create a project and set `VITE_POSTHOG_KEY`. Then build:
   - *Retention* insight: start event `onboarding_completed`, return event `app_opened`, daily, breakdown by person property `group`.
   - *Funnel*: `announcement_viewed` → `paywall_viewed` → `paywall_cta_tapped` → `ai_estimate_approved`.
3. **Deploy to Vercel.** Import this folder as a project (framework: Vite), add the env vars from `.env.example`, deploy, and share the URL.

## Events

| Event | When | Key properties |
|---|---|---|
| `app_opened` | Launch, or return to foreground after 30+ min | `days_since_signup`, `first_open_today`, `installed` |
| `onboarding_completed` | Finished setup | `goal`, `kcal_target` |
| `meal_logged` | Any entry saved | `method` (`search`/`photo`), `meal`, `kcal` |
| `food_searched` | Settled search query | `query`, `results` |
| `announcement_viewed` / `_cta_tapped` / `_dismissed` | AI arm's first exposure | — |
| `paywall_viewed` / `_plan_selected` / `_cta_tapped` / `_dismissed` | Fake paywall | `source`, `plan` |
| `ai_estimate_received` / `_failed` | Photo analysed | `ms`, `confidence`, `items`, `demo` |
| `ai_estimate_approved` / `_discarded` | User decision | `edited`, `ai_kcal`, `final_kcal`, `kcal_delta_pct` |
| `entry_edited` / `entry_deleted` | Changes after logging | `source` |

Every event carries `group`, `app_version` and `installed` as super properties.

## Project layout

```
api/estimate.ts        Vercel function → server/estimate.ts (Claude vision call, structured output)
src/screens/           Onboarding, Today, AddFood, PhotoLog, Paywall, Announcement, History, Me
src/lib/store.ts       Local data (zustand + localStorage) and A/B assignment
src/lib/analytics.ts   PostHog wrapper and the event list
src/data/foods.ts      94 fruits & vegetables, per-100 g values (USDA FoodData Central)
```

**Known limits:** data lives on the device, so clearing Safari data resets a tester to a new user in a new group. Photos are downscaled in the browser and are not stored on a server; only a small thumbnail is kept on the phone.
