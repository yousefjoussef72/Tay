function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function describeDevice(userAgent) {
  const ua = String(userAgent || "");
  let device = "جهاز غير محدد";
  let os = "نظام غير محدد";
  let browser = "متصفح غير محدد";

  if (/iPhone/i.test(ua)) { device = "iPhone"; os = "iOS"; }
  else if (/iPad/i.test(ua)) { device = "iPad"; os = "iPadOS"; }
  else if (/Android/i.test(ua)) {
    os = "Android";
    const modelMatch = ua.match(/Android [^;]+;\s*([^;)]+)/i);
    const model = modelMatch?.[1]?.replace(/\s+Build.*$/i, "").trim();
    device = (/Mobile/i.test(ua) ? "هاتف Android" : "جهاز Android") + (model && model.length < 50 ? " (" + model + ")" : "");
  } else if (/Windows/i.test(ua)) { device = "كمبيوتر"; os = "Windows"; }
  else if (/Mac OS X|Macintosh/i.test(ua)) { device = "كمبيوتر"; os = "macOS"; }
  else if (/Linux/i.test(ua)) { device = "كمبيوتر"; os = "Linux"; }

  if (/Edg\\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Firefox\\//i.test(ua)) browser = "Firefox";
  else if (/OPR\\//i.test(ua)) browser = "Opera";
  else if (/Chrome\\//i.test(ua)) browser = "Google Chrome";
  else if (/Safari\\//i.test(ua)) browser = "Safari";

  return { device, os, browser };
}

async function completeNotification(supabaseUrl, publishableKey, authorization, sent) {
  try {
    await fetch(supabaseUrl.replace(/\\/$/, "") + "/rest/v1/rpc/complete_telegram_signup_notification", {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_sent: sent }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("[telegram-signup] completion update failed", { name: error?.name || "Error" });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const authorization = req.headers.authorization || "";
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !publishableKey || !authorization.startsWith("Bearer ")) {
    console.error("[telegram-signup] missing Supabase configuration or authorization");
    return res.status(401).json({ ok: false, error: "auth_configuration_missing" });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.error("[telegram-signup] Telegram server variables are missing", {
      botTokenConfigured: Boolean(botToken),
      chatIdConfigured: Boolean(chatId),
    });
    return res.status(503).json({ ok: false, error: "telegram_not_configured" });
  }

  let claimed = false;
  try {
    const baseUrl = supabaseUrl.replace(/\\/$/, "");
    const verifyResponse = await fetch(baseUrl + "/auth/v1/user", {
      headers: { apikey: publishableKey, Authorization: authorization },
      signal: AbortSignal.timeout(5000),
    });
    if (!verifyResponse.ok) {
      console.error("[telegram-signup] Supabase access token validation failed", { status: verifyResponse.status });
      return res.status(401).json({ ok: false, error: "invalid_session" });
    }

    const verifiedUser = await verifyResponse.json();
    const profileUrl = new URL(baseUrl + "/rest/v1/profiles");
    profileUrl.searchParams.set("id", "eq." + String(verifiedUser.id || ""));
    profileUrl.searchParams.set("select", "username,display_name");
    const profileResponse = await fetch(profileUrl, {
      headers: { apikey: publishableKey, Authorization: authorization },
      signal: AbortSignal.timeout(5000),
    });
    if (!profileResponse.ok) {
      console.error("[telegram-signup] profile lookup failed", { status: profileResponse.status });
      return res.status(502).json({ ok: false, error: "profile_lookup_failed" });
    }

    const profiles = await profileResponse.json();
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    const username = String(profile?.username || "").trim().toLowerCase();
    const displayName = String(profile?.display_name || "").trim();
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return res.status(403).json({ ok: false, error: "profile_not_ready" });
    }

    // Claim a one-time notification for recently created accounts to prevent replay/spam.
    const claimResponse = await fetch(baseUrl + "/rest/v1/rpc/claim_telegram_signup_notification", {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(5000),
    });
    if (!claimResponse.ok) {
      console.error("[telegram-signup] notification claim failed", { status: claimResponse.status });
      return res.status(503).json({ ok: false, error: "notification_claim_failed" });
    }
    claimed = await claimResponse.json();
    if (claimed !== true) return res.status(200).json({ ok: true, skipped: "already_sent_or_not_new" });

    const { device, os, browser } = describeDevice(req.headers["user-agent"]);
    const text = [
      "🔔 <b>تسجيل حساب جديد في Tay Space</b>",
      "",
      "<b>الاسم:</b> " + escapeHtml(displayName || "غير محدد"),
      "<b>اسم المستخدم:</b> <code>@" + escapeHtml(username) + "</code>",
      "<b>الجهاز:</b> " + escapeHtml(device),
      "<b>النظام:</b> " + escapeHtml(os),
      "<b>المتصفح:</b> " + escapeHtml(browser),
      "<b>الوقت:</b> " + escapeHtml(new Date().toISOString()),
    ].join("\n");

    const telegramResponse = await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    const telegramResult = await telegramResponse.json().catch(() => ({}));
    if (!telegramResponse.ok || telegramResult.ok !== true) {
      await completeNotification(baseUrl, publishableKey, authorization, false);
      console.error("[telegram-signup] Telegram rejected sendMessage", {
        status: telegramResponse.status,
        errorCode: telegramResult.error_code || null,
        description: String(telegramResult.description || "unknown error").slice(0, 200),
      });
      return res.status(502).json({ ok: false, error: "telegram_rejected" });
    }

    await completeNotification(baseUrl, publishableKey, authorization, true);
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (claimed) await completeNotification(supabaseUrl, publishableKey, authorization, false);
    console.error("[telegram-signup] request failed", { name: error?.name || "Error" });
    return res.status(502).json({ ok: false, error: "notification_request_failed" });
  }
}
