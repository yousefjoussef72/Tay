import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowUpLeft, ArrowUpRight, Check, Clock3, FileText,
  Layers3, LayoutDashboard, LockKeyhole, Mail, Menu, MessageSquare,
  Plus, Send, ShieldCheck, Sparkles, X, LogOut, Trash2, Eye, EyeOff, UserRound, LogIn
} from "lucide-react";
import { supabase, supabaseReady } from "./lib/supabase.js";

const features = [
  {
    icon: Layers3,
    number: "01",
    title: "هيكل مرن",
    body: "أساس منظم يسهل تطويره وتغيير صفحاته عندما تتحدد فكرة الموقع.",
  },
  {
    icon: ShieldCheck,
    number: "02",
    title: "بيانات محمية",
    body: "قاعدة PostgreSQL مع صلاحيات وصول منفصلة وسياسات حماية على مستوى الصفوف.",
  },
  {
    icon: Sparkles,
    number: "03",
    title: "جاهز للنمو",
    body: "إمكانية إضافة صفحات ومقالات وحسابات وخصائص جديدة دون إعادة البناء من الصفر.",
  },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link to="/" className="brand" onClick={close} aria-label="مساحة - الرئيسية">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">مساحة<small>بداية تستحق</small></span>
        </Link>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="فتح القائمة">
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="/#home" onClick={close}>الرئيسية</a>
          <a href="/#about" onClick={close}>عن الموقع</a>
          <a href="/#features" onClick={close}>المميزات</a>
          <a href="/#contact" onClick={close}>تواصل معنا</a>
          <Link to="/account" onClick={close}>حساب الطالب</Link>
        </nav>
        <Link to="/admin" className="nav-admin"><LockKeyhole size={15} /> لوحة الإدارة</Link>
      </div>
    </header>
  );
}

