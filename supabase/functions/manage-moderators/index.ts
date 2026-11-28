import { createClient } from "npm:@supabase/supabase-js@2";

const MASTER_USERNAME = "syznstwr";

function defaultKey(raw: string | undefined, fallback: string | undefined) {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.default === "string") return parsed.default;
    } catch { /* use fallback */ }
  }
  return fallback ?? "";
}

const allowedOrigin = (origin: string | null) => !origin
  || origin === "https://tay-space.vercel.app"
  || /^https:\/\/tay-space-[a-z0-9-]+-yousefjoussef72\.vercel\.app$/.test(origin)
  || /^http:\/\/localhost(:\d+)?$/.test(origin);

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigin(origin) ? origin : "https://tay-space.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(body: Record<string, unknown>, origin: string | null, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function validUsername(value: string) {
  return /^[a-z0-9_]{3,24}$/.test(value) && value !== MASTER_USERNAME;
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

    const admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: actor, error: actorError } = await admin
      .from("profiles")
      .select("id,username,role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (actorError || actor?.role !== "admin" || normalizeUsername(actor.username) !== MASTER_USERNAME) {
      return response({ ok: false, error: "master_admin_required", message: "إدارة المشرفين متاحة للحساب الرئيسي فقط." }, origin, 403);
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return response({ ok: false, error: "invalid_request" }, origin, 400); }

    const action = String(body.action ?? "");

    if (action === "list") {
      const { data: moderators, error } = await admin
        .from("profiles")
        .select("id,username,display_name,created_at")
        .eq("role", "moderator")
        .order("created_at", { ascending: true });
      if (error) return response({ ok: false, error: "moderator_list_failed" }, origin, 500);
      return response({ ok: true, moderators: moderators || [] }, origin);
    }

    if (action === "create") {
      const username = normalizeUsername(body.username);
      const password = String(body.password ?? "");
      const displayName = String(body.display_name ?? "").trim().slice(0, 80);

      if (!validUsername(username)) {
        return response({ ok: false, error: "invalid_username", message: "اسم المستخدم يجب أن يكون من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو _، ولا يمكن استخدام اسم الحساب الرئيسي." }, origin, 400);
      }
      if (password.length < 8 || password.length > 72) {
        return response({ ok: false, error: "invalid_password", message: "كلمة المرور يجب أن تكون من 8 إلى 72 حرفًا." }, origin, 400);
      }
      if (displayName.length < 2) {
        return response({ ok: false, error: "invalid_display_name", message: "اكتب اسمًا واضحًا للمشرف." }, origin, 400);
      }

      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (existing) {
        return response({ ok: false, error: "username_taken", message: "اسم المستخدم مستخدم بالفعل." }, origin, 409);
      }

      const email = username + "@accounts.tay-space.invalid";
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName, username },
      });

      if (createError || !created.user) {
        console.error("manage-moderators account creation failed:", createError?.message ?? "user_not_created");
        return response({ ok: false, error: "moderator_create_failed", message: "تعذر إنشاء حساب المشرف. تحقق من اسم المستخدم وحاول مرة أخرى." }, origin, 400);
      }

      const { error: profileError } = await admin.from("profiles").upsert({
        id: created.user.id,
        username,
        display_name: displayName,
        role: "moderator",
      }, { onConflict: "id" });

      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        console.error("manage-moderators profile creation failed:", profileError.message);
        return response({ ok: false, error: "moderator_profile_failed", message: "تعذر تجهيز صلاحيات المشرف، ولم يتم الاحتفاظ بالحساب." }, origin, 500);
      }

      return response({
        ok: true,
        moderator: { id: created.user.id, username, display_name: displayName },
      }, origin, 201);
    }

    if (action === "remove") {
      const moderatorId = String(body.moderator_id ?? "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(moderatorId)) {
        return response({ ok: false, error: "invalid_moderator_id" }, origin, 400);
      }
      const { data: target, error: targetError } = await admin
        .from("profiles")
        .select("id,username,role")
        .eq("id", moderatorId)
        .maybeSingle();

      if (targetError || !target || target.role !== "moderator" || normalizeUsername(target.username) === MASTER_USERNAME) {
        return response({ ok: false, error: "moderator_not_found", message: "لم يتم العثور على هذا المشرف." }, origin, 404);
      }

      const { error } = await admin
        .from("profiles")
        .update({ role: "member" })
        .eq("id", moderatorId)
        .eq("role", "moderator");

      if (error) return response({ ok: false, error: "moderator_remove_failed", message: "تعذر سحب صلاحيات المشرف." }, origin, 500);

      return response({
        ok: true,
        removed: { id: target.id, username: target.username },
        message: "تم سحب صلاحية الإشراف. الحساب نفسه ما زال موجودًا كحساب طالب.",
      }, origin);
    }

    return response({ ok: false, error: "unsupported_action" }, origin, 400);
  } catch (error) {
    console.error("manage-moderators failed:", error instanceof Error ? error.message : "unknown error");
    return response({ ok: false, error: "unexpected_error", message: "حدث خطأ غير متوقع أثناء إدارة المشرفين." }, origin, 500);
  }
});
