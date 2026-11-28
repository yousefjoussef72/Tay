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

export async function requireUser(req) {
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

  return { ok: true, client, user: authData.user };
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
    .select("role,username")
    .eq("id", authData.user.id)
    .maybeSingle();

  const isMasterAdmin = profile?.role === "admin"
    && String(profile?.username || "").trim().toLowerCase() === "syznstwr";
  const isModerator = profile?.role === "moderator";
  if (profileError || (!isMasterAdmin && !isModerator)) {
    return { ok: false, status: 403, error: "admin_required" };
  }

  return { ok: true, client, user: authData.user, profile, isMasterAdmin, isModerator };
}

function gatewayToken(req) {
  const requestToken = req.headers["x-vercel-oidc-token"];
  const fromHeader = Array.isArray(requestToken) ? requestToken[0] : requestToken;
  return String(process.env.AI_GATEWAY_API_KEY || fromHeader || process.env.VERCEL_OIDC_TOKEN || "");
}

export async function generateClaudeJson({ system, user, maxTokens = 12000 }) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    const error = new Error("Claude API key is not configured.");
    error.code = "claude_not_configured";
    throw error;
  }

  const model = String(process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5").trim();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2026-10-21",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.max(1000, Math.min(16000, maxTokens)),
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(120000),
  });

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Claude API request failed.");
    error.status = response.status;
    const type = raw?.error?.type || raw?.type;
    error.code = response.status === 401 ? "claude_auth_failed"
      : response.status === 403 ? "claude_access_denied"
      : response.status === 402 || type === "billing_error" ? "claude_billing_required"
      : response.status === 429 ? "claude_rate_limited"
      : response.status === 400 ? "claude_invalid_request"
      : response.status >= 500 ? "claude_service_unavailable"
      : type === "billing_error" ? "claude_billing_required"
      : "claude_request_failed";
    throw error;
  }

  const content = Array.isArray(raw?.content)
    ? raw.content.filter(block => block?.type === "text").map(block => block.text || "").join("\\n").trim()
    : "";
  if (!content) {
    const error = new Error("Claude returned an empty response.");
    error.code = "ai_empty_response";
    throw error;
  }

  const jsonText = content.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try {
    return { data: JSON.parse(jsonText), model: raw.model || model, usage: raw.usage || null };
  } catch {
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return { data: JSON.parse(jsonText.slice(start, end + 1)), model: raw.model || model, usage: raw.usage || null };
      } catch {}
    }
    const error = new Error("Claude returned invalid JSON.");
    error.code = "ai_invalid_json";
    throw error;
  }
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
    const gatewayErrorType = raw?.error?.type || raw?.error?.code;
    error.code = gatewayErrorType === "customer_verification_required"
      ? "ai_gateway_verification_required"
      : response.status === 401 ? "ai_gateway_auth_failed"
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
    claude_not_configured: "لم يتم إعداد مفتاح Claude API على خادم المنصة بعد.",
    claude_auth_failed: "تعذر التحقق من مفتاح Claude. راجع إعداداته السرية في Vercel.",
    claude_access_denied: "رفضت خدمة Claude هذا الطلب بسبب صلاحيات الحساب أو إعداداته.",
    claude_billing_required: "حساب Claude API يحتاج إلى مراجعة إعدادات الفوترة لدى مسؤول المنصة.",
    claude_rate_limited: "وصلنا إلى حد الطلبات في Claude مؤقتًا. حاول بعد قليل.",
    claude_invalid_request: "إعدادات طلب Claude غير مقبولة. لم تُخصم المحاولة.",
    claude_service_unavailable: "خدمة Claude غير متاحة مؤقتًا. لم تُخصم المحاولة.",
    claude_request_failed: "تعذر إكمال الطلب عبر Claude. لم تُخصم المحاولة.",
    ai_gateway_not_configured: "لم يتم تفعيل الاتصال الآمن بالذكاء الاصطناعي في Vercel بعد.",
    ai_gateway_auth_failed: "تعذر التحقق من اتصال الذكاء الاصطناعي. راجع إعدادات OIDC في Vercel.",
    ai_gateway_billing_required: "خدمة إنشاء الأبحاث تحتاج إلى استكمال إعدادات الفوترة لدى مسؤول المنصة. لم تُخصم المحاولة.",
    ai_gateway_verification_required: "خدمة إنشاء الأبحاث تحتاج إلى استكمال التحقق في إعدادات حساب Vercel الخاص بالمنصة. لم تُخصم المحاولة، ويمكنك استخدام المحاكي العملي أدناه الآن.",
    ai_gateway_rate_limited: "تم الوصول إلى حد الطلبات مؤقتًا. حاول بعد قليل.",
    ai_gateway_request_failed: "خدمة الذكاء الاصطناعي غير متاحة الآن.",
    ai_empty_response: "لم يُرجع الذكاء الاصطناعي نتيجة قابلة للاستخدام.",
    ai_invalid_json: "تعذر قراءة نتيجة الذكاء الاصطناعي. أعد المحاولة.",
  };
  const status = code === "claude_not_configured" ? 503
    : code === "claude_auth_failed" ? 503
    : code === "claude_access_denied" ? 503
    : code === "claude_billing_required" ? 503
    : code === "claude_rate_limited" ? 429
    : code === "claude_invalid_request" ? 400
    : code === "claude_service_unavailable" ? 503
    : code === "ai_gateway_not_configured" ? 503
    : code === "ai_gateway_auth_failed" ? 503
    : code === "ai_gateway_billing_required" ? 503
    : code === "ai_gateway_verification_required" ? 503
    : code === "ai_gateway_rate_limited" ? 429
    : 500;
  return res.status(status).json({ ok: false, error: code, message: messages[code] || "حدث خطأ غير متوقع." });
}
