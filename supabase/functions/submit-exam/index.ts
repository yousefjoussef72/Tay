import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigin = (origin: string | null) => !origin
  || origin === "https://tay-space.vercel.app"
  || /^https:\/\/tay-space-[a-z0-9-]+-yousefjoussef72\.vercel\.app$/.test(origin)
  || /^http:\/\/localhost(:\d+)?$/.test(origin);

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(origin) && origin ? origin : "https://tay-space.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(body: Record<string, unknown>, origin: string | null, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

function defaultKey(raw: string | undefined, fallback: string | undefined) {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.default === "string") return parsed.default;
    } catch { /* Use the legacy variable below. */ }
  }
  return fallback ?? "";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (!allowedOrigin(origin)) return response({ ok: false, error: "origin_not_allowed" }, null, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return response({ ok: false, error: "method_not_allowed" }, origin, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKey = defaultKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"), Deno.env.get("SUPABASE_ANON_KEY"));
    const secretKey = defaultKey(Deno.env.get("SUPABASE_SECRET_KEYS"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!url || !publishableKey || !secretKey) {
      return response({ ok: false, error: "server_configuration_error" }, origin, 500);
    }

    const authorization = req.headers.get("authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token || token === authorization) {
      return response({ ok: false, error: "authentication_required" }, origin, 401);
    }

    const authClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) {
      return response({ ok: false, error: "authentication_required" }, origin, 401);
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return response({ ok: false, error: "invalid_request" }, origin, 400); }

    const sessionId = String(body.session_id ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
      return response({ ok: false, error: "invalid_session" }, origin, 400);
    }

    const answers = body.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return response({ ok: false, error: "invalid_answers" }, origin, 400);
    }

    const admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: gradingError } = await admin.rpc("grade_exam_session_internal", {
      p_session_id: sessionId,
      p_user_id: userData.user.id,
      p_answers: answers,
    });

    if (gradingError || !data) {
      console.error("submit-exam grading failed:", gradingError?.message ?? "empty result");
      return response({ ok: false, error: "grading_failed", message: "تعذر تصحيح الامتحان. حاول مرة أخرى." }, origin, 500);
    }
    return response(data as Record<string, unknown>, origin);
  } catch (error) {
    console.error("submit-exam failed:", error instanceof Error ? error.message : "unknown error");
    return response({ ok: false, error: "unexpected_error", message: "حدث خطأ غير متوقع. حاول مرة أخرى." }, origin, 500);
  }
});
