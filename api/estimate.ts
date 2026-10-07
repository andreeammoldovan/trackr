import { handleEstimateRequest } from "../server/estimate.js";

export const config = { maxDuration: 60 };

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { status, json } = await handleEstimateRequest(body);
  return Response.json(json, { status });
}
