import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowUpLeft, ArrowUpRight, Check, Clock3, FileText,
  Layers3, LayoutDashboard, LockKeyhole, Mail, Menu, MessageSquare,
  Plus, Send, Paperclip, ShieldCheck, Sparkles, X, LogOut, Trash2, Eye, EyeOff, UserRound, LogIn,
  BookOpen, FlaskConical, Library, ClipboardList
} from "lucide-react";
import { supabase, supabaseReady } from "./lib/supabase.js";
const AdminWorkspace = lazy(() => import("./AdminWorkspace.jsx"));
const LibraryPage = lazy(() => import("./StudentHub.jsx").then(module => ({ default: module.LibraryPage })));
const ExamsPage = lazy(() => import("./StudentHub.jsx").then(module => ({ default: module.ExamsPage })));
const ArticlePage = lazy(() => import("./ArticlePage.jsx"));
const LearningExperimentsPage = lazy(() => import("./LearningExperimentsPage.jsx"));
const ResearchProjectsPage = lazy(() => import("./ResearchProjectsPage.jsx"));
import { SiteCopyProvider, useSiteCopy } from "./siteCopy.js";

const features = [
  { icon: Layers3, number: "01", titleKey: "feature1Title", bodyKey: "feature1Body", imageKey: "feature1ImageUrl" },
  { icon: ShieldCheck, number: "02", titleKey: "feature2Title", bodyKey: "feature2Body", imageKey: "feature2ImageUrl" },
  { icon: Sparkles, number: "03", titleKey: "feature3Title", bodyKey: "feature3Body", imageKey: "feature3ImageUrl" },
];

const CONTACT_ATTACHMENT_BUCKET = "tay-contact-attachments";
const CONTACT_ATTACHMENT_MIME_BY_EXTENSION = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  ogg: "video/ogg",
};
const CONTACT_ATTACHMENT_MAX_FILES = 5;
const CONTACT_ATTACHMENT_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

function contactAttachmentMime(file) {
  const extension = String(file?.name || "").split(".").pop().toLowerCase();
  const byExtension = CONTACT_ATTACHMENT_MIME_BY_EXTENSION[extension];
  const allowed = Object.values(CONTACT_ATTACHMENT_MIME_BY_EXTENSION);
  return allowed.includes(file?.type) ? file.type : byExtension || "";
}

function formatAttachmentSize(bytes) {
  const size = Number(bytes) || 0;
  return size < 1024 * 1024
    ? Math.max(1, Math.round(size / 1024)) + " كيلوبايت"
    : (size / (1024 * 1024)).toFixed(1) + " ميجابايت";
}

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
          <a href={safeSiteHref(copy.navHomeUrl, "/#home")} onClick={close}>{copy.navHome}</a>
          <a href={safeSiteHref(copy.navAboutUrl, "/#about")} onClick={close}>{copy.navAbout}</a>
          <a href={safeSiteHref(copy.navFeaturesUrl, "/#features")} onClick={close}>{copy.navFeatures}</a>
          <a href={safeSiteHref(copy.navContactUrl, "/#contact")} onClick={close}>{copy.navContact}</a>
          <Link to={safeSiteHref(copy.navExperimentsUrl, "/experiments")} onClick={close}>{copy.navExperiments || "المواد والتجارب"}</Link>
          <Link to="/research" onClick={close}>مختبر التجارب</Link>
          <a href={safeSiteHref(copy.navLibraryUrl, "/library")} onClick={close}>{copy.navLibrary}</a>
          <a href={safeSiteHref(copy.navExamsUrl, "/exams")} onClick={close}>{copy.navExams}</a>
          <a href={safeSiteHref(copy.navAccountUrl, "/account")} onClick={close}>{copy.navAccount}</a>
        </nav>
        <Link to="/admin" className="nav-admin"><LockKeyhole size={15} /> {copy.navAdmin}</Link>
      </div>
    </header>
  );
}


function safeSiteHref(value, fallback = "#") {
  const href = String(value || "").trim();
  if (!href || href.startsWith("//")) return fallback;
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href) ? href : fallback;
}

