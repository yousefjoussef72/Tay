import { generateJson, setApiHeaders } from "../../lib/ai-server.js";

export default async function handler(req, res) {
  if (!setApiHeaders(req, res)) return res.status(403).json({ ok: false });
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  try {
    const result = await generateJson(req, {
      system: "Return only the JSON object {\"ok\":true}.",
      user: "Connectivity check.",
      maxTokens: 1000
    });
    return res.status(200).json({
      ok: Boolean(result.data?.ok),
      model: result.model,
      usage: result.usage || null
    });
  } catch (error) {
    console.error("ai_gateway_smoke_failed", { code: error?.code || "unknown", status: error?.status || null });
    return res.status(503).json({
      ok: false,
      error: error?.code || "ai_gateway_smoke_failed"
    });
  }
}
