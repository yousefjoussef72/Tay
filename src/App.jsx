import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowUpLeft, ArrowUpRight, Check, Clock3, FileText,
  Layers3, LayoutDashboard, LockKeyhole, Mail, Menu, MessageSquare,
  Plus, Send, ShieldCheck, Sparkles, X, LogOut, Trash2, Eye, EyeOff, UserRound, LogIn
} from "lucide-react";
import { supabase, supabaseReady } from "./lib/supabase.js";
import AdminWorkspace from "./AdminWorkspace.jsx";
import { LibraryPage, ExamsPage } from "./StudentHub.jsx";
import ArticlePage from "./ArticlePage.jsx";

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
          <Link to="/library" onClick={close}>المكتبة</Link>
          <Link to="/exams" onClick={close}>الامتحانات</Link>
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
                  <Link to={"/articles/" + article.slug} className="article-card article-card-link" key={article.id} aria-label={"قراءة المقال: " + article.title}>
                    <span className="article-tag">مقال · اضغط للقراءة</span><h3>{article.title}</h3>
                    <p>{article.excerpt || "اكتشف هذا الموضوع من داخل المساحة."}</p>
                    <span className="article-read-more">قراءة المقال <ArrowUpLeft size={15} /></span>
                  </Link>
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
  const [authBusy, setAuthBusy] = useState(false);
  const [username, setUsername] = useState("");
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
    if (!supabase || authBusy) return;
    setAuthBusy(true);
    try {
      const { data, error: signInError } = await supabase.functions.invoke("username-auth", {
        body: { action: "login", username: username.trim().toLowerCase(), password },
      });
      if (signInError || !data?.access_token || !data?.refresh_token) {
        setError(data?.message || "اسم المستخدم أو كلمة المرور غير صحيحة.");
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) setError("تعذر بدء الجلسة. حاول مرة أخرى.");
    } catch (error) {
      console.error("Admin sign-in failed:", error);
      setError("حدث خطأ أثناء تسجيل الدخول. تحقق من الاتصال وحاول مرة أخرى.");
    } finally {
      setAuthBusy(false);
    }
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
            <label>اسم المستخدم<input type="text" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" autoComplete="username" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} dir="ltr" /></label>
            <label>كلمة المرور<input type="password" required minLength={8} maxLength={72} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" /></label>
            {error && <div className="notice error">{error}</div>}
            <button className="button button-primary" type="submit" disabled={authBusy}>{authBusy ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"} <ArrowLeft size={17} /></button>
          </form>
        </div>
      ) : role !== "admin" ? (
        <div className="admin-message"><div className="admin-icon"><ShieldCheck size={25} /></div><h1>الحساب ليس حساب إدارة.</h1><p>تم تسجيل الدخول، لكن هذا الحساب لا يملك صلاحية إدارة الموقع. اطلب من مالك المشروع تعيين دور admin له من قاعدة البيانات.</p><button className="button button-ghost-dark" onClick={signOut}>تسجيل الخروج</button></div>
      ) : (
        <AdminWorkspace session={session} />
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState(null);

  async function loadProfile(user) {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name,username,role")
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

  async function submitAuth(event) {
    event.preventDefault();
    setNotice(null);
    if (!supabase) {
      setNotice({ kind: "error", text: "خدمة الحسابات غير متاحة الآن. حاول لاحقًا." });
      return;
    }
    setBusy(true);
    try {
      const cleanUsername = username.trim().toLowerCase();
      const action = mode === "signup" ? "signup" : "login";
      const body = action === "signup"
        ? { action, username: cleanUsername, password, displayName: name.trim() }
        : { action, username: cleanUsername, password };
      const { data, error: authError } = await supabase.functions.invoke("username-auth", { body });
      if (authError || data?.error) {
        setNotice({
          kind: "error",
          text: data?.message || (data?.error === "username_taken"
            ? "اسم المستخدم مستخدم بالفعل."
            : "اسم المستخدم أو كلمة المرور غير صحيحة. راجع البيانات وحاول مرة أخرى."),
        });
        return;
      }
      if (!data?.access_token || !data?.refresh_token) {
        setNotice({ kind: "success", text: "تم إنشاء الحساب. سجّل الدخول الآن باسم المستخدم وكلمة المرور." });
        setMode("login");
        setPassword("");
        return;
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) {
        setNotice({ kind: "error", text: "تم تنفيذ الطلب لكن تعذر بدء الجلسة. حاول تسجيل الدخول." });
        return;
      }
      setSession(sessionData.session);
      if (sessionData.user) await loadProfile(sessionData.user);
      setPassword("");
      setNotice({
        kind: "success",
        text: action === "signup" ? "تم إنشاء حسابك وتسجيل دخولك بنجاح." : "تم تسجيل الدخول بنجاح.",
      });
    } catch (error) {
      console.error("Username authentication failed:", error);
      setNotice({ kind: "error", text: "حدثت مشكلة اتصال. تحقق من الإنترنت وحاول مرة أخرى." });
    } finally {
      setBusy(false);
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
            <h1>{session ? "أهلًا بعودتك." : mode === "signup" ? "ابدأ مساحتك الخاصة." : "سجّل دخولك من جديد."}</h1>
            <p>{session ? "أصبح لديك حساب خاص. يمكنك العودة إلى الموقع ومتابعة المحتوى." : "استخدم اسم المستخدم وكلمة المرور، من غير رسائل تأكيد بالبريد الإلكتروني."}</p>
          </div>
          {loading ? (
            <div className="account-card"><p className="muted">جارٍ التحقق من حسابك...</p></div>
          ) : session ? (
            <section className="account-card account-profile">
              <div className="account-avatar"><UserRound size={28} /></div>
              <span className="admin-label">تم تسجيل الدخول</span>
              <h2>{profile?.display_name || session.user.user_metadata?.full_name || "مرحبًا بك"}</h2>
              <p className="account-email" dir="ltr">@{profile?.username || session.user.user_metadata?.username || "user"}</p>
              <div className="account-role">{profile?.role === "admin" ? "مدير الموقع" : "حساب طالب"}</div>
              <div className="account-actions">
                <Link to="/" className="button button-primary">العودة إلى الموقع <ArrowLeft size={17} /></Link>
                <button className="button button-ghost-dark" onClick={signOut}><LogOut size={16} /> تسجيل الخروج</button>
              </div>
              {notice && <div className={"notice " + notice.kind}>{notice.text}</div>}
            </section>
          ) : (
            <section className="account-card">
              <div className="account-switch">
                <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setNotice(null); }}>إنشاء حساب جديد</button>
                <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setNotice(null); }}>تسجيل الدخول</button>
              </div>
              <form className="account-form" onSubmit={submitAuth}>
                {mode === "signup" && (
                  <label>الاسم الكامل
                    <input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك" />
                  </label>
                )}
                <label>اسم المستخدم
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={24}
                    pattern="[A-Za-z0-9_]{3,24}"
                    autoComplete="username"
                    value={username}
                    onChange={e => { setUsername(e.target.value.toLowerCase()); setNotice(null); }}
                    placeholder="مثال: yousef_123"
                    dir="ltr"
                  />
                </label>
                <label>كلمة المرور
                  <span className="password-field">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="8 أحرف على الأقل"
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </span>
                </label>
                {notice && <div className={"notice " + notice.kind}>{notice.text}</div>}
                <button className="button button-primary account-submit" type="submit" disabled={busy}>
                  {busy ? "جارٍ التنفيذ..." : mode === "signup" ? "إنشاء حساب" : "تسجيل الدخول"}
                  {mode === "signup" ? <UserRound size={17} /> : <LogIn size={17} />}
                </button>
              </form>
              <p className="account-footnote">اسم المستخدم من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو _ فقط. في الحسابات السابقة، استُخدم الجزء السابق لعلامة @ من بريد التسجيل كاسم مستخدم بعد تحويله إلى أحرف صغيرة واستبدال الرموز غير المدعومة بـ _. احتفظ بكلمة المرور؛ لا يتوفر استرداد آلي لها في هذه النسخة.</p>
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
  return <Routes><Route path="/" element={<SiteGate />} /><Route path="/account" element={<AccountPage />} /><Route path="/admin" element={<AdminPage />} /><Route path="/library" element={<LibraryPage />} /><Route path="/exams" element={<ExamsPage />} /><Route path="/exams/:examId" element={<ExamsPage />} /><Route path="/articles/:slug" element={<ArticlePage />} /><Route path="*" element={<NotFound />} /></Routes>;
}