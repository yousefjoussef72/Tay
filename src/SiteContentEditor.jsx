import { useMemo, useState } from "react";
import {
  Save, RotateCcw, ImagePlus, Upload, Trash2, Plus, Eye, EyeOff,
  ArrowUp, ArrowDown, ExternalLink, Layers3, Type, Image as ImageIcon,
  AlertCircle, CheckCircle2
} from "lucide-react";
import {
  SITE_COPY_GROUPS, SITE_MEDIA_FIELDS, SITE_SECTION_FIELDS,
  DEFAULT_SITE_COPY, useSiteCopy
} from "./siteCopy.js";
import "./site-content-editor.css";

const BUCKET = "tay-assets";
const PLACEMENTS = [
  { value: "afterHero", label: "بعد الواجهة الرئيسية" },
  { value: "afterAbout", label: "بعد قسم التعريف" },
  { value: "afterFeatures", label: "بعد قسم المميزات" },
  { value: "beforeArticles", label: "قبل المقالات" },
  { value: "beforeContact", label: "قبل التواصل" },
];

function safeImageUrl(value) {
  return /^https:\/\//i.test(String(value || "").trim());
}

function ImageAssetEditor({ field, value, onChange }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload() {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP أو GIF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("حجم الصورة أكبر من 20 ميجابايت.");
      return;
    }
    setBusy(true);
    setError("");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-90) || "image";
    const path = "site-content/" + Date.now() + "-" + safeName;
    const { error: uploadError } = await window.__taySupabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      cacheControl: "3600",
      contentType: file.type,
    });
    setBusy(false);
    if (uploadError) {
      setError(uploadError.message || "تعذر رفع الصورة.");
      return;
    }
    const url = window.__taySupabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    onChange(url);
    setFile(null);
  }

  return (
    <div className="site-editor-media">
      <div className="site-editor-field-head">
        <strong>{field.label}</strong>
        <small>{field.description}</small>
      </div>
      {value && safeImageUrl(value) ? (
        <div className="site-editor-image-preview">
          <img src={value} alt={field.label} />
          <button type="button" onClick={() => onChange("")}><Trash2 size={15} /> إزالة الصورة</button>
        </div>
      ) : null}
      <label className="site-editor-file">
        <ImagePlus size={18} />
        <span>{file ? file.name : "اختر صورة من جهازك"}</span>
        <small>{file ? (file.size / 1024 / 1024).toFixed(1) + " MB" : "JPG · PNG · WEBP · GIF، بحد أقصى 20 MB"}</small>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => { setFile(event.target.files?.[0] || null); setError(""); }} />
      </label>
      <button type="button" className="site-editor-upload" disabled={!file || busy} onClick={upload}>
        <Upload size={15} /> {busy ? "جارٍ رفع الصورة..." : "رفع واستخدام الصورة"}
      </button>
      {error && <small className="site-editor-error">{error}</small>}
      <label className="site-editor-url-field">أو رابط صورة مباشر
        <input type="url" value={value || ""} onChange={event => onChange(event.target.value)} placeholder="https://..." dir="ltr" />
      </label>
    </div>
  );
}

function newBlock() {
  return {
    id: "block-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
    eyebrow: "قسم جديد",
    title: "",
    body: "",
    imageUrl: "",
    buttonText: "",
    buttonUrl: "",
    placement: "afterFeatures",
    enabled: true,
  };
}

