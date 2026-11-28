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
import { SiteCopyProvider, useSiteCopy } from "./siteCopy.js";

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
  const { copy } = useSiteCopy();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);
  if (copy.showHeader === false) return null;
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link to="/" className="brand" onClick={close} aria-label={copy.brandName + " - " + copy.navHome}>
          {copy.brandLogoUrl ? <img className="site-brand-image" src={copy.brandLogoUrl} alt={copy.brandName} /> : <span className="brand-mark"><span /></span>}
          <span className="brand-name">{copy.brandName}<small>{copy.brandTagline}</small></span>
        </Link>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="فتح القائمة">
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href={copy.navHomeUrl || "/#home"} onClick={close}>{copy.navHome}</a>
          <a href={copy.navAboutUrl || "/#about"} onClick={close}>{copy.navAbout}</a>
          <a href={copy.navFeaturesUrl || "/#features"} onClick={close}>{copy.navFeatures}</a>
          <a href={copy.navContactUrl || "/#contact"} onClick={close}>{copy.navContact}</a>
          <Link to={copy.navLibraryUrl || "/library"} onClick={close}>{copy.navLibrary}</Link>
          <Link to={copy.navExamsUrl || "/exams"} onClick={close}>{copy.navExams}</Link>
          <Link to={copy.navAccountUrl || "/account"} onClick={close}>{copy.navAccount}</Link>
        </nav>
        <Link to="/admin" className="nav-admin"><LockKeyhole size={15} /> {copy.navAdmin}</Link>
      </div>
    </header>
  );
}

