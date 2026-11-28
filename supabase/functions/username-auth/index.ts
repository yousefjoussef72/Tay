import { createClient } from "npm:@supabase/supabase-js@2";

function corsHeadersFor(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "https://tay-space.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function reply(
  body: Record<string, unknown>,
  status = 200,
  headers = corsHeadersFor(null),
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function validUsername(value: string) {
  return /^[a-z0-9_]{3,24}$/.test(value);
}

async function hashIp(ip: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const originAllowed = !origin
    || origin === "https://tay-space.vercel.app"
    || /^https:\/\/tay-space-[a-z0-9-]+-yousefjoussef72\.vercel\.app$/.test(origin)
    || /^https:\/\/deploy-preview-\\d+--comfy-malabi-25d1dc\\.netlify\\.app$/.test(origin)
    || /^http:\/\/localhost(:\d+)?$/.test(origin);
  const corsHeaders = corsHeadersFor(originAllowed ? origin : null);
  const send = (body: Record<string, unknown>, status = 200) => reply(body, status, corsHeaders);

  if (!originAllowed) return send({ error: "origin_not_allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return send({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const serviceKey = secretKeysRaw
    ? (JSON.parse(secretKeysRaw).default as string)
    : (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const anonKey = publishableKeysRaw
    ? (JSON.parse(publishableKeysRaw).default as string)
    : (Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  if (!url || !serviceKey || !anonKey) return send({ error: "server_configuration_error" }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return send({ error: "invalid_request" }, 400); }

  const action = String(body.action ?? "");
  const username = normalizeUsername(body.username);
  const password = String(body.password ?? "");

  if (!validUsername(username)) {
    return send({ error: "invalid_username", message: "اسم المستخدم من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو _ فقط." }, 400);
  }
  if (password.length < 8 || password.length > 72) {
    return send({ error: "invalid_password", message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." }, 400);
  }

  if (action === "signup") {
    const displayName = String(body.displayName ?? "").trim().slice(0, 80);
    if (displayName.length < 2) return send({ error: "invalid_name", message: "اكتب اسمًا من حرفين على الأقل." }, 400);

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await hashIp(forwarded, serviceKey);
    const { data: signupAllowed, error: rateError } = await admin.rpc(
      "consume_username_signup_attempt",
      { p_ip_hash: ipHash },
    );
    if (rateError) return send({ error: "rate_check_failed" }, 503);
    if (!signupAllowed) {
      return send({
        error: "signup_rate_limited",
        message: "محاولات إنشاء الحساب كثيرة. حاول بعد 15 دقيقة.",
      }, 429);
    }

    const { data: existing } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
    if (existing) return send({ error: "username_taken", message: "اسم المستخدم مستخدم بالفعل." }, 409);

    const email = username + "@accounts.tay-space.invalid";
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName, username },
    });
    if (createError || !created.user) {
      return send({ error: "signup_failed", message: "تعذر إنشاء الحساب. جرّب اسم مستخدم آخر." }, 400);
    }

    const { error: profileError } = await admin.from("profiles")
      .update({ username, display_name: displayName })
      .eq("id", created.user.id);

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return send({ error: "username_claim_failed", message: "تعذر حفظ اسم المستخدم. جرّب اسمًا آخر." }, 409);
    }

    const { data: signedIn, error: signInError } = await authClient.auth.signInWithPassword({ email, password });
    if (signInError || !signedIn.session) {
      return send({ error: "account_created_login_failed", message: "تم إنشاء الحساب. سجّل الدخول باسم المستخدم وكلمة المرور." }, 200);
    }
    return send({
      access_token: signedIn.session.access_token,
      refresh_token: signedIn.session.refresh_token,
      user: { id: signedIn.user.id, username, display_name: displayName },
    });
  }

  if (action === "login") {
    const { data: profile, error: lookupError } = await admin
      .from("profiles").select("id").eq("username", username).maybeSingle();
    if (lookupError || !profile) return send({ error: "invalid_credentials", message: "اسم المستخدم أو كلمة المرور غير صحيحة." }, 401);

    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(profile.id);
    if (userError || !authUser.user?.email) return send({ error: "invalid_credentials", message: "اسم المستخدم أو كلمة المرور غير صحيحة." }, 401);

    const { data: signedIn, error: signInError } = await authClient.auth.signInWithPassword({
      email: authUser.user.email,
      password,
    });
    if (signInError || !signedIn.session) {
      return send({ error: "invalid_credentials", message: "اسم المستخدم أو كلمة المرور غير صحيحة." }, 401);
    }
    return send({
      access_token: signedIn.session.access_token,
      refresh_token: signedIn.session.refresh_token,
      user: { id: signedIn.user.id, username },
    });
  }

  return send({ error: "unsupported_action" }, 400);
});
