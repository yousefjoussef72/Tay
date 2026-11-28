export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const token = req.headers["x-vercel-oidc-token"];
  if (!token || Array.isArray(token)) {
    return res.status(503).json({ ok: false, error: "runtime_oidc_header_missing" });
  }

  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4.1-mini",
        messages: [
          { role: "system", content: "Return only the JSON object {\"ok\":true}." },
          { role: "user", content: "Connectivity check." }
        ],
        response_format: { type: "json_object" },
        max_tokens: 40,
        temperature: 0
      }),
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        gatewayStatus: response.status,
        gatewayError: data?.error?.type || data?.error?.code || "gateway_error"
      });
    }

    const content = data?.choices?.[0]?.message?.content || "";
    return res.status(200).json({
      ok: content.includes('"ok"') && content.includes("true"),
      model: data?.model || "openai/gpt-4.1-mini",
      usage: data?.usage || null
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      error: error?.name || "gateway_fetch_failed"
    });
  }
}
