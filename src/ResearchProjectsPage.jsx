import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronLeft, FlaskConical,
  GraduationCap, Lightbulb, Microscope, RotateCcw, Sparkles, Target,
} from "lucide-react";
import { supabase } from "./lib/supabase.js";
import ExperimentSimulator from "./ExperimentSimulator.jsx";
import "./research-projects.css";

const asList = value => Array.isArray(value) ? value.filter(Boolean) : [];

function Header() {
  return (
    <header className="research-header">
      <Link to="/" className="research-brand">
        <span className="research-brand-icon"><GraduationCap size={20}/></span>
        <span><b>Tay Space</b><small>مختبر التجارب التفاعلي</small></span>
      </Link>
      <nav aria-label="التنقل الرئيسي">
        <Link to="/">الرئيسية</Link>
        <Link to="/experiments">المواد والتجارب</Link>
        <Link to="/research">مختبر التجارب</Link>
        <Link to="/library">المكتبة</Link>
        <Link to="/exams">الامتحانات</Link>
        <Link to="/account">حساب الطالب</Link>
      </nav>
    </header>
  );
}

function ExperimentResult({ experiment, subjectName }) {
  if (!experiment) return null;
  const content = experiment.content_json || {};
  const simulatorType = experiment.simulator_type || content.simulator_type;
  const config = experiment.simulation_config || content.simulation_config || {};
  const variables = content.variables || {};

  return (
    <article className="research-document experiment-result">
      <div className="research-document-top">
        <div>
          <span className="research-document-kicker"><CheckCircle2 size={14}/> محاكاة محفوظة في حسابك</span>
          <h2>{experiment.title || content.title}</h2>
          <p>{subjectName || "تجربة حرة"} · {new Date(experiment.created_at).toLocaleDateString("ar-EG")}</p>
        </div>
        <span className="experiment-simulator-badge"><Microscope size={14}/> تجربة تفاعلية</span>
      </div>

      {content.description && <section className="experiment-intro"><p>{content.description}</p></section>}
      {content.hypothesis && <section className="experiment-section"><h3><Lightbulb size={17}/> الفرضية</h3><p>{content.hypothesis}</p></section>}

      {simulatorType ? (
        <section className="experiment-simulator-panel">
          <div className="research-simulator-heading"><Microscope size={17}/> المحاكي التفاعلي</div>
          <ExperimentSimulator key={experiment.id} simulatorType={simulatorType} config={config}/>
        </section>
      ) : (
        <div className="research-no-simulator">لم يتم تحديد محاكاة مناسبة لهذا الطلب.</div>
      )}

      {(variables.independent || variables.dependent || asList(variables.controlled).length > 0) && (
        <section className="experiment-section">
          <h3><Target size={17}/> متغيرات التجربة</h3>
          <ul>
            {variables.independent && <li><b>المتغير المستقل:</b> {variables.independent}</li>}
            {variables.dependent && <li><b>المتغير التابع:</b> {variables.dependent}</li>}
            {asList(variables.controlled).map((item,index)=><li key={index}><b>متغير ثابت:</b> {item}</li>)}
          </ul>
        </section>
      )}

      {asList(content.steps).length > 0 && <section className="experiment-section"><h3><CheckCircle2 size={17}/> خطوات التجربة داخل المحاكي</h3><ol>{asList(content.steps).map((item,index)=><li key={index}>{item}</li>)}</ol></section>}
      {asList(content.expected_observations).length > 0 && <section className="experiment-section"><h3>ماذا تلاحظ؟</h3><ul>{asList(content.expected_observations).map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
      {asList(content.analysis_questions).length > 0 && <section className="experiment-section"><h3>أسئلة للتفكير</h3><ol>{asList(content.analysis_questions).map((item,index)=><li key={index}>{item}</li>)}</ol></section>}
      {content.model_limitations && <p className="experiment-model-note"><b>حدود النموذج:</b> {content.model_limitations}</p>}
      {asList(content.safety_notes).length > 0 && <section className="experiment-section experiment-safety"><h3>تنبيهات السلامة</h3><ul>{asList(content.safety_notes).map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
    </article>
  );
}

export default function ResearchProjectsPage() {
  const { subjectSlug } = useParams();
  const [subjects,setSubjects] = useState([]);
  const [session,setSession] = useState(null);
  const [experiments,setExperiments] = useState([]);
  const [selectedExperimentId,setSelectedExperimentId] = useState("");
  const [topic,setTopic] = useState("");
  const [loading,setLoading] = useState(true);
  const [loadingExperiments,setLoadingExperiments] = useState(false);
  const [generating,setGenerating] = useState(false);
  const [notice,setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      if (!supabase) {
        setNotice("خدمة قاعدة البيانات غير متاحة حاليًا.");
        setLoading(false);
        return;
      }
      const [subjectResult,sessionResult] = await Promise.all([
        supabase.from("learning_subjects")
          .select("id,name,slug,academic_stage,grade_level,track,description,is_published")
          .eq("is_published",true)
          .order("sort_order"),
        supabase.auth.getSession(),
      ]);
      if (!active) return;
      if (subjectResult.error) setNotice("تعذر تحميل المجالات حاليًا. حدّث الصفحة وحاول مرة أخرى.");
      setSubjects(subjectResult.data || []);
      setSession(sessionResult.data?.session || null);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  },[]);

  useEffect(() => {
    let active = true;
    async function loadSaved() {
      if (!session?.user?.id || !supabase) {
        setExperiments([]);
        return;
      }
      setLoadingExperiments(true);
      const { data,error } = await supabase.from("learning_research_projects")
        .select("id,subject_id,topic,title,content_json,simulator_type,simulation_config,created_at")
        .order("created_at",{ascending:false})
        .limit(60);
      if (!active) return;
      if (error) setNotice("تعذر تحميل تجاربك المحفوظة. يمكنك إنشاء تجربة جديدة.");
      else setExperiments((data || []).filter(item => item.content_json?.kind === "virtual_experiment"));
      setLoadingExperiments(false);
    }
    loadSaved();
    return () => { active = false; };
  },[session?.user?.id]);

  const selectedSubject = subjects.find(item => item.slug === subjectSlug) || null;
  const subjectExperiments = selectedSubject
    ? experiments.filter(item => item.subject_id === selectedSubject.id)
    : [];
  const selectedExperiment = subjectExperiments.find(item => item.id === selectedExperimentId)
    || subjectExperiments[0]
    || null;

  const subjectMap = useMemo(() => new Map(subjects.map(item => [item.id,item])),[subjects]);

  useEffect(() => {
    setSelectedExperimentId("");
    setTopic("");
    setNotice("");
  },[subjectSlug]);

  async function generateExperiment(event) {
    event.preventDefault();
    setNotice("");
    if (!selectedSubject) {
      setNotice("اختر مجالًا لتنظيم التجربة أولًا.");
      return;
    }
    if (topic.trim().length < 3) {
      setNotice("اكتب فكرة التجربة بصورة أوضح.");
      return;
    }
    if (!supabase) {
      setNotice("خدمة إنشاء المحاكاة غير متاحة حاليًا.");
      return;
    }
    const { data: sessionData,error:sessionError } = await supabase.auth.getSession();
    const activeSession = sessionData?.session;
    if (sessionError || !activeSession) {
      setNotice("سجّل الدخول أولًا حتى نحفظ المحاكاة في حسابك.");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-virtual-experiment",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:"Bearer "+activeSession.access_token,
        },
        body:JSON.stringify({subject_id:selectedSubject.id,topic:topic.trim()}),
      });
      const data = await response.json().catch(()=>({}));
      if (!response.ok || !data.ok || !data.experiment) {
        throw new Error(data.message || "تعذر إنشاء المحاكاة. حاول مرة أخرى.");
      }
      setExperiments(current => [data.experiment,...current.filter(item=>item.id!==data.experiment.id)]);
      setSelectedExperimentId(data.experiment.id);
      setNotice("تم إنشاء المحاكاة وحفظها في حسابك.");
    } catch (error) {
      setNotice(error.message || "حدث خطأ أثناء إنشاء المحاكاة.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="research-page-shell">
      <Header/>
      <main className="research-page-main">
        <Link to="/experiments" className="research-back-link"><ArrowRight size={15}/> العودة إلى المواد والتجارب</Link>
        <section className="research-hero experiment-hero">
          <span className="research-kicker"><Sparkles size={15}/> مختبر التجارب بالذكاء الاصطناعي</span>
          <h1>{selectedSubject ? "مختبر " + selectedSubject.name : "مختبر التجارب التفاعلي"}</h1>
          <p>اكتب فكرة أي تجربة علمية آمنة، حتى لو كانت خارج المنهج. سيختار الذكاء الاصطناعي نموذجًا مناسبًا ويحوّلها إلى محاكاة تفاعلية تستكشفها بنفسك، بدل إنشاء بحث طويل.</p>
          <div className="research-hero-points">
            <span><FlaskConical size={15}/> تجارب من داخل المنهج وخارجه</span>
            <span><Microscope size={15}/> محاكاة تفاعلية قابلة للتغيير</span>
            <span><BookOpen size={15}/> خطوات وملاحظات محفوظة بحسابك</span>
          </div>
        </section>

        {notice && <div className="research-notice" role="status">{notice}</div>}
        {loading ? <div className="research-empty">جارٍ تحميل المجالات...</div> : !subjectSlug ? (
          <section className="research-subject-picker">
            <div className="research-section-head"><div><span>اختر تصنيفًا فقط</span><h2>في أي مجال تريد إجراء التجربة؟</h2></div><b>{subjects.length} مجالًا</b></div>
            <p className="experiment-scope-note">اختيار المجال لتنظيم تجاربك المحفوظة فقط، ولا يلزم أن تكون التجربة من المنهج الدراسي لهذا المجال.</p>
            <div className="research-subject-grid">
              {subjects.map(subject=><Link to={"/research/"+subject.slug} className="research-subject-card" key={subject.id}>
                <span className="research-subject-icon"><FlaskConical size={20}/></span>
                <small>{subject.grade_level} · {subject.track || "مجال عام"}</small>
                <strong>{subject.name}</strong>
                <p>{subject.description || "استخدم هذا المجال لتنظيم تجاربك التفاعلية."}</p>
                <span className="research-subject-action">ابدأ تجربة <ChevronLeft size={15}/></span>
              </Link>)}
            </div>
          </section>
        ) : !selectedSubject ? (
          <div className="research-empty"><h2>المجال غير موجود أو غير منشور</h2><Link to="/research">اختر مجالًا آخر</Link></div>
        ) : (
          <>
            <section className="research-workspace">
              <div className="research-workspace-intro">
                <div><span>{selectedSubject.grade_level} · {selectedSubject.track || "جميع المسارات"}</span><h2>{selectedSubject.name}</h2></div>
                <Link to="/research" className="research-change-subject">تغيير المجال</Link>
              </div>
              <form className="research-form" onSubmit={generateExperiment}>
                <label className="research-topic-label">ما التجربة التي تريد محاكاتها؟
                  <textarea required minLength={3} maxLength={240} rows={3} value={topic} onChange={event=>setTopic(event.target.value)} placeholder="مثال: كيف تنتشر الحرارة في جسم معدني؟ أو كيف تنمو جماعة من الكائنات في بيئة محدودة؟"/>
                </label>
                <div className="experiment-builder-note">
                  <b>اكتب أي فكرة آمنة تريد استكشافها</b>
                  <span>ليس مطلوبًا أن تكون في المنهج أو حتى مرتبطة بالمادة المختارة. سيختار النظام محاكيًا متخصصًا أو نموذجًا رياضيًا تفاعليًا عامًا، ويوضح حدود النموذج.</span>
                </div>
                {!session && <div className="research-login-reminder">لإنشاء التجربة وحفظها، <Link to="/account">سجّل الدخول إلى حساب الطالب</Link>.</div>}
                <button className="research-generate-button" type="submit" disabled={generating || !topic.trim()}>
                  <Sparkles size={17}/>{generating ? "جارٍ بناء المحاكاة..." : "أنشئ المحاكاة التفاعلية"}
                </button>
                <p className="research-form-hint">لديك حتى 5 محاولات لإنشاء محاكاة خلال 24 ساعة. المحاولة الفاشلة لا تُخصم، والتجارب الناجحة تظل محفوظة في حسابك.</p>
              </form>
            </section>

            {subjectExperiments.length > 0 && <section className="research-saved-section">
              <div className="research-section-head"><div><span>مكتبتك الخاصة</span><h2>تجاربك المحفوظة في {selectedSubject.name}</h2></div><b>{subjectExperiments.length} تجربة</b></div>
              <div className="research-saved-list">{subjectExperiments.map(item=><button type="button" key={item.id} className={selectedExperiment?.id===item.id?"active":""} onClick={()=>setSelectedExperimentId(item.id)}><span>{item.title}</span><small>{new Date(item.created_at).toLocaleDateString("ar-EG")}</small></button>)}</div>
            </section>}
            {loadingExperiments && session && <div className="research-empty">جارٍ تحميل تجاربك المحفوظة...</div>}
            {selectedExperiment && <ExperimentResult experiment={selectedExperiment} subjectName={subjectMap.get(selectedExperiment.subject_id)?.name}/>}
            {!loadingExperiments && session && subjectExperiments.length===0 && <div className="research-empty"><FlaskConical size={22}/><span>لم تحفظ تجربة في هذا المجال بعد. اكتب فكرتك بالأعلى وابدأ الاستكشاف.</span></div>}
          </>
        )}

        <div className="research-academic-note"><b>مهم:</b> هذه نماذج ومحاكاة تعليمية مبسطة، وليست بديلًا عن تجربة واقعية أو قياس معملي. قد تختلف النتائج عن الواقع إذا كانت افتراضات النموذج محدودة. التجارب الخطرة لا تُنفذ خارج الشاشة.</div>
      </main>
    </div>
  );
}
