import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight, Atom, BookOpen, CheckCircle2, ChevronLeft, Clock3,
  FlaskConical, GraduationCap, Layers3, Library, ListChecks, Search, Sparkles
} from "lucide-react";
import { supabase } from "./lib/supabase.js";
import ExperimentSimulator from "./ExperimentSimulator.jsx";
import "./learning-studio.css";

const EMPTY = { subjects: [], units: [], lessons: [], experiments: [] };

function lines(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function PageHeader() {
  return (
    <header className="learning-public-header">
      <Link to="/" className="learning-brand"><span className="learning-brand-mark"><GraduationCap size={20}/></span><span><b>Tay Space</b><small>منصة التعلم بالتجربة والتطبيق</small></span></Link>
      <nav>
        <Link to="/">الرئيسية</Link>
        <Link to="/experiments">المواد والتجارب</Link>
        <Link to="/library">المكتبة</Link>
        <Link to="/exams">الامتحانات</Link>
        <Link to="/account">حساب الطالب</Link>
      </nav>
    </header>
  );
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
  const { slug } = useParams();
  const [data, setData] = useState(EMPTY);
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
      const [subjects, units, lessons, experiments, session] = await Promise.all([
        supabase.from("learning_subjects").select("id,name,slug,academic_stage,grade_level,track,description,icon,color").eq("is_published", true).order("sort_order"),
        supabase.from("learning_units").select("id,subject_id,title,slug,term,description,sort_order").eq("is_published", true).order("sort_order"),
        supabase.from("learning_lessons").select("id,unit_id,title,slug,summary,content_json,learning_objectives,sort_order").eq("is_published", true).order("sort_order"),
        supabase.from("learning_experiments").select("id,subject_id,unit_id,lesson_id,title,slug,description,experience_type,simulator_type,simulation_config,content_json,sort_order").eq("is_published", true).order("sort_order").order("created_at", { ascending: false }),
        supabase.auth.getSession()
      ]);
      if (!active) return;
      const firstError = subjects.error || units.error || lessons.error || experiments.error;
      if (firstError) setError("تعذر تحميل المواد والتجارب حاليًا. حدّث الصفحة وحاول مرة أخرى.");
      setData({
        subjects: subjects.data || [],
        units: units.data || [],
        lessons: lessons.data || [],
        experiments: experiments.data || []
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
  const visibleUnits = useMemo(
    () => data.units.filter(unit => selectedSubject === "all" || unit.subject_id === selectedSubject),
    [data.units, selectedSubject]
  );
  const visibleExperiments = useMemo(() => data.experiments.filter(item => {
    const matchesSubject = selectedSubject === "all" || item.subject_id === selectedSubject;
    const matchesUnit = selectedUnit === "all" || item.unit_id === selectedUnit;
    const text = (item.title + " " + item.description).toLowerCase();
    return matchesSubject && matchesUnit && text.includes(search.trim().toLowerCase());
  }), [data.experiments, selectedSubject, selectedUnit, search]);

  useEffect(() => {
    setSelectedUnit("all");
  }, [selectedSubject]);

  useEffect(() => {
    setNotice("");
    setObservations("");
    setReflectionAnswers({});
    startedAt.current = Date.now();
  }, [slug]);

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
            <span className="learning-public-kicker"><FlaskConical size={15}/> معمل تفاعلي</span>
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
          <span className="learning-public-kicker"><GraduationCap size={15}/> الصف الثاني من البكالوريا المصرية</span>
          <h1>المواد والتجارب التفاعلية</h1>
          <p>اختر المادة والوحدة، افتح التجربة، غيّر القيم، واكتشف بنفسك كيف تعمل القوانين.</p>
          <div className="learning-list-stats"><span><BookOpen size={16}/>{data.subjects.length} مادة</span><span><Layers3 size={16}/>{data.units.length} وحدة</span><span><FlaskConical size={16}/>{data.experiments.length} تجربة</span></div>
        </div>
        <div className="learning-list-tools">
          <label><Search size={17}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="ابحث عن تجربة أو موضوع..."/></label>
          <select value={selectedSubject} onChange={event=>setSelectedSubject(event.target.value)}><option value="all">كل المواد</option>{data.subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
          <select value={selectedUnit} onChange={event=>setSelectedUnit(event.target.value)}><option value="all">كل الوحدات</option>{visibleUnits.map(unit=><option key={unit.id} value={unit.id}>{unit.title}</option>)}</select>
        </div>
        {error && <div className="learning-error">{error}</div>}
        {loading ? <div className="learning-empty">جارٍ تحميل المواد والتجارب...</div> : visibleExperiments.length === 0 ? <div className="learning-empty"><FlaskConical size={27}/><h2>لا توجد تجارب منشورة لهذا الاختيار</h2><p>ستظهر هنا التجارب التي ينشئها فريق المنصة وينشرها من لوحة الإدارة.</p></div> : (
          <div className="learning-experiment-grid">{visibleExperiments.map(item=><ExperimentCard key={item.id} experiment={item} subject={subjectMap.get(item.subject_id)} unit={unitMap.get(item.unit_id)}/>)}</div>
        )}
      </main>
    </div>
  );
}
