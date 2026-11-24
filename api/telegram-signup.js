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
  else if (/Android/i.test(ua)) { device = /Mobile/i.test(ua) ? "هاتف Android" : "جهاز Android"; os = "Android"; }
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
    return res.status(405).json({ ok: false });
  }

  const { consent, email, displayName } = req.body || {};
  if (consent !== true) return res.status(204).end();

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return res.status(202).json({ ok: true, notification: "not_configured" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = req.headers.authorization || "";
  if (!supabaseUrl || !publishableKey || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false });
  }

  try {
    const verifyResponse = await fetch(supabaseUrl.replace(/\/$/, "") + "/auth/v1/user", {
      headers: { apikey: publishableKey, Authorization: authorization },
    });
    if (!verifyResponse.ok) return res.status(401).json({ ok: false });
    const verifiedUser = await verifyResponse.json();

    const safeEmail = String(email || "").trim().toLowerCase();
    if (!verifiedUser.email || verifiedUser.email.toLowerCase() !== safeEmail) {
      return res.status(403).json({ ok: false });
    }

    const forwardedFor = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || "").split(",")[0]).trim()
      || req.headers["x-real-ip"]
      || "غير متاح";
    const { device, os, browser } = describeDevice(req.headers["user-agent"]);
    const safeName = escapeHtml(String(displayName || "").slice(0, 120));
    const text = [
      "🔔 <b>تسجيل حساب جديد في مساحة</b>",
      "",
      "<b>الاسم:</b> " + safeName,
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
    if (!telegramResponse.ok) return res.status(502).json({ ok: false });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ ok: false });
  }
}
