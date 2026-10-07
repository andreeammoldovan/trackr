import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Serves /api/estimate in dev with the same handler Vercel runs in production.
function devApi(): Plugin {
  return {
    name: "trackr-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/estimate", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        let body: unknown;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }
        const mod = await server.ssrLoadModule("/server/estimate.ts");
        const { status, json } = await mod.handleEstimateRequest(body);
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(json));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
});