export default function SiteContentEditor() {
  const { copy, saveCopy, loaded } = useSiteCopy();
  const [draft, setDraft] = useState(copy);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [activeGroup, setActiveGroup] = useState("واجهة الموقع");
  const [activeBlock, setActiveBlock] = useState(null);

  // Keep the editor in sync after a fresh settings load, but do not overwrite unsaved work.
  useMemo(() => {
    if (!dirty) setDraft(copy);
    return null;
  }, [copy, dirty]);

  function update(key, value) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setDirty(true);
    setStatus(null);
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    const { error } = await saveCopy(draft);
    setBusy(false);
    if (error) {
      setStatus({ kind: "error", text: "لم تُحفظ التغييرات. تأكد من اتصالك وصلاحية حساب الإدارة." });
    } else {
      setDirty(false);
      setStatus({ kind: "success", text: "تم حفظ ونشر إعدادات الموقع. ستظهر التغييرات للزوار مباشرةً." });
    }
  }

  function resetDraft() {
    if (!window.confirm("إعادة كل نصوص الموقع وصوره وأقسامه إلى الإعدادات الافتراضية؟ لن يتم حذف المقالات أو الكتب أو الامتحانات.")) return;
    setDraft({ ...DEFAULT_SITE_COPY, customBlocks: [] });
    setDirty(true);
    setStatus({ kind: "warning", text: "هذه معاينة للإعدادات الافتراضية. اضغط حفظ لتطبيقها على الموقع." });
  }

  function addBlock() {
    const block = newBlock();
    const blocks = [...(draft.customBlocks || []), block];
    update("customBlocks", blocks);
    setActiveBlock(block.id);
  }

  function changeBlock(id, key, value) {
    update("customBlocks", (draft.customBlocks || []).map(block => block.id === id ? { ...block, [key]: value } : block));
  }

  function deleteBlock(id) {
    if (!window.confirm("حذف هذا القسم من الموقع؟")) return;
    update("customBlocks", (draft.customBlocks || []).filter(block => block.id !== id));
    if (activeBlock === id) setActiveBlock(null);
  }

  function moveBlock(id, direction) {
    const blocks = [...(draft.customBlocks || [])];
    const index = blocks.findIndex(block => block.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return;
    [blocks[index], blocks[nextIndex]] = [blocks[nextIndex], blocks[index]];
    update("customBlocks", blocks);
  }

  const groups = useMemo(() => [
    { title: "واجهة الموقع", fields: [] },
    ...SITE_COPY_GROUPS,
    { title: "الصور والهوية البصرية", fields: [] },
    { title: "الأقسام والظهور", fields: [] },
    { title: "الأقسام التي أنشأتها", fields: [] },
  ], []);

  const blocks = draft.customBlocks || [];

  if (!loaded) return <div className="site-editor-loading">جارٍ تحميل إعدادات الموقع...</div>;

  return (
    <div className="site-content-editor">
      <div className="site-editor-header">
        <div>
          <span className="admin-label">تحكم كامل في المحتوى</span>
          <h2>محرر الموقع</h2>
          <p>عدّل النصوص والصور والأقسام، وراجع تغييراتك قبل حفظها.</p>
        </div>
        <div className="site-editor-actions">
          <button type="button" className="site-editor-reset" onClick={resetDraft}><RotateCcw size={15} /> الافتراضي</button>
          <button type="button" className="hub-primary" onClick={save} disabled={!dirty || busy}><Save size={16} /> {busy ? "جارٍ الحفظ..." : "حفظ ونشر التغييرات"}</button>
        </div>
      </div>

      {status && <div className={"site-editor-status " + status.kind}>{status.kind === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{status.text}</div>}
      <div className="site-editor-workspace">
        <aside className="site-editor-sidebar">
          {groups.map(group => <button key={group.title} type="button" className={activeGroup === group.title ? "active" : ""} onClick={() => setActiveGroup(group.title)}>
            {group.title === "الصور والهوية البصرية" ? <ImageIcon size={15} /> : group.title === "الأقسام والظهور" ? <Eye size={15} /> : group.title === "الأقسام التي أنشأتها" ? <Layers3 size={15} /> : <Type size={15} />}
            <span>{group.title}</span>
          </button>)}
        </aside>

        <section className="site-editor-panel">
          {activeGroup === "واجهة الموقع" && <div className="site-editor-intro">
            <h3>ماذا يمكنك إدارته؟</h3>
            <div className="site-editor-intro-grid">
              <article><Type size={19} /><strong>النصوص والعبارات</strong><p>العناوين، الأوصاف، أسماء الأزرار، والقوائم في الصفحات العامة وصفحة الحساب.</p></article>
              <article><ImageIcon size={19} /><strong>الصور والهوية</strong><p>الشعار، صور البداية، وصور الأقسام والبطاقات التي تصنعها.</p></article>
              <article><Layers3 size={19} /><strong>الأقسام والمحتوى</strong><p>إظهار وإخفاء الأقسام، وإنشاء أقسام إضافية وترتيبها.</p></article>
            </div>
            <p className="site-editor-tip">المقالات والكتب والملفات والامتحانات لها تبويبات مستقلة داخل لوحة الإدارة، وتظل جميعها محفوظة عند تغيير نصوص الموقع.</p>
            <button type="button" className="hub-secondary" onClick={() => setActiveGroup(SITE_COPY_GROUPS[0].title)}>ابدأ بتعديل النصوص</button>
          </div>}

          {SITE_COPY_GROUPS.some(group => group.title === activeGroup) && (() => {
            const group = SITE_COPY_GROUPS.find(item => item.title === activeGroup);
            return <div className="site-editor-copy-group">
              <h3>{group.title}</h3>
              {group.description && <p>{group.description}</p>}
              <div className="site-editor-fields">
                {group.fields.map(field => <label className="site-editor-copy-field" key={field.key}>
                  <span>{field.label}</span>
                  {field.multiline
                    ? <textarea rows={3} value={draft[field.key] ?? field.value} onChange={event => update(field.key, event.target.value)} />
                    : <input value={draft[field.key] ?? field.value} onChange={event => update(field.key, event.target.value)} />}
                </label>)}
              </div>
            </div>;
          })()}

          {activeGroup === "الصور والهوية البصرية" && <div className="site-editor-copy-group">
            <h3>صور الموقع</h3>
            <p>ارفع الصور بنفسك أو ضع رابط صورة مباشر. الصور التي ترفعها تُحفظ في تخزين الموقع وتُستخدم بعد النشر.</p>
            <div className="site-editor-media-grid">
              {SITE_MEDIA_FIELDS.map(field => <ImageAssetEditor key={field.key} field={field} value={draft[field.key] || ""} onChange={value => update(field.key, value)} />)}
            </div>
          </div>}

          {activeGroup === "الأقسام والظهور" && <div className="site-editor-copy-group">
            <h3>الأقسام الظاهرة للزوار</h3>
            <p>يمكنك إخفاء قسم مؤقتًا دون حذف محتواه أو مقالاته.</p>
            <div className="site-editor-toggles">
              {SITE_SECTION_FIELDS.map(field => <label key={field.key} className="site-editor-toggle">
                <span><strong>{field.label}</strong><small>{field.description}</small></span>
                <input type="checkbox" checked={draft[field.key] !== false} onChange={event => update(field.key, event.target.checked)} />
              </label>)}
            </div>
          </div>}

          {activeGroup === "الأقسام التي أنشأتها" && <div className="site-editor-copy-group">
            <div className="site-editor-block-head"><div><h3>أقسام مخصصة</h3><p>أنشئ بانرًا أو قسمًا بمحتوى وصورة ورابط، ثم حدّد مكان ظهوره.</p></div><button type="button" className="hub-small-add" onClick={addBlock}><Plus size={15} /> إضافة قسم</button></div>
            <div className="site-editor-block-layout">
              <div className="site-editor-block-list">
                {blocks.length === 0 ? <div className="hub-empty">لم تُنشئ أقسامًا إضافية بعد.</div> : blocks.map((block, index) => <div className={"site-editor-block-row " + (activeBlock === block.id ? "active" : "")} key={block.id}>
                  <button type="button" className="site-editor-block-select" onClick={() => setActiveBlock(block.id)}><strong>{block.title || "قسم بدون عنوان"}</strong><small>{PLACEMENTS.find(item => item.value === block.placement)?.label || "مكان غير محدد"}</small></button>
                  <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={index === 0} title="تحريك لأعلى"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={index === blocks.length - 1} title="تحريك لأسفل"><ArrowDown size={14} /></button>
                  <button type="button" onClick={() => changeBlock(block.id, "enabled", !block.enabled)} title="إظهار أو إخفاء">{block.enabled ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                  <button type="button" onClick={() => deleteBlock(block.id)} title="حذف"><Trash2 size={14} /></button>
                </div>)}
              </div>
              {activeBlock && blocks.some(block => block.id === activeBlock) && (() => {
                const block = blocks.find(item => item.id === activeBlock);
                const field = (label, key, multiline = false, placeholder = "") => <label className="site-editor-copy-field"><span>{label}</span>{multiline ? <textarea rows={3} value={block[key] || ""} placeholder={placeholder} onChange={event => changeBlock(block.id, key, event.target.value)} /> : <input value={block[key] || ""} placeholder={placeholder} onChange={event => changeBlock(block.id, key, event.target.value)} />}</label>;
                return <div className="site-editor-block-form">
                  <h4>إعداد القسم</h4>
                  {field("عبارة صغيرة أعلى القسم", "eyebrow")}
                  {field("عنوان القسم", "title", false, "اكتب عنوان القسم")}
                  {field("المحتوى أو الوصف", "body", true, "اكتب النص الذي سيظهر للزائر")}
                  {field("نص الزر", "buttonText", false, "اختياري")}
                  {field("رابط الزر", "buttonUrl", false, "/library أو https://...")}
                  <label className="site-editor-copy-field"><span>مكان ظهور القسم</span><select value={block.placement || "afterFeatures"} onChange={event => changeBlock(block.id, "placement", event.target.value)}>{PLACEMENTS.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
                  <label className="site-editor-toggle"><span><strong>إظهار القسم</strong><small>يمكنك إخفاؤه دون حذفه.</small></span><input type="checkbox" checked={block.enabled !== false} onChange={event => changeBlock(block.id, "enabled", event.target.checked)} /></label>
                  <ImageAssetEditor field={{ label: "صورة القسم", description: "اختياري. تظهر مع العنوان والوصف." }} value={block.imageUrl || ""} onChange={value => changeBlock(block.id, "imageUrl", value)} />
                </div>;
              })()}
            </div>
          </div>}
        </section>
      </div>

      <div className="site-editor-preview">
        <div><span>معاينة سريعة</span><h3>{draft.heroTitleLine1 || "عنوان الواجهة"} {draft.heroTitleLine2 || ""}</h3><p>{draft.heroDescription || "وصف الموقع"}</p></div>
        {draft.heroImageUrl && safeImageUrl(draft.heroImageUrl) && <img src={draft.heroImageUrl} alt="معاينة الواجهة" />}
      </div>
    </div>
  );
}
