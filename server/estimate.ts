import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Shared by the Vercel function (api/estimate.ts) and the Vite dev middleware.

const MODEL = "claude-opus-5-5";
const MAX_IMAGE_BYTES = 4_000_000;

const EstimateSchema = z.object({
  is_food: z.boolean().describe("false if the photo does not show food or a meal"),
  meal_name: z.string().describe("Short, plain name for the whole meal, e.g. 'Chicken rice bowl'"),
  items: z
    .array(
      z.object({
        name: z.string(),
        grams: z.number().describe("Estimated edible weight in grams"),
        kcal: z.number(),
        protein: z.number().describe("grams"),
        carbs: z.number().describe("grams"),
        fat: z.number().describe("grams"),
      }),
    )
    .describe("Every distinct component visible, including oils, sauces and drinks"),
  confidence: z.enum(["low", "medium", "high"]),
  note: z.string().describe("One short sentence on the biggest source of uncertainty, max 90 chars"),
});

export type Estimate = z.infer<typeof EstimateSchema>;

export type EstimateResult =
  | { ok: true; demo: boolean; estimate: Estimate }
  | { ok: false; status: number; error: string };

const SYSTEM = `You estimate the nutrition of meals from a single photo for a calorie-tracking app used by gym-goers.

Identify each visible component (including cooking oil, butter, sauces, dressings and drinks when they are evident) and estimate its edible weight in grams from visual cues: plate and cutlery size, portion depth, typical serving sizes. Then give kcal, protein, carbs and fat for that weight, consistent with standard nutrition databases (USDA). Macros must roughly agree with kcal (4/4/9 kcal per gram).

Be realistic rather than conservative: restaurant and home portions are often larger than labelled servings, and hidden fat is common. If the photo does not show food, set is_food to false and return an empty items list.`;

export async function estimateMeal(imageBase64: string, mediaType: string): Promise<EstimateResult> {
  if (!imageBase64 || Buffer.byteLength(imageBase64, "base64") > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, error: "Image missing or too large" };
  }
  if (mediaType !== "image/jpeg" && mediaType !== "image/png" && mediaType !== "image/webp") {
    return { ok: false, status: 415, error: "Unsupported image type" };
  }

  // No credentials configured yet: serve a labelled sample so the flow can be demoed.
  if (!hasCredentials()) return { ok: true, demo: true, estimate: DEMO_ESTIMATE };
  const client = new Anthropic();

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(EstimateSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: "Estimate the calories and macros of this meal." },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return { ok: false, status: 422, error: "Could not analyse this photo" };
    }
    return { ok: true, demo: false, estimate: response.parsed_output };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: true, demo: true, estimate: DEMO_ESTIMATE };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, status: 429, error: "Too many requests, try again in a moment" };
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error", error.status, error.message);
      return { ok: false, status: 502, error: "AI service error" };
    }
    console.error("Estimate failed", error);
    return { ok: false, status: 500, error: "Estimate failed" };
  }
}

// Mirrors the SDK's resolution order: API key, auth token, then an `ant auth login` profile.
function hasCredentials(): boolean {
  const env = process.env;
  if (env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_PROFILE) return true;
  const configDir = env.ANTHROPIC_CONFIG_DIR ?? join(homedir(), ".config", "anthropic");
  return existsSync(join(configDir, "credentials"));
}

const DEMO_ESTIMATE: Estimate = {
  is_food: true,
  meal_name: "Chicken, rice & broccoli bowl",
  items: [
    { name: "Grilled chicken breast", grams: 150, kcal: 248, protein: 46.5, carbs: 0, fat: 5.4 },
    { name: "White rice, cooked", grams: 180, kcal: 234, protein: 4.9, carbs: 50.8, fat: 0.5 },
    { name: "Broccoli, steamed", grams: 90, kcal: 32, protein: 2.2, carbs: 6.3, fat: 0.4 },
    { name: "Olive oil", grams: 7, kcal: 62, protein: 0, carbs: 0, fat: 7 },
  ],
  confidence: "medium",
  note: "Sample estimate — the AI is not connected yet.",
};

export async function handleEstimateRequest(body: unknown): Promise<{ status: number; json: unknown }> {
  const { image, mediaType } = (body ?? {}) as { image?: string; mediaType?: string };
  const result = await estimateMeal(image ?? "", mediaType ?? "");
  if (!result.ok) return { status: result.status, json: { error: result.error } };
  return { status: 200, json: { demo: result.demo, estimate: result.estimate } };
}
