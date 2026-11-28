import { useCallback, useEffect, useState } from "react";
import {
  FileText, Image as ImageIcon, BookOpen, ClipboardList, MessageSquare,
  Plus, Pencil, Trash2, Eye, EyeOff, Upload, ExternalLink, Save, X,
  Clock3, CheckCircle2, AlertCircle, File, Link as LinkIcon, ArrowRight,
  RotateCw, ListChecks, Users
} from "lucide-react";
import { supabase } from "./lib/supabase.js";
import "./admin-content.css";
import SiteContentEditor from "./SiteContentEditor.jsx";

const BUCKET = "tay-assets";
const TABS = [
  { id: "articles", label: "المقالات", icon: FileText },
  { id: "library", label: "المكتبة والملفات", icon: BookOpen },
  { id: "exams", label: "الامتحانات", icon: ClipboardList },
  { id: "messages", label: "الرسائل", icon: MessageSquare },
  { id: "site", label: "محرر الموقع", icon: ImageIcon },
];

const EMPTY_ARTICLE = { id: null, title: "", excerpt: "", content: "", cover_url: "", is_published: false };
const EMPTY_RESOURCE = { id: null, title: "", description: "", resource_type: "pdf", category: "عام", external_url: "", file_path: "", file_name: "", is_published: false };
const EMPTY_EXAM = { id: null, title: "", description: "", duration_minutes: 30, cover_image_url: "" };
const EMPTY_QUESTION = { id: null, prompt: "", question_type: "mcq", options_text: "", correct_answer: "", points: 1, image_url: "" };

function slugFor(title) {
  const normalized = title.toLowerCase().trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 45);
  return (normalized || "article") + "-" + Date.now().toString(36);
}

