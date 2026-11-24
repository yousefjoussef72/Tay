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
  }
  else if (/Windows/i.test(ua)) { device = "كمبيوتر"; os = "Windows"; }
  else if (/Mac OS X|Macintosh/i.test(ua)) { device = "كمبيوتر"; os = "macOS"; }
  else if (/Linux/i.test(ua)) { device = "كمبيوتر"; os = "Linux"; }

  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/OPR\//i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Google Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  return { device, os, browser };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const { consent, email } = req.body || {};
  if (consent !== true) return res.status(204).end();

  const authorization = req.headers.authorization || "";
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !publishableKey || !authorization.startsWith("Bearer ")) {
    console.error("[telegram-signup] missing Supabase configuration or authorization");
    return res.status(401).json({ ok: false, error: "auth_configuration_missing" });
  }

  try {
    const verifyResponse = await fetch(supabaseUrl.replace(/\/$/, "") + "/auth/v1/user", {
      headers: { apikey: publishableKey, Authorization: authorization },
    });
    if (!verifyResponse.ok) {
      console.error("[telegram-signup] Supabase access token validation failed", { status: verifyResponse.status });
      return res.status(401).json({ ok: false, error: "invalid_session" });
    }
    const verifiedUser = await verifyResponse.json();

    const safeEmail = String(email || "").trim().toLowerCase();
    if (!verifiedUser.email || verifiedUser.email.toLowerCase() !== safeEmail) {
      console.error("[telegram-signup] session email did not match signup email");
      return res.status(403).json({ ok: false, error: "email_mismatch" });
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

    const forwardedFor = req.headers["x-forwarded-for"];
    const forwardedIps = (Array.isArray(forwardedFor) ? forwardedFor.join(",") : String(forwardedFor || ""))
      .split(",").map((value) => value.trim()).filter(Boolean);
    const ip = req.headers["x-real-ip"] || forwardedIps[0] || "غير متاح";
    const { device, os, browser } = describeDevice(req.headers["user-agent"]);
    const authName = verifiedUser.user_metadata?.full_name || "";
    const safeName = escapeHtml(String(authName).slice(0, 120));
    const text = [
      "🔔 <b>تسجيل حساب جديد في مساحة</b>",
      "",
      "<b>الاسم:</b> " + (safeName || "غير محدد"),
      "<b>البريد:</b> " + escapeHtml(safeEmail),
      "<b>الجهاز:</b> " + escapeHtml(device),
      "<b>النظام:</b> " + escapeHtml(os),
      "<b>المتصفح:</b> " + escapeHtml(browser),
      "<b>IP:</b> <code>" + escapeHtml(ip) + "</code>",
      "<b>الوقت:</b> " + escapeHtml(new Date().toISOString()),
      "",
      "<i>تم إرسال هذه التفاصيل بعد موافقة صاحب الحساب.</i>",
    ].join("\n");

    const telegramResponse = await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    const telegramResult = await telegramResponse.json().catch(() => ({}));
    if (!telegramResponse.ok || telegramResult.ok !== true) {
      console.error("[telegram-signup] Telegram rejected sendMessage", {
        status: telegramResponse.status,
        errorCode: telegramResult.error_code || null,
        description: String(telegramResult.description || "unknown error").slice(0, 200),
      });
      return res.status(502).json({ ok: false, error: "telegram_rejected" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[telegram-signup] request failed", { name: error?.name || "Error" });
    return res.status(502).json({ ok: false, error: "notification_request_failed" });
  }
}