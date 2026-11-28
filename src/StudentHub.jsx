import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BookOpen, FileText, Image as ImageIcon, ExternalLink, Search, ClipboardList, Clock3, ArrowRight, CheckCircle2, LockKeyhole, Download } from "lucide-react";
import { supabase } from "./lib/supabase.js";
import "./admin-content.css";
import { useSiteCopy } from "./siteCopy.js";

const LIBRARY_BUCKET = "tay-library";

async function signedLibraryUrl(path) {
  if (!path) return "";
  const { data, error } = await supabase.storage.from(LIBRARY_BUCKET).createSignedUrl(path, 60 * 60);
  return error ? "" : (data?.signedUrl || "");
}

function safeHubHref(value, fallback = "/") {
  const href = String(value || "").trim();
  if (!href || href.startsWith("//")) return fallback;
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(href) ? href : fallback;
}

function PublicHubHeader() {
  const { copy } = useSiteCopy();
  if (copy.showHeader === false) return null;
  return <header className="public-hub-header"><a href={safeHubHref(copy.navHomeUrl, "/")} className="public-hub-brand">{copy.brandLogoUrl ? <img className="site-brand-image" src={copy.brandLogoUrl} alt={copy.brandName} /> : null}{copy.brandName} <span>{copy.publicHubTagline}</span></a><nav><a href={safeHubHref(copy.navLibraryUrl, "/library")}>{copy.navLibrary}</a><a href={safeHubHref(copy.navExamsUrl, "/exams")}>{copy.navExams}</a><a href={safeHubHref(copy.navAccountUrl, "/account")}>{copy.navAccount}</a><a href={safeHubHref(copy.navHomeUrl, "/")}>{copy.navHome}</a></nav></header>;
}

export function LibraryPage() {
  const { copy } = useSiteCopy();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error: loadError } = await supabase
        .from("learning_resources")
        .select("id,title,description,resource_type,file_path,file_name,external_url,category,file_size,created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (loadError) {
        if (!active) return;
        setError("load");
        setItems([]);
        setLoading(false);
        return;
      }
      const resolvedItems = await Promise.all((data || []).map(async item => ({
        ...item,
        resolved_url: item.resource_type === "link"
          ? item.external_url
          : await signedLibraryUrl(item.file_path),
      })));
      if (!active) return;
      setItems(resolvedItems);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const categories = ["ALL", ...new Set(items.map(item => item.category || copy.libraryGeneralCategory))];
  const filtered = items.filter(item =>
    (category === "ALL" || item.category === category) &&
    (item.title + " " + item.description).toLowerCase().includes(query.toLowerCase())
  );

  return <div className="public-hub-shell">
    <PublicHubHeader />
    <main className="public-hub-main">
      <div className="public-hub-kicker">{copy.libraryKicker}</div>
      <h1>{copy.libraryTitle}</h1>
      <p className="public-hub-lead">{copy.libraryDescription}</p>
      <div className="library-tools">
        <label><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={copy.librarySearchPlaceholder} /></label>
        <select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c === "ALL" ? copy.libraryAllCategories : c}</option>)}</select>
      </div>
      {error && <p className="hub-alert error">{error === "load" ? copy.libraryLoadError : error}</p>}
      {loading ? <div className="public-hub-empty">{copy.libraryLoading}</div> : filtered.length === 0 ? <div className="public-hub-empty">{copy.libraryEmpty}</div> : <div className="public-resource-grid">
        {filtered.map(item => {
          const url = item.resolved_url || "";
          return <article className="public-resource-card" key={item.id}>
            {item.resource_type === "image" && url ? <a href={url} target="_blank" rel="noreferrer" className="public-resource-image"><img src={url} alt={item.title} /></a> : <div className="public-resource-symbol">{item.resource_type === "link" ? <ExternalLink size={24} /> : item.resource_type === "pdf" ? <FileText size={24} /> : <BookOpen size={24} />}</div>}
            <span className="public-resource-category">{item.category || copy.libraryGeneralCategory}</span>
            <h2>{item.title}</h2>
            <p>{item.description || copy.libraryFileFallback}</p>
            {url ? <a className="public-resource-open" href={url} target="_blank" rel="noreferrer">{item.resource_type === "image" ? copy.libraryImageOpen : item.resource_type === "link" ? copy.libraryLinkOpen : copy.libraryOpenFile} <Download size={15} /></a> : <span className="public-resource-open">{copy.libraryFileUnavailable}</span>}
          </article>;
        })}
      </div>}
    </main>
  </div>;
}