function Home() {
  const { copy } = useSiteCopy();
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [attachments, setAttachments] = useState([]);
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

  function handleAttachmentSelection(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;

    const next = [...attachments, ...selected];
    if (next.length > CONTACT_ATTACHMENT_MAX_FILES) {
      setNotice({ kind: "error", text: "يمكن إرفاق 5 ملفات بحد أقصى في الرسالة الواحدة." });
      return;
    }

    const invalidFile = selected.find(file => !contactAttachmentMime(file));
    if (invalidFile) {
      setNotice({ kind: "error", text: "نوع الملف غير مدعوم. استخدم PDF أو صورة JPG/PNG/WEBP/GIF أو فيديو MP4/WEBM/MOV/OGG أو Word." });
      return;
    }

    const totalBytes = next.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > CONTACT_ATTACHMENT_MAX_TOTAL_BYTES) {
      setNotice({ kind: "error", text: "إجمالي حجم المرفقات لا يمكن أن يتجاوز 50 ميجابايت." });
      return;
    }

    setAttachments(next);
    setNotice(null);
  }

  async function submitMessage(event) {
    event.preventDefault();
    setNotice(null);
    if (!form.message.trim() && attachments.length === 0) {
      setNotice({ kind: "warning", text: "اكتب رسالتك أو أرفق ملفًا واحدًا على الأقل." });
      return;
    }
    if (!supabase) {
      setNotice({ kind: "warning", text: "نموذج التواصل جاهز، وسيبدأ حفظ الرسائل بعد ربط قاعدة بيانات Supabase." });
      return;
    }

    setSending(true);
    try {
      const randomId = () => window.crypto?.randomUUID?.()
        || (Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
      const submissionId = randomId();
      const uploadedAttachments = [];

      for (const file of attachments) {
        const mimeType = contactAttachmentMime(file);
        const safeName = file.name.normalize("NFKD")
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(-100) || "attachment";
        const path = "incoming/" + submissionId + "/" + randomId() + "-" + safeName;
        const { error: uploadError } = await supabase.storage
          .from(CONTACT_ATTACHMENT_BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: mimeType,
          });
        if (uploadError) throw new Error(uploadError.message || "تعذر رفع أحد المرفقات.");
        uploadedAttachments.push({
          path,
          file_name: file.name,
          mime_type: mimeType,
          file_size: file.size,
        });
      }

      const { error } = await supabase.from("messages").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || "رسالة من الموقع",
        message: form.message.trim(),
        attachments: uploadedAttachments,
      });
      if (error) throw error;

      setForm({ name: "", email: "", subject: "", message: "" });
      setAttachments([]);
      setNotice({ kind: "success", text: copy.contactSuccess });
    } catch (error) {
      console.error("Contact message submission failed:", error);
      setNotice({ kind: "error", text: error?.message || copy.contactFailure });
    } finally {
      setSending(false);
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
            {block.buttonText && block.buttonUrl && <a className="button button-primary" href={safeSiteHref(block.buttonUrl)}>{block.buttonText} <ArrowUpLeft size={16} /></a>}
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
                <a className="button button-primary" href={safeSiteHref(copy.heroPrimaryUrl, "#about")}>{copy.heroPrimaryButton} <ArrowUpLeft size={18} /></a>
                <a className="button button-ghost" href={safeSiteHref(copy.heroSecondaryUrl, "#contact")}>{copy.heroSecondaryButton} <ArrowLeft size={17} /></a>
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
                <a className="text-link" href={safeSiteHref(copy.aboutLinkUrl, "#features")}>{copy.aboutLink} <ArrowUpLeft size={18} /></a>
              </div>
            </div>
            {copy.aboutImageUrl && <img className="site-section-image about-image" src={copy.aboutImageUrl} alt="" />}
          </div>
        </section>}
        {renderCustomBlocks("afterAbout")}

        <section className="quick-access-section section-pad" id="learning">
          <div className="container">
            <div className="quick-access-heading">
              <div>
                <div className="section-kicker"><span>ابدأ من هنا</span> مساحة التعلم</div>
                <h2>كل أدوات رحلتك التعليمية <span>في مكان واحد</span></h2>
              </div>
              <p>اختار القسم اللي محتاجه، وهتوصل للمحتوى مباشرة من غير ما تدور بين صفحات الموقع.</p>
            </div>
            <div className="quick-access-grid">
              <Link to="/experiments" className="quick-access-card">
                <span className="quick-access-icon"><FlaskConical size={23}/></span>
                <span className="quick-access-number">01</span>
                <h3>المواد والتجارب</h3>
                <p>افتح الدروس، راجع القوانين، وجرّب المحاكاة التفاعلية بنفسك.</p>
                <span className="quick-access-link">استكشف المواد <ArrowUpLeft size={16}/></span>
              </Link>
              <Link to="/library" className="quick-access-card">
                <span className="quick-access-icon"><Library size={23}/></span>
                <span className="quick-access-number">02</span>
                <h3>المكتبة التعليمية</h3>
                <p>كل الملفات والمراجع والصور والفيديوهات في مساحة واحدة مرتبة.</p>
                <span className="quick-access-link">افتح المكتبة <ArrowUpLeft size={16}/></span>
              </Link>
              <Link to="/exams" className="quick-access-card">
                <span className="quick-access-icon"><ClipboardList size={23}/></span>
                <span className="quick-access-number">03</span>
                <h3>الامتحانات</h3>
                <p>اختبر فهمك، حل الأسئلة، وتابع نتيجتك بعد انتهاء المحاولة.</p>
                <span className="quick-access-link">ابدأ التدريب <ArrowUpLeft size={16}/></span>
              </Link>
              <Link to="/account" className="quick-access-card">
                <span className="quick-access-icon"><BookOpen size={23}/></span>
                <span className="quick-access-number">04</span>
                <h3>حساب الطالب</h3>
                <p>احتفظ بسجل إنجازاتك وتابع تقدمك في رحلتك التعليمية.</p>
                <span className="quick-access-link">افتح حسابك <ArrowUpLeft size={16}/></span>
              </Link>
            </div>
          </div>
        </section>

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
        {copy.showArticles !== false && (
          <section className="articles-section section-pad">
            <div className="container">
              <div className="section-kicker">{copy.articlesKicker}</div>
              <div className="articles-heading"><h2>{copy.articlesTitle}</h2><span>{copy.articlesSubtitle}</span></div>
              <div className="article-grid">
                {loadingArticles ? <p className="muted">جارٍ تحميل المحتوى...</p> : articles.length === 0 ? <p className="muted">{copy.articlesEmpty}</p> : articles.map(article => (
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
                <label>{copy.contactEmailLabel}<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={copy.contactEmailPlaceholder} dir="ltr" /></label>
              </div>
              <label>{copy.contactSubjectLabel} <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder={copy.contactSubjectPlaceholder} /></label>
              <label>{copy.contactMessageLabel}<textarea required={attachments.length === 0} rows="4" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder={copy.contactMessagePlaceholder} /></label>
              <div className="contact-attachments-field">
                <label className="contact-attachment-picker">
                  <Paperclip size={18} />
                  <span>إرفاق ملفات أو صور أو فيديو</span>
                  <small>PDF · صور · فيديو · Word، حتى 5 ملفات وبإجمالي 50 ميجابايت</small>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.mp4,.webm,.mov,.ogg,application/pdf,image/jpeg,image/png,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/webm,video/quicktime,video/ogg"
                    onChange={handleAttachmentSelection}
                  />
                </label>
                {attachments.length > 0 && (
                  <div className="contact-selected-attachments">
                    {attachments.map((file, index) => (
                      <div className="contact-selected-attachment" key={index}>
                        <span>{file.name}<small>{formatAttachmentSize(file.size)}</small></span>
                        <button type="button" onClick={() => setAttachments(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={"إزالة " + file.name}><X size={15} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
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
    const { data: profile } = await supabase.from("profiles").select("role,username").eq("id", user.id).maybeSingle();
    const normalizedUsername = String(profile?.username || "").trim().toLowerCase();
    const staffRole = profile?.role === "admin" || profile?.role === "moderator";
    setRole(profile?.role ?? "member");
    setIsMasterAdmin(profile?.role === "admin" && normalizedUsername === "syznstwr");
    if (!staffRole) return;
    const [{ data: posts }, { data: inbox }] = await Promise.all([
      supabase.from("articles").select("id,title,slug,is_published,created_at").order("created_at", { ascending: false }),
      supabase.from("messages").select("id,name,email,subject,message,attachments,status,created_at").order("created_at", { ascending: false }).limit(50),
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
      if (!nextSession) { setRole(null); setIsMasterAdmin(false); setArticles([]); setMessages([]); }
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
      ) : role !== "admin" && role !== "moderator" ? (
        <div className="admin-message"><div className="admin-icon"><ShieldCheck size={25} /></div><h1>الحساب ليس حساب إدارة.</h1><p>تم تسجيل الدخول، لكن هذا الحساب لا يملك صلاحية إدارة الموقع. اطلب من المدير الرئيسي تعيينه مشرفًا.</p><button className="button button-ghost-dark" onClick={signOut}>تسجيل الخروج</button></div>
      ) : (
        <AdminWorkspace session={session} isMasterAdmin={isMasterAdmin} staffRole={role} />
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

      // Notify the site administrator only after an actual successful signup, never on login.
      if (action === "signup" && sessionData.session?.access_token) {
        try {
          const notifyResponse = await fetch("/api/telegram-signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + sessionData.session.access_token,
            },
            body: "{}",
          });
          const notifyResult = await notifyResponse.json().catch(() => ({}));
          if (!notifyResponse.ok || notifyResult.ok !== true) {
            console.warn("[telegram-signup] notification was not delivered", notifyResult.error || notifyResponse.status);
          }
        } catch (notifyError) {
          console.warn("[telegram-signup] notification request failed", notifyError?.name || "Error");
        }
      }

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
              <div className="account-role">{profile?.role === "admin" ? "المدير الرئيسي" : profile?.role === "moderator" ? "مشرف Tay Space" : copy.accountStudentRole}</div>
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
                  <input
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
                {mode === "signup" && <p className="form-hint account-telegram-note">عند إنشاء الحساب، يصل إلى إدارة Tay Space إشعار باسم المستخدم والاسم ونوع الجهاز ونظام التشغيل والمتصفح. لا يتضمن إشعار تيليجرام عنوان IP.</p>}
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
  const { copy } = useSiteCopy();
  return <div className="not-found"><span>404</span><h1>{copy.notFoundTitle}</h1><Link to="/" className="button button-primary">{copy.notFoundBack} <ArrowLeft size={17} /></Link></div>;
}

export default function App() {
  return <SiteCopyProvider><Routes>
    <Route path="/" element={<SiteGate />} />
    <Route path="/account" element={<AccountPage />} />
    <Route path="/admin" element={<Suspense fallback={<div className="admin-message" role="status">جارٍ تحميل لوحة الإدارة...</div>}><AdminPage /></Suspense>} />
    <Route path="/library" element={<Suspense fallback={<div className="admin-message" role="status">جارٍ تحميل المكتبة...</div>}><LibraryPage /></Suspense>} />
    <Route path="/exams" element={<Suspense fallback={<div className="admin-message" role="status">جارٍ تحميل الامتحانات...</div>}><ExamsPage /></Suspense>} />
    <Route path="/exams/:examId" element={<Suspense fallback={<div className="admin-message" role="status">جارٍ تحميل الامتحان...</div>}><ExamsPage /></Suspense>} />
    <Route path="/experiments" element={<Suspense fallback={<div className="admin-message" role="status">جارٍ تحميل المواد والتجارب...</div>}><LearningExperimentsPage /></Suspense>} />
    <Route path="/experiments/:slug" element={<Suspense fallback={<div className="admin-message" role="status">جارٍ تحميل التجربة...</div>}><LearningExperimentsPage /></Suspense>} />
    <Route path="/lessons/:lessonSlug" element={<Suspense fallback={<div className="admin-message" role="status">جارٍ تحميل الدرس...</div>}><LearningExperimentsPage /></Suspense>} />
    <Route path="/research" element={<Suspense fallback={<div className="admin-message" role="status">جارٍ تحميل مختبر التجارب...</div>}><ResearchProjectsPage /></Suspense>} />
    <Route path="/research/:subjectSlug" element={<Suspense fallback={<div className="admin-message" role="status">جارٍ تحميل محاكاة التجربة...</div>}><ResearchProjectsPage /></Suspense>} />
    <Route path="/interactive-physics" element={<Navigate to="/experiments" replace />} />
    <Route path="/articles/:slug" element={<Suspense fallback={<div className="admin-message" role="status">جارٍ تحميل المقال...</div>}><ArticlePage /></Suspense>} />
    <Route path="*" element={<NotFound />} />
  </Routes></SiteCopyProvider>;
}