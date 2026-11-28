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

    const examId = String(body.exam_id ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(examId)) {
      return response({ ok: false, error: "invalid_exam_id" }, origin, 400);
    }

    const admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: exam, error: examError } = await admin
      .from("exams")
      .select("id,duration_minutes")
      .eq("id", examId)
      .eq("is_published", true)
      .maybeSingle();

    if (examError) return response({ ok: false, error: "exam_lookup_failed" }, origin, 500);
    if (!exam) return response({ ok: false, error: "exam_not_available", message: "الامتحان غير متاح حاليًا." }, origin, 404);

    const { count, error: questionsError } = await admin
      .from("exam_questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", examId);
    if (questionsError) return response({ ok: false, error: "question_lookup_failed" }, origin, 500);
    if (!count) return response({ ok: false, error: "exam_has_no_questions", message: "لم تتم إضافة أسئلة إلى هذا الامتحان بعد." }, origin, 409);

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + (exam.duration_minutes || 30) * 60_000);
    const { data: session, error: sessionError } = await admin
      .from("exam_sessions")
      .insert({
        exam_id: examId,
        user_id: userData.user.id,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id,started_at,expires_at")
      .single();

    if (sessionError || !session) {
      return response({ ok: false, error: "exam_session_create_failed" }, origin, 500);
    }

    return response({
      ok: true,
      session_id: session.id,
      expires_at: session.expires_at,
      server_now: startedAt.toISOString(),
      duration_minutes: exam.duration_minutes,
    }, origin);
  } catch (error) {
    console.error("start-exam failed:", error instanceof Error ? error.message : "unknown error");
    return response({ ok: false, error: "unexpected_error" }, origin, 500);
  }
});