function Home() {
  const { copy } = useSiteCopy();
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
      setNotice({ kind: "error", text: copy.contactFailure });
    } else {
      setForm({ name: "", email: "", subject: "", message: "" });
      setNotice({ kind: "success", text: copy.contactSuccess });
    }
  }

  function renderCustomBlocks(placement) {
    if (copy.showCustomBlocks === false) return null;
    return (copy.customBlocks || []).filter(block => block.enabled !== false && block.placement === placement).map(block => (
      <section className="custom-site-section section-pad" key={block.id} id={"custom-" + block.id}>
        <div className="container custom-site-layout">
          {block.imageUrl && <img className="custom-site-image" src={block.imageUrl} alt={block.title || "صورة القسم"} />}
          <div className="custom-site-copy">
            {block.eyebrow && <span>{block.eyebrow}</span>}
            {block.title && <h2>{block.title}</h2>}
            {block.body && <p>{block.body}</p>}
            {block.buttonText && block.buttonUrl && <a className="button button-primary" href={block.buttonUrl}>{block.buttonText} <ArrowUpLeft size={16} /></a>}
          </div>
        </div>
      </section>
    ));
  }

  return (
    <>
      <Header />
      <main>
        {copy.showHero !== false && <section className="hero" id="home">
          <div className="hero-grid" />
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="container hero-inner">
            <div className="hero-copy">
              <div className="eyebrow"><span className="live-dot" /> {copy.heroEyebrow}</div>
              <h1>{copy.heroTitleLine1}<br /><em>{copy.heroTitleLine2}</em></h1>
              <p className="hero-lead">{copy.heroDescription}</p>
              <div className="hero-actions">
                <a className="button button-primary" href={copy.heroPrimaryUrl || "#about"}>{copy.heroPrimaryButton} <ArrowUpLeft size={18} /></a>
                <a className="button button-ghost" href={copy.heroSecondaryUrl || "#contact"}>{copy.heroSecondaryButton} <ArrowLeft size={17} /></a>
              </div>
              <div className="hero-note"><span className="note-line" /> {copy.heroNote}</div>
            </div>
            {copy.heroImageUrl ? (
              <div className="hero-art hero-art-image"><img src={copy.heroImageUrl} alt="" /></div>
            ) : <div className="hero-art" aria-hidden="true">
              <div className="art-glow" />
              <div className="art-ring ring-a" />
              <div className="art-ring ring-b" />
              <div className="art-card card-back"><span>IDEAS</span><b>01</b></div>
              <div className="art-card card-front">
                <div className="art-card-top"><span className="mini-mark" /> YOUR NEXT CHAPTER</div>
                <div className="art-symbol">مـ</div>
                <div className="art-card-bottom"><span>{copy.heroCardCaption}</span><ArrowUpLeft size={17} /></div>
              </div>
              <span className="art-star star-a">✳</span>
              <span className="art-star star-b">✳</span>
              <span className="art-caption">A PLACE TO BEGIN</span>
            </div>}
          </div>
          <div className="hero-bottom container">
            <span>{copy.heroBottomLeft}</span><span className="scroll-cue">{copy.heroBottomScroll} <span /></span><span>EST. 2026</span>
          </div>
        </section>}
        {renderCustomBlocks("afterHero")}

        {copy.showAbout !== false && <section className="intro-section section-pad" id="about">
          <div className="container intro-layout">
            <div className="section-kicker">{copy.aboutKicker}</div>
            <div className="intro-content">
              <h2>{copy.aboutTitleLine1}<br /><span>{copy.aboutTitleLine2}</span></h2>
              <div className="intro-bottom">
                <p>{copy.aboutDescription}</p>
                <a className="text-link" href={copy.aboutLinkUrl || "#features"}>{copy.aboutLink} <ArrowUpLeft size={18} /></a>
              </div>
            </div>
            {copy.aboutImageUrl && <img className="site-section-image about-image" src={copy.aboutImageUrl} alt="" />}
          </div>
        </section>}
        {renderCustomBlocks("afterAbout")}

        {copy.showFeatures !== false && <section className="features-section section-pad" id="features">
          <div className="container">
            <div className="section-heading">
              <div><div className="section-kicker">{copy.featuresKicker}</div><h2>{copy.featuresTitleLine1}<br /><span>{copy.featuresTitleLine2}</span></h2></div>
              <p>{copy.featuresDescription}</p>
            </div>
            {copy.featuresImageUrl && <img className="site-section-image features-image" src={copy.featuresImageUrl} alt="" />}
            <div className="feature-grid">
              {features.map(({ icon: Icon, number, titleKey, bodyKey, imageKey }) => (
                <article className="feature-card" key={number}>
                  <div className="feature-top"><span>{number}</span>{copy[imageKey] ? <img className="feature-custom-image" src={copy[imageKey]} alt="" /> : <Icon size={22} strokeWidth={1.6} />}</div>
                  <h3>{copy[titleKey]}</h3><p>{copy[bodyKey]}</p><div className="feature-rule" />
                </article>
              ))}
            </div>
          </div>
        </section>}
        {renderCustomBlocks("afterFeatures")}

        {renderCustomBlocks("beforeArticles")}
        {copy.showArticles !== false && (articles.length > 0 || loadingArticles) && (
          <section className="articles-section section-pad">
            <div className="container">
              <div className="section-kicker">{copy.articlesKicker}</div>
              <div className="articles-heading"><h2>{copy.articlesTitle}</h2><span>{copy.articlesSubtitle}</span></div>
              <div className="article-grid">
                {loadingArticles ? <p className="muted">جارٍ تحميل المحتوى...</p> : articles.map(article => (
                  <Link to={"/articles/" + article.slug} className="article-card article-card-link" key={article.id} aria-label={"قراءة المقال: " + article.title}>
                    <span className="article-tag">{copy.articleTag}</span><h3>{article.title}</h3>
                    <p>{article.excerpt || copy.articleFallback}</p>
                    <span className="article-read-more">{copy.articleReadMore} <ArrowUpLeft size={15} /></span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
        {renderCustomBlocks("beforeContact")}

        {copy.showContact !== false && <section className="contact-section section-pad" id="contact">
          <div className="container contact-layout">
            <div className="contact-copy">
              {copy.contactImageUrl && <img className="site-section-image contact-image" src={copy.contactImageUrl} alt="" />}
              <div className="section-kicker light">{copy.contactKicker}</div>
              <h2>{copy.contactTitleLine1}<br /><em>{copy.contactTitleLine2}</em></h2>
              <p>{copy.contactDescription}</p>
              <div className="contact-meta"><Mail size={17} /><span>{copy.contactMeta}</span></div>
            </div>
            <form className="contact-form" onSubmit={submitMessage}>
              <div className="form-row">
                <label>{copy.contactNameLabel}<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={copy.contactNamePlaceholder} /></label>
                <label>{copy.contactEmailLabel}<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" dir="ltr" /></label>
              </div>
              <label>{copy.contactSubjectLabel} <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder={copy.contactSubjectPlaceholder} /></label>
              <label>{copy.contactMessageLabel}<textarea required rows="4" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder={copy.contactMessagePlaceholder} /></label>
              {notice && <div className={"notice " + notice.kind}>{notice.text}</div>}
              <button className="button button-accent submit-button" disabled={sending}>{sending ? copy.contactSending : copy.contactSubmit} <Send size={17} /></button>
              {!supabaseReady && <span className="form-hint">الحفظ الفعلي سيتاح بعد ربط Supabase.</span>}
            </form>
          </div>
        </section>}
      </main>
      {copy.showFooter !== false && <footer className="site-footer">
        <div className="container footer-inner">
          <Link to="/" className="brand footer-brand">{copy.footerLogoUrl ? <img className="site-brand-image" src={copy.footerLogoUrl} alt={copy.brandName} /> : <span className="brand-mark"><span /></span>}<span className="brand-name">{copy.brandName}<small>{copy.brandTagline}</small></span></Link>
          <span>{copy.footerText}</span>
          <a href="#home" className="back-top">{copy.footerBackTop} <ArrowUpRight size={16} /></a>
        </div>
      </footer>}
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
            <label>{copy.accountUsername}<input type="text" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" autoComplete="username" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} dir="ltr" /></label>
            <label>{copy.accountPassword}<input type="password" required minLength={8} maxLength={72} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" /></label>
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
  const { copy } = useSiteCopy();
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
            ? copy.accountUsernameTaken
            : copy.accountAuthError),
        });
        return;
      }
      if (!data?.access_token || !data?.refresh_token) {
        setNotice({ kind: "success", text: copy.accountSignupCreated });
        setMode("login");
        setPassword("");
        return;
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) {
        setNotice({ kind: "error", text: copy.accountSessionStartError });
        return;
      }
      setSession(sessionData.session);
      if (sessionData.user) await loadProfile(sessionData.user);
      setPassword("");
      setNotice({
        kind: "success",
        text: action === "signup" ? copy.accountSignupSuccess : copy.accountLoginSuccess,
      });
    } catch (error) {
      console.error("Username authentication failed:", error);
      setNotice({ kind: "error", text: copy.accountConnectionError });
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
            <span className="admin-label">{copy.accountBrandSubtitle}</span>
            <h1>{session ? copy.accountWelcomeBack : mode === "signup" ? copy.accountSignupTitle : copy.accountLoginTitle}</h1>
            <p>{session ? copy.accountProfileDescription : copy.accountDescription}</p>
          </div>
          {loading ? (
            <div className="account-card"><p className="muted">{copy.accountChecking}</p></div>
          ) : session ? (
            <section className="account-card account-profile">
              <div className="account-avatar"><UserRound size={28} /></div>
              <span className="admin-label">{copy.accountLoggedInLabel}</span>
              <h2>{profile?.display_name || session.user.user_metadata?.full_name || "مرحبًا بك"}</h2>
              <p className="account-email" dir="ltr">@{profile?.username || session.user.user_metadata?.username || "user"}</p>
              <div className="account-role">{profile?.role === "admin" ? copy.accountAdminRole : copy.accountStudentRole}</div>
              <div className="account-actions">
                <Link to="/" className="button button-primary">{copy.accountReturnToSite} <ArrowLeft size={17} /></Link>
                <button className="button button-ghost-dark" onClick={signOut}><LogOut size={16} /> {copy.accountSignOut}</button>
              </div>
              {notice && <div className={"notice " + notice.kind}>{notice.text}</div>}
            </section>
          ) : (
            <section className="account-card">
              <div className="account-switch">
                <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setNotice(null); }}>{copy.accountSignupTab}</button>
                <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setNotice(null); }}>{copy.accountLoginTab}</button>
              </div>
              <form className="account-form" onSubmit={submitAuth}>
                {mode === "signup" && (
                  <label>{copy.accountFullName}
                    <input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder={copy.accountFullNamePlaceholder} />
                  </label>
                )}
                <label>{copy.accountUsernameLabel}
                  <input>
                    type="text"
                    required
                    minLength={3}
                    maxLength={24}
                    pattern="[A-Za-z0-9_]{3,24}"
                    autoComplete="username"
                    value={username}
                    onChange={e => { setUsername(e.target.value.toLowerCase()); setNotice(null); }}
                    placeholder={copy.accountUsernamePlaceholder}
                    dir="ltr"
                  />
                </label>
                <label>{copy.accountPasswordLabel}
                  <span className="password-field">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={copy.accountPasswordPlaceholder}
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </span>
                </label>
                {notice && <div className={"notice " + notice.kind}>{notice.text}</div>}
                <button className="button button-primary account-submit" type="submit" disabled={busy}>
                  {busy ? copy.accountBusy : mode === "signup" ? copy.accountCreateButton : copy.accountLoginButton}
                  {mode === "signup" ? <UserRound size={17} /> : <LogIn size={17} />}
                </button>
              </form>
            </section>
          )}
          <Link to="/" className="account-home-link"><ArrowLeft size={15} /> {copy.accountBackHome}</Link>
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
  return <NotFound />;
}

export default function App() {
  return <SiteCopyProvider><Routes><Route path="/" element={<SiteGate />} /><Route path="/account" element={<AccountPage />} /><Route path="/admin" element={<AdminPage />} /><Route path="/library" element={<LibraryPage />} /><Route path="/exams" element={<ExamsPage />} /><Route path="/exams/:examId" element={<ExamsPage />} /><Route path="/articles/:slug" element={<ArticlePage />} /><Route path="*" element={<NotFound />} /></Routes></SiteCopyProvider>;
}