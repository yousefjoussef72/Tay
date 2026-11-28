import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ClipboardList, Copy, Printer,
  FlaskConical, GraduationCap, Lightbulb, Microscope, Search, Sparkles, Target
} from "lucide-react";
import { supabase } from "./lib/supabase.js";
import ExperimentSimulator from "./ExperimentSimulator.jsx";
import "./research-projects.css";

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function Header() {
  return (
    <header className="research-header">
      <Link to="/" className="research-brand">
        <span className="research-brand-icon"><GraduationCap size={20}/></span>
        <span><b>Tay Space</b><small>مساحة البحث والاكتشاف</small></span>
      </Link>
      <nav aria-label="التنقل الرئيسي">
        <Link to="/">الرئيسية</Link>
        <Link to="/experiments">المواد والتجارب</Link>
        <Link to="/research">المشاريع البحثية</Link>
        <Link to="/library">المكتبة</Link>
        <Link to="/exams">الامتحانات</Link>
        <Link to="/account">حساب الطالب</Link>
      </nav>
    </header>
  );
}

function makePlainText(project) {
  const content = project?.content_json || {};
  const out = [
    project?.title || content.title || "بحث علمي",
    "المادة: " + (project?.subject_name || ""),
    "الملخص",
    content.abstract,
    "مشكلة البحث",
    content.research_problem,
    "أسئلة البحث",
    ...list(content.research_questions).map((item, index) => (index + 1) + ". " + item),
    "أهداف البحث",
    ...list(content.objectives).map((item, index) => (index + 1) + ". " + item),
    "أهمية البحث",
    content.importance,
    "المقدمة",
    content.introduction,
    ...list(content.sections).flatMap(section => [section.heading, section.body]),
    "المنهجية",
    content.methodology?.approach,
    ...list(content.methodology?.steps).map((item, index) => (index + 1) + ". " + item),
    "النتائج المتوقعة",
    content.expected_results,
    "المناقشة",
    content.discussion,
    "الخاتمة",
    content.conclusion,
    "التوصيات",
    ...list(content.recommendations),
    "مصادر مقترحة للتحقق",
    ...list(content.references),
  ];
  return out.filter(Boolean).join("\n\n");
}

