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

export async function generateGroqResearchJson({ system, user, maxTokens = 6400 }) {
  const apiKey = String(process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    const error = new Error("Groq API key is not configured.");
    error.code = "groq_not_configured";
    throw error;
  }

  const model = String(process.env.GROQ_RESEARCH_MODEL || "openai/gpt-oss-120b").trim();
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: Math.max(1000, Math.min(6500, maxTokens)),
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(90000),
  });

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Groq API request failed.");
    error.status = response.status;
    const providerCode = raw?.error?.code || raw?.error?.type;
    error.code = response.status === 401 ? "groq_auth_failed"
      : response.status === 403 ? "groq_model_not_available"
      : response.status === 429 ? "groq_rate_limited"
      : response.status === 400 ? "groq_invalid_request"
      : response.status >= 500 ? "groq_service_unavailable"
      : providerCode === "billing_required" ? "groq_billing_required"
      : "groq_request_failed";
    throw error;
  }

  const choice = raw?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    const error = new Error("Groq returned an empty response.");
    error.code = "ai_empty_response";
    throw error;
  }
  if (choice?.finish_reason === "length") {
    const error = new Error("Groq reached the free-tier output token limit before completing the research.");
    error.code = "groq_output_limit";
    throw error;
  }

  try {
    return { data: JSON.parse(content), model: raw.model || model, usage: raw.usage || null };
  } catch {
    const error = new Error("Groq returned invalid JSON.");
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
    groq_not_configured: "لم يتم إعداد مفتاح Groq المجاني على خادم المنصة بعد. يحتاج ذلك إلى مسؤول بالغ عن الحساب.",
    groq_auth_failed: "تعذر التحقق من مفتاح Groq. راجع إعدادات المفتاح السري.",
    groq_model_not_available: "النموذج المجاني غير متاح لهذا الحساب حاليًا.",
    groq_rate_limited: "وصلنا إلى حد الاستخدام المجاني مؤقتًا. انتظر إعادة ضبط الحصة ثم حاول مرة أخرى.",
    groq_billing_required: "الخدمة تطلب إعدادات حساب إضافية. لم نقم بترقية الحساب أو تفعيل الدفع.",
    groq_invalid_request: "لم تُقبل صيغة طلب البحث من النموذج المجاني. لم تُخصم محاولتك.",
    groq_output_limit: "وصل البحث إلى حد الإخراج المجاني قبل اكتماله. لم تُخصم محاولتك.",
    groq_service_unavailable: "خدمة Groq غير متاحة مؤقتًا. لم تُخصم محاولتك.",
    groq_request_failed: "تعذر إكمال البحث عبر Groq. لم تُخصم محاولتك.",
    ai_gateway_not_configured: "لم يتم تفعيل الاتصال الآمن بالذكاء الاصطناعي في Vercel بعد.",
    ai_gateway_auth_failed: "تعذر التحقق من اتصال الذكاء الاصطناعي. راجع إعدادات OIDC في Vercel.",
    ai_gateway_billing_required: "خدمة إنشاء الأبحاث تحتاج إلى استكمال إعدادات الفوترة لدى مسؤول المنصة. لم تُخصم المحاولة.",
    ai_gateway_verification_required: "خدمة إنشاء الأبحاث تحتاج إلى استكمال التحقق في إعدادات حساب Vercel الخاص بالمنصة. لم تُخصم المحاولة، ويمكنك استخدام المحاكي العملي أدناه الآن.",
    ai_gateway_rate_limited: "تم الوصول إلى حد الطلبات مؤقتًا. حاول بعد قليل.",
    ai_gateway_request_failed: "خدمة الذكاء الاصطناعي غير متاحة الآن.",
    ai_empty_response: "لم يُرجع الذكاء الاصطناعي نتيجة قابلة للاستخدام.",
    ai_invalid_json: "تعذر قراءة نتيجة الذكاء الاصطناعي. أعد المحاولة.",
  };
  const status = code === "groq_not_configured" ? 503
    : code === "groq_auth_failed" ? 503
    : code === "groq_model_not_available" ? 503
    : code === "groq_rate_limited" ? 429
    : code === "groq_billing_required" ? 503
    : code === "groq_invalid_request" ? 400
    : code === "groq_output_limit" ? 502
    : code === "groq_service_unavailable" ? 503
    : code === "ai_gateway_not_configured" ? 503
    : code === "ai_gateway_auth_failed" ? 503
    : code === "ai_gateway_billing_required" ? 503
    : code === "ai_gateway_verification_required" ? 503
    : code === "ai_gateway_rate_limited" ? 429
    : 500;
  return res.status(status).json({ ok: false, error: code, message: messages[code] || "حدث خطأ غير متوقع." });
}
