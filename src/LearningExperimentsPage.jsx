import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight, Atom, BookOpen, CheckCircle2, ChevronLeft, Clock3,
  FlaskConical, GraduationCap, Layers3, Library, ListChecks, Search, Sparkles,
  Landmark, Languages, BriefcaseBusiness, Cpu, Activity, Wallet, Brain
} from "lucide-react";
import { supabase } from "./lib/supabase.js";
import ExperimentSimulator from "./ExperimentSimulator.jsx";
import "./learning-studio.css";

const EMPTY = { tracks: [], subjects: [], units: [], lessons: [], experiments: [], resources: [] };

function lines(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function SubjectIcon({ slug, icon }) {
  if (slug?.includes("physics") || icon === "atom") return <Atom size={21}/>;
  if (slug?.includes("english") || slug?.includes("language") || icon === "languages") return <Languages size={21}/>;
  if (slug?.includes("history") || slug?.includes("geography") || icon === "landmark") return <Landmark size={21}/>;
  if (slug?.includes("programming") || icon === "cpu") return <Cpu size={21}/>;
  if (slug?.includes("business") || slug?.includes("accounting") || icon === "briefcase-business") return <BriefcaseBusiness size={21}/>;
  if (slug?.includes("psychology") || icon === "brain") return <Brain size={21}/>;
  if (slug?.includes("financial") || icon === "wallet") return <Wallet size={21}/>;
  if (slug?.includes("physical") || icon === "activity") return <Activity size={21}/>;
  return <BookOpen size={21}/>;
}
function TrackIcon({ slug }) {
  if (slug === "medicine-life-sciences") return <Atom size={23}/>;
  if (slug === "engineering-computer-science") return <Cpu size={23}/>;
  if (slug === "business") return <BriefcaseBusiness size={23}/>;
  return <Landmark size={23}/>;
}
const subjectKindLabel = kind => ({
  core:"أساسية مشتركة",
  specialized:"تخصصية",
  non_counting:"لا تضاف للمجموع",
  activity:"نشاط عملي",
  elective:"اختيارية"
}[kind] || "مادة دراسية");

function PageHeader() {
  return (
    <header className="learning-public-header">
      <Link to="/" className="learning-brand">
        <span className="learning-brand-mark"><GraduationCap size={20}/></span>
        <span className="learning-brand-copy"><b>Tay Space</b><small>منصة التعلم بالتجربة والتطبيق</small></span>
      </Link>
      <nav aria-label="التنقل الرئيسي">
        <Link to="/">الرئيسية</Link>
        <Link to="/experiments">المواد والتجارب</Link>
        <Link to="/library">المكتبة</Link>
        <Link to="/exams">الامتحانات</Link>
        <Link to="/account" className="learning-account-link">حساب الطالب</Link>
      </nav>
    </header>
  );
}


function LessonQuiz({ items }) {
  const [answers, setAnswers] = useState({});
  const score = items.reduce((total,item,index)=>total+(answers[index]===item.answer?1:0),0);
  return <section className="learning-content-section learning-lesson-quiz">
    <h2>اختبر فهمك</h2>
    <div className="learning-quiz-score">{score} / {items.length}</div>
    {items.map((item,index)=><article key={index}>
      <h3>{index+1}. {item.question}</h3>
      <div className="learning-quiz-options">{(item.options||[]).map((option,optionIndex)=><button type="button" key={optionIndex} className={answers[index]===optionIndex?(optionIndex===item.answer?"correct":"incorrect"):""} onClick={()=>setAnswers(current=>({...current,[index]:optionIndex}))}>{option}</button>)}</div>
      {answers[index]!==undefined&&<p>{item.why}</p>}
    </article>)}
  </section>;
}

function ExperimentCard({ experiment, subject, unit }) {
  const icon = experiment.experience_type === "virtual_lab" ? <FlaskConical size={20}/> : <Atom size={20}/>;
  return (
    <Link className="learning-experiment-card" to={"/experiments/" + experiment.slug}>
      <div className="learning-experiment-card-icon">{icon}</div>
      <div className="learning-experiment-meta"><span>{subject?.name || "مادة تعليمية"}</span>{unit?.title && <span>{unit.title}</span>}</div>
      <h3>{experiment.title}</h3>
      <p>{experiment.description || "تجربة تفاعلية لفهم الفكرة وتطبيق القوانين."}</p>
      <div className="learning-experiment-card-foot"><span>{experiment.simulator_type ? "محاكاة تفاعلية" : "نشاط تعليمي"}</span><span>ابدأ التجربة <ChevronLeft size={15}/></span></div>
    </Link>
  );
}

export default function LearningExperimentsPage() {
  const { slug, lessonSlug } = useParams();
  const [data, setData] = useState(EMPTY);
  const [selectedTrack, setSelectedTrack] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [observations, setObservations] = useState("");
  const [reflectionAnswers, setReflectionAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const [tracks, subjects, units, lessons, experiments, resources, session] = await Promise.all([
        supabase.from("learning_tracks").select("id,name,slug,description,icon,color,sort_order").eq("is_published", true).order("sort_order"),
        supabase.from("learning_subjects").select("id,name,slug,academic_stage,grade_level,track,track_id,curriculum_year,subject_kind,choice_group,choice_rule,description,icon,color").eq("is_published", true).order("curriculum_year").order("sort_order"),
        supabase.from("learning_units").select("id,subject_id,title,slug,term,description,sort_order").eq("is_published", true).order("sort_order"),
        supabase.from("learning_lessons").select("id,unit_id,title,slug,summary,content_json,learning_objectives,sort_order").eq("is_published", true).order("sort_order"),
        supabase.from("learning_experiments").select("id,subject_id,unit_id,lesson_id,title,slug,description,experience_type,simulator_type,simulation_config,content_json,sort_order").eq("is_published", true).order("sort_order").order("created_at", { ascending: false }),
        supabase.from("learning_resources").select("id,title,description,resource_type,file_path,file_name,external_url,category,file_size,track_id,grade_level,curriculum_year,subject_id,unit_id,lesson_id").eq("is_published", true).order("created_at", { ascending: false }),
        supabase.auth.getSession()
      ]);
      if (!active) return;
      const firstError = tracks.error || subjects.error || units.error || lessons.error || experiments.error || resources.error;
      if (firstError) setError("تعذر تحميل المواد والتجارب حاليًا. حدّث الصفحة وحاول مرة أخرى.");
      const resourceRows = await Promise.all((resources.data || []).map(async item => {
        if (item.resource_type === "link") return { ...item, resolved_url: item.external_url || "" };
        if (!item.file_path) return { ...item, resolved_url: "" };
        const { data: signed, error: signedError } = await supabase.storage.from("tay-library").createSignedUrl(item.file_path, 60 * 60);
        return { ...item, resolved_url: signedError ? "" : (signed?.signedUrl || "") };
      }));
      if (!active) return;
      setData({
        tracks: tracks.data || [],
        subjects: subjects.data || [],
        units: units.data || [],
        lessons: lessons.data || [],
        experiments: experiments.data || [],
        resources: resourceRows
      });
      setUser(session.data?.session?.user || null);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const subjectMap = useMemo(() => new Map(data.subjects.map(item => [item.id, item])), [data.subjects]);
  const unitMap = useMemo(() => new Map(data.units.map(item => [item.id, item])), [data.units]);
  const lessonMap = useMemo(() => new Map(data.lessons.map(item => [item.id, item])), [data.lessons]);
  const selected = slug ? data.experiments.find(item => item.slug === slug) : null;
  const selectedLesson = lessonSlug ? data.lessons.find(item => item.slug === lessonSlug) : null;
  const visibleSubjects = useMemo(() => data.subjects.filter(subject => {
    const matchesTrack = selectedTrack === "all" || !subject.track_id || subject.track_id === selectedTrack;
    const matchesGrade = selectedGrade === "all" || String(subject.curriculum_year || 2) === selectedGrade;
    return matchesTrack && matchesGrade;
  }), [data.subjects, selectedTrack, selectedGrade]);
  const visibleSubjectIds = useMemo(() => new Set(visibleSubjects.map(subject => subject.id)), [visibleSubjects]);
  const visibleUnits = useMemo(
    () => data.units.filter(unit => visibleSubjectIds.has(unit.subject_id) && (selectedSubject === "all" || unit.subject_id === selectedSubject)),
    [data.units, visibleSubjectIds, selectedSubject]
  );
  const visibleLessons = useMemo(() => data.lessons.filter(item => {
    const unit = unitMap.get(item.unit_id);
    const matchesSubject = !!unit && visibleSubjectIds.has(unit.subject_id) && (selectedSubject === "all" || unit.subject_id === selectedSubject);
    const matchesUnit = selectedUnit === "all" || item.unit_id === selectedUnit;
    const text = (item.title + " " + item.summary).toLowerCase();
    return matchesSubject && matchesUnit && text.includes(search.trim().toLowerCase());
  }), [data.lessons, unitMap, visibleSubjectIds, selectedSubject, selectedUnit, search]);
  const visibleExperiments = useMemo(() => data.experiments.filter(item => {
    const matchesSubject = visibleSubjectIds.has(item.subject_id) && (selectedSubject === "all" || item.subject_id === selectedSubject);
    const matchesUnit = selectedUnit === "all" || item.unit_id === selectedUnit;
    const text = (item.title + " " + item.description).toLowerCase();
    return matchesSubject && matchesUnit && text.includes(search.trim().toLowerCase());
  }), [data.experiments, visibleSubjectIds, selectedSubject, selectedUnit, search]);
  const visibleResources = useMemo(() => data.resources.filter(item => {
    const resourceUnit = unitMap.get(item.unit_id);
    const resourceLesson = lessonMap.get(item.lesson_id);
    const resourceSubjectId = item.subject_id || resourceUnit?.subject_id || unitMap.get(resourceLesson?.unit_id)?.subject_id;
    const resourceSubject = subjectMap.get(resourceSubjectId);
    const resourceTrackId = item.track_id || resourceSubject?.track_id || null;
    const resourceYear = item.curriculum_year || resourceSubject?.curriculum_year || null;
    const matchesSubject = !resourceSubjectId || (
      visibleSubjectIds.has(resourceSubjectId) &&
      (selectedSubject === "all" || resourceSubjectId === selectedSubject)
    );
    const matchesTrack = selectedTrack === "all" || !resourceTrackId || resourceTrackId === selectedTrack;
    const matchesGrade = selectedGrade === "all" || !resourceYear || String(resourceYear) === selectedGrade;
    const matchesUnit = selectedUnit === "all" || item.unit_id === selectedUnit || resourceLesson?.unit_id === selectedUnit;
    const text = (item.title + " " + (item.description || "") + " " + (item.category || "")).toLowerCase();
    return matchesSubject && matchesTrack && matchesGrade && matchesUnit && text.includes(search.trim().toLowerCase());
  }), [data.resources, unitMap, lessonMap, subjectMap, visibleSubjectIds, selectedTrack, selectedGrade, selectedSubject, selectedUnit, search]);

  const sharedSubjects = visibleSubjects.filter(subject => !subject.track_id);
  const specialistSubjects = selectedTrack === "all" ? [] : visibleSubjects.filter(subject => subject.track_id === selectedTrack);
  const selectedTrackInfo = data.tracks.find(track => track.id === selectedTrack);

  useEffect(() => {
    setNotice("");
    setObservations("");
    setReflectionAnswers({});
    startedAt.current = Date.now();
  }, [slug, lessonSlug]);

  async function completeExperiment() {
    if (!selected) return;
    if (!user) {
      setNotice("سجّل الدخول بحساب الطالب حتى نضيف التجربة إلى سجل إنجازاتك.");
      return;
    }
    setSaving(true);
    setNotice("");
    const answers = Object.fromEntries(Object.entries(reflectionAnswers).filter(([, value]) => String(value).trim()));
    const { error: saveError } = await supabase.from("learning_experiment_attempts").insert({
      experiment_id: selected.id,
      user_id: user.id,
      answers,
      observations: observations.trim(),
      is_completed: true,
      duration_seconds: Math.max(0, Math.min(86400, Math.round((Date.now() - startedAt.current) / 1000)))
    });
    if (saveError) {
      setNotice("لم نتمكن من حفظ إنجازك. تحقق من اتصالك ثم حاول مرة أخرى.");
    } else {
      setNotice("تم تسجيل إنجاز التجربة في حسابك بنجاح.");
    }
    setSaving(false);
  }

  if (lessonSlug && !loading && !selectedLesson) {
    return <div className="learning-public-shell"><PageHeader/><main className="learning-public-main"><div className="learning-empty"><BookOpen size={28}/><h1>الدرس غير موجود أو لم يعد منشورًا</h1><Link to="/experiments" className="learning-back-link"><ArrowRight size={15}/> العودة إلى المواد والتجارب</Link></div></main></div>;
  }

  if (lessonSlug && selectedLesson) {
    const unit = unitMap.get(selectedLesson.unit_id);
    const subject = unit ? subjectMap.get(unit.subject_id) : null;
    const content = selectedLesson.content_json || {};
    const relatedExperiments = data.experiments.filter(item => item.lesson_id === selectedLesson.id);
    const relatedResources = data.resources.filter(item => item.lesson_id === selectedLesson.id || (!item.lesson_id && item.unit_id === selectedLesson.unit_id) || (!item.lesson_id && !item.unit_id && item.subject_id === unit?.subject_id));
    const sections = lines(content.sections);
    const laws = lines(content.laws);
    const roadmap = lines(content.exam_roadmap);
    const quiz = lines(content.quiz);
    return (
      <div className="learning-public-shell">
        <PageHeader/>
        <main className="learning-public-main learning-experiment-detail">
          <Link to="/experiments" className="learning-back-link"><ArrowRight size={15}/> العودة إلى المواد والتجارب</Link>
          <div className="learning-detail-title">
            <div className="learning-breadcrumb">{subject?.name || "المادة"}{unit?.title ? " / " + unit.title : ""}</div>
            <span className="learning-public-kicker"><BookOpen size={15}/> درس تعليمي</span>
            <h1>{selectedLesson.title}</h1>
            <p>{selectedLesson.summary}</p>
          </div>
          {content.intro && <section className="learning-content-section"><h2>مقدمة الدرس</h2><p>{content.intro}</p></section>}
          {selectedLesson.learning_objectives?.length > 0 && <section className="learning-content-section"><h2><CheckCircle2 size={18}/> أهداف التعلم</h2><ul>{selectedLesson.learning_objectives.map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
          {sections.length > 0 && <section className="learning-content-section"><h2>شرح الدرس</h2><div className="learning-lesson-grid">{sections.map((section,index)=><article key={section.id || index}><span>{section.subtitle || "شرح"}</span><h3>{section.title}</h3><p>{section.body}</p>{section.example && <p className="learning-example">{section.example}</p>}{section.formula && <strong dir="ltr">{section.formula}</strong>}<details className="learning-explain-details"><summary>افهمها ببساطة / للامتحان / بعمق</summary><p>{section.simple}</p><p>{section.exam}</p><p>{section.deep}</p></details></article>)}</div></section>}
          {laws.length > 0 && <section className="learning-content-section"><h2>القوانين والملخص</h2><div className="learning-formula-grid">{laws.map((item,index)=><div key={index}><b>{item.title}</b><strong dir="ltr">{item.formula}</strong><small>{item.note}</small></div>)}</div></section>}
          {roadmap.length > 0 && <section className="learning-content-section"><h2>خريطة الحل في الامتحان</h2><ol>{roadmap.map((item,index)=><li key={index}>{item}</li>)}</ol></section>}
          {quiz.length > 0 && <LessonQuiz items={quiz}/>}
          {relatedResources.length > 0 && <section className="learning-content-section"><h2><Library size={18}/> ملفات ومصادر الدرس</h2><div className="learning-related-resource-grid">{relatedResources.map(item=><article className="learning-related-resource" key={item.id}>
            <span>{item.category || "مصدر تعليمي"}</span><h3>{item.title}</h3><p>{item.description}</p>
            {item.resource_type === "video" && item.resolved_url && <video controls playsInline preload="metadata" src={item.resolved_url}>متصفحك لا يدعم تشغيل الفيديو.</video>}
            {item.resource_type === "image" && item.resolved_url && <img src={item.resolved_url} alt={item.title}/>}
            {item.resolved_url ? <a href={item.resolved_url} target="_blank" rel="noreferrer">{item.resource_type === "video" ? "مشاهدة الفيديو" : item.resource_type === "link" ? "فتح المصدر الخارجي" : "فتح أو تنزيل الملف"}</a> : <small>المصدر غير متاح مؤقتًا.</small>}
          </article>)}</div></section>}
          {relatedExperiments.length > 0 && <section className="learning-content-section"><h2><FlaskConical size={18}/> جرّب ما تعلمته</h2><div className="learning-experiment-grid">{relatedExperiments.map(experiment=><ExperimentCard key={experiment.id} experiment={experiment} subject={subject} unit={unit}/>)}</div></section>}
        </main>
      </div>
    );
  }

  if (slug && !loading && !selected) {
    return <div className="learning-public-shell"><PageHeader/><main className="learning-public-main"><div className="learning-empty"><BookOpen size={28}/><h1>التجربة غير موجودة أو لم تعد منشورة</h1><Link to="/experiments" className="learning-back-link"><ArrowRight size={15}/> العودة إلى المواد والتجارب</Link></div></main></div>;
  }

  if (slug && selected) {
    const subject = subjectMap.get(selected.subject_id);
    const unit = unitMap.get(selected.unit_id);
    const lesson = lessonMap.get(selected.lesson_id);
    const content = selected.content_json || {};
    const objectives = lines(content.objectives);
    const steps = lines(content.steps);
    const observationsList = lines(content.observations);
    const formulas = lines(content.formulas);
    const questions = lines(content.reflection_questions);
    return (
      <div className="learning-public-shell">
        <PageHeader/>
        <main className="learning-public-main learning-experiment-detail">
          <Link to="/experiments" className="learning-back-link"><ArrowRight size={15}/> العودة إلى قائمة التجارب</Link>
          <div className="learning-detail-title">
            <div className="learning-breadcrumb">{subject?.name || "المادة"}{unit?.title ? " / " + unit.title : ""}{lesson?.title ? " / " + lesson.title : ""}</div>
            <span className="learning-public-kicker"><FlaskConical size={15}/>{selected.simulator_type ? "معمل ومحاكاة تفاعلية" : "نشاط تعليمي"}</span>
            <h1>{selected.title}</h1>
            <p>{selected.description}</p>
          </div>
          {content.intro && <section className="learning-content-section"><h2>فكرة التجربة</h2><p>{content.intro}</p></section>}
          {selected.simulator_type && <ExperimentSimulator simulatorType={selected.simulator_type} config={selected.simulation_config || {}}/>}
          {objectives.length > 0 && <section className="learning-content-section"><h2><CheckCircle2 size={18}/> أهداف التعلم</h2><ul>{objectives.map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
          {steps.length > 0 && <section className="learning-content-section"><h2><ListChecks size={18}/> خطوات التجربة</h2><ol>{steps.map((item,index)=><li key={index}>{item}</li>)}</ol></section>}
          {observationsList.length > 0 && <section className="learning-content-section"><h2>ماذا تلاحظ؟</h2><ul>{observationsList.map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
          {formulas.length > 0 && <section className="learning-content-section"><h2>القوانين المستخدمة</h2><div className="learning-formula-grid">{formulas.map((formula,index)=><div dir="ltr" key={index}>{formula}</div>)}</div></section>}
          {lesson?.content_json?.sections?.length > 0 && <section className="learning-content-section"><h2>شرح الدرس المرتبط</h2><div className="learning-lesson-grid">{lesson.content_json.sections.map(section=><article key={section.id || section.title}><span>{section.subtitle || "شرح"}</span><h3>{section.title}</h3><p>{section.body}</p>{section.formula && <strong dir="ltr">{section.formula}</strong>}</article>)}</div></section>}
          {lesson?.content_json?.laws?.length > 0 && <section className="learning-content-section"><h2>ملخص القوانين</h2><div className="learning-formula-grid">{lesson.content_json.laws.map((item,index)=><div key={index}><b>{item.title}</b><strong dir="ltr">{item.formula}</strong><small>{item.note}</small></div>)}</div></section>}
          {questions.length > 0 && <section className="learning-content-section learning-reflection"><h2>فكّر وأجب</h2><p>اكتب ملاحظاتك أو إجاباتك، ثم سجّل إتمام التجربة في حسابك.</p>{questions.map((question,index)=><label key={index}><span>{index+1}. {question}</span><textarea rows="2" value={reflectionAnswers[index] || ""} onChange={event=>setReflectionAnswers(current=>({...current,[index]:event.target.value}))} placeholder="اكتب استنتاجك هنا..."/></label>)}</section>}
          <section className="learning-completion">
            <label>ملاحظاتك بعد التجربة (اختياري)<textarea rows="3" value={observations} onChange={event=>setObservations(event.target.value)} placeholder="ماذا لاحظت؟ ما النتيجة التي توصلت إليها؟"/></label>
            {notice && <p className="learning-notice">{notice}</p>}
            <button type="button" disabled={saving} onClick={completeExperiment}><CheckCircle2 size={17}/>{saving?"جارٍ تسجيل الإنجاز...":"أنهيت التجربة وسجّل إنجازي"}</button>
            {!user && <Link to="/account">تسجيل الدخول لحفظ تقدمك</Link>}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="learning-public-shell">
      <PageHeader/>
      <main className="learning-public-main">
        <div className="learning-list-hero">
          <span className="learning-public-kicker"><GraduationCap size={15}/> البكالوريا المصرية · أربعة مسارات تعليمية</span>
          <h1>مساحتك التعليمية لكل مسار</h1>
          <p>استكشف المسارات والمواد المشتركة والتخصصية، ثم افتح الوحدات والدروس والملفات والأنشطة والاختبارات المرتبطة بكل مادة.</p>
          <div className="learning-list-stats">
            <span><Layers3 size={16}/>{data.tracks.length} مسارات</span>
            <span><BookOpen size={16}/>{data.subjects.length} مساحات مواد</span>
            <span><BookOpen size={16}/>{data.lessons.length} درس منشور</span>
            <span><FlaskConical size={16}/>{data.experiments.length} نشاط وتجربة</span>
          </div>
        </div>
        <div className="learning-list-tools learning-track-filters">
          <label><Search size={17}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="ابحث عن مادة أو درس أو موضوع..."/></label>
          <select value={selectedTrack} onChange={event=>setSelectedTrack(event.target.value)}><option value="all">كل المسارات</option>{data.tracks.map(track=><option key={track.id} value={track.id}>{track.name}</option>)}</select>
          <select value={selectedGrade} onChange={event=>setSelectedGrade(event.target.value)}><option value="all">كل الصفوف</option><option value="2">الصف الثاني</option><option value="3">الصف الثالث</option></select>
          <select value={selectedSubject} onChange={event=>setSelectedSubject(event.target.value)}><option value="all">كل المواد</option>{visibleSubjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name} · {subject.grade_level}</option>)}</select>
          <select value={selectedUnit} onChange={event=>setSelectedUnit(event.target.value)}><option value="all">كل الوحدات</option>{visibleUnits.map(unit=><option value={unit.id} key={unit.id}>{unit.title}</option>)}</select>
        </div>
        {!loading && <>
          <section className="learning-subjects-section">
            <div className="learning-list-section-head">
              <h2><Layers3 size={18}/> المسارات التعليمية</h2>
              <span>{data.tracks.length} مسارات متاحة</span>
            </div>
            <div className="learning-track-grid">
              {data.tracks.map(track => {
                const trackSubjects = data.subjects.filter(subject =>
                  subject.track_id === track.id &&
                  (selectedGrade === "all" || String(subject.curriculum_year || 2) === selectedGrade)
                );
                const active = selectedTrack === track.id;
                return (
                  <button type="button" key={track.id} className={"learning-track-card" + (active ? " active" : "")}
                    aria-pressed={active}
                    onClick={() => { setSelectedTrack(active ? "all" : track.id); setSelectedSubject("all"); setSelectedUnit("all"); setSearch(""); }}>
                    <span className={"learning-track-icon track-" + track.slug}><TrackIcon slug={track.slug}/></span>
                    <span className="learning-subject-status">{active ? "المسار المحدد" : "مسار البكالوريا"}</span>
                    <strong>{track.name}</strong>
                    <small>{track.description}</small>
                    <span className="learning-subject-counts">
                      <span>{trackSubjects.length} مادة تخصصية</span>
                      <span>{trackSubjects.filter(subject=>subject.curriculum_year===2).length} للصف الثاني</span>
                      <span>{trackSubjects.filter(subject=>subject.curriculum_year===3).length} للصف الثالث</span>
                    </span>
                    <span className="learning-subject-action">{active ? "إظهار كل المسارات" : "افتح المسار"} <ChevronLeft size={15}/></span>
                  </button>
                );
              })}
            </div>
          </section>
          {sharedSubjects.length > 0 && <section className="learning-subjects-section learning-common-subjects">
            <div className="learning-list-section-head">
              <h2><BookOpen size={18}/> المواد المشتركة بين المسارات</h2>
              <span>{sharedSubjects.length} مواد</span>
            </div>
            <div className="learning-subject-grid">
              {sharedSubjects.map(subject => {
                const active = selectedSubject === subject.id;
                const subjectUnits = data.units.filter(item => item.subject_id === subject.id);
                const subjectLessons = data.lessons.filter(item => subjectUnits.some(unit => unit.id === item.unit_id));
                const subjectResources = data.resources.filter(item => item.subject_id === subject.id);
                return (
                  <button type="button" key={subject.id} className={"learning-subject-card" + (active ? " active" : "")}
                    aria-pressed={active}
                    onClick={() => { setSelectedSubject(active ? "all" : subject.id); setSearch(""); }}>
                    <span className="learning-subject-icon"><SubjectIcon slug={subject.slug} icon={subject.icon}/></span>
                    <span className="learning-subject-status">{subjectKindLabel(subject.subject_kind)}</span>
                    <strong>{subject.name}</strong>
                    <small>{subject.description || "مساحة مادة مشتركة قابلة لإضافة المحتوى."}</small>
                    <span className="learning-subject-counts">
                      <span>{subjectUnits.length} وحدة</span><span>{subjectLessons.length} درس</span><span>{subjectResources.length} ملف</span>
                    </span>
                    <span className="learning-subject-action">{active ? "إلغاء التحديد" : "افتح المادة"} <ChevronLeft size={15}/></span>
                  </button>
                );
              })}
            </div>
          </section>}
          <section className="learning-subjects-section learning-specialist-subjects">
            <div className="learning-list-section-head">
              <h2><Atom size={18}/> مواد التخصص</h2>
              <span>{selectedTrackInfo ? selectedTrackInfo.name : "اختر مسارًا لعرض المواد التخصصية"}</span>
            </div>
            {specialistSubjects.length === 0 ? <div className="learning-inline-empty">اختر أحد المسارات الأربعة بالأعلى لعرض مواده التخصصية للصفين الثاني والثالث.</div> : <div className="learning-subject-grid">
              {specialistSubjects.map(subject => {
                const active = selectedSubject === subject.id;
                const subjectUnits = data.units.filter(item => item.subject_id === subject.id);
                const subjectLessons = data.lessons.filter(item => subjectUnits.some(unit => unit.id === item.unit_id));
                const subjectResources = data.resources.filter(item => item.subject_id === subject.id);
                const choiceLabel = subject.choice_rule === "choose_one" ? "اختر مادة واحدة من المجموعة" : subject.choice_rule === "all_required" ? "مادتان تخصصيتان مطلوبتان" : subjectKindLabel(subject.subject_kind);
                return (
                  <button type="button" key={subject.id} className={"learning-subject-card" + (active ? " active" : "")}
                    aria-pressed={active}
                    onClick={() => { setSelectedSubject(active ? "all" : subject.id); setSearch(""); }}>
                    <span className="learning-subject-icon"><SubjectIcon slug={subject.slug} icon={subject.icon}/></span>
                    <span className="learning-subject-status">{subject.grade_level} · {choiceLabel}</span>
                    <strong>{subject.name}</strong>
                    <small>{subject.description || "مساحة تخصصية قابلة لإضافة الوحدات والدروس والملفات."}</small>
                    <span className="learning-subject-counts">
                      <span>{subjectUnits.length} وحدة</span><span>{subjectLessons.length} درس</span><span>{subjectResources.length} ملف</span>
                    </span>
                    <span className="learning-subject-action">{active ? "إلغاء التحديد" : "افتح المادة"} <ChevronLeft size={15}/></span>
                  </button>
                );
              })}
            </div>}
          </section>
          {selectedSubject !== "all" && <button type="button" className="learning-all-subjects" onClick={() => {setSelectedSubject("all");setSelectedUnit("all")}}>عرض جميع المواد المحددة</button>}
        </>}
        {error && <div className="learning-error">{error}</div>}
        {loading ? <div className="learning-empty">جارٍ تحميل المواد والدروس والتجارب...</div> : <>
          <section className="learning-list-section"><div className="learning-list-section-head"><h2><BookOpen size={18}/> الدروس</h2><span>{visibleLessons.length} درس</span></div>
            {visibleLessons.length === 0 ? <div className="learning-inline-empty">لا توجد دروس منشورة لهذا الاختيار بعد.</div> : <div className="learning-experiment-grid">{visibleLessons.map(lesson=>{const unit=unitMap.get(lesson.unit_id);const subject=unit?subjectMap.get(unit.subject_id):null;return <Link className="learning-experiment-card learning-lesson-card" key={lesson.id} to={"/lessons/"+lesson.slug}><div className="learning-experiment-card-icon"><BookOpen size={20}/></div><div className="learning-experiment-meta"><span>{subject?.name||"مادة تعليمية"}</span>{unit?.title&&<span>{unit.title}</span>}</div><h3>{lesson.title}</h3><p>{lesson.summary}</p><div className="learning-experiment-card-foot"><span>شرح وقوانين</span><span>افتح الدرس <ChevronLeft size={15}/></span></div></Link>})}</div>}
          </section>
          <section className="learning-list-section"><div className="learning-list-section-head"><h2><Library size={18}/> الملفات والمصادر</h2><span>{visibleResources.length} ملف أو مصدر</span></div>
            {visibleResources.length === 0 ? <div className="learning-inline-empty">لا توجد ملفات مضافة لهذه المادة بعد. يمكنك ربط ملفاتها من تبويب المكتبة والملفات في لوحة الإدارة.</div> : <div className="learning-resource-grid">{visibleResources.map(item => (
              <article className="learning-resource-card" key={item.id}>
                <div className="learning-resource-icon">{item.resource_type === "video" ? <FlaskConical size={19}/> : item.resource_type === "image" ? <BookOpen size={19}/> : <Library size={19}/>}</div>
                <div className="learning-resource-copy"><span>{item.category || "مصدر تعليمي"}</span><h3>{item.title}</h3><p>{item.description || "ملف تعليمي مرتبط بالمادة."}</p></div>
                {item.resource_type === "video" && item.resolved_url && <video controls playsInline preload="metadata" src={item.resolved_url}>متصفحك لا يدعم تشغيل الفيديو.</video>}
                {item.resource_type === "image" && item.resolved_url && <img src={item.resolved_url} alt={item.title}/>}
                {item.resolved_url ? <a href={item.resolved_url} target="_blank" rel="noreferrer">{item.resource_type === "video" ? "مشاهدة الفيديو" : item.resource_type === "link" ? "فتح المصدر" : "فتح أو تنزيل الملف"} <ArrowRight size={14}/></a> : <small>المصدر غير متاح مؤقتًا.</small>}
              </article>
            ))}</div>}
          </section>
          <section className="learning-list-section"><div className="learning-list-section-head"><h2><FlaskConical size={18}/> التجارب والمحاكاة</h2><span>{visibleExperiments.length} تجربة</span></div>
            {visibleExperiments.length === 0 ? <div className="learning-inline-empty">لا توجد تجارب منشورة لهذا الاختيار بعد.</div> : <div className="learning-experiment-grid">{visibleExperiments.map(item=><ExperimentCard key={item.id} experiment={item} subject={subjectMap.get(item.subject_id)} unit={unitMap.get(item.unit_id)}/>)}</div>}
          </section>
        </> }
      </main>
    </div>
  );
}