function Home() {
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadArticles() {
      if (!supabase) return;
      setLoadingArticles(true);
      const { data } = await supabase
        .from("articles")
        .select("id,title,slug,excerpt,published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      if (active) {
        setArticles(data ?? []);
        setLoadingArticles(false);
      }
    }
    loadArticles();
    return () => { active = false; };
  }, []);

  async function submitMessage(event) {
    event.preventDefault();
    setNotice(null);
    if (!supabase) {
      setNotice({ kind: "warning", text: "نموذج التواصل جاهز، وسيبدأ حفظ الرسائل بعد ربط قاعدة بيانات Supabase." });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim() || "رسالة من الموقع",
      message: form.message.trim(),
    });
    setSending(false);
    if (error) {
      setNotice({ kind: "error", text: "تعذر إرسال الرسالة الآن. حاول مرة أخرى لاحقًا." });
    } else {
      setForm({ name: "", email: "", subject: "", message: "" });
      setNotice({ kind: "success", text: "وصلت رسالتك بنجاح. شكرًا لتواصلك!" });
    }
  }

  return (
    <>
      <Header />
      <main>
        <section className="hero" id="home">
          <div className="hero-grid" />
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="container hero-inner">
            <div className="hero-copy">
              <div className="eyebrow"><span className="live-dot" /> النسخة التأسيسية للموقع</div>
              <h1>كل بداية عظيمة<br /><em>تحتاج إلى مساحة.</em></h1>
              <p className="hero-lead">نضع الآن الأساس لموقعك. الفكرة والاسم والمحتوى سنحددها معًا، أما البنية التقنية فقد بدأت بالفعل.</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#about">اكتشف الموقع <ArrowUpLeft size={18} /></a>
                <a className="button button-ghost" href="#contact">ابدأ الحديث <ArrowLeft size={17} /></a>
              </div>
              <div className="hero-note"><span className="note-line" /> تصميم مرن · عربي بالكامل · قابل للتطوير</div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-glow" />
              <div className="art-ring ring-a" />
              <div className="art-ring ring-b" />
              <div className="art-card card-back"><span>IDEAS</span><b>01</b></div>
              <div className="art-card card-front">
                <div className="art-card-top"><span className="mini-mark" /> YOUR NEXT CHAPTER</div>
                <div className="art-symbol">مـ</div>
                <div className="art-card-bottom"><span>مساحة جديدة</span><ArrowUpLeft size={17} /></div>
              </div>
              <span className="art-star star-a">✳</span>
              <span className="art-star star-b">✳</span>
              <span className="art-caption">A PLACE TO BEGIN</span>
            </div>
          </div>
          <div className="hero-bottom container">
            <span>01 — البداية</span><span className="scroll-cue">مرّر لاكتشاف المزيد <span /></span><span>EST. 2026</span>
          </div>
        </section>

        <section className="intro-section section-pad" id="about">
          <div className="container intro-layout">
            <div className="section-kicker"><span>01</span> / الفكرة</div>
            <div className="intro-content">
              <h2>لسنا هنا لنملأ صفحة فارغة؛<br /><span>بل لنصنع شيئًا له معنى.</span></h2>
              <div className="intro-bottom">
                <p>هذه نسخة أولية أنشأناها لتكون نقطة انطلاق. لا يوجد مجال أو محتوى مفروض مسبقًا؛ سنرسم تجربة الموقع معًا بعد تثبيت الأساس.</p>
                <a className="text-link" href="#features">تعرف على ما تم تجهيزه <ArrowUpLeft size={18} /></a>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section section-pad" id="features">
          <div className="container">
            <div className="section-heading">
              <div><div className="section-kicker"><span>02</span> / ما تم بناؤه</div><h2>أساس قوي،<br /><span>وتفاصيل نضيفها معًا.</span></h2></div>
              <p>جهزنا ما يحتاجه أي مشروع رقمي حديث قبل إدخال المحتوى النهائي.</p>
            </div>
            <div className="feature-grid">
              {features.map(({ icon: Icon, number, title, body }) => (
                <article className="feature-card" key={number}>
                  <div className="feature-top"><span>{number}</span><Icon size={22} strokeWidth={1.6} /></div>
                  <h3>{title}</h3><p>{body}</p><div className="feature-rule" />
                </article>
              ))}
            </div>
          </div>
        </section>

        {(articles.length > 0 || loadingArticles) && (
          <section className="articles-section section-pad">
            <div className="container">
              <div className="section-kicker"><span>03</span> / آخر الإضافات</div>
              <div className="articles-heading"><h2>من داخل المساحة</h2><span>المحتوى المنشور</span></div>
              <div className="article-grid">
                {loadingArticles ? <p className="muted">جارٍ تحميل المحتوى...</p> : articles.map(article => (
                  <article className="article-card" key={article.id}>
                    <span className="article-tag">مقال</span><h3>{article.title}</h3>
                    <p>{article.excerpt || "اكتشف هذا الموضوع من داخل المساحة."}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="contact-section section-pad" id="contact">
          <div className="container contact-layout">
            <div className="contact-copy">
              <div className="section-kicker light"><span>04</span> / الخطوة التالية</div>
              <h2>عندك فكرة؟<br /><em>خلّينا نبدأ.</em></h2>
              <p>أرسل رسالة تجريبية الآن، أو استخدم هذا القسم لاحقًا لاستقبال استفسارات زوار الموقع.</p>
              <div className="contact-meta"><Mail size={17} /><span>نموذج التواصل — تُحفظ الرسائل مباشرةً في قاعدة البيانات</span></div>
            </div>
            <form className="contact-form" onSubmit={submitMessage}>
              <div className="form-row">
                <label>الاسم<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسمك" /></label>
                <label>البريد الإلكتروني<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" dir="ltr" /></label>
              </div>
              <label>موضوع الرسالة <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="كيف يمكننا مساعدتك؟" /></label>
              <label>رسالتك<textarea required rows="4" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="اكتب ما يدور في بالك..." /></label>
              {notice && <div className={"notice " + notice.kind}>{notice.text}</div>}
              <button className="button button-accent submit-button" disabled={sending}>{sending ? "جارٍ الإرسال..." : "إرسال الرسالة"} <Send size={17} /></button>
              {!supabaseReady && <span className="form-hint">الحفظ الفعلي سيتاح بعد ربط Supabase.</span>}
            </form>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <Link to="/" className="brand footer-brand"><span className="brand-mark"><span /></span><span className="brand-name">مساحة<small>بداية تستحق</small></span></Link>
          <span>© 2026 — نسخة تأسيسية قابلة للتطوير</span>
          <a href="#home" className="back-top">العودة للأعلى <ArrowUpRight size={16} /></a>
        </div>
      </footer>
    </>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [articles, setArticles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState("articles");
  const [draft, setDraft] = useState({ title: "", excerpt: "", content: "" });
  const [saving, setSaving] = useState(false);

  async function loadDashboard(user) {
    if (!supabase || !user) return;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    setRole(profile?.role ?? "member");
    if (profile?.role !== "admin") return;
    const [{ data: posts }, { data: inbox }] = await Promise.all([
      supabase.from("articles").select("id,title,slug,is_published,created_at").order("created_at", { ascending: false }),
      supabase.from("messages").select("id,name,email,subject,message,status,created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    setArticles(posts ?? []);
    setMessages(inbox ?? []);
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadDashboard(data.session.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) { setRole(null); setArticles([]); setMessages([]); }
      else loadDashboard(nextSession.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setError("");
    if (!supabase) return;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError("تعذر تسجيل الدخول. راجع البريد الإلكتروني وكلمة المرور.");
  }

  async function createArticle(event) {
    event.preventDefault();
    if (!supabase || !draft.title.trim()) return;
    setSaving(true);
    const slug = "draft-" + Date.now();
    const { error: insertError } = await supabase.from("articles").insert({
      title: draft.title.trim(), slug, excerpt: draft.excerpt.trim(), content: draft.content.trim(), is_published: false
    });
    setSaving(false);
    if (insertError) setError("لم نتمكن من حفظ المسودة. تحقق من صلاحيات حساب الإدارة.");
    else {
      setDraft({ title: "", excerpt: "", content: "" });
      await loadDashboard(session.user);
    }
  }

  async function togglePublish(article) {
    const { error: updateError } = await supabase.from("articles").update({
      is_published: !article.is_published,
      published_at: article.is_published ? null : new Date().toISOString()
    }).eq("id", article.id);
    if (updateError) setError("تعذر تحديث حالة المقال.");
    else await loadDashboard(session.user);
  }

  async function deleteArticle(id) {
    if (!window.confirm("هل تريد حذف هذه المسودة؟")) return;
    const { error: deleteError } = await supabase.from("articles").delete().eq("id", id);
    if (deleteError) setError("تعذر حذف المقال.");
    else await loadDashboard(session.user);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="admin-shell">
      <div className="admin-top"><Link to="/" className="brand"><span className="brand-mark"><span /></span><span className="brand-name">مساحة<small>لوحة الإدارة</small></span></Link><Link to="/" className="admin-back">العودة للموقع <ArrowUpLeft size={16} /></Link></div>
      {!supabaseReady ? (
        <div className="admin-message"><div className="admin-icon"><LockKeyhole size={25} /></div><span className="admin-label">إعداد مطلوب</span><h1>لوحة الإدارة جاهزة،<br />وتنتظر ربط قاعدة البيانات.</h1><p>أضف بيانات مشروع Supabase إلى ملف البيئة لتفعيل تسجيل الدخول وإدارة المحتوى والرسائل.</p><Link to="/" className="button button-primary">العودة إلى الموقع <ArrowLeft size={17} /></Link></div>
      ) : loading ? <div className="admin-message"><p>جارٍ التحقق من الجلسة...</p></div>
      : !session ? (
        <div className="login-card">
          <div className="admin-icon"><LockKeyhole size={25} /></div><span className="admin-label">منطقة محمية</span><h1>مرحبًا بعودتك.</h1><p>سجّل الدخول بحساب الإدارة للمتابعة.</p>
          <form onSubmit={signIn} className="login-form">
            <label>البريد الإلكتروني<input type="email" required value={email} onChange={e => setEmail(e.target.value)} dir="ltr" /></label>
            <label>كلمة المرور<input type="password" required value={password} onChange={e => setPassword(e.target.value)} dir="ltr" /></label>
            {error && <div className="notice error">{error}</div>}
            <button className="button button-primary" type="submit">تسجيل الدخول <ArrowLeft size={17} /></button>
          </form>
        </div>
      ) : role !== "admin" ? (
        <div className="admin-message"><div className="admin-icon"><ShieldCheck size={25} /></div><h1>الحساب ليس حساب إدارة.</h1><p>تم تسجيل الدخول، لكن هذا الحساب لا يملك صلاحية إدارة الموقع. اطلب من مالك المشروع تعيين دور admin له من قاعدة البيانات.</p><button className="button button-ghost-dark" onClick={signOut}>تسجيل الخروج</button></div>
      ) : (
        <div className="dashboard">
          <div className="dashboard-head"><div><span className="admin-label">مساحة العمل</span><h1>لوحة التحكم</h1><p>إدارة المحتوى والرسائل الواردة.</p></div><button className="button button-ghost-dark" onClick={signOut}><LogOut size={16} /> خروج</button></div>
          <div className="stats-grid"><div className="stat-card"><FileText /><span>المقالات</span><strong>{articles.length}</strong></div><div className="stat-card"><MessageSquare /><span>الرسائل</span><strong>{messages.length}</strong></div><div className="stat-card"><Clock3 /><span>مساحة الإدارة</span><strong>نشطة</strong></div></div>
          <div className="dashboard-tabs"><button className={tab === "articles" ? "active" : ""} onClick={() => setTab("articles")}>المقالات</button><button className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")}>الرسائل</button></div>
          {error && <div className="notice error">{error}</div>}
          {tab === "articles" ? <div className="admin-content">
            <form className="new-article" onSubmit={createArticle}><h2><Plus size={18} /> إضافة مسودة</h2><input required placeholder="عنوان المقال" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /><input placeholder="وصف مختصر" value={draft.excerpt} onChange={e => setDraft({ ...draft, excerpt: e.target.value })} /><textarea rows="3" placeholder="المحتوى..." value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} /><button className="button button-primary" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ كمسودة"}</button></form>
            <div className="admin-list"><h2>كل المقالات</h2>{articles.length === 0 ? <p className="muted">لا توجد مقالات بعد.</p> : articles.map(article => <div className="admin-list-row" key={article.id}><div><strong>{article.title}</strong><small>{article.is_published ? "منشور" : "مسودة"} · {article.slug}</small></div><div className="row-actions"><button title={article.is_published ? "إلغاء النشر" : "نشر"} onClick={() => togglePublish(article)}>{article.is_published ? <EyeOff size={17} /> : <Eye size={17} />}</button><button title="حذف" onClick={() => deleteArticle(article.id)}><Trash2 size={17} /></button></div></div>)}</div>
          </div> : <div className="admin-list message-list"><h2>صندوق الوارد</h2>{messages.length === 0 ? <p className="muted">لا توجد رسائل بعد.</p> : messages.map(message => <article className="inbox-item" key={message.id}><div className="inbox-head"><strong>{message.subject}</strong><small>{new Date(message.created_at).toLocaleString("ar-EG")}</small></div><p>{message.message}</p><div className="inbox-meta">{message.name} · {message.email}</div></article>)}</div>}
        </div>
      )}
    </div>
  );
}


function AccountPage() {
  const [mode, setMode] = useState("signup");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPending, setOtpPending] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shareTelemetry, setShareTelemetry] = useState(false);
  const [signupDetails, setSignupDetails] = useState(null);
  const [notice, setNotice] = useState(null);

  async function loadProfile(user) {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name,role")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data ?? null);
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user);
      if (active) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
      else setTimeout(() => loadProfile(nextSession.user), 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function describeEmailError(error) {
    if (error?.code === "over_email_send_rate_limit") {
      return "لم يُرسل الرمز لأن المشروع وصل إلى حد البريد المجاني: رسالتان في الساعة فقط. يلزم ربط خدمة SMTP حتى تصل الرموز إلى جميع الطلاب.";
    }
    if (error?.code === "email_address_not_authorized" || /email address not authorized/i.test(error?.message || "")) {
      return "خدمة البريد الحالية لا تسمح بالإرسال إلى هذا العنوان. يلزم ربط خدمة SMTP خارجية في Supabase.";
    }
    return "تعذر إرسال رمز التحقق الآن. تحقق من إعدادات البريد وحاول لاحقًا.";
  }

  async function sendSignupNotice(authSession, userEmail, displayName, consent) {
    if (!consent || !authSession?.access_token) return { ok: true, skipped: true };
    try {
      const response = await fetch("/api/telegram-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + authSession.access_token,
        },
        body: JSON.stringify({
          consent: true,
          email: userEmail,
          displayName,
        }),
      });
      const result = await response.json().catch(() => ({}));
      return { ok: response.ok && result.ok === true, error: result.error || "notification_failed" };
    } catch {
      return { ok: false, error: "network_error" };
    }
  }

  async function finishVerifiedSignup(authData) {
    const user = authData?.user;
    const authSession = authData?.session;
    setSession(authSession);
    if (user) await loadProfile(user);

    const details = signupDetails;
    setOtpPending(false);
    setOtp("");
    setPassword("");
    setSignupDetails(null);

    if (details?.shareTelemetry) {
      const notification = await sendSignupNotice(
        authSession,
        user?.email || email.trim().toLowerCase(),
        details.name,
        true
      );
      if (notification.ok) {
        setNotice({ kind: "success", text: "تم تفعيل حسابك وتسجيل دخولك، ووصل إشعار التسجيل إلى إدارة الموقع." });
      } else {
        setNotice({ kind: "warning", text: "تم تفعيل حسابك بنجاح، لكن تعذر إرسال إشعار تيليجرام للإدارة. راجع إعدادات البوت في Vercel." });
      }
    } else {
      setNotice({ kind: "success", text: "تم تفعيل حسابك وتسجيل دخولك بنجاح." });
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    setNotice(null);
    if (!supabase) {
      setNotice({ kind: "error", text: "خدمة الحسابات غير متاحة الآن. حاول لاحقًا." });
      return;
    }

    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (otpPending) {
        const cleanOtp = otp.trim();
        if (!/^\d{6}$/.test(cleanOtp)) {
          setNotice({ kind: "warning", text: "اكتب رمز التحقق المكوّن من 6 أرقام." });
          return;
        }
        const { data, error: otpError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanOtp,
          type: "email",
        });
        if (otpError) {
          setNotice({ kind: "error", text: "الرمز غير صحيح أو انتهت صلاحيته. تأكد من الأرقام أو اطلب رمزًا جديدًا." });
          return;
        }
        await finishVerifiedSignup(data);
        return;
      }

      if (mode === "signup") {
        const cleanName = name.trim();
        const consentAtSignup = shareTelemetry;
        const { data, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: cleanName },
          },
        });
        if (authError) {
          setNotice({
            kind: "error",
            text: authError.code === "over_email_send_rate_limit" ||
              authError.code === "email_address_not_authorized"
              ? describeEmailError(authError)
              : "تعذر إنشاء الحساب. راجع البريد الإلكتروني وكلمة المرور أو جرّب بريدًا آخر.",
          });
          return;
        }

        if (data.session) {
          setSession(data.session);
          await loadProfile(data.user);
          const notification = await sendSignupNotice(data.session, cleanEmail, cleanName, consentAtSignup);
          setNotice({
            kind: notification.ok
              ? "success"
              : consentAtSignup ? "warning" : "success",
            text: consentAtSignup && !notification.ok
              ? "تم إنشاء حسابك، لكن تعذر إرسال إشعار تيليجرام للإدارة. راجع إعدادات البوت في Vercel."
              : "تم إنشاء حسابك وتسجيل دخولك بنجاح.",
          });
          setPassword("");
          return;
        }

        const existingAccount = Boolean(
          data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0
        );
        setSignupDetails(existingAccount ? null : { name: cleanName, shareTelemetry: consentAtSignup });
        setOtpPending(true);
        setOtp("");
        setPassword("");
        setNotice({
          kind: existingAccount ? "warning" : "success",
          text: existingAccount
            ? "هذا البريد مسجّل بالفعل. يمكنك طلب رمز جديد أدناه أو تسجيل الدخول إلى حسابك."
            : "أرسلنا رمز تحقق مكوّنًا من 6 أرقام إلى بريدك. اكتبه هنا لتفعيل حسابك.",
        });
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (authError) {
        const notConfirmed = authError.code === "email_not_confirmed" ||
          /email not confirmed/i.test(authError.message || "");
        if (notConfirmed) {
          setSignupDetails(null);
          setOtpPending(true);
          setOtp("");
        }
        setNotice({
          kind: notConfirmed ? "warning" : "error",
          text: notConfirmed
            ? "هذا الحساب لم يُفعّل بعد. اضغط «إعادة إرسال الرمز»، ثم أدخل الرمز الذي يصلك هنا."
            : authError.code === "invalid_credentials"
              ? "البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد من كتابتهما كما استخدمتهما عند إنشاء الحساب."
              : "تعذر تسجيل الدخول الآن. حاول مرة أخرى بعد قليل.",
        });
        return;
      }

      setSession(data.session);
      await loadProfile(data.user);
      setNotice({ kind: "success", text: "تم تسجيل الدخول بنجاح." });
      setPassword("");
    } catch (error) {
      console.error("Authentication request failed:", error);
      setNotice({ kind: "error", text: "حدث اتصال غير متوقع أثناء تنفيذ الطلب. تحقق من الإنترنت ثم حاول مرة أخرى." });
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setNotice({ kind: "warning", text: "اكتب بريدك الإلكتروني أولًا." });
      return;
    }
    setOtpSending(true);
    setNotice(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
      });
      if (resendError) {
        setNotice({ kind: "warning", text: describeEmailError(resendError) });
      } else {
        setNotice({ kind: "success", text: "تم طلب إرسال رمز جديد. أدخل الرمز الأحدث الذي يصلك." });
      }
    } catch (error) {
      console.error("Resend signup OTP failed:", error);
      setNotice({ kind: "error", text: "تعذر طلب رمز جديد بسبب مشكلة اتصال. حاول لاحقًا." });
    } finally {
      setOtpSending(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setNotice({ kind: "success", text: "تم تسجيل الخروج." });
  }

  return (
    <>
      <Header />
      <main className="account-page">
        <div className="account-wrap">
          <div className="account-intro">
            <span className="admin-label">مساحة — حساب الطالب</span>
            <h1>{session ? "أهلًا بعودتك." : otpPending ? "أكّد بريدك الإلكتروني." : mode === "signup" ? "ابدأ مساحتك الخاصة." : "سجّل دخولك من جديد."}</h1>
            <p>{session ? "أصبح لديك حساب خاص. يمكنك العودة إلى الموقع ومتابعة المحتوى." : otpPending ? "أدخل رمز التحقق المكوّن من 6 أرقام الذي وصلك في رسالة البريد الإلكتروني." : "أنشئ حسابك بالبريد الإلكتروني وكلمة المرور، أو ادخل إلى حسابك الحالي."}</p>
          </div>
          {loading ? (
            <div className="account-card"><p className="muted">جارٍ التحقق من حسابك...</p></div>
          ) : session ? (
            <section className="account-card account-profile">
              <div className="account-avatar"><UserRound size={28} /></div>
              <span className="admin-label">تم تسجيل الدخول</span>
              <h2>{profile?.display_name || session.user.user_metadata?.full_name || "مرحبًا بك"}</h2>
              <p className="account-email" dir="ltr">{session.user.email}</p>
              <div className="account-role">{profile?.role === "admin" ? "مدير الموقع" : "حساب طالب"}</div>
              <div className="account-actions">
                <Link to="/" className="button button-primary">العودة إلى الموقع <ArrowLeft size={17} /></Link>
                <button className="button button-ghost-dark" onClick={signOut}><LogOut size={16} /> تسجيل الخروج</button>
              </div>
              {notice && <div className={"notice " + notice.kind}>{notice.text}</div>}
            </section>
          ) : (
            <section className="account-card">
              {!otpPending && (
                <div className="account-switch">
                  <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setNotice(null); }}>إنشاء حساب جديد</button>
                  <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setNotice(null); }}>تسجيل الدخول</button>
                </div>
              )}
              <form className="account-form" onSubmit={submitAuth}>
                {otpPending ? (
                  <>
                    <label>البريد الإلكتروني
                      <input type="email" value={email} readOnly dir="ltr" />
                    </label>
                    <label>رمز التحقق المكوّن من 6 أرقام
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        dir="ltr"
                      />
                    </label>
                    {notice && <div className={"notice " + notice.kind}>{notice.text}</div>}
                    <button className="button button-primary account-submit" type="submit" disabled={busy}>
                      {busy ? "جارٍ التحقق..." : "تأكيد الرمز وتفعيل الحساب"} <ShieldCheck size={17} />
                    </button>
                    <button className="button button-ghost-dark account-submit" type="button" onClick={resendCode} disabled={otpSending}>
                      {otpSending ? "جارٍ طلب الرمز..." : "إعادة إرسال الرمز"} <Mail size={16} />
                    </button>
                    <button className="account-home-link" type="button" onClick={() => { setOtpPending(false); setOtp(""); setSignupDetails(null); setNotice(null); }}>
                      العودة إلى بيانات الحساب
                    </button>
                  </>
                ) : (
                  <>
                    {mode === "signup" && (
                      <label>الاسم الكامل
                        <input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك" />
                      </label>
                    )}
                    <label>البريد الإلكتروني
                      <input type="email" required autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setNotice(null); }} placeholder="name@example.com" dir="ltr" />
                    </label>
                    <label>كلمة المرور
                      <span className="password-field">
                        <input type={showPassword ? "text" : "password"} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" dir="ltr" />
                        <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                      </span>
                    </label>
                    {mode === "signup" && (
                      <label className="telemetry-consent">
                        <input type="checkbox" checked={shareTelemetry} onChange={e => setShareTelemetry(e.target.checked)} />
                        <span>أوافق على إرسال اسمي وبريدي ومعلومات جهازي وعنوان IP إلى إدارة الموقع عبر تيليجرام بعد تفعيل الحساب. هذا اختياري ولا يؤثر على التسجيل.</span>
                      </label>
                    )}
                    {notice && <div className={"notice " + notice.kind}>{notice.text}</div>}
                    <button className="button button-primary account-submit" type="submit" disabled={busy}>
                      {busy ? "جارٍ التنفيذ..." : mode === "signup" ? "إنشاء حساب" : "تسجيل الدخول"}
                      {mode === "signup" ? <UserRound size={17} /> : <LogIn size={17} />}
                    </button>
                  </>
                )}
              </form>
              <p className="account-footnote">لن نطلب منك أي بيانات غير لازمة لإنشاء حسابك.</p>
            </section>
          )}
          <Link to="/" className="account-home-link"><ArrowLeft size={15} /> العودة إلى الصفحة الرئيسية</Link>
        </div>
      </main>
    </>
  );
}
function SiteGate() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="admin-message"><p>جارٍ التحقق من حسابك...</p></div>;
  }
  return session ? <Home /> : <AccountPage />;
}

function NotFound() {
  return <div className="not-found"><span>404</span><h1>هذه الصفحة غير موجودة.</h1><Link to="/" className="button button-primary">العودة للرئيسية <ArrowLeft size={17} /></Link></div>;
}

export default function App() {
  return <Routes><Route path="/" element={<SiteGate />} /><Route path="/account" element={<AccountPage />} /><Route path="/admin" element={<AdminPage />} /><Route path="*" element={<NotFound />} /></Routes>;
}