function publicFileUrl(path) {
  if (!path) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function humanSize(size) {
  if (!size) return "";
  return size < 1024 * 1024 ? Math.round(size / 1024) + " KB" : (size / (1024 * 1024)).toFixed(1) + " MB";
}

function Alert({ value }) {
  if (!value) return null;
  return <div className={"hub-alert " + (value.kind || "error")}><AlertCircle size={16} />{value.text}</div>;
}

function FilePicker({ file, onChange, accept = ".pdf,.doc,.docx,image/*", label = "اختر ملفًا من جهازك" }) {
  return (
    <label className="hub-file-picker">
      <Upload size={18} />
      <span>{file ? file.name : label}</span>
      <small>{file ? humanSize(file.size) : "PDF أو صور أو مستندات، حتى 50 ميجابايت"}</small>
      <input type="file" accept={accept} onChange={e => onChange(e.target.files?.[0] || null)} />
    </label>
  );
}

export default function AdminWorkspace({ session }) {
  const [tab, setTab] = useState("articles");
  const [articles, setArticles] = useState([]);
  const [resources, setResources] = useState([]);
  const [exams, setExams] = useState([]);
  const [messages, setMessages] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState(null);

  const [articleDraft, setArticleDraft] = useState(EMPTY_ARTICLE);
  const [articleCover, setArticleCover] = useState(null);
  const [resourceDraft, setResourceDraft] = useState(EMPTY_RESOURCE);
  const [resourceFile, setResourceFile] = useState(null);
  const [examDraft, setExamDraft] = useState(EMPTY_EXAM);
  const [examCoverFile, setExamCoverFile] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionDraft, setQuestionDraft] = useState(EMPTY_QUESTION);
  const [questionImageFile, setQuestionImageFile] = useState(null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingExam, setEditingExam] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [articleResult, resourceResult, examResult, messageResult, attemptResult] = await Promise.all([
      supabase.from("articles").select("id,title,slug,excerpt,content,cover_url,is_published,published_at,created_at").order("created_at", { ascending: false }),
      supabase.from("learning_resources").select("id,title,description,resource_type,file_path,file_name,mime_type,file_size,external_url,category,is_published,created_at").order("created_at", { ascending: false }),
      supabase.from("exams").select("id,title,description,duration_minutes,cover_image_url,is_published,created_at").order("created_at", { ascending: false }),
      supabase.from("messages").select("id,name,email,subject,message,status,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("exam_attempts").select("id,exam_id,user_id,score,max_score,submitted_at").order("submitted_at", { ascending: false }).limit(200),
    ]);
    const firstError = articleResult.error || resourceResult.error || examResult.error || messageResult.error || attemptResult.error;
    if (firstError) setAlert({ kind: "error", text: "تعذر تحميل بعض بيانات اللوحة. حدّث الصفحة، وإذا استمرت المشكلة راجع صلاحيات قاعدة البيانات." });
    setArticles(articleResult.data || []);
    setResources(resourceResult.data || []);
    setExams(examResult.data || []);
    setMessages(messageResult.data || []);
    setAttempts(attemptResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function uploadAsset(file, folder) {
    if (!file) return null;
    if (file.size > 50 * 1024 * 1024) throw new Error("حجم الملف أكبر من الحد الأقصى (50 ميجابايت).");
    const allowed = [
      "application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) throw new Error("نوع الملف غير مدعوم. استخدم PDF أو صورة أو Word.");
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "file";
    const path = folder + "/" + Date.now() + "-" + safeName;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    return path;
  }

  function resetArticle() {
    setArticleDraft(EMPTY_ARTICLE);
    setArticleCover(null);
  }

  function editArticle(article) {
    setArticleDraft({ ...article });
    setArticleCover(null);
    setAlert(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveArticle(publish) {
    if (!articleDraft.title.trim()) return setAlert({ kind: "error", text: "اكتب عنوان المقال أولًا." });
    setBusy(true); setAlert(null);
    try {
      let coverUrl = articleDraft.cover_url || null;
      if (articleCover) {
        const path = await uploadAsset(articleCover, "article-covers");
        coverUrl = publicFileUrl(path);
      }
      const values = {
        title: articleDraft.title.trim(),
        slug: articleDraft.slug || slugFor(articleDraft.title),
        excerpt: articleDraft.excerpt.trim(),
        content: articleDraft.content.trim(),
        cover_url: coverUrl,
        is_published: publish || articleDraft.is_published,
        published_at: publish ? new Date().toISOString() : articleDraft.published_at || null,
        created_by: articleDraft.id ? undefined : session.user.id,
      };
      const result = articleDraft.id
        ? await supabase.from("articles").update(values).eq("id", articleDraft.id)
        : await supabase.from("articles").insert(values);
      if (result.error) throw result.error;
      resetArticle(); await loadAll();
      setAlert({ kind: "success", text: publish ? "تم حفظ المقال ونشره." : "تم حفظ المقال كمسودة." });
    } catch (error) {
      setAlert({ kind: "error", text: error.message || "تعذر حفظ المقال." });
    } finally { setBusy(false); }
  }

  async function removeArticle(article) {
    if (!window.confirm("حذف المقال «" + article.title + "»؟")) return;
    const { error } = await supabase.from("articles").delete().eq("id", article.id);
    if (error) setAlert({ kind: "error", text: "تعذر حذف المقال." });
    else { await loadAll(); setAlert({ kind: "success", text: "تم حذف المقال." }); }
  }

  async function toggleArticle(article) {
    const next = !article.is_published;
    const { error } = await supabase.from("articles").update({
      is_published: next, published_at: next ? new Date().toISOString() : null,
    }).eq("id", article.id);
    if (error) setAlert({ kind: "error", text: "تعذر تغيير حالة النشر." });
    else { await loadAll(); setAlert({ kind: "success", text: next ? "تم نشر المقال." : "تم إلغاء نشر المقال." }); }
  }

  function resetResource() { setResourceDraft(EMPTY_RESOURCE); setResourceFile(null); }

  function editResource(resource) {
    setResourceDraft({ ...resource });
    setResourceFile(null);
    setAlert(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveResource(event) {
    event.preventDefault();
    if (!resourceDraft.title.trim()) return setAlert({ kind: "error", text: "اكتب اسم الملف أو المورد." });
    if (resourceDraft.resource_type === "link" && !/^https:\/\//i.test(resourceDraft.external_url.trim())) {
      return setAlert({ kind: "error", text: "أدخل رابطًا يبدأ بـ https://." });
    }
    if (resourceDraft.resource_type !== "link" && !resourceFile && !resourceDraft.file_path) {
      return setAlert({ kind: "error", text: "اختر ملفًا من جهازك أولًا." });
    }
    setBusy(true); setAlert(null);
    let newPath = null;
    try {
      if (resourceFile) newPath = await uploadAsset(resourceFile, "library");
      const values = {
        title: resourceDraft.title.trim(),
        description: resourceDraft.description.trim(),
        resource_type: resourceDraft.resource_type,
        category: resourceDraft.category.trim() || "عام",
        external_url: resourceDraft.resource_type === "link" ? resourceDraft.external_url.trim() : null,
        file_path: resourceDraft.resource_type === "link" ? null : (newPath || resourceDraft.file_path),
        file_name: resourceDraft.resource_type === "link" ? null : (resourceFile?.name || resourceDraft.file_name),
        mime_type: resourceDraft.resource_type === "link" ? null : (resourceFile?.type || resourceDraft.mime_type),
        file_size: resourceDraft.resource_type === "link" ? null : (resourceFile?.size || resourceDraft.file_size),
        is_published: resourceDraft.is_published,
        created_by: resourceDraft.id ? undefined : session.user.id,
      };
      const result = resourceDraft.id
        ? await supabase.from("learning_resources").update(values).eq("id", resourceDraft.id)
        : await supabase.from("learning_resources").insert(values);
      if (result.error) throw result.error;
      if (newPath && resourceDraft.file_path) await supabase.storage.from(BUCKET).remove([resourceDraft.file_path]);
      resetResource(); await loadAll();
      setAlert({ kind: "success", text: "تم حفظ المورد في المكتبة." });
    } catch (error) {
      if (newPath) await supabase.storage.from(BUCKET).remove([newPath]);
      setAlert({ kind: "error", text: error.message || "تعذر حفظ المورد." });
    } finally { setBusy(false); }
  }

  async function removeResource(resource) {
    if (!window.confirm("حذف «" + resource.title + "» من المكتبة؟")) return;
    if (resource.file_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([resource.file_path]);
      if (storageError) return setAlert({ kind: "error", text: "تعذر حذف الملف من التخزين." });
    }
    const { error } = await supabase.from("learning_resources").delete().eq("id", resource.id);
    if (error) setAlert({ kind: "error", text: "تعذر حذف سجل المورد." });
    else { await loadAll(); setAlert({ kind: "success", text: "تم حذف المورد." }); }
  }

  async function toggleResource(resource) {
    const { error } = await supabase.from("learning_resources").update({ is_published: !resource.is_published }).eq("id", resource.id);
    if (error) setAlert({ kind: "error", text: "تعذر تغيير حالة المورد." });
    else await loadAll();
  }

  async function loadQuestions(examId) {
    const [questionResult, answerResult] = await Promise.all([
      supabase.from("exam_questions").select("id,exam_id,prompt,question_type,options,points,sort_order,image_url").eq("exam_id", examId).order("sort_order").order("created_at"),
      supabase.from("exam_answer_keys").select("question_id,correct_answer"),
    ]);
    if (questionResult.error || answerResult.error) {
      setAlert({ kind: "error", text: "تعذر تحميل أسئلة الامتحان." });
      return;
    }
    const answers = new Map((answerResult.data || []).map(row => [row.question_id, row.correct_answer]));
    setQuestions((questionResult.data || []).map(q => ({ ...q, correct_answer: answers.get(q.id) || "" })));
  }

  async function saveExam(event) {
    event.preventDefault();
    if (!examDraft.title.trim()) return setAlert({ kind: "error", text: "اكتب اسم الامتحان." });
    setBusy(true);
    setAlert(null);
    let uploadedPath = null;
    try {
      let coverImageUrl = examDraft.cover_image_url || null;
      if (examCoverFile) {
        uploadedPath = await uploadAsset(examCoverFile, "exam-covers");
        coverImageUrl = publicFileUrl(uploadedPath);
      }
      const values = {
        title: examDraft.title.trim(),
        description: examDraft.description.trim(),
        duration_minutes: Number(examDraft.duration_minutes) || 30,
        cover_image_url: coverImageUrl,
        created_by: examDraft.id ? undefined : session.user.id,
      };
      const result = examDraft.id
        ? await supabase.from("exams").update(values).eq("id", examDraft.id).select().single()
        : await supabase.from("exams").insert(values).select().single();
      if (result.error) throw result.error;
      setSelectedExam(result.data);
      setEditingExam(false);
      setExamDraft({ ...EMPTY_EXAM });
      setExamCoverFile(null);
      await loadQuestions(result.data.id);
      await loadAll();
      setAlert({ kind: "success", text: examDraft.id ? "تم تحديث بيانات الامتحان." : "تم إنشاء الامتحان. أضف أسئلته الآن." });
    } catch (error) {
      if (uploadedPath) await supabase.storage.from(BUCKET).remove([uploadedPath]);
      setAlert({ kind: "error", text: error.message || "تعذر حفظ الامتحان." });
    } finally {
      setBusy(false);
    }
  }

  function openExam(exam) {
    setSelectedExam(exam);
    setExamDraft({ id: exam.id, title: exam.title, description: exam.description || "", duration_minutes: exam.duration_minutes, cover_image_url: exam.cover_image_url || "" });
    setExamCoverFile(null);
    setEditingExam(false);
    setQuestionDraft(EMPTY_QUESTION);
    setEditingQuestionId(null);
    loadQuestions(exam.id);
    setAlert(null);
  }

  function editExamDetails() {
    if (!selectedExam) return;
    setExamDraft({ id: selectedExam.id, title: selectedExam.title, description: selectedExam.description || "", duration_minutes: selectedExam.duration_minutes, cover_image_url: selectedExam.cover_image_url || "" });
    setExamCoverFile(null);
    setEditingExam(true);
  }

  async function saveQuestion(event) {
    event.preventDefault();
    if (!selectedExam) return;
    if (!questionDraft.prompt.trim() || !questionDraft.correct_answer.trim()) {
      return setAlert({ kind: "error", text: "اكتب نص السؤال والإجابة الصحيحة." });
    }
    let options = [];
    if (questionDraft.question_type === "mcq") {
      options = questionDraft.options_text.split("\n").map(v => v.trim()).filter(Boolean);
      if (options.length < 2) return setAlert({ kind: "error", text: "أضف اختيارين على الأقل، كل اختيار في سطر." });
      if (!options.includes(questionDraft.correct_answer.trim())) return setAlert({ kind: "error", text: "الإجابة الصحيحة يجب أن تطابق أحد الاختيارات." });
    } else if (questionDraft.question_type === "true_false") {
      options = ["صحيح", "خطأ"];
    }
    setBusy(true); setAlert(null);
    const values = {
      exam_id: selectedExam.id,
      prompt: questionDraft.prompt.trim(),
      question_type: questionDraft.question_type,
      options,
      points: Math.max(1, Math.min(100, Number(questionDraft.points) || 1)),
      sort_order: editingQuestionId ? (questions.find(q => q.id === editingQuestionId)?.sort_order ?? questions.length) : questions.length,
    };
    let questionId = editingQuestionId;
    let questionError = null;
    if (editingQuestionId) {
      const result = await supabase.from("exam_questions").update(values).eq("id", editingQuestionId);
      questionError = result.error;
    } else {
      const result = await supabase.from("exam_questions").insert(values).select("id").single();
      questionError = result.error;
      questionId = result.data?.id;
    }
    if (!questionError && questionId) {
      const keyResult = await supabase.from("exam_answer_keys").upsert({
        question_id: questionId,
        correct_answer: questionDraft.correct_answer.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "question_id" });
      questionError = keyResult.error;
    }
    setBusy(false);
    if (questionError) {
      setAlert({ kind: "error", text: questionError.message || "تعذر حفظ السؤال." });
      return;
    }
    setQuestionDraft(EMPTY_QUESTION);
    setEditingQuestionId(null);
    await loadQuestions(selectedExam.id);
    await loadAll();
    setAlert({ kind: "success", text: editingQuestionId ? "تم تعديل السؤال." : "تمت إضافة السؤال." });
  }

  function editQuestion(question) {
    setEditingQuestionId(question.id);
    setQuestionDraft({
      id: question.id,
      prompt: question.prompt,
      question_type: question.question_type,
      options_text: (question.options || []).join("\n"),
      correct_answer: question.correct_answer,
      points: question.points,
    });
    setAlert(null);
  }

  async function removeQuestion(question) {
    if (!window.confirm("حذف هذا السؤال؟")) return;
    const { error } = await supabase.from("exam_questions").delete().eq("id", question.id);
    if (error) setAlert({ kind: "error", text: "تعذر حذف السؤال." });
    else { await loadQuestions(selectedExam.id); await loadAll(); }
  }

  async function toggleExam(exam) {
    if (!exam.is_published) {
      const { count, error: countError } = await supabase.from("exam_questions").select("id", { count: "exact", head: true }).eq("exam_id", exam.id);
      if (countError || !count) return setAlert({ kind: "error", text: "أضف سؤالًا واحدًا على الأقل قبل نشر الامتحان." });
    }
    const { error } = await supabase.from("exams").update({ is_published: !exam.is_published }).eq("id", exam.id);
    if (error) setAlert({ kind: "error", text: "تعذر تحديث حالة الامتحان." });
    else { await loadAll(); setAlert({ kind: "success", text: exam.is_published ? "تم إلغاء نشر الامتحان." : "الامتحان أصبح متاحًا للطلاب." }); }
  }

  async function removeExam(exam) {
    if (!window.confirm("حذف الامتحان وأسئلته ومحاولاته؟")) return;
    const { error } = await supabase.from("exams").delete().eq("id", exam.id);
    if (error) setAlert({ kind: "error", text: "تعذر حذف الامتحان." });
    else {
      if (selectedExam?.id === exam.id) { setSelectedExam(null); setQuestions([]); }
      await loadAll();
    }
  }

  async function updateMessage(message, status) {
    const { error } = await supabase.from("messages").update({ status }).eq("id", message.id);
    if (error) setAlert({ kind: "error", text: "تعذر تحديث الرسالة." });
    else await loadAll();
  }

  async function removeMessage(message) {
    if (!window.confirm("حذف الرسالة؟")) return;
    const { error } = await supabase.from("messages").delete().eq("id", message.id);
    if (error) setAlert({ kind: "error", text: "تعذر حذف الرسالة." });
    else await loadAll();
  }

  const selectedAttempts = selectedExam ? attempts.filter(a => a.exam_id === selectedExam.id) : [];

  return (
    <div className="hub-dashboard">
      <div className="hub-page-heading">
        <div><span className="admin-label">إدارة Tay Space</span><h1>مركز إدارة المحتوى</h1><p>أضف وعدّل وانشر المحتوى والملفات والاختبارات من مكان واحد.</p></div>
        <button className="hub-refresh" onClick={loadAll} title="تحديث البيانات"><RotateCw size={17} /></button>
      </div>
      <div className="hub-stats">
        <div><FileText /><span>المقالات</span><strong>{articles.length}</strong></div>
        <div><BookOpen /><span>ملفات المكتبة</span><strong>{resources.length}</strong></div>
        <div><ClipboardList /><span>الامتحانات</span><strong>{exams.length}</strong></div>
        <div><Users /><span>محاولات الامتحان</span><strong>{attempts.length}</strong></div>
      </div>
      <nav className="hub-tabs">
        {TABS.map(item => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setTab(item.id); setAlert(null); }}><item.icon size={16} />{item.label}</button>)}
      </nav>
      <Alert value={alert} />

      {loading ? <div className="hub-empty">جارٍ تحميل بيانات لوحة الإدارة...</div> : null}

      {!loading && tab === "articles" && (
        <div className="hub-columns">
          <form className="hub-panel hub-editor" onSubmit={e => { e.preventDefault(); saveArticle(false); }}>
            <div className="hub-panel-heading"><h2>{articleDraft.id ? "تعديل المقال" : "كتابة مقال جديد"}</h2>{articleDraft.id && <button type="button" className="hub-icon-btn" onClick={resetArticle}><X size={17} /></button>}</div>
            <label>عنوان المقال<input required value={articleDraft.title} onChange={e => setArticleDraft({ ...articleDraft, title: e.target.value })} placeholder="اكتب عنوانًا واضحًا" /></label>
            <label>وصف مختصر<textarea rows="2" value={articleDraft.excerpt} onChange={e => setArticleDraft({ ...articleDraft, excerpt: e.target.value })} placeholder="ملخص يظهر في صفحة الموقع" /></label>
            <label>محتوى المقال<textarea rows="9" value={articleDraft.content} onChange={e => setArticleDraft({ ...articleDraft, content: e.target.value })} placeholder="اكتب المقال أو الدرس هنا..." /></label>
            <div className="hub-subtitle">صورة غلاف (اختياري)</div>
            {articleDraft.cover_url && !articleCover && <img className="hub-cover-preview" src={articleDraft.cover_url} alt="غلاف المقال الحالي" />}
            <FilePicker file={articleCover} onChange={setArticleCover} accept="image/png,image/jpeg,image/webp,image/gif" label="ارفع صورة الغلاف" />
            <div className="hub-form-actions">
              <button className="hub-primary" disabled={busy}><Save size={16} />{busy ? "جارٍ الحفظ..." : "حفظ مسودة"}</button>
              <button type="button" className="hub-secondary" disabled={busy} onClick={() => saveArticle(true)}><Eye size={16} />حفظ ونشر</button>
            </div>
          </form>
          <section className="hub-panel">
            <div className="hub-panel-heading"><h2>المقالات ({articles.length})</h2></div>
            {articles.length === 0 ? <div className="hub-empty">لم تضف مقالات بعد. ابدأ بكتابة أول مقال.</div> : articles.map(article => (
              <div className="hub-row" key={article.id}>
                {article.cover_url ? <img src={article.cover_url} alt="" /> : <div className="hub-row-icon"><FileText size={19} /></div>}
                <div className="hub-row-main"><strong>{article.title}</strong><small>{article.is_published ? "منشور" : "مسودة"}</small></div>
                <div className="hub-row-actions"><button onClick={() => editArticle(article)} title="تعديل"><Pencil size={16} /></button><button onClick={() => toggleArticle(article)} title={article.is_published ? "إخفاء" : "نشر"}>{article.is_published ? <EyeOff size={16} /> : <Eye size={16} />}</button><button onClick={() => removeArticle(article)} title="حذف"><Trash2 size={16} /></button></div>
              </div>
            ))}
          </section>
        </div>
      )}

      {!loading && tab === "library" && (
        <div className="hub-columns">
          <form className="hub-panel hub-editor" onSubmit={saveResource}>
            <div className="hub-panel-heading"><h2>{resourceDraft.id ? "تعديل مورد" : "إضافة ملف إلى المكتبة"}</h2>{resourceDraft.id && <button type="button" className="hub-icon-btn" onClick={resetResource}><X size={17} /></button>}</div>
            <label>اسم الملف أو المورد<input required value={resourceDraft.title} onChange={e => setResourceDraft({ ...resourceDraft, title: e.target.value })} placeholder="مثال: ملخص الوحدة الأولى" /></label>
            <label>وصف مختصر<textarea rows="2" value={resourceDraft.description} onChange={e => setResourceDraft({ ...resourceDraft, description: e.target.value })} placeholder="ماذا سيجد الطالب داخل الملف؟" /></label>
            <div className="hub-form-grid">
              <label>نوع المورد<select value={resourceDraft.resource_type} onChange={e => setResourceDraft({ ...resourceDraft, resource_type: e.target.value })}><option value="pdf">كتاب أو ملف PDF</option><option value="image">صورة</option><option value="document">مستند Word</option><option value="link">رابط خارجي</option></select></label>
              <label>القسم<input value={resourceDraft.category} onChange={e => setResourceDraft({ ...resourceDraft, category: e.target.value })} placeholder="الفيزياء، الكيمياء..." /></label>
            </div>
            {resourceDraft.resource_type === "link" ? <label>الرابط الخارجي<input type="url" required value={resourceDraft.external_url} onChange={e => setResourceDraft({ ...resourceDraft, external_url: e.target.value })} placeholder="https://..." dir="ltr" /></label> : <>
              {resourceDraft.file_path && !resourceFile && <div className="hub-current-file"><File size={16} />{resourceDraft.file_name || "الملف الحالي"}<a href={publicFileUrl(resourceDraft.file_path)} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a></div>}
              <FilePicker file={resourceFile} onChange={setResourceFile} accept={resourceDraft.resource_type === "image" ? "image/*" : resourceDraft.resource_type === "pdf" ? ".pdf,application/pdf" : ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"} label="اختر ملفًا من هاتفك أو الكمبيوتر" />
            </>}
            <label className="hub-check"><input type="checkbox" checked={resourceDraft.is_published} onChange={e => setResourceDraft({ ...resourceDraft, is_published: e.target.checked })} />نشر المورد للطلاب فور الحفظ</label>
            <div className="hub-form-actions"><button className="hub-primary" disabled={busy}><Upload size={16} />{busy ? "جارٍ الرفع والحفظ..." : "حفظ في المكتبة"}</button><button type="button" className="hub-secondary" onClick={resetResource}>تفريغ</button></div>
          </form>
          <section className="hub-panel">
            <div className="hub-panel-heading"><h2>مكتبة الملفات ({resources.length})</h2></div>
            {resources.length === 0 ? <div className="hub-empty">المكتبة فارغة. أضف أول كتاب أو صورة.</div> : resources.map(resource => (
              <div className="hub-row" key={resource.id}>
                <div className="hub-row-icon">{resource.resource_type === "image" ? <ImageIcon size={19} /> : resource.resource_type === "link" ? <LinkIcon size={19} /> : <FileText size={19} />}</div>
                <div className="hub-row-main"><strong>{resource.title}</strong><small>{resource.category} · {resource.is_published ? "منشور" : "مخفي"}{resource.file_size ? " · " + humanSize(resource.file_size) : ""}</small></div>
                <div className="hub-row-actions">{resource.file_path && <a href={publicFileUrl(resource.file_path)} target="_blank" rel="noreferrer" title="فتح الملف"><ExternalLink size={16} /></a>}<button onClick={() => editResource(resource)} title="تعديل"><Pencil size={16} /></button><button onClick={() => toggleResource(resource)} title="تغيير النشر">{resource.is_published ? <EyeOff size={16} /> : <Eye size={16} />}</button><button onClick={() => removeResource(resource)} title="حذف"><Trash2 size={16} /></button></div>
              </div>
            ))}
          </section>
        </div>
      )}

      {!loading && tab === "exams" && (
        <div className="hub-exams-layout">
          <section className="hub-panel">
            <div className="hub-panel-heading"><h2>إدارة الامتحانات</h2><button className="hub-small-add" onClick={() => { setExamDraft(EMPTY_EXAM); setSelectedExam(null); setQuestions([]); setEditingExam(true); setQuestionDraft(EMPTY_QUESTION); }}><Plus size={15} />امتحان جديد</button></div>
            {exams.length === 0 ? <div className="hub-empty">لم تنشئ امتحانات بعد.</div> : exams.map(exam => (
              <div className={"hub-exam-row " + (selectedExam?.id === exam.id ? "selected" : "")} key={exam.id}>
                <button className="hub-exam-select" onClick={() => openExam(exam)}><strong>{exam.title}</strong><small>{exam.duration_minutes} دقيقة · {attempts.filter(a => a.exam_id === exam.id).length} محاولة · {exam.is_published ? "منشور" : "مسودة"}</small></button>
                <div className="hub-row-actions"><button onClick={() => toggleExam(exam)} title={exam.is_published ? "إيقاف النشر" : "نشر"}>{exam.is_published ? <EyeOff size={16} /> : <Eye size={16} />}</button><button onClick={() => removeExam(exam)} title="حذف"><Trash2 size={16} /></button></div>
              </div>
            ))}
          </section>

          <section className="hub-panel hub-exam-editor">
            {!selectedExam && !editingExam ? <div className="hub-empty hub-empty-tall"><ClipboardList size={30} /><strong>اختر امتحانًا أو أنشئ امتحانًا جديدًا</strong><span>بعد الإنشاء، أضف الأسئلة وحدد الإجابات الصحيحة ثم انشره للطلاب.</span></div> : editingExam ? (
              <form className="hub-editor" onSubmit={saveExam}>
                <div className="hub-panel-heading"><h2>{examDraft.id ? "تعديل بيانات الامتحان" : "إنشاء امتحان جديد"}</h2><button type="button" className="hub-icon-btn" onClick={() => { setEditingExam(false); if (!examDraft.id) setSelectedExam(null); }}><X size={17} /></button></div>
                <label>اسم الامتحان<input required value={examDraft.title} onChange={e => setExamDraft({ ...examDraft, title: e.target.value })} placeholder="امتحان الوحدة الأولى" /></label>
                <label>تعليمات أو وصف<textarea rows="3" value={examDraft.description} onChange={e => setExamDraft({ ...examDraft, description: e.target.value })} placeholder="اكتب تعليمات الامتحان..." /></label>
                <label>مدة الامتحان بالدقائق<input type="number" min="1" max="300" required value={examDraft.duration_minutes} onChange={e => setExamDraft({ ...examDraft, duration_minutes: e.target.value })} /></label>
                <button className="hub-primary" disabled={busy}><Save size={16} />حفظ بيانات الامتحان</button>
              </form>
            ) : selectedExam && (
              <>
                <div className="hub-panel-heading"><div><h2>{selectedExam.title}</h2><small>{questions.length} سؤال · {selectedExam.duration_minutes} دقيقة</small></div><button className="hub-secondary compact" onClick={editExamDetails}><Pencil size={15} /> تعديل</button></div>
                <form className="hub-question-form" onSubmit={saveQuestion}>
                  <h3>{editingQuestionId ? "تعديل السؤال" : "إضافة سؤال"}</h3>
                  <label>نص السؤال<textarea rows="3" required value={questionDraft.prompt} onChange={e => setQuestionDraft({ ...questionDraft, prompt: e.target.value })} placeholder="اكتب السؤال بوضوح..." /></label>
                  <div className="hub-form-grid">
                    <label>نوع السؤال<select value={questionDraft.question_type} onChange={e => setQuestionDraft({ ...questionDraft, question_type: e.target.value, options_text: e.target.value === "true_false" ? "صحيح\nخطأ" : "" })}><option value="mcq">اختيار من متعدد</option><option value="true_false">صح أو خطأ</option><option value="short_answer">إجابة قصيرة</option></select></label>
                    <label>الدرجة<input type="number" min="1" max="100" value={questionDraft.points} onChange={e => setQuestionDraft({ ...questionDraft, points: e.target.value })} /></label>
                  </div>
                  {questionDraft.question_type === "mcq" && <label>الاختيارات (كل اختيار في سطر)<textarea rows="4" required value={questionDraft.options_text} onChange={e => setQuestionDraft({ ...questionDraft, options_text: e.target.value })} placeholder={"الاختيار الأول\nالاختيار الثاني\nالاختيار الثالث\nالاختيار الرابع"} /></label>}
                  {questionDraft.question_type === "true_false" && <label>الإجابة الصحيحة<select value={questionDraft.correct_answer} onChange={e => setQuestionDraft({ ...questionDraft, correct_answer: e.target.value })}><option value="">اختر الإجابة</option><option value="صحيح">صحيح</option><option value="خطأ">خطأ</option></select></label>}
                  {questionDraft.question_type !== "true_false" && <label>الإجابة الصحيحة<input required value={questionDraft.correct_answer} onChange={e => setQuestionDraft({ ...questionDraft, correct_answer: e.target.value })} placeholder={questionDraft.question_type === "mcq" ? "اكتب نص الاختيار الصحيح كما هو" : "الإجابة التي سيصحح النظام بناءً عليها"} /></label>}
                  <div className="hub-form-actions"><button className="hub-primary" disabled={busy}><Plus size={16} />{editingQuestionId ? "حفظ التعديل" : "إضافة السؤال"}</button>{editingQuestionId && <button type="button" className="hub-secondary" onClick={() => { setEditingQuestionId(null); setQuestionDraft(EMPTY_QUESTION); }}>إلغاء</button>}</div>
                </form>
                <div className="hub-question-list"><h3><ListChecks size={17} /> أسئلة الامتحان</h3>
                  {questions.length === 0 ? <p className="hub-muted">أضف السؤال الأول للبدء.</p> : questions.map((q,index) => <div className="hub-question-row" key={q.id}><div><strong>{index+1}. {q.prompt}</strong><small>{q.question_type === "mcq" ? "اختيار من متعدد" : q.question_type === "true_false" ? "صح أو خطأ" : "إجابة قصيرة"} · {q.points} درجة</small></div><div className="hub-row-actions"><button onClick={() => editQuestion(q)} title="تعديل السؤال"><Pencil size={16} /></button><button onClick={() => removeQuestion(q)} title="حذف السؤال"><Trash2 size={16} /></button></div></div>)}
                </div>
                <div className="hub-attempts"><h3>نتائج الطلاب ({selectedAttempts.length})</h3>{selectedAttempts.length === 0 ? <p className="hub-muted">لا توجد محاولات مسجلة لهذا الامتحان حتى الآن.</p> : selectedAttempts.slice(0,12).map(attempt => <div key={attempt.id}><span>{new Date(attempt.submitted_at).toLocaleString("ar-EG")}</span><strong>{attempt.score} / {attempt.max_score}</strong></div>)}</div>
                <div className="hub-publish-note"><CheckCircle2 size={16} /> بعد الانتهاء من الأسئلة، استخدم زر النشر بجوار اسم الامتحان ليظهر للطلاب.</div>
              </>
            )}
          </section>
        </div>
      )}

      {!loading && tab === "site" && <SiteContentEditor />}

      {!loading && tab === "messages" && (
        <section className="hub-panel">
          <div className="hub-panel-heading"><h2>صندوق الرسائل ({messages.length})</h2></div>
          {messages.length === 0 ? <div className="hub-empty">لا توجد رسائل واردة.</div> : messages.map(message => (
            <article className="hub-message" key={message.id}>
              <div className="hub-message-top"><strong>{message.subject}</strong><small>{new Date(message.created_at).toLocaleString("ar-EG")}</small></div>
              <p>{message.message}</p>
              <div className="hub-message-bottom"><span>{message.name} · {message.email}</span><div><select value={message.status} onChange={e => updateMessage(message,e.target.value)}><option value="new">جديدة</option><option value="read">مقروءة</option><option value="archived">مؤرشفة</option></select><button onClick={() => removeMessage(message)} title="حذف الرسالة"><Trash2 size={15} /></button></div></div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