function ResearchDocument({ project, subject }) {
  const [copyNotice, setCopyNotice] = useState("");
  if (!project) return null;
  const content = project.content_json || {};
  const practical = content.practical_experiment;
  const simulatorType = project.simulator_type || content.simulator_type;
  const simulatorConfig = project.simulation_config || content.simulation_config || {};

  async function copyResearch() {
    try {
      await navigator.clipboard.writeText(makePlainText({ ...project, subject_name: subject?.name }));
      setCopyNotice("تم نسخ نص البحث.");
    } catch {
      setCopyNotice("تعذر النسخ من هذا المتصفح. يمكنك تحديد النص ونسخه يدويًا.");
    }
  }

  return (
    <article className="research-document">
      <div className="research-document-top">
        <div>
          <span className="research-document-kicker"><CheckCircle2 size={14}/> بحث محفوظ في حسابك</span>
          <h2>{project.title}</h2>
          <p>{subject?.name || "المادة"} · {new Date(project.created_at).toLocaleDateString("ar-EG")}</p>
        </div>
        <div className="research-document-actions"><button type="button" className="research-copy-button" onClick={copyResearch}><Copy size={15}/> نسخ البحث</button><button type="button" className="research-copy-button" onClick={() => window.print()}><Printer size={15}/> طباعة / حفظ PDF</button></div>
      </div>
      {copyNotice && <p className="research-copy-notice" role="status">{copyNotice}</p>}

      {content.abstract && <section className="research-paper-section research-abstract"><h3>ملخص البحث</h3><p>{content.abstract}</p>{list(content.keywords).length > 0 && <div className="research-keywords">{list(content.keywords).map((item,index)=><span key={index}>{item}</span>)}</div>}</section>}
      {content.research_problem && <section className="research-paper-section"><h3><Target size={17}/> مشكلة البحث</h3><p>{content.research_problem}</p></section>}
      {list(content.research_questions).length > 0 && <section className="research-paper-section"><h3>أسئلة البحث</h3><ol>{list(content.research_questions).map((item,index)=><li key={index}>{item}</li>)}</ol></section>}
      {list(content.objectives).length > 0 && <section className="research-paper-section"><h3><CheckCircle2 size={17}/> أهداف البحث</h3><ul>{list(content.objectives).map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
      {content.importance && <section className="research-paper-section"><h3><Lightbulb size={17}/> أهمية البحث</h3><p>{content.importance}</p></section>}
      {content.introduction && <section className="research-paper-section"><h3>المقدمة</h3><p>{content.introduction}</p></section>}
      {list(content.sections).length > 0 && <section className="research-paper-section"><h3><BookOpen size={17}/> محاور البحث</h3><div className="research-paper-chapters">{list(content.sections).map((section,index)=><article key={index}><span>المحور {index+1}</span><h4>{section.heading}</h4><p>{section.body}</p></article>)}</div></section>}
      {(content.methodology?.approach || list(content.methodology?.steps).length > 0) && <section className="research-paper-section"><h3><ClipboardList size={17}/> منهجية البحث</h3>{content.methodology?.approach && <p>{content.methodology.approach}</p>}{list(content.methodology?.steps).length > 0 && <ol>{list(content.methodology.steps).map((item,index)=><li key={index}>{item}</li>)}</ol>}</section>}
      {content.expected_results && <section className="research-paper-section"><h3>النتائج المتوقعة</h3><p>{content.expected_results}</p><small>هذه توقعات بحثية وليست نتائج تجربة تم تنفيذها أو قياسها.</small></section>}
      {content.discussion && <section className="research-paper-section"><h3>المناقشة والتحليل</h3><p>{content.discussion}</p></section>}
      {content.conclusion && <section className="research-paper-section"><h3>الخاتمة</h3><p>{content.conclusion}</p></section>}
      {list(content.recommendations).length > 0 && <section className="research-paper-section"><h3>التوصيات</h3><ul>{list(content.recommendations).map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
      {list(content.limitations).length > 0 && <section className="research-paper-section"><h3>حدود البحث</h3><ul>{list(content.limitations).map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
      {list(content.references).length > 0 && <section className="research-paper-section"><h3>مصادر ومراجع مقترحة للتحقق</h3><ul>{list(content.references).map((item,index)=><li key={index}>{item}</li>)}</ul><small>راجع المصدر بنفسك قبل إدراجه في النسخة النهائية. لا تعتبر هذه القائمة توثيقًا لمعلومات لم تتحقق منها.</small></section>}

      {practical && <details className="research-practical">
        <summary><FlaskConical size={17}/> اعرض التجربة العملية المرتبطة بالبحث <span>اختياري</span></summary>
        <div className="research-practical-body">
          <h3>{practical.title}</h3>
          {practical.purpose && <p>{practical.purpose}</p>}
          {practical.hypothesis && <p><b>الفرضية:</b> {practical.hypothesis}</p>}
          {simulatorType ? <div className="research-simulator-wrap"><div className="research-simulator-heading"><Microscope size={17}/> المحاكي التفاعلي</div><ExperimentSimulator simulatorType={simulatorType} config={simulatorConfig}/></div> : <div className="research-no-simulator">هذا النشاط مناسب للتطبيق أو التحليل العملي، لكن لا يوجد محاكي تفاعلي معتمد لهذا النوع من الموضوعات في الموقع حاليًا.</div>}
          {list(practical.materials).length > 0 && <div><b>الأدوات أو المصادر:</b><ul>{list(practical.materials).map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
          {list(practical.steps).length > 0 && <div><b>خطوات التنفيذ:</b><ol>{list(practical.steps).map((item,index)=><li key={index}>{item}</li>)}</ol></div>}
          {(practical.variables?.independent || practical.variables?.dependent || list(practical.variables?.controlled).length > 0) && <div><b>متغيرات الدراسة:</b><ul>{practical.variables?.independent && <li>المتغير المستقل: {practical.variables.independent}</li>}{practical.variables?.dependent && <li>المتغير التابع: {practical.variables.dependent}</li>}{list(practical.variables?.controlled).map((item,index)=><li key={index}>متغير ثابت: {item}</li>)}</ul></div>}
          {list(practical.expected_observations).length > 0 && <div><b>ملاحظات متوقعة:</b><ul>{list(practical.expected_observations).map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
          {list(practical.analysis_questions).length > 0 && <div><b>أسئلة لتحليل التجربة:</b><ol>{list(practical.analysis_questions).map((item,index)=><li key={index}>{item}</li>)}</ol></div>}
          {list(practical.safety_notes).length > 0 && <div><b>تنبيهات السلامة:</b><ul>{list(practical.safety_notes).map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
        </div>
      </details>}

      <div className="research-integrity-note">استخدم هذا البحث كنقطة بداية: راجع المعلومات، أضف ملاحظاتك ومصادرك الأصلية، واكتب النسخة النهائية بأسلوبك. لا تنسب تجربة إلى نفسك قبل تنفيذها فعليًا.</div>
    </article>
  );
}

export default function ResearchProjectsPage() {
  const { subjectSlug } = useParams();
  const [subjects, setSubjects] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [topic, setTopic] = useState("");
  const [detailLevel, setDetailLevel] = useState("standard");
  const [includePractical, setIncludePractical] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      if (!supabase) {
        setNotice("خدمة قاعدة البيانات غير متاحة حاليًا.");
        setLoading(false);
        return;
      }
      const [subjectResult, trackResult, sessionResult] = await Promise.all([
        supabase.from("learning_subjects")
          .select("id,name,slug,academic_stage,grade_level,track,track_id,curriculum_year,subject_kind,description,is_published")
          .eq("is_published", true)
          .order("curriculum_year")
          .order("sort_order"),
        supabase.from("learning_tracks").select("id,name,slug").eq("is_published", true).order("sort_order"),
        supabase.auth.getSession(),
      ]);
      if (!active) return;
      if (subjectResult.error || trackResult.error) {
        setNotice("تعذر تحميل المواد حاليًا. حدّث الصفحة وحاول مرة أخرى.");
      }
      setSubjects(subjectResult.data || []);
      setTracks(trackResult.data || []);
      setSession(sessionResult.data?.session || null);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProjects() {
      if (!session?.user?.id || !supabase) {
        setProjects([]);
        return;
      }
      setLoadingProjects(true);
      const { data, error } = await supabase.from("learning_research_projects")
        .select("id,subject_id,topic,title,content_json,simulator_type,simulation_config,created_at")
        .order("created_at", { ascending: false })
        .limit(40);
      if (!active) return;
      if (error) setNotice("تعذر تحميل الأبحاث المحفوظة. يمكنك إنشاء بحث جديد ثم المحاولة مرة أخرى.");
      else setProjects(data || []);
      setLoadingProjects(false);
    }
    loadProjects();
    return () => { active = false; };
  }, [session?.user?.id]);

  const selectedSubject = subjects.find(subject => subject.slug === subjectSlug) || null;
  const visibleSubjects = useMemo(() => subjects.filter(subject => {
    const trackMatches = selectedTrack === "all" || !subject.track_id || subject.track_id === selectedTrack;
    const gradeMatches = selectedGrade === "all" || String(subject.curriculum_year || 2) === selectedGrade;
    return trackMatches && gradeMatches;
  }), [subjects, selectedTrack, selectedGrade]);
  const subjectProjects = selectedSubject
    ? projects.filter(project => project.subject_id === selectedSubject.id)
    : [];
  const selectedProject = subjectProjects.find(project => project.id === selectedProjectId) || subjectProjects[0] || null;

  useEffect(() => {
    setSelectedProjectId("");
    setTopic("");
    setNotice("");
  }, [subjectSlug]);

  async function generateProject(event) {
    event.preventDefault();
    setNotice("");
    if (!selectedSubject) {
      setNotice("اختر المادة أولًا.");
      return;
    }
    if (topic.trim().length < 3) {
      setNotice("اكتب موضوعًا واضحًا للبحث.");
      return;
    }
    if (!supabase) {
      setNotice("خدمة إنشاء الأبحاث غير متاحة حاليًا.");
      return;
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const activeSession = sessionData?.session;
    if (sessionError || !activeSession) {
      setNotice("سجّل الدخول أولًا حتى نحفظ البحث في حسابك.");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-research-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + activeSession.access_token,
        },
        body: JSON.stringify({
          subject_id: selectedSubject.id,
          topic: topic.trim(),
          detail_level: detailLevel,
          include_practical: includePractical,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.project) {
        throw new Error(data.message || "تعذر إنشاء البحث. حاول مرة أخرى.");
      }
      setProjects(current => [data.project, ...current.filter(item => item.id !== data.project.id)]);
      setSelectedProjectId(data.project.id);
      setNotice("تم إنشاء البحث وحفظه في حسابك بنجاح.");
    } catch (error) {
      setNotice(error.message || "حدث خطأ أثناء إنشاء البحث.");
    } finally {
      setGenerating(false);
    }
  }

  const researchUrl = subjectSlug ? "/research/" + subjectSlug : "/research";

  return (
    <div className="research-page-shell">
      <Header/>
      <main className="research-page-main">
        <Link to="/experiments" className="research-back-link"><ArrowRight size={15}/> العودة إلى المواد والتجارب</Link>
        <section className="research-hero">
          <span className="research-kicker"><Sparkles size={15}/> مساعد البحث بالذكاء الاصطناعي</span>
          <h1>{selectedSubject ? "مشاريع " + selectedSubject.name + " البحثية" : "مركز المشاريع البحثية"}</h1>
          <p>{selectedSubject ? "حوّل فكرتك إلى بحث منظم يناسب المادة والصف والمسار، واحتفظ بنسخ أبحاثك في حسابك." : "اختر مادة دراسية، ثم اكتب موضوعًا لتحصل على مسودة بحث متكاملة قابلة للمراجعة والتطوير."}</p>
          <div className="research-hero-points"><span><BookOpen size={15}/> لكل المواد والمسارات</span><span><ClipboardList size={15}/> بحث منظم بعناصره</span><span><FlaskConical size={15}/> تجربة اختيارية عند ملاءمتها</span></div>
        </section>

        {notice && <div className="research-notice" role="status">{notice}</div>}
        {loading ? <div className="research-empty">جارٍ تحميل المواد...</div> : !subjectSlug ? (
          <section className="research-subject-picker">
            <div className="research-section-head"><div><span>ابدأ من المادة</span><h2>اختر المادة التي تريد البحث فيها</h2></div><b>{visibleSubjects.length} مادة</b></div>
            <div className="research-filter-row">
              <label>المسار<select value={selectedTrack} onChange={event=>setSelectedTrack(event.target.value)}><option value="all">كل المسارات</option>{tracks.map(track=><option key={track.id} value={track.id}>{track.name}</option>)}</select></label>
              <label>الصف<select value={selectedGrade} onChange={event=>setSelectedGrade(event.target.value)}><option value="all">كل الصفوف</option><option value="1">الصف الأول</option><option value="2">الصف الثاني</option><option value="3">الصف الثالث</option></select></label>
            </div>
            <div className="research-subject-grid">
              {visibleSubjects.map(subject=><Link to={"/research/" + subject.slug} className="research-subject-card" key={subject.id}>
                <span className="research-subject-icon"><BookOpen size={20}/></span>
                <small>{subject.grade_level} · {subject.track || "مشتركة بين المسارات"}</small>
                <strong>{subject.name}</strong>
                <p>{subject.description || "أنشئ بحثًا أكاديميًا مناسبًا لهذه المادة."}</p>
                <span className="research-subject-action">ابدأ مشروعًا بحثيًا <ChevronLeft size={15}/></span>
              </Link>)}
              {visibleSubjects.length === 0 && <div className="research-empty">لا توجد مواد مطابقة لهذا الاختيار.</div>}
            </div>
          </section>
        ) : !selectedSubject ? (
          <div className="research-empty"><h2>المادة غير موجودة أو غير منشورة</h2><Link to="/research">اختر مادة أخرى</Link></div>
        ) : (
          <>
            <section className="research-workspace">
              <div className="research-workspace-intro">
                <div><span>{selectedSubject.grade_level} · {selectedSubject.track || "جميع المسارات"}</span><h2>{selectedSubject.name}</h2></div>
                <Link to={researchUrl} className="research-change-subject">تغيير المادة</Link>
              </div>
              <form className="research-form" onSubmit={generateProject}>
                <label className="research-topic-label">ما موضوع البحث الذي تريد إعداده؟
                  <textarea required minLength={3} maxLength={240} rows={3} value={topic} onChange={event=>setTopic(event.target.value)} placeholder="مثال: أثر التغيرات المناخية على التنوع الحيوي في مصر..."/>
                </label>
                <div className="research-options">
                  <label>مستوى التفصيل<select value={detailLevel} onChange={event=>setDetailLevel(event.target.value)}><option value="standard">بحث متوسط التفصيل</option><option value="deep">بحث موسع ومتعمق</option></select></label>
                  <label className="research-checkbox"><input type="checkbox" checked={includePractical} onChange={event=>setIncludePractical(event.target.checked)}/><span><b>أرفق تجربة أو نشاطًا عمليًا</b><small>يظهر داخل البحث عند فتحه، والمحاكي متاح عندما يتوافق الموضوع مع النماذج الموجودة.</small></span></label>
                </div>
                {!session && <div className="research-login-reminder">لإنشاء البحث وحفظه، <Link to="/account">سجّل الدخول إلى حساب الطالب</Link>.</div>}
                <button className="research-generate-button" type="submit" disabled={generating || !topic.trim()}>
                  <Sparkles size={17}/>{generating ? "جارٍ إعداد البحث وحفظه..." : "أنشئ البحث بالذكاء الاصطناعي"}
                </button>
                <p className="research-form-hint">لديك حتى 5 محاولات لإنشاء بحث خلال 24 ساعة. الأبحاث التي تنشئها تظل محفوظة في حسابك.</p>
              </form>
            </section>

            {subjectProjects.length > 0 && <section className="research-saved-section">
              <div className="research-section-head"><div><span>مكتبتك الخاصة</span><h2>أبحاثك السابقة في {selectedSubject.name}</h2></div><b>{subjectProjects.length} بحث</b></div>
              <div className="research-saved-list">{subjectProjects.map(project=><button type="button" key={project.id} className={selectedProject?.id===project.id?"active":""} onClick={()=>setSelectedProjectId(project.id)}><span>{project.title}</span><small>{new Date(project.created_at).toLocaleDateString("ar-EG")}</small></button>)}</div>
            </section>}
            {loadingProjects && session && <div className="research-empty">جارٍ تحميل أبحاثك المحفوظة...</div>}
            {selectedProject && <ResearchDocument project={selectedProject} subject={selectedSubject}/>}
            {!loadingProjects && session && subjectProjects.length===0 && <div className="research-empty"><BookOpen size={22}/><span>لم تنشئ بحثًا لهذه المادة بعد. اكتب موضوعك بالأعلى للبدء.</span></div>}
          </>
        )}

        <div className="research-academic-note"><b>تنبيه أكاديمي:</b> الذكاء الاصطناعي يجهّز مسودة تعليمية. راجع الحقائق بنفسك، وتحقق من المراجع، وأضف نتائجك وملاحظاتك الأصلية قبل تسليم أي بحث.</div>
      </main>
    </div>
  );
}
