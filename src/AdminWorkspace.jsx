import { useCallback, useEffect, useState } from "react";
import {
  FileText, Image as ImageIcon, BookOpen, ClipboardList, MessageSquare, Video,
  Plus, Pencil, Trash2, Eye, EyeOff, Upload, ExternalLink, Save, X,
  Clock3, CheckCircle2, AlertCircle, File, Link as LinkIcon, ArrowRight,
  RotateCw, ListChecks, Users, Sparkles, WandSparkles, Award, FlaskConical
} from "lucide-react";
import { supabase } from "./lib/supabase.js";
import "./admin-content.css";
import SiteContentEditor from "./SiteContentEditor.jsx";
import LearningStudioAdmin from "./LearningStudioAdmin.jsx";

const BUCKET = "tay-assets";
const LIBRARY_BUCKET = "tay-library";
const CONTACT_BUCKET = "tay-contact-attachments";
const TABS = [
  { id: "articles", label: "المقالات", icon: FileText },
  { id: "library", label: "المكتبة والملفات", icon: BookOpen },
  { id: "exams", label: "الامتحانات", icon: ClipboardList },
  { id: "results", label: "نتائج الطلاب", icon: Award },
  { id: "moderators", label: "إدارة المشرفين", icon: Users },
  { id: "messages", label: "الرسائل", icon: MessageSquare },
  { id: "studio", label: "المواد والتجارب", icon: FlaskConical },
  { id: "site", label: "محرر الموقع", icon: ImageIcon },
];

const EMPTY_ARTICLE = { id: null, title: "", excerpt: "", content: "", cover_url: "", track_id: "", subject_id: "", grade_level: "", curriculum_year: "", is_published: false };
const EMPTY_RESOURCE = { id: null, title: "", description: "", resource_type: "pdf", category: "عام", subject_id: "", unit_id: "", lesson_id: "", external_url: "", file_path: "", file_name: "", is_published: false };
const EMPTY_EXAM = { id: null, title: "", description: "", duration_minutes: 30, cover_image_url: "", track_id: "", subject_id: "", grade_level: "", curriculum_year: "" };
const EMPTY_QUESTION = { id: null, prompt: "", question_type: "mcq", options_text: "", correct_answer: "", grading_mode: "ai", grading_rubric: "", points: 1, image_url: "" };

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

function isSafeContactAttachmentPath(value) {
  const parts = String(value || "").split("/");
  return parts.length === 3
    && parts[0] === "incoming"
    && /^[A-Za-z0-9-]{8,80}$/.test(parts[1])
    && /^[A-Za-z0-9-]{8,80}-[A-Za-z0-9._-]{1,100}$/.test(parts[2]);
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
      <small>{file ? humanSize(file.size) : "PDF أو صور أو Word أو فيديو، حتى 50 ميجابايت"}</small>
      <input type="file" accept={accept} onChange={e => onChange(e.target.files?.[0] || null)} />
    </label>
  );
}

