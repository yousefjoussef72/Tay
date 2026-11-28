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

export async function generateGroqJson({ system, user, maxTokens = 6400 }) {
  const apiKey = String(process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    const error = new Error("Groq API key is not configured.");
    error.code = "groq_not_configured";
    throw error;
  }

  const model = String(
    process.env.GROQ_MODEL || process.env.GROQ_RESEARCH_MODEL || "openai/gpt-oss-120b"
  ).trim();
  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: Math.max(1000, Math.min(6500, maxTokens)),
    temperature: 0.2,
  });

  let response;
  let lastCause;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: requestBody,
        signal: AbortSignal.timeout(45000),
      });
      lastCause = null;
      break;
    } catch (cause) {
      lastCause = cause;
      const timedOut = cause?.name === "TimeoutError" || cause?.name === "AbortError";
      if (attempt === 0 && !timedOut) {
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }

      const causeChain = [];
      let currentCause = cause;
      for (let depth = 0; currentCause && depth < 4; depth += 1) {
        causeChain.push({
          name: String(currentCause?.name || "Error").slice(0, 80),
          code: String(currentCause?.code || "").slice(0, 80) || null,
          message: String(currentCause?.message || "").slice(0, 180),
          errno: String(currentCause?.errno || "").slice(0, 80) || null,
          syscall: String(currentCause?.syscall || "").slice(0, 80) || null,
          hostname: String(currentCause?.hostname || "").slice(0, 160) || null,
        });
        currentCause = currentCause?.cause;
      }
      console.error("groq_transport_failure", {
        timedOut,
        causeChain,
      });
      const causeCode = causeChain.find(item => item.code)?.code || null;
      const causeName = causeChain[0]?.name || "Error";

      const error = new Error("Groq API request could not be completed.");
      error.code = timedOut ? "groq_timeout" : "groq_network_error";
      error.causeCode = causeCode;
      error.causeName = causeName;
      throw error;
    }
  }

  if (!response && lastCause) {
    const error = new Error("Groq API request could not be completed.");
    error.code = "groq_network_error";
    throw error;
  }

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Groq API request failed.");
    error.status = response.status;
    const providerCode = raw?.error?.code || raw?.error?.type;
    error.code = providerCode === "billing_required"
      ? "groq_billing_required"
      : response.status === 401 ? "groq_auth_failed"
      : response.status === 403 ? "groq_model_not_available"
      : response.status === 429 ? "groq_rate_limited"
      : response.status === 400 ? "groq_invalid_request"
      : response.status >= 500 ? "groq_service_unavailable"
      : "groq_request_failed";
    throw error;
  }

  const choice = raw?.choices?.[0];
  const responseContent = choice?.message?.content;
  if (typeof responseContent !== "string" || !responseContent.trim()) {
    const error = new Error("Groq returned an empty response.");
    error.code = "ai_empty_response";
    throw error;
  }
  if (choice?.finish_reason === "length") {
    const error = new Error("Groq reached the free-tier output token limit before completing the response.");
    error.code = "groq_output_limit";
    throw error;
  }

  try {
    return { data: JSON.parse(responseContent), model: raw.model || model, usage: raw.usage || null };
  } catch {
    const error = new Error("Groq returned invalid JSON.");
    error.code = "ai_invalid_json";
    throw error;
  }
}

// Kept as a compatibility alias for the research endpoint.
export async function generateGroqResearchJson(args) {
  return generateGroqJson(args);
}

export function sendApiError(res, error) {
  const code = error?.code || "internal_error";
  const messages = {
    groq_not_configured: "لم يتم إعداد مفتاح Groq على خادم المنصة. راجع إعداد السر في Vercel.",
    groq_auth_failed: "تعذر التحقق من مفتاح Groq. راجع إعدادات المفتاح السري.",
    groq_model_not_available: "النموذج المجاني غير متاح لهذا الحساب حاليًا.",
    groq_rate_limited: "وصلنا إلى حد الاستخدام المجاني مؤقتًا. انتظر إعادة ضبط الحصة ثم حاول مرة أخرى.",
    groq_billing_required: "تطلب خدمة Groq استكمال إعدادات الحساب. لم نقم بتفعيل خطة مدفوعة.",
    groq_invalid_request: "لم تُقبل صيغة الطلب من نموذج Groq. راجع إعدادات الطلب ثم حاول مرة أخرى.",
    groq_output_limit: "وصل الرد إلى حد الإخراج المجاني قبل اكتماله. قلّل حجم الطلب أو قسّمه ثم حاول مجددًا.",
    groq_service_unavailable: "خدمة Groq غير متاحة مؤقتًا. حاول مرة أخرى لاحقًا.",
    groq_request_failed: "تعذر إكمال طلب الذكاء الاصطناعي عبر Groq.",
    groq_timeout: "استغرق رد Groq وقتًا أطول من المسموح. حاول مجددًا بطلب أقصر.",
    groq_network_error: "تعذر الاتصال بخدمة Groq. تحقق من الخدمة وحاول مجددًا.",
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
    : code === "groq_timeout" ? 504
    : code === "groq_network_error" ? 503
    : 500;
  return res.status(status).json({ ok: false, error: code, message: messages[code] || "حدث خطأ غير متوقع." });
}