export function ExamsPage() {
  const { copy } = useSiteCopy();
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [active, setActive] = useState(false);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const [attemptSessionId, setAttemptSessionId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      const [{ data: sessionData }, examResult] = await Promise.all([
        supabase.auth.getSession(),
        examId
          ? supabase.from("exams").select("id,title,description,duration_minutes,cover_image_url").eq("id", examId).eq("is_published", true).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!alive) return;
      setUser(sessionData.session?.user || null);
      if (examId) {
        if (examResult.error || !examResult.data) {
          setError(copy.examUnavailable);
        } else {
          setExam(examResult.data);
          const { data: qs, error: questionsError } = await supabase
            .from("exam_questions")
            .select("id,prompt,question_type,options,points,sort_order,image_url")
            .eq("exam_id", examId)
            .order("sort_order");
          if (questionsError) setError(copy.examQuestionsLoadError);
          setQuestions(qs || []);
        }
      } else {
        const { data, error: examsError } = await supabase
          .from("exams")
          .select("id,title,description,duration_minutes,cover_image_url,created_at")
          .eq("is_published", true)
          .order("created_at", { ascending: false });
        if (examsError) setError(copy.examListLoadError);
        setExams(data || []);
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [examId, copy.examUnavailable, copy.examQuestionsLoadError, copy.examListLoadError]);

  async function submitExam() {
    if (!exam || !attemptSessionId || submitting || result) return;
    setSubmitting(true);
    setSubmissionError("");
    try {
      const { data, error: submitError } = await supabase.functions.invoke("submit-exam", {
        body: { session_id: attemptSessionId, answers },
      });
      if (submitError || !data?.ok) {
        const code = data?.error || "";
        setSubmissionError(code === "exam_time_expired" ? copy.examTimeExpired : (data?.message || copy.examSubmitError));
        setActive(false);
        if (code === "exam_time_expired" || code === "exam_session_not_found" || code === "exam_session_already_submitted") {
          setAttemptSessionId(null);
          setExpiresAt("");
        }
        return;
      }
      setResult(data.result);
      setActive(false);
    } catch {
      setSubmissionError(copy.examSubmitError);
      setActive(false);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!active || !expiresAt || result || submitting) return;
    const updateRemaining = () => {
      const serverNow = Date.now() + serverClockOffset;
      const next = Math.max(0, Math.ceil((Date.parse(expiresAt) - serverNow) / 1000));
      setRemaining(next);
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [active, expiresAt, serverClockOffset, result, submitting]);

  useEffect(() => {
    if (active && remaining === 0 && !result && !submitting && attemptSessionId) submitExam();
  }, [active, remaining, result, submitting, attemptSessionId]);

  async function beginExam() {
    if (!user) {
      navigate("/account");
      return;
    }
    setStarting(true);
    setSubmissionError("");
    setError("");
    setAttemptSessionId(null);
    setExpiresAt("");
    try {
      const { data, error: startError } = await supabase.functions.invoke("start-exam", {
        body: { exam_id: exam.id },
      });
      if (startError || !data?.ok || !data?.session_id || !data?.expires_at) {
        setSubmissionError(data?.message || copy.examStartError);
        return;
      }
      const offset = Date.parse(data.server_now || new Date().toISOString()) - Date.now();
      setServerClockOffset(offset);
      setAttemptSessionId(data.session_id);
      setExpiresAt(data.expires_at);
      setAnswers({});
      setResult(null);
      setRemaining(Math.max(0, Math.ceil((Date.parse(data.expires_at) - Date.parse(data.server_now || new Date().toISOString())) / 1000)));
      setActive(true);
    } catch {
      setSubmissionError(copy.examStartError);
    } finally {
      setStarting(false);
    }
  }

  const formatTime = seconds => String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");

  return <div className="public-hub-shell">
    <PublicHubHeader />
    <main className="public-hub-main">
      {!examId ? <>
        <div className="public-hub-kicker">{copy.examsKicker}</div>
        <h1>{copy.examsTitle}</h1>
        <p className="public-hub-lead">{copy.examsDescription}</p>
        {error && <p className="hub-alert error">{error}</p>}
        {loading ? <div className="public-hub-empty">{copy.examsLoading}</div> : exams.length === 0 ? <div className="public-hub-empty">{copy.examsEmpty}</div> : <div className="public-exam-grid">
          {exams.map(item => <article className="public-exam-card" key={item.id}>{item.cover_image_url ? <img className="public-exam-card-cover" src={item.cover_image_url} alt={item.title} /> : <div className="public-resource-symbol"><ClipboardList size={24} /></div>}<h2>{item.title}</h2><p>{item.description || copy.examDescriptionFallback}</p><div className="public-exam-meta"><span><Clock3 size={14} /> {item.duration_minutes} {copy.examMinuteUnit}</span></div><Link className="public-resource-open" to={"/exams/" + item.id}>{copy.examViewButton} <ArrowRight size={15} /></Link></article>)}
        </div>}
      </> : loading ? <div className="public-hub-empty">{copy.examLoading}</div> : error ? <div className="public-hub-empty">{error}</div> : exam ? <>
        <Link className="public-back-link" to="/exams">← {copy.examBackLabel}</Link>
        <div className="public-hub-kicker">{copy.examTrainingLabel}</div>
        <h1>{exam.title}</h1>
        {exam.cover_image_url && <img className="public-exam-detail-cover" src={exam.cover_image_url} alt={exam.title} />}
        <p className="public-hub-lead">{exam.description || copy.examDetailFallback}</p>
        {!active && !result && <section className="public-exam-start"><div><Clock3 size={18} /> {copy.examDurationLabel}: {exam.duration_minutes} {copy.examMinuteUnit}</div><div><ClipboardList size={18} /> {copy.examQuestionsCountLabel}: {questions.length}</div><p>{user ? copy.examNoAnswersNotice : copy.examLoginNotice}</p>{submissionError && <p className="hub-alert error">{submissionError}</p>}<button className="hub-primary" disabled={starting || submitting} onClick={attemptSessionId && submissionError ? submitExam : beginExam}>{starting ? copy.examStarting : submitting ? copy.examSubmitting : user ? (attemptSessionId && submissionError ? copy.examRetrySubmitButton : copy.examStartButton) : copy.examLoginButton}</button></section>}
        {active && <section className="public-exam-paper">{submissionError && <p className="hub-alert error">{submissionError}</p>}<div className="public-exam-timer"><Clock3 size={17} /> {copy.examTimerLabel} <strong>{formatTime(remaining)}</strong></div>
          {questions.map((q,index) => <article className="public-question" key={q.id}><div className="public-question-title"><strong>{index+1}. {q.prompt}</strong><span>{q.points} {copy.examQuestionPoint}</span></div>
            {q.image_url && <img className="public-question-image" src={q.image_url} alt={"صورة السؤال " + (index + 1)} />}
            {q.question_type === "mcq" || q.question_type === "true_false" ? <div className="public-options">{(q.options || []).map(option => <label key={option}><input type="radio" name={q.id} checked={answers[q.id] === option} onChange={() => setAnswers(prev => ({ ...prev, [q.id]: option }))} />{option}</label>)}</div> : <input className="public-short-answer" value={answers[q.id] || ""} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} placeholder={copy.examShortAnswerPlaceholder} />}
          </article>)}
          <button className="hub-primary" disabled={submitting} onClick={() => { if (window.confirm(copy.examSubmitConfirm)) submitExam(); }}>{submitting ? copy.examSubmitting : copy.examSubmitButton}</button>
        </section>}
        {result && <section className="public-result"><CheckCircle2 size={34} /><span>{copy.examResultLabel}</span><strong>{result.score} / {result.max_score}</strong><h2>{result.percentage}%</h2><p>{copy.examResultSaved}</p><Link className="hub-primary" to="/exams">{copy.examBackToList}</Link></section>}
      </> : null}
    </main>
  </div>;
}