export default function AdminWorkspace({ session, isMasterAdmin = false }) {
  const [tab, setTab] = useState("articles");
  const [articles, setArticles] = useState([]);
  const [resources, setResources] = useState([]);
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);
  const [curriculumTracks, setCurriculumTracks] = useState([]);
  const [curriculumUnits, setCurriculumUnits] = useState([]);
  const [curriculumLessons, setCurriculumLessons] = useState([]);
  const [exams, setExams] = useState([]);
  const [messages, setMessages] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState(null);
  const [openingAttachment, setOpeningAttachment] = useState(null);

  const [articleDraft, setArticleDraft] = useState(EMPTY_ARTICLE);
  const [articleCover, setArticleCover] = useState(null);
  const [resourceDraft, setResourceDraft] = useState(EMPTY_RESOURCE);
  const [resourceFile, setResourceFile] = useState(null);
  const [resourcePreviewUrl, setResourcePreviewUrl] = useState("");
  const [examDraft, setExamDraft] = useState(EMPTY_EXAM);
  const [examCoverFile, setExamCoverFile] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionDraft, setQuestionDraft] = useState(EMPTY_QUESTION);
  const [questionImageFile, setQuestionImageFile] = useState(null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingExam, setEditingExam] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiSubject, setAiSubject] = useState("");
  const [aiLevel, setAiLevel] = useState("");
  const [aiCount, setAiCount] = useState(8);
  const [aiDifficulty, setAiDifficulty] = useState("mixed");
  const [aiQuestionTypes, setAiQuestionTypes] = useState(["mcq", "true_false", "short_answer", "essay"]);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [savingGenerated, setSavingGenerated] = useState(false);
  const [gradingAttemptId, setGradingAttemptId] = useState(null);
  const [manualGradeAttemptId, setManualGradeAttemptId] = useState(null);
  const [manualGradeDraft, setManualGradeDraft] = useState({ score: "", feedback: "" });
  const [resultsExamFilter, setResultsExamFilter] = useState("all");
  const [moderators, setModerators] = useState([]);
  const [moderatorsLoading, setModeratorsLoading] = useState(false);
  const [moderatorCreating, setModeratorCreating] = useState(false);
  const [removingModeratorId, setRemovingModeratorId] = useState(null);
  const [moderatorDraft, setModeratorDraft] = useState({ display_name: "", username: "", password: "" });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [articleResult, resourceResult, subjectResult, trackResult, unitResult, lessonResult, examResult, messageResult, attemptResult, manualQuestionResult] = await Promise.all([
      supabase.from("articles").select("id,title,slug,excerpt,content,cover_url,track_id,subject_id,grade_level,curriculum_year,is_published,published_at,created_at").order("created_at", { ascending: false }),
      supabase.from("learning_resources").select("id,title,description,resource_type,file_path,file_name,mime_type,file_size,external_url,category,subject_id,unit_id,lesson_id,is_published,created_at").order("created_at", { ascending: false }),
      supabase.from("learning_subjects").select("id,name,sort_order,track_id,curriculum_year,grade_level,subject_kind").order("curriculum_year").order("sort_order").order("name"),
      supabase.from("learning_tracks").select("id,name,slug,sort_order").order("sort_order"),
      supabase.from("learning_units").select("id,subject_id,title,sort_order").order("sort_order").order("title"),
      supabase.from("learning_lessons").select("id,unit_id,title,sort_order").order("sort_order").order("title"),
      supabase.from("exams").select("id,title,description,duration_minutes,cover_image_url,track_id,subject_id,grade_level,curriculum_year,is_published,created_at").order("created_at", { ascending: false }),
      supabase.from("messages").select("id,name,email,subject,message,attachments,status,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("exam_attempts").select("id,exam_id,user_id,answers,score,max_score,objective_score,ai_essay_score,manual_essay_score,manual_feedback,ai_feedback,grading_status,ai_graded_at,ai_model,submitted_at").order("submitted_at", { ascending: false }).limit(500),
      supabase.from("exam_questions").select("exam_id,points").eq("question_type", "essay").eq("grading_mode", "manual"),
    ]);
    const attemptRows = attemptResult.data || [];
    setCurriculumSubjects(subjectResult.data || []);
    setCurriculumTracks(trackResult.data || []);
    setCurriculumUnits(unitResult.data || []);
    setCurriculumLessons(lessonResult.data || []);
    const userIds = [...new Set(attemptRows.map(attempt => attempt.user_id).filter(Boolean))];
    const profileResult = userIds.length
      ? await supabase.from("profiles").select("id,display_name,username").in("id", userIds)
      : { data: [], error: null };
    const profileMap = new Map((profileResult.data || []).map(profile => [profile.id, profile]));
    const examMap = new Map((examResult.data || []).map(exam => [exam.id, exam.title]));
    const manualMaxByExam = new Map();
    (manualQuestionResult.data || []).forEach(question => manualMaxByExam.set(
      question.exam_id,
      (manualMaxByExam.get(question.exam_id) || 0) + (Number(question.points) || 0)
    ));
    const firstError = articleResult.error || resourceResult.error || subjectResult.error || trackResult.error || unitResult.error || lessonResult.error || examResult.error || messageResult.error || attemptResult.error || profileResult.error || manualQuestionResult.error;
    if (firstError) setAlert({ kind: "error", text: "تعذر تحميل بعض بيانات اللوحة. حدّث الصفحة، وإذا استمرت المشكلة راجع صلاحيات قاعدة البيانات." });
    setArticles(articleResult.data || []);
    setResources(resourceResult.data || []);
    setCurriculumSubjects(subjectResult.data || []);
    setCurriculumTracks(trackResult.data || []);
    setCurriculumUnits(unitResult.data || []);
    setCurriculumLessons(lessonResult.data || []);
    setExams(examResult.data || []);
    setMessages(messageResult.data || []);
    setAttempts(attemptRows.map(attempt => {
      const profile = profileMap.get(attempt.user_id);
      return {
        ...attempt,
        student_name: profile?.display_name || "اسم غير مسجل",
        student_username: profile?.username || "بدون اسم مستخدم",
        exam_title: examMap.get(attempt.exam_id) || "امتحان محذوف",
        manual_max_score: manualMaxByExam.get(attempt.exam_id) || 0,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function loadModerators() {
    if (!isMasterAdmin) return;
    setModeratorsLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-moderators", {
      body: { action: "list" },
    });
    if (error || !data?.ok) {
      setAlert({ kind: "error", text: data?.message || "تعذر تحميل قائمة المشرفين." });
    } else {
      setModerators(data.moderators || []);
    }
    setModeratorsLoading(false);
  }

  useEffect(() => {
    if (isMasterAdmin) loadModerators();
  }, [isMasterAdmin]);

  async function createModerator(event) {
    event.preventDefault();
    if (!isMasterAdmin) return;
    const displayName = moderatorDraft.display_name.trim();
    const username = moderatorDraft.username.trim().toLowerCase();
    const password = moderatorDraft.password;
    if (displayName.length < 2 || !/^[a-z0-9_]{3,24}$/.test(username) || password.length < 8 || password.length > 72) {
      return setAlert({ kind: "error", text: "راجع الاسم واسم المستخدم وكلمة المرور. اسم المستخدم 3 إلى 24 حرفًا، وكلمة المرور 8 أحرف على الأقل." });
    }
    setModeratorCreating(true);
    setAlert(null);
    try {
      const { data, error } = await supabase.functions.invoke("manage-moderators", {
        body: {
          action: "create",
          display_name: displayName,
          username,
          password,
        },
      });
      if (error || !data?.ok) throw new Error(data?.message || "تعذر إنشاء حساب المشرف.");
      setModeratorDraft({ display_name: "", username: "", password: "" });
      await loadModerators();
      setAlert({ kind: "success", text: "تم إنشاء حساب المشرف وتعيين صلاحيات لوحة الإدارة له." });
    } catch (error) {
      setAlert({ kind: "error", text: error.message || "تعذر إنشاء المشرف." });
    } finally {
      setModeratorCreating(false);
    }
  }

  async function removeModerator(moderator) {
    if (!isMasterAdmin) return;
    if (!window.confirm("سحب صلاحية الإشراف من @" + moderator.username + "؟ سيظل الحساب موجودًا كحساب طالب، ولن تُحذف بياناته.")) return;
    setRemovingModeratorId(moderator.id);
    setAlert(null);
    try {
      const { data, error } = await supabase.functions.invoke("manage-moderators", {
        body: { action: "remove", moderator_id: moderator.id },
      });
      if (error || !data?.ok) throw new Error(data?.message || "تعذر سحب صلاحية الإشراف.");
      await loadModerators();
      setAlert({ kind: "success", text: "تم سحب صلاحية المشرف. الحساب نفسه لم يُحذف." });
    } catch (error) {
      setAlert({ kind: "error", text: error.message || "تعذر سحب صلاحية الإشراف." });
    } finally {
      setRemovingModeratorId(null);
    }
  }

  async function uploadAsset(file, folder, targetBucket = BUCKET) {
    if (!file) return null;
    if (file.size > 50 * 1024 * 1024) throw new Error("حجم الملف أكبر من الحد الأقصى (50 ميجابايت).");
    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const libraryTypes = [
      ...imageTypes,
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/ogg",
    ];
    const allowed = targetBucket === LIBRARY_BUCKET ? libraryTypes : imageTypes;
    if (!allowed.includes(file.type)) {
      throw new Error(targetBucket === LIBRARY_BUCKET
        ? "نوع الملف غير مدعوم. استخدم PDF أو صورة أو Word أو فيديو MP4 أو WebM أو MOV."
        : "صور الموقع تقبل JPEG أو PNG أو WebP أو GIF فقط.");
    }
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "file";
    const path = folder + "/" + Date.now() + "-" + safeName;
    const { error } = await supabase.storage.from(targetBucket).upload(path, file, {
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
        track_id: articleDraft.subject_id ? (curriculumSubjects.find(item => item.id === articleDraft.subject_id)?.track_id || null) : (articleDraft.track_id || null),
        subject_id: articleDraft.subject_id || null,
        grade_level: articleDraft.subject_id
          ? (curriculumSubjects.find(item => item.id === articleDraft.subject_id)?.grade_level || "")
          : (articleDraft.grade_level || ""),
        curriculum_year: articleDraft.subject_id
          ? (curriculumSubjects.find(item => item.id === articleDraft.subject_id)?.curriculum_year || null)
          : (articleDraft.curriculum_year ? Number(articleDraft.curriculum_year) : null),
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

  function resetResource() {
    setResourceDraft(EMPTY_RESOURCE);
    setResourceFile(null);
    setResourcePreviewUrl("");
  }

  async function editResource(resource) {
    setResourceDraft({ ...resource });
    setResourceFile(null);
    setResourcePreviewUrl("");
    setAlert(null);
    if (resource.file_path) {
      const { data, error } = await supabase.storage.from(LIBRARY_BUCKET).createSignedUrl(resource.file_path, 60 * 60);
      if (!error) setResourcePreviewUrl(data?.signedUrl || "");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveResource(event) {
    event.preventDefault();
    if (!resourceDraft.title.trim()) return setAlert({ kind: "error", text: "اكتب اسم الملف أو المورد." });
    if (resourceFile && resourceDraft.resource_type === "video" && !resourceFile.type.startsWith("video/")) {
      return setAlert({ kind: "error", text: "اختر ملف فيديو بصيغة MP4 أو WebM أو MOV أو OGG." });
    }
    if (resourceFile && resourceDraft.resource_type !== "video" && resourceFile.type.startsWith("video/")) {
      return setAlert({ kind: "error", text: "غيّر نوع المورد إلى «فيديو» قبل رفع هذا الملف." });
    }
    if (resourceDraft.resource_type === "link" && !/^https:\/\//i.test(resourceDraft.external_url.trim())) {
      return setAlert({ kind: "error", text: "أدخل رابطًا يبدأ بـ https://." });
    }
    if (resourceDraft.resource_type !== "link" && !resourceFile && !resourceDraft.file_path) {
      return setAlert({ kind: "error", text: "اختر ملفًا من جهازك أولًا." });
    }
    setBusy(true); setAlert(null);
    let newPath = null;
    try {
      if (resourceFile) newPath = await uploadAsset(resourceFile, "library", LIBRARY_BUCKET);
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
        subject_id: resourceDraft.subject_id || null,
        unit_id: resourceDraft.unit_id || null,
        lesson_id: resourceDraft.lesson_id || null,
        created_by: resourceDraft.id ? undefined : session.user.id,
      };
      const result = resourceDraft.id
        ? await supabase.from("learning_resources").update(values).eq("id", resourceDraft.id)
        : await supabase.from("learning_resources").insert(values);
      if (result.error) throw result.error;
      if (newPath && resourceDraft.file_path) await supabase.storage.from(LIBRARY_BUCKET).remove([resourceDraft.file_path]);
      resetResource(); await loadAll();
      setAlert({ kind: "success", text: "تم حفظ المورد في المكتبة." });
    } catch (error) {
      if (newPath) await supabase.storage.from(LIBRARY_BUCKET).remove([newPath]);
      setAlert({ kind: "error", text: error.message || "تعذر حفظ المورد." });
    } finally { setBusy(false); }
  }

  async function removeResource(resource) {
    if (!window.confirm("حذف «" + resource.title + "» من المكتبة؟")) return;
    if (resource.file_path) {
      const { error: storageError } = await supabase.storage.from(LIBRARY_BUCKET).remove([resource.file_path]);
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
      supabase.from("exam_questions").select("id,exam_id,prompt,question_type,options,points,sort_order,image_url,grading_mode").eq("exam_id", examId).order("sort_order").order("created_at"),
      supabase.from("exam_answer_keys").select("question_id,correct_answer,grading_rubric"),
    ]);
    if (questionResult.error || answerResult.error) {
      setAlert({ kind: "error", text: "تعذر تحميل أسئلة الامتحان." });
      return;
    }
    const answers = new Map((answerResult.data || []).map(row => [row.question_id, row]));
    setQuestions((questionResult.data || []).map(q => ({
      ...q,
      correct_answer: answers.get(q.id)?.correct_answer || "",
      grading_rubric: answers.get(q.id)?.grading_rubric || "",
    })));
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
        track_id: examDraft.subject_id
          ? (curriculumSubjects.find(item => item.id === examDraft.subject_id)?.track_id || null)
          : (examDraft.track_id || null),
        subject_id: examDraft.subject_id || null,
        grade_level: examDraft.subject_id
          ? (curriculumSubjects.find(item => item.id === examDraft.subject_id)?.grade_level || "")
          : (examDraft.grade_level || ""),
        curriculum_year: examDraft.subject_id
          ? (curriculumSubjects.find(item => item.id === examDraft.subject_id)?.curriculum_year || null)
          : (examDraft.curriculum_year ? Number(examDraft.curriculum_year) : null),
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
    setExamDraft({ ...EMPTY_EXAM, id: exam.id, title: exam.title, description: exam.description || "", duration_minutes: exam.duration_minutes, cover_image_url: exam.cover_image_url || "", track_id: exam.track_id || "", subject_id: exam.subject_id || "", grade_level: exam.grade_level || "", curriculum_year: exam.curriculum_year || "" });
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
      return setAlert({ kind: "error", text: "اكتب نص السؤال والإجابة النموذجية." });
    }
    if (questionDraft.question_type === "essay" && questionDraft.grading_mode === "ai" && !questionDraft.grading_rubric.trim()) {
      return setAlert({ kind: "error", text: "أضف عناصر التصحيح حتى يستطيع الذكاء الاصطناعي توزيع الدرجة بعدل." });
    }
    let options = [];
    if (questionDraft.question_type === "mcq") {
      options = questionDraft.options_text.split("\n").map(v => v.trim()).filter(Boolean);
      if (options.length < 2) return setAlert({ kind: "error", text: "أضف اختيارين على الأقل، كل اختيار في سطر." });
      if (!options.includes(questionDraft.correct_answer.trim())) return setAlert({ kind: "error", text: "الإجابة الصحيحة يجب أن تطابق أحد الاختيارات." });
    } else if (questionDraft.question_type === "true_false") {
      options = ["صحيح", "خطأ"];
    }

    setBusy(true);
    setAlert(null);
    let uploadedPath = null;
    try {
      let imageUrl = questionDraft.image_url || null;
      if (questionImageFile) {
        uploadedPath = await uploadAsset(questionImageFile, "exam-questions");
        imageUrl = publicFileUrl(uploadedPath);
      }
      const values = {
        exam_id: selectedExam.id,
        prompt: questionDraft.prompt.trim(),
        question_type: questionDraft.question_type,
        grading_mode: questionDraft.question_type === "essay" ? questionDraft.grading_mode : "auto",
        options,
        points: Math.max(1, Math.min(100, Number(questionDraft.points) || 1)),
        image_url: imageUrl,
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
          grading_rubric: questionDraft.grading_rubric.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "question_id" });
        questionError = keyResult.error;
      }
      if (questionError) throw questionError;

      setQuestionDraft(EMPTY_QUESTION);
      setQuestionImageFile(null);
      setEditingQuestionId(null);
      await loadQuestions(selectedExam.id);
      await loadAll();
      setAlert({ kind: "success", text: editingQuestionId ? "تم تعديل السؤال." : "تمت إضافة السؤال." });
    } catch (error) {
      if (uploadedPath) await supabase.storage.from(BUCKET).remove([uploadedPath]);
      setAlert({ kind: "error", text: error.message || "تعذر حفظ السؤال." });
    } finally {
      setBusy(false);
    }
  }

  function editQuestion(question) {
    setEditingQuestionId(question.id);
    setQuestionDraft({
      id: question.id,
      prompt: question.prompt,
      question_type: question.question_type,
      options_text: (question.options || []).join("\n"),
      correct_answer: question.correct_answer,
      grading_mode: question.grading_mode || "ai",
      grading_rubric: question.grading_rubric || "",
      points: question.points,
      image_url: question.image_url || "",
    });
    setQuestionImageFile(null);
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

  async function openMessageAttachment(message, attachment) {
    const path = String(attachment?.path || "");
    if (!path.startsWith("incoming/")) {
      setAlert({ kind: "error", text: "مسار المرفق غير صالح." });
      return;
    }
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    const loadingKey = message.id + ":" + path;
    setOpeningAttachment(loadingKey);
    try {
      const { data, error } = await supabase.storage
        .from(CONTACT_BUCKET)
        .createSignedUrl(path, 10 * 60);
      if (error || !data?.signedUrl) throw error || new Error("تعذر إنشاء رابط آمن للملف.");
      if (popup) popup.location.href = data.signedUrl;
      else window.location.assign(data.signedUrl);
    } catch (error) {
      if (popup) popup.close();
      setAlert({ kind: "error", text: error?.message || "تعذر فتح المرفق." });
    } finally {
      setOpeningAttachment(null);
    }
  }

  async function removeMessage(message) {
    if (!window.confirm("حذف الرسالة ومرفقاتها؟")) return;
    const paths = [...new Set(
      (Array.isArray(message.attachments) ? message.attachments : [])
        .map(attachment => attachment?.path)
        .filter(isSafeContactAttachmentPath)
    )];

    // Remove private files first so deleting the inbox row cannot orphan its attachments.
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from(CONTACT_BUCKET).remove(paths);
      if (storageError) {
        setAlert({ kind: "error", text: "تعذر حذف مرفقات الرسالة، لذلك لم تُحذف الرسالة. حاول مرة أخرى." });
        return;
      }
    }

    const { error } = await supabase.from("messages").delete().eq("id", message.id);
    if (error) {
      setAlert({ kind: "error", text: "تم حذف المرفقات لكن تعذر حذف سجل الرسالة. حدّث الصفحة وحاول مرة أخرى." });
    } else {
      await loadAll();
      setAlert({ kind: "success", text: "تم حذف الرسالة ومرفقاتها." });
    }
  }

  const selectedAttempts = selectedExam ? attempts.filter(a => a.exam_id === selectedExam.id) : [];
  const visibleAttempts = resultsExamFilter === "all" ? attempts : attempts.filter(attempt => attempt.exam_id === resultsExamFilter);

  async function generateExamQuestions() {
    if (!selectedExam || !aiTopic.trim() || aiQuestionTypes.length === 0) {
      return setAlert({ kind: "error", text: "اكتب الموضوع واختر نوع سؤال واحدًا على الأقل." });
    }
    if (!session?.access_token) return setAlert({ kind: "error", text: "انتهت جلسة الإدارة. سجّل الدخول مرة أخرى." });
    setGeneratingAI(true);
    setAlert(null);
    setGeneratedQuestions([]);
    try {
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({
          topic: aiTopic,
          subject: aiSubject,
          level: aiLevel,
          count: aiCount,
          difficulty: aiDifficulty,
          types: aiQuestionTypes,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "تعذر توليد الأسئلة.");
      setGeneratedQuestions(data.questions || []);
      setAlert({ kind: "success", text: "تم توليد " + (data.questions || []).length + " سؤالًا. راجعها ثم أضفها للامتحان." });
    } catch (error) {
      setAlert({ kind: "error", text: error.message || "تعذر الاتصال بخدمة الذكاء الاصطناعي." });
    } finally {
      setGeneratingAI(false);
    }
  }

  function updateGeneratedQuestion(index, field, value) {
    setGeneratedQuestions(current => current.map((question, i) => i === index ? { ...question, [field]: value } : question));
  }

  async function saveGeneratedQuestions() {
    if (!selectedExam || generatedQuestions.length === 0) return;
    setSavingGenerated(true);
    setAlert(null);
    const insertedIds = [];
    try {
      for (const [index, question] of generatedQuestions.entries()) {
        const values = {
          exam_id: selectedExam.id,
          prompt: question.prompt.trim(),
          question_type: question.question_type,
          grading_mode: question.question_type === "essay" ? "ai" : "auto",
          options: question.question_type === "mcq"
            ? (question.options || []).map(value => String(value).trim()).filter(Boolean)
            : question.question_type === "true_false" ? ["صحيح", "خطأ"] : [],
          points: Math.max(1, Math.min(100, Number(question.points) || 1)),
          sort_order: questions.length + index,
        };
        if (!values.prompt || !question.correct_answer?.trim()) throw new Error("أحد الأسئلة لا يحتوي على نص أو إجابة نموذجية.");
        const { data, error } = await supabase.from("exam_questions").insert(values).select("id").single();
        if (error || !data?.id) throw error || new Error("تعذر حفظ السؤال.");
        insertedIds.push(data.id);
        const { error: keyError } = await supabase.from("exam_answer_keys").upsert({
          question_id: data.id,
          correct_answer: question.correct_answer.trim(),
          grading_rubric: String(question.grading_rubric || "").trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "question_id" });
        if (keyError) throw keyError;
      }
      setGeneratedQuestions([]);
      await loadQuestions(selectedExam.id);
      await loadAll();
      setAlert({ kind: "success", text: "تمت إضافة الأسئلة المولدة إلى الامتحان بنجاح." });
    } catch (error) {
      if (insertedIds.length) await supabase.from("exam_questions").delete().in("id", insertedIds);
      setAlert({ kind: "error", text: error.message || "تعذر حفظ الأسئلة المولدة." });
    } finally {
      setSavingGenerated(false);
    }
  }

  async function gradeAttemptWithAI(attempt) {
    if (!session?.access_token) return setAlert({ kind: "error", text: "انتهت جلسة الإدارة. سجّل الدخول مرة أخرى." });
    setGradingAttemptId(attempt.id);
    setAlert(null);
    try {
      const response = await fetch("/api/ai/grade-essay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({ attempt_id: attempt.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "تعذر تصحيح المقالات.");
      setAttempts(current => current.map(item => item.id === attempt.id ? {
        ...item,
        ...data.attempt,
        exam_title: item.exam_title,
        student_name: item.student_name,
        student_username: item.student_username,
        manual_max_score: item.manual_max_score,
      } : item));
      setAlert({ kind: "success", text: "تم تصحيح المقالات بالذكاء الاصطناعي وحفظ الدرجة الجديدة." });
    } catch (error) {
      setAlert({ kind: "error", text: error.message || "تعذر تصحيح هذه المحاولة." });
      await loadAll();
    } finally {
      setGradingAttemptId(null);
    }
  }

  async function saveManualEssayGrade(attempt) {
    const maxScore = Number(attempt.manual_max_score) || 0;
    const score = Number(manualGradeDraft.score);
    if (!maxScore || !Number.isInteger(score) || score < 0 || score > maxScore) {
      return setAlert({ kind: "error", text: "أدخل درجة صحيحة من صفر إلى " + maxScore + "." });
    }
    setBusy(true);
    setAlert(null);
    const nextScore = (Number(attempt.objective_score) || 0) + (Number(attempt.ai_essay_score) || 0) + score;
    const { data, error } = await supabase.from("exam_attempts").update({
      manual_essay_score: score,
      manual_feedback: manualGradeDraft.feedback.trim(),
      score: nextScore,
      grading_status: "graded",
    }).eq("id", attempt.id).select("id,score,max_score,objective_score,ai_essay_score,manual_essay_score,manual_feedback,grading_status").single();
    if (error || !data) {
      setAlert({ kind: "error", text: "تعذر حفظ التقييم اليدوي. تحقق من الدرجة وصلاحيات المدير." });
    } else {
      setAttempts(current => current.map(item => item.id === attempt.id ? { ...item, ...data } : item));
      setManualGradeAttemptId(null);
      setManualGradeDraft({ score: "", feedback: "" });
      setAlert({ kind: "success", text: "تم حفظ التقييم اليدوي وتحديث الدرجة النهائية." });
    }
    setBusy(false);
  }

  return (
    <div className="hub-dashboard">
      <div className="hub-page-heading">
        <div><span className="admin-label">{isMasterAdmin ? "المدير الرئيسي" : "مشرف Tay Space"}</span><h1>مركز إدارة المحتوى</h1><p>أضف وعدّل وانشر المحتوى والملفات والاختبارات من مكان واحد.</p></div>
        <button className="hub-refresh" onClick={loadAll} title="تحديث البيانات"><RotateCw size={17} /></button>
      </div>
      <div className="hub-stats">
        <div><FileText /><span>المقالات</span><strong>{articles.length}</strong></div>
        <div><BookOpen /><span>ملفات المكتبة</span><strong>{resources.length}</strong></div>
        <div><ClipboardList /><span>الامتحانات</span><strong>{exams.length}</strong></div>
        <div><Users /><span>محاولات الامتحان</span><strong>{attempts.length}</strong></div>
      </div>
      <nav className="hub-tabs">
        {TABS.filter(item => item.id !== "moderators" || isMasterAdmin).map(item => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setTab(item.id); setAlert(null); }}><item.icon size={16} />{item.label}</button>)}
      </nav>
      <Alert value={alert} />

      {loading ? <div className="hub-empty">جارٍ تحميل بيانات لوحة الإدارة...</div> : null}

      {!loading && tab === "articles" && (
        <div className="hub-columns">
          <form className="hub-panel hub-editor" onSubmit={e => { e.preventDefault(); saveArticle(false); }}>
            <div className="hub-panel-heading"><h2>{articleDraft.id ? "تعديل المقال" : "كتابة مقال جديد"}</h2>{articleDraft.id && <button type="button" className="hub-icon-btn" onClick={resetArticle}><X size={17} /></button>}</div>
            <label>عنوان المقال<input required value={articleDraft.title} onChange={e => setArticleDraft({ ...articleDraft, title: e.target.value })} placeholder="اكتب عنوانًا واضحًا" /></label>
            <label>وصف مختصر<textarea rows="2" value={articleDraft.excerpt} onChange={e => setArticleDraft({ ...articleDraft, excerpt: e.target.value })} placeholder="ملخص يظهر في صفحة الموقع" /></label>
            <label>محتوى المقال<textarea rows="9" value={articleDraft.content} onChange={e => setArticleDraft({ ...articleDraft, content: e.target.value })} placeholder="اكتب شرحًا تعليميًا أو موضوعًا إثرائيًا..." /></label>
            <div className="hub-form-grid">
              <label>المسار
                <select value={articleDraft.track_id || ""} onChange={e=>setArticleDraft({...articleDraft,track_id:e.target.value,subject_id:"",curriculum_year:"",grade_level:""})}>
                  <option value="">محتوى عام أو مشترك</option>
                  {curriculumTracks.map(track=><option key={track.id} value={track.id}>{track.name}</option>)}
                </select>
              </label>
              <label>المادة
                <select value={articleDraft.subject_id || ""} onChange={e=>{
                  const subject=curriculumSubjects.find(item=>item.id===e.target.value);
                  setArticleDraft({...articleDraft,subject_id:e.target.value,track_id:subject?.track_id||"",curriculum_year:subject?.curriculum_year||"",grade_level:subject?.grade_level||""});
                }}>
                  <option value="">موضوع عام للمسار</option>
                  {curriculumSubjects.filter(subject=>!articleDraft.track_id || !subject.track_id || subject.track_id===articleDraft.track_id).map(subject=><option key={subject.id} value={subject.id}>{subject.name} · {subject.grade_level}</option>)}
                </select>
              </label>
              <label>الصف الدراسي
                <select value={articleDraft.curriculum_year || ""} onChange={e=>setArticleDraft({...articleDraft,curriculum_year:e.target.value,grade_level:e.target.value==="2"?"الصف الثاني":e.target.value==="3"?"الصف الثالث":""})}>
                  <option value="">كل الصفوف</option><option value="2">الصف الثاني</option><option value="3">الصف الثالث</option>
                </select>
              </label>
            </div>
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
              <label>نوع المورد<select value={resourceDraft.resource_type} onChange={e => setResourceDraft({ ...resourceDraft, resource_type: e.target.value })}><option value="pdf">كتاب أو ملف PDF</option><option value="image">صورة</option><option value="document">مستند Word</option><option value="video">فيديو</option><option value="link">رابط خارجي</option></select></label>
              <label>القسم<input value={resourceDraft.category} onChange={e => setResourceDraft({ ...resourceDraft, category: e.target.value })} placeholder="الفيزياء، الكيمياء..." /></label>
            </div>
            <div className="hub-form-grid">
              <label>ربط بالمادة
                <select value={resourceDraft.subject_id || ""} onChange={e => setResourceDraft({ ...resourceDraft, subject_id: e.target.value, unit_id: "", lesson_id: "" })}>
                  <option value="">مورد عام في المكتبة</option>
                  {curriculumSubjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </label>
              <label>ربط بالوحدة
                <select value={resourceDraft.unit_id || ""} disabled={!resourceDraft.subject_id} onChange={e => setResourceDraft({ ...resourceDraft, unit_id: e.target.value, lesson_id: "" })}>
                  <option value="">بدون وحدة</option>
                  {curriculumUnits.filter(unit => unit.subject_id === resourceDraft.subject_id).map(unit => <option key={unit.id} value={unit.id}>{unit.title}</option>)}
                </select>
              </label>
              <label>ربط بالدرس
                <select value={resourceDraft.lesson_id || ""} disabled={!resourceDraft.unit_id} onChange={e => setResourceDraft({ ...resourceDraft, lesson_id: e.target.value })}>
                  <option value="">بدون درس</option>
                  {curriculumLessons.filter(lesson => lesson.unit_id === resourceDraft.unit_id).map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                </select>
              </label>
            </div>
            <small className="hub-form-hint">اربط الملف بالمادة أو الوحدة أو الدرس ليظهر بجوار المحتوى المرتبط به. اترك الاختيارات فارغة لإبقائه في المكتبة العامة.</small>
            {resourceDraft.resource_type === "link" ? <label>الرابط الخارجي<input type="url" required value={resourceDraft.external_url} onChange={e => setResourceDraft({ ...resourceDraft, external_url: e.target.value })} placeholder="https://..." dir="ltr" /></label> : <>
              {resourceDraft.file_path && !resourceFile && <div className="hub-current-file"><File size={16} />{resourceDraft.file_name || "الملف الحالي"}{resourcePreviewUrl && (resourceDraft.resource_type === "video" ? <video className="hub-library-video-preview" controls preload="metadata" src={resourcePreviewUrl} /> : <a href={resourcePreviewUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>)}</div>}
              <FilePicker file={resourceFile} onChange={setResourceFile} accept={resourceDraft.resource_type === "image" ? "image/*" : resourceDraft.resource_type === "pdf" ? ".pdf,application/pdf" : resourceDraft.resource_type === "video" ? ".mp4,.webm,.mov,.ogg,video/mp4,video/webm,video/quicktime,video/ogg" : ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"} label={resourceDraft.resource_type === "video" ? "اختر فيديو من هاتفك أو الكمبيوتر" : "اختر ملفًا من هاتفك أو الكمبيوتر"} />
            </>}
            <label className="hub-check"><input type="checkbox" checked={resourceDraft.is_published} onChange={e => setResourceDraft({ ...resourceDraft, is_published: e.target.checked })} />نشر المورد للطلاب فور الحفظ</label>
            <div className="hub-form-actions"><button className="hub-primary" disabled={busy}><Upload size={16} />{busy ? "جارٍ الرفع والحفظ..." : "حفظ في المكتبة"}</button><button type="button" className="hub-secondary" onClick={resetResource}>تفريغ</button></div>
          </form>
          <section className="hub-panel">
            <div className="hub-panel-heading"><h2>مكتبة الملفات ({resources.length})</h2></div>
            {resources.length === 0 ? <div className="hub-empty">المكتبة فارغة. أضف أول كتاب أو صورة.</div> : resources.map(resource => (
              <div className="hub-row" key={resource.id}>
                <div className="hub-row-icon">{resource.resource_type === "image" ? <ImageIcon size={19} /> : resource.resource_type === "video" ? <Video size={19} /> : resource.resource_type === "link" ? <LinkIcon size={19} /> : <FileText size={19} />}</div>
                <div className="hub-row-main"><strong>{resource.title}</strong><small>{resource.category} · {curriculumSubjects.find(item => item.id === resource.subject_id)?.name || "مكتبة عامة"}{resource.lesson_id ? " · " + (curriculumLessons.find(item => item.id === resource.lesson_id)?.title || "درس") : ""} · {resource.is_published ? "منشور" : "مخفي"}{resource.file_size ? " · " + humanSize(resource.file_size) : ""}</small></div>
                <div className="hub-row-actions"><button onClick={() => editResource(resource)} title="تعديل وفتح الملف"><Pencil size={16} /></button><button onClick={() => toggleResource(resource)} title="تغيير النشر">{resource.is_published ? <EyeOff size={16} /> : <Eye size={16} />}</button><button onClick={() => removeResource(resource)} title="حذف"><Trash2 size={16} /></button></div>
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
                {exam.cover_image_url && <img className="hub-exam-list-cover" src={exam.cover_image_url} alt="" />}
                <button className="hub-exam-select" onClick={() => openExam(exam)}><strong>{exam.title}</strong><small>{exam.duration_minutes} دقيقة · {attempts.filter(a => a.exam_id === exam.id).length} محاولة · {exam.is_published ? "منشور" : "مسودة"}</small></button>
                <div className="hub-row-actions"><button onClick={() => toggleExam(exam)} title={exam.is_published ? "إيقاف النشر" : "نشر"}>{exam.is_published ? <EyeOff size={16} /> : <Eye size={16} />}</button><button onClick={() => removeExam(exam)} title="حذف"><Trash2 size={16} /></button></div>
              </div>
            ))}
          </section>

          <section className="hub-panel hub-exam-editor">
            {!selectedExam && !editingExam ? <div className="hub-empty hub-empty-tall"><ClipboardList size={30} /><strong>اختر امتحانًا أو أنشئ امتحانًا جديدًا</strong><span>بعد الإنشاء، أضف الأسئلة وحدد الإجابات الصحيحة ثم انشره للطلاب.</span></div> : editingExam ? (
              <form className="hub-editor" onSubmit={saveExam}>
                <div className="hub-panel-heading"><h2>{examDraft.id ? "تعديل بيانات الامتحان" : "إنشاء امتحان جديد"}</h2><button type="button" className="hub-icon-btn" onClick={() => { setEditingExam(false); if (!examDraft.id) setSelectedExam(null); }}><X size={17} /></button></div>
                <label>اسم الامتحان<input required value={examDraft.title} onChange={e => setExamDraft({ ...examDraft, title: e.target.value })} placeholder="اختبار تدريبي في موضوع الدرس" /></label>
                <div className="hub-form-grid">
                  <label>المسار
                    <select value={examDraft.track_id || ""} onChange={e => setExamDraft({...examDraft,track_id:e.target.value,subject_id:"",curriculum_year:"",grade_level:""})}>
                      <option value="">كل المسارات / مشترك</option>
                      {curriculumTracks.map(track=><option key={track.id} value={track.id}>{track.name}</option>)}
                    </select>
                  </label>
                  <label>المادة
                    <select value={examDraft.subject_id || ""} onChange={e => {
                      const subject=curriculumSubjects.find(item=>item.id===e.target.value);
                      setExamDraft({...examDraft,subject_id:e.target.value,track_id:subject?.track_id||"",curriculum_year:subject?.curriculum_year||"",grade_level:subject?.grade_level||""});
                    }}>
                      <option value="">امتحان عام للمسار</option>
                      {curriculumSubjects.filter(subject=>!examDraft.track_id || !subject.track_id || subject.track_id===examDraft.track_id).map(subject=><option key={subject.id} value={subject.id}>{subject.name} · {subject.grade_level}</option>)}
                    </select>
                  </label>
                  <label>الصف الدراسي
                    <select value={examDraft.curriculum_year || ""} onChange={e=>setExamDraft({...examDraft,curriculum_year:e.target.value,grade_level:e.target.value==="2"?"الصف الثاني":e.target.value==="3"?"الصف الثالث":""})}>
                      <option value="">كل الصفوف</option><option value="2">الصف الثاني</option><option value="3">الصف الثالث</option>
                    </select>
                  </label>
                </div>
                <label>تعليمات أو وصف<textarea rows="3" value={examDraft.description} onChange={e => setExamDraft({ ...examDraft, description: e.target.value })} placeholder="اكتب تعليمات الامتحان..." /></label>
                <label>مدة الامتحان بالدقائق<input type="number" min="1" max="300" required value={examDraft.duration_minutes} onChange={e => setExamDraft({ ...examDraft, duration_minutes: e.target.value })} /></label>
                {examDraft.cover_image_url && !examCoverFile && <div className="hub-image-preview"><img src={examDraft.cover_image_url} alt="غلاف الامتحان" /><button type="button" className="hub-secondary compact" onClick={() => setExamDraft({ ...examDraft, cover_image_url: "" })}>إزالة الغلاف</button></div>}
                <FilePicker file={examCoverFile} onChange={setExamCoverFile} accept="image/*" label="إضافة صورة غلاف للامتحان" />
                <button className="hub-primary" disabled={busy}><Save size={16} />حفظ بيانات الامتحان</button>
              </form>
            ) : selectedExam && (
              <>
                {selectedExam.cover_image_url && <img className="hub-exam-cover-preview" src={selectedExam.cover_image_url} alt={selectedExam.title} />}
                <div className="hub-panel-heading"><div><h2>{selectedExam.title}</h2><small>{questions.length} سؤال · {selectedExam.duration_minutes} دقيقة</small></div><button className="hub-secondary compact" onClick={editExamDetails}><Pencil size={15} /> تعديل</button></div>
                <section className="hub-panel hub-ai-generator">
                  <div className="hub-panel-heading"><h3><Sparkles size={18} /> إنشاء أسئلة بالذكاء الاصطناعي</h3><span className="hub-ai-tag">AI</span></div>
                  <p className="hub-muted">اكتب الموضوع والمستوى، وسيقترح النظام أسئلة متنوعة مع الإجابات النموذجية وعناصر تصحيح المقال. لن تُحفظ الأسئلة قبل مراجعتك.</p>
                  <label>موضوع الأسئلة<textarea rows="2" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="مثال: قوانين نيوتن وتطبيقاتها في الحركة..." /></label>
                  <div className="hub-form-grid">
                    <label>المادة (اختياري)<input value={aiSubject} onChange={e => setAiSubject(e.target.value)} placeholder="الفيزياء" /></label>
                    <label>المستوى الدراسي<input value={aiLevel} onChange={e => setAiLevel(e.target.value)} placeholder="الصف أو الوحدة الدراسية" /></label>
                    <label>عدد الأسئلة<input type="number" min="1" max="20" value={aiCount} onChange={e => setAiCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label>
                    <label>مستوى الصعوبة<select value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)}><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">متقدم</option><option value="mixed">متدرج ومتنوع</option></select></label>
                  </div>
                  <div className="hub-ai-type-picker">
                    <strong>أنواع الأسئلة</strong>
                    <div className="hub-ai-type-options">
                      {[["mcq","اختيار من متعدد"],["true_false","صح أو خطأ"],["short_answer","إجابة قصيرة"],["essay","مقالي"]].map(([value,label]) => <label className="hub-check" key={value}><input type="checkbox" checked={aiQuestionTypes.includes(value)} onChange={() => setAiQuestionTypes(current => current.includes(value) ? current.filter(type => type !== value) : [...current, value])} />{label}</label>)}
                    </div>
                  </div>
                  <button type="button" className="hub-primary" disabled={generatingAI || savingGenerated || !aiTopic.trim() || aiQuestionTypes.length === 0} onClick={generateExamQuestions}>
                    <WandSparkles size={16} />{generatingAI ? "جارٍ إعداد الأسئلة..." : "ولّد أسئلة احترافية"}
                  </button>
                  {generatedQuestions.length > 0 && <div className="hub-ai-preview">
                    <div className="hub-panel-heading"><h4>معاينة الأسئلة المولدة ({generatedQuestions.length})</h4><button type="button" className="hub-secondary compact" onClick={() => setGeneratedQuestions([])}>إلغاء المعاينة</button></div>
                    {generatedQuestions.map((question,index) => <article className="hub-ai-question-preview" key={index}>
                      <div className="hub-ai-question-preview-title"><strong>السؤال {index+1}</strong><small>{question.question_type === "mcq" ? "اختيار من متعدد" : question.question_type === "true_false" ? "صح أو خطأ" : question.question_type === "essay" ? "مقالي · تصحيح بالذكاء الاصطناعي" : "إجابة قصيرة"} · {question.points} درجة</small></div>
                      <label>نص السؤال<textarea rows="2" value={question.prompt} onChange={e => updateGeneratedQuestion(index,"prompt",e.target.value)} /></label>
                      {question.question_type === "mcq" && <label>الاختيارات (كل اختيار في سطر)<textarea rows="4" value={(question.options || []).join("\n")} onChange={e => updateGeneratedQuestion(index,"options",e.target.value.split("\n").map(value => value.trim()).filter(Boolean))} /></label>}
                      <label>{question.question_type === "essay" ? "الإجابة النموذجية" : "الإجابة الصحيحة"}<textarea rows="2" value={question.correct_answer} onChange={e => updateGeneratedQuestion(index,"correct_answer",e.target.value)} /></label>
                      {question.question_type === "essay" && <label>عناصر التصحيح<textarea rows="3" value={question.grading_rubric || ""} onChange={e => updateGeneratedQuestion(index,"grading_rubric",e.target.value)} /></label>}
                      <label className="hub-ai-points">الدرجة<input type="number" min="1" max="100" value={question.points} onChange={e => updateGeneratedQuestion(index,"points",Number(e.target.value) || 1)} /></label>
                    </article>)}
                    <button type="button" className="hub-primary" disabled={savingGenerated} onClick={saveGeneratedQuestions}><Save size={16} />{savingGenerated ? "جارٍ حفظ الأسئلة..." : "أضف الأسئلة إلى الامتحان"}</button>
                  </div>}
                </section>
                <form className="hub-question-form" onSubmit={saveQuestion}>
                  <h3>{editingQuestionId ? "تعديل السؤال يدويًا" : "إضافة سؤال يدويًا"}</h3>
                  <label>نص السؤال<textarea rows="3" required value={questionDraft.prompt} onChange={e => setQuestionDraft({ ...questionDraft, prompt: e.target.value })} placeholder="اكتب السؤال بوضوح..." /></label>
                  {questionDraft.image_url && !questionImageFile && <div className="hub-image-preview"><img src={questionDraft.image_url} alt="صورة السؤال" /><button type="button" className="hub-secondary compact" onClick={() => setQuestionDraft({ ...questionDraft, image_url: "" })}>إزالة الصورة</button></div>}
                  <FilePicker file={questionImageFile} onChange={setQuestionImageFile} accept="image/*" label="إضافة صورة للسؤال (اختياري)" />
                  <div className="hub-form-grid">
                    <label>نوع السؤال<select value={questionDraft.question_type} onChange={e => setQuestionDraft({ ...questionDraft, question_type: e.target.value, grading_mode: e.target.value === "essay" ? "ai" : "auto", options_text: e.target.value === "true_false" ? "صحيح\nخطأ" : "" })}><option value="mcq">اختيار من متعدد</option><option value="true_false">صح أو خطأ</option><option value="short_answer">إجابة قصيرة</option><option value="essay">سؤال مقالي</option></select></label>
                    <label>الدرجة<input type="number" min="1" max="100" value={questionDraft.points} onChange={e => setQuestionDraft({ ...questionDraft, points: e.target.value })} /></label>
                  </div>
                  {questionDraft.question_type === "mcq" && <label>الاختيارات (كل اختيار في سطر)<textarea rows="4" required value={questionDraft.options_text} onChange={e => setQuestionDraft({ ...questionDraft, options_text: e.target.value })} placeholder={"الاختيار الأول\nالاختيار الثاني\nالاختيار الثالث\nالاختيار الرابع"} /></label>}
                  {questionDraft.question_type === "true_false" && <label>الإجابة الصحيحة<select value={questionDraft.correct_answer} onChange={e => setQuestionDraft({ ...questionDraft, correct_answer: e.target.value })}><option value="">اختر الإجابة</option><option value="صحيح">صحيح</option><option value="خطأ">خطأ</option></select></label>}
                  {questionDraft.question_type === "mcq" && <label>الإجابة الصحيحة<input required value={questionDraft.correct_answer} onChange={e => setQuestionDraft({ ...questionDraft, correct_answer: e.target.value })} placeholder="اكتب نص الاختيار الصحيح كما هو" /></label>}
                  {questionDraft.question_type === "short_answer" && <label>الإجابة النموذجية<input required value={questionDraft.correct_answer} onChange={e => setQuestionDraft({ ...questionDraft, correct_answer: e.target.value })} placeholder="الإجابة التي سيصحح النظام بناءً عليها" /></label>}
                  {questionDraft.question_type === "essay" && <>
                    <label>طريقة التصحيح<select value={questionDraft.grading_mode} onChange={e => setQuestionDraft({ ...questionDraft, grading_mode: e.target.value })}><option value="ai">تصحيح بالذكاء الاصطناعي</option><option value="manual">مراجعة يدوية</option></select></label>
                    <label>الإجابة النموذجية<textarea required rows="3" value={questionDraft.correct_answer} onChange={e => setQuestionDraft({ ...questionDraft, correct_answer: e.target.value })} placeholder="اكتب إجابة نموذجية أو أهم الأفكار التي ينبغي أن تتضمنها الإجابة..." /></label>
                    <label>عناصر التصحيح وتوزيع الدرجة<textarea rows="4" value={questionDraft.grading_rubric} onChange={e => setQuestionDraft({ ...questionDraft, grading_rubric: e.target.value })} placeholder="مثال: درجتان لشرح الفكرة، درجتان لصحة القانون، درجة للمثال والتطبيق..." /></label>
                  </>}
                  <div className="hub-form-actions"><button className="hub-primary" disabled={busy}><Plus size={16} />{editingQuestionId ? "حفظ التعديل" : "إضافة السؤال"}</button>{editingQuestionId && <button type="button" className="hub-secondary" onClick={() => { setEditingQuestionId(null); setQuestionDraft(EMPTY_QUESTION); setQuestionImageFile(null); }}>إلغاء</button>}</div>
                </form>
                <div className="hub-question-list"><h3><ListChecks size={17} /> أسئلة الامتحان</h3>
                  {questions.length === 0 ? <p className="hub-muted">أضف السؤال الأول للبدء.</p> : questions.map((q,index) => <div className="hub-question-row" key={q.id}>{q.image_url && <img className="hub-question-thumb" src={q.image_url} alt="" />}<div><strong>{index+1}. {q.prompt}</strong><small>{q.question_type === "mcq" ? "اختيار من متعدد" : q.question_type === "true_false" ? "صح أو خطأ" : q.question_type === "essay" ? "مقالي · " + (q.grading_mode === "ai" ? "تصحيح AI" : "مراجعة يدوية") : "إجابة قصيرة"} · {q.points} درجة</small></div><div className="hub-row-actions"><button onClick={() => editQuestion(q)} title="تعديل السؤال"><Pencil size={16} /></button><button onClick={() => removeQuestion(q)} title="حذف السؤال"><Trash2 size={16} /></button></div></div>)}
                </div>
                <div className="hub-attempts">
                  <h3>نتائج الطلاب ({selectedAttempts.length})</h3>
                  {selectedAttempts.length === 0 ? <p className="hub-muted">لا توجد محاولات مسجلة لهذا الامتحان حتى الآن.</p> : selectedAttempts.slice(0,12).map(attempt => <div className="hub-attempt-row" key={attempt.id}>
                    <div><strong>{attempt.student_name}</strong><small>@{attempt.student_username} · {new Date(attempt.submitted_at).toLocaleString("ar-EG")}</small></div>
                    <strong>{attempt.score} / {attempt.max_score}</strong>
                    {attempt.grading_status === "pending_ai" || attempt.grading_status === "failed" ? <button className="hub-secondary compact" disabled={gradingAttemptId === attempt.id} onClick={() => gradeAttemptWithAI(attempt)}>{gradingAttemptId === attempt.id ? "جارٍ التصحيح..." : "صحّح المقالات بالذكاء الاصطناعي"}</button> : <small>{attempt.grading_status === "graded" ? "تم تصحيح المقال" : attempt.grading_status === "needs_review" ? "تحتاج مراجعة يدوية" : "اكتمل التصحيح"}</small>}
                  </div>)}
                </div>
                <div className="hub-publish-note"><CheckCircle2 size={16} /> بعد الانتهاء من الأسئلة، استخدم زر النشر بجوار اسم الامتحان ليظهر للطلاب.</div>
              </>
            )}
          </section>
        </div>
      )}

      {!loading && tab === "results" && (
        <section className="hub-panel hub-results-panel">
          <div className="hub-panel-heading"><div><h2>نتائج الطلاب</h2><small>{attempts.length} محاولة مسجلة في آخر 500 محاولة</small></div>
            <label className="hub-results-filter">الامتحان<select value={resultsExamFilter} onChange={e => setResultsExamFilter(e.target.value)}><option value="all">كل الامتحانات</option>{exams.map(exam => <option value={exam.id} key={exam.id}>{exam.title}</option>)}</select></label>
          </div>
          {visibleAttempts.length === 0 ? <div className="hub-empty">لا توجد نتائج مطابقة لهذا الاختيار حتى الآن.</div> : <div className="hub-results-list">
            {visibleAttempts.map(attempt => <article className="hub-result-row" key={attempt.id}>
              <div className="hub-result-student"><strong>{attempt.student_name}</strong><span dir="ltr">@{attempt.student_username}</span><small>{attempt.exam_title}</small><small>{new Date(attempt.submitted_at).toLocaleString("ar-EG")}</small></div>
              <div className="hub-result-score"><strong>{attempt.score} / {attempt.max_score}</strong><span>{attempt.max_score > 0 ? Math.round((attempt.score / attempt.max_score) * 1000) / 10 : 0}%</span><small>{attempt.grading_status === "pending_ai" ? "مقالات تنتظر التصحيح" : attempt.grading_status === "processing" ? "جارٍ تصحيح المقال" : attempt.grading_status === "failed" ? "تعذر التصحيح، يمكن إعادة المحاولة" : attempt.grading_status === "needs_review" ? "تحتاج مراجعة يدوية" : attempt.grading_status === "graded" ? "تم تصحيح المقالات" : "تم التصحيح"}</small></div>
              {attempt.grading_status === "pending_ai" || attempt.grading_status === "failed" ? <button className="hub-primary compact" disabled={gradingAttemptId === attempt.id} onClick={() => gradeAttemptWithAI(attempt)}><Sparkles size={15} />{gradingAttemptId === attempt.id ? "جارٍ التصحيح..." : "صحّح بالذكاء الاصطناعي"}</button> : attempt.grading_status === "needs_review" && attempt.manual_max_score > 0 ? <button className="hub-secondary compact" onClick={() => { setManualGradeAttemptId(attempt.id); setManualGradeDraft({ score: String(attempt.manual_essay_score || ""), feedback: attempt.manual_feedback || "" }); }}>تقييم المقال يدويًا</button> : <span className="hub-result-status"><CheckCircle2 size={15} />{attempt.grading_status === "graded" ? "تم التصحيح" : "مكتمل"}</span>}
              {manualGradeAttemptId === attempt.id && <div className="hub-manual-grade">
                <label>درجة المقالات اليدوية (من {attempt.manual_max_score})<input type="number" min="0" max={attempt.manual_max_score} value={manualGradeDraft.score} onChange={e => setManualGradeDraft(current => ({ ...current, score: e.target.value }))} /></label>
                <label>تعليق للطالب (اختياري)<textarea rows="2" value={manualGradeDraft.feedback} onChange={e => setManualGradeDraft(current => ({ ...current, feedback: e.target.value }))} /></label>
                <div className="hub-form-actions"><button className="hub-primary compact" disabled={busy} onClick={() => saveManualEssayGrade(attempt)}>{busy ? "جارٍ الحفظ..." : "حفظ التقييم"}</button><button className="hub-secondary compact" onClick={() => setManualGradeAttemptId(null)}>إلغاء</button></div>
              </div>}
              {attempt.manual_feedback && <p className="hub-result-manual-feedback">ملاحظة الإدارة: {attempt.manual_feedback}</p>}
              {attempt.ai_feedback && Object.keys(attempt.ai_feedback).length > 0 && <details className="hub-result-feedback"><summary>عرض ملاحظات التصحيح</summary>{Object.values(attempt.ai_feedback).map((feedback,index) => <div key={index}><strong>{feedback.prompt || "السؤال المقالي"} · {feedback.score} درجة</strong><p>{feedback.feedback}</p>{feedback.strengths?.length > 0 && <small>نقاط القوة: {feedback.strengths.join("، ")}</small>}{feedback.improvements?.length > 0 && <small>ما يحتاج تحسينًا: {feedback.improvements.join("، ")}</small>}</div>)}</details>}
            </article>)}
          </div>}
        </section>
      )}

      {!loading && isMasterAdmin && tab === "moderators" && (
        <div className="hub-moderator-layout">
          <section className="hub-panel hub-moderator-create">
            <div className="hub-panel-heading"><h2><Users size={18} /> إضافة مشرف جديد</h2><span className="hub-ai-tag">المدير الرئيسي فقط</span></div>
            <p className="hub-muted">أنشئ حسابًا باسم مستخدم وكلمة مرور. المشرف سيتمكن من إدارة المحتوى والمكتبة والامتحانات والنتائج والرسائل، لكنه لن يرى تبويب إدارة المشرفين ولن يستطيع تعيين مشرفين أو سحب صلاحياتهم.</p>
            <form className="hub-editor" onSubmit={createModerator}>
              <label>اسم المشرف<input required minLength="2" maxLength="80" value={moderatorDraft.display_name} onChange={e => setModeratorDraft(current => ({ ...current, display_name: e.target.value }))} placeholder="الاسم الذي سيظهر داخل لوحة الإدارة" /></label>
              <label>اسم المستخدم<input required minLength="3" maxLength="24" pattern="[A-Za-z0-9_]{3,24}" autoComplete="off" dir="ltr" value={moderatorDraft.username} onChange={e => setModeratorDraft(current => ({ ...current, username: e.target.value.toLowerCase() }))} placeholder="moderator_01" /></label>
              <label>كلمة المرور<input required type="password" minLength="8" maxLength="72" autoComplete="new-password" dir="ltr" value={moderatorDraft.password} onChange={e => setModeratorDraft(current => ({ ...current, password: e.target.value }))} placeholder="8 أحرف على الأقل" /></label>
              <button className="hub-primary" disabled={moderatorCreating}><Plus size={16} />{moderatorCreating ? "جارٍ إنشاء الحساب..." : "إنشاء حساب المشرف"}</button>
            </form>
          </section>
          <section className="hub-panel hub-moderator-list">
            <div className="hub-panel-heading"><div><h2>المشرفون الحاليون</h2><small>{moderators.length} مشرف</small></div><button className="hub-refresh" onClick={loadModerators} title="تحديث قائمة المشرفين"><RotateCw size={16} /></button></div>
            {moderatorsLoading ? <div className="hub-empty">جارٍ تحميل قائمة المشرفين...</div>
              : moderators.length === 0 ? <div className="hub-empty">لم تتم إضافة مشرفين بعد.</div>
              : moderators.map(moderator => <article className="hub-moderator-row" key={moderator.id}>
                <div><strong>{moderator.display_name || "مشرف"}</strong><span dir="ltr">@{moderator.username}</span><small>أُضيف في {new Date(moderator.created_at).toLocaleDateString("ar-EG")}</small></div>
                <button className="hub-secondary compact" disabled={removingModeratorId === moderator.id} onClick={() => removeModerator(moderator)}>{removingModeratorId === moderator.id ? "جارٍ السحب..." : "سحب الصلاحية"}</button>
              </article>)}
          </section>
          <div className="hub-moderator-note"><CheckCircle2 size={17} /><div><strong>حدود الصلاحيات</strong><p>الحساب الرئيسي syznstwr وحده يستطيع إنشاء المشرفين أو سحب صلاحياتهم. سحب الصلاحية لا يحذف حساب الشخص أو نتائجه أو المحتوى الذي أنشأه.</p></div></div>
        </div>
      )}

      {!loading && tab === "studio" && <LearningStudioAdmin session={session} />}

      {!loading && tab === "site" && <SiteContentEditor />}

      {!loading && tab === "messages" && (
        <section className="hub-panel">
          <div className="hub-panel-heading"><h2>صندوق الرسائل ({messages.length})</h2></div>
          {messages.length === 0 ? <div className="hub-empty">لا توجد رسائل واردة.</div> : messages.map(message => (
            <article className="hub-message" key={message.id}>
              <div className="hub-message-top"><strong>{message.subject}</strong><small>{new Date(message.created_at).toLocaleString("ar-EG")}</small></div>
              {message.message && <p>{message.message}</p>}
              {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                <div className="hub-message-attachments">
                  <strong>المرفقات ({message.attachments.length})</strong>
                  <div className="hub-message-attachment-list">
                    {message.attachments.map((attachment, index) => {
                      const mime = String(attachment?.mime_type || "");
                      const AttachmentIcon = mime.startsWith("image/") ? ImageIcon : mime.startsWith("video/") ? Video : FileText;
                      const key = message.id + ":" + String(attachment?.path || "");
                      return (
                        <button
                          type="button"
                          className="hub-message-attachment"
                          key={attachment?.path || index}
                          onClick={() => openMessageAttachment(message, attachment)}
                          disabled={openingAttachment === key}
                        >
                          <AttachmentIcon size={16} />
                          <span><b>{attachment?.file_name || "ملف مرفق"}</b><small>{humanSize(attachment?.file_size)}</small></span>
                          {openingAttachment === key ? <small>جارٍ الفتح...</small> : <ExternalLink size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="hub-message-bottom"><span>{message.name} · {message.email}</span><div><select value={message.status} onChange={e => updateMessage(message,e.target.value)}><option value="new">جديدة</option><option value="read">مقروءة</option><option value="archived">مؤرشفة</option></select><button onClick={() => removeMessage(message)} title="حذف الرسالة"><Trash2 size={15} /></button></div></div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
