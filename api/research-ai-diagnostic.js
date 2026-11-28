export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false });
  }

  return res.status(200).json({
    ok: true,
    hasAiGatewayApiKey: Boolean(process.env.AI_GATEWAY_API_KEY),
    hasVercelOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
    hasSupabaseUrl: Boolean(process.env.VITE_SUPABASE_URL),
    hasSupabasePublishableKey: Boolean(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    ),
    model: "openai/gpt-4.1-mini"
  });
}
