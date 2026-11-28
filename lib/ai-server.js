import { createClient } from "@supabase/supabase-js";

const MODEL = "openai/gpt-4.1-mini";
const MAX_AI_OUTPUT_TOKENS = 12000;

function allowedOrigin(origin) {
  if (!origin) return true;
  return origin === "https://tay-space.vercel.app"
    || /^https:\/\/tay-space-[a-z0-9-]+-yousefjoussef72\.vercel\.app$/.test(origin)
    || /^http:\/\/localhost(:\d+)?$/.test(origin);
}

export function setApiHeaders(req, res) {
  const origin = req.headers.origin;
  if (!allowedOrigin(origin)) return false;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  return true;
}

export function getBearerToken(req) {
  const value = String(req.headers.authorization || "");
  return /^Bearer\s+\S+$/i.test(value) ? value.replace(/^Bearer\s+/i, "") : "";
}

export async function requireAdmin(req) {
  const token = getBearerToken(req);
  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !url || !publishableKey) {
    return { ok: false, status: 401, error: "authentication_required" };
  }

  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: "Bearer " + token } },
  });

  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData?.user) {
    return { ok: false, status: 401, error: "invalid_session" };
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return { ok: false, status: 403, error: "admin_required" };
  }

  return { ok: true, client, user: authData.user };
}

function gatewayToken(req) {
  const requestToken = req.headers["x-vercel-oidc-token"];
  const fromHeader = Array.isArray(requestToken) ? requestToken[0] : requestToken;
  return String(process.env.AI_GATEWAY_API_KEY || fromHeader || process.env.VERCEL_OIDC_TOKEN || "");
}

export async function generateJson(req, { system, user, maxTokens = 5000 }) {
  const token = gatewayToken(req);
  if (!token) {
    const error = new Error("AI Gateway authentication is not enabled for this Vercel project.");
    error.code = "ai_gateway_not_configured";
    throw error;
  }

  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: Math.max(1000, Math.min(MAX_AI_OUTPUT_TOKENS, maxTokens)),
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(45000),
  });

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("AI Gateway request failed.");
    error.code = response.status === 401 ? "ai_gateway_auth_failed"
      : response.status === 402 ? "ai_gateway_billing_required"
      : response.status === 429 ? "ai_gateway_rate_limited"
      : "ai_gateway_request_failed";
    error.status = response.status;
    throw error;
  }

  const content = raw?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    const error = new Error("The AI model returned an empty response.");
    error.code = "ai_empty_response";
    throw error;
  }

  try {
    return { data: JSON.parse(content), model: MODEL, usage: raw.usage || null };
  } catch {
    const error = new Error("The AI model returned invalid structured data.");
    error.code = "ai_invalid_json";
    throw error;
  }
}

export function sendApiError(res, error) {
  const code = error?.code || "internal_error";
  const messages = {
    ai_gateway_not_configured: "لم يتم تفعيل الاتصال الآمن بالذكاء الاصطناعي في Vercel بعد.",
    ai_gateway_auth_failed: "تعذر التحقق من اتصال الذكاء الاصطناعي. راجع إعدادات OIDC في Vercel.",
    ai_gateway_billing_required: "رصيد أو إعدادات فوترة AI Gateway لا تسمح بتنفيذ الطلب حاليًا.",
    ai_gateway_rate_limited: "تم الوصول إلى حد الطلبات مؤقتًا. حاول بعد قليل.",
    ai_gateway_request_failed: "خدمة الذكاء الاصطناعي غير متاحة الآن.",
    ai_empty_response: "لم يُرجع الذكاء الاصطناعي نتيجة قابلة للاستخدام.",
    ai_invalid_json: "تعذر قراءة نتيجة الذكاء الاصطناعي. أعد المحاولة.",
  };
  const status = code === "ai_gateway_not_configured" ? 503
    : code === "ai_gateway_auth_failed" ? 503
    : code === "ai_gateway_billing_required" ? 503
    : code === "ai_gateway_rate_limited" ? 429
    : 500;
  return res.status(status).json({ ok: false, error: code, message: messages[code] || "حدث خطأ غير متوقع." });
}
