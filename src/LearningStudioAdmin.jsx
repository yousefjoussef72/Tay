import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Atom, BookOpen, CheckCircle2, ChevronDown, Eye, EyeOff, FlaskConical,
  Layers3, ListChecks, LoaderCircle, Pencil, Plus, Save, Sparkles, Trash2, WandSparkles
} from "lucide-react";
import { supabase } from "./lib/supabase.js";
import ExperimentSimulator, { SIMULATOR_OPTIONS } from "./ExperimentSimulator.jsx";
import "./learning-studio-admin.css";

const SUBJECT_EMPTY = {
  id:null,name:"",slug:"",academic_stage:"البكالوريا المصرية",grade_level:"الصف الثاني",
  track:"مسار الطب وعلوم الحياة",term:"",description:"",icon:"book-open",color:"teal",
  is_published:false,sort_order:0
};
const UNIT_EMPTY = { id:null,subject_id:"",title:"",slug:"",term:"",description:"",is_published:false,sort_order:0 };
const LESSON_EMPTY = { id:null,unit_id:"",title:"",slug:"",summary:"",content_text:"{}",objectives_text:"",is_published:false,sort_order:0 };
const EXPERIMENT_EMPTY = {
  id:null,subject_id:"",unit_id:"",lesson_id:"",title:"",slug:"",description:"",
  experience_type:"simulation",simulator_type:"harmonic_spring",simulation_config_text:"{}",
  intro:"",objectives_text:"",steps_text:"",observations_text:"",formulas_text:"",
  questions_text:"",ai_prompt:"",is_ai_generated:false,is_published:false,sort_order:0
};

const parseJson = (value, fallback) => {
  try { return JSON.parse(value || ""); } catch { return fallback; }
};
const textLines = value => String(value || "").split("\n").map(item => item.trim()).filter(Boolean);
const joinLines = value => Array.isArray(value) ? value.join("\n") : "";
function slugify(value, prefix) {
  const ascii = String(value || "").normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);
  return ascii || `${prefix}-${Date.now().toString(36)}`;
}
function subjectForm(item) { return { ...SUBJECT_EMPTY, ...item }; }
function unitForm(item) { return { ...UNIT_EMPTY, ...item }; }
function lessonForm(item) {
  return {
    ...LESSON_EMPTY, ...item,
    content_text: JSON.stringify(item.content_json || {}, null, 2),
    objectives_text: joinLines(item.learning_objectives)
  };
}
function experimentForm(item) {
  const content = item.content_json || {};
  return {
    ...EXPERIMENT_EMPTY, ...item,
    simulation_config_text: JSON.stringify(item.simulation_config || {}, null, 2),
    intro: content.intro || "",
    objectives_text: joinLines(content.objectives),
    steps_text: joinLines(content.steps),
    observations_text: joinLines(content.observations),
    formulas_text: joinLines(content.formulas),
    questions_text: joinLines(content.reflection_questions)
  };
}
function Field({ label, children, wide=false }) {
  return <label className={wide ? "studio-field studio-field-wide" : "studio-field"}><span>{label}</span>{children}</label>;
}
function Notice({ notice }) {
  return notice ? <div className={"studio-notice " + notice.kind}>{notice.text}</div> : null;
}

export default function LearningStudioAdmin({ session }) {
  const [tab,setTab]=useState("subjects");
  const [subjects,setSubjects]=useState([]);
  const [units,setUnits]=useState([]);
  const [lessons,setLessons]=useState([]);
  const [experiments,setExperiments]=useState([]);
  const [attempts,setAttempts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [notice,setNotice]=useState(null);
  const [subjectDraft,setSubjectDraft]=useState(SUBJECT_EMPTY);
  const [unitDraft,setUnitDraft]=useState(UNIT_EMPTY);
  const [lessonDraft,setLessonDraft]=useState(LESSON_EMPTY);
  const [experimentDraft,setExperimentDraft]=useState(EXPERIMENT_EMPTY);
  const [selectedSubjectId,setSelectedSubjectId]=useState("");
  const [selectedUnitId,setSelectedUnitId]=useState("");
  const [previewOpen,setPreviewOpen]=useState(false);

  const loadData=useCallback(async()=>{
    setLoading(true);
    const [s,u,l,e,a]=await Promise.all([
      supabase.from("learning_subjects").select("*").order("sort_order").order("name"),
      supabase.from("learning_units").select("*").order("sort_order").order("created_at"),
      supabase.from("learning_lessons").select("*").order("sort_order").order("created_at"),
      supabase.from("learning_experiments").select("*").order("sort_order").order("created_at",{ascending:false}),
      supabase.from("learning_experiment_attempts").select("experiment_id,user_id,is_completed,completed_at").order("completed_at",{ascending:false}).limit(1000)
    ]);
    const failure=s.error||u.error||l.error||e.error||a.error;
    if(failure) setNotice({kind:"error",text:"تعذر تحميل بعض بيانات الاستوديو. راجع اتصال قاعدة البيانات وصلاحيات الإدارة."});
    setSubjects(s.data||[]);
    setUnits(u.data||[]);
    setLessons(l.data||[]);
    setExperiments(e.data||[]);
    setAttempts(a.data||[]);
    if(!selectedSubjectId && s.data?.[0]) setSelectedSubjectId(s.data[0].id);
    if(!selectedUnitId && u.data?.[0]) setSelectedUnitId(u.data[0].id);
    setLoading(false);
  },[selectedSubjectId,selectedUnitId]);

  useEffect(()=>{loadData()},[loadData]);

  const activeSubject = subjects.find(item=>item.id===selectedSubjectId);
  const subjectUnits = useMemo(()=>units.filter(item=>item.subject_id===selectedSubjectId),[units,selectedSubjectId]);
  const unitLessons = useMemo(()=>lessons.filter(item=>item.unit_id===selectedUnitId),[lessons,selectedUnitId]);
  const experimentCounts = useMemo(()=>{
    const map=new Map();
    attempts.forEach(attempt=>map.set(attempt.experiment_id,(map.get(attempt.experiment_id)||0)+1));
    return map;
  },[attempts]);
  const expSubjectUnits = useMemo(()=>units.filter(item=>item.subject_id===experimentDraft.subject_id),[units,experimentDraft.subject_id]);
  const expUnitLessons = useMemo(()=>lessons.filter(item=>item.unit_id===experimentDraft.unit_id),[lessons,experimentDraft.unit_id]);
  const configPreview = parseJson(experimentDraft.simulation_config_text,{});

  function resetSubject(){setSubjectDraft(SUBJECT_EMPTY)}
  function resetUnit(){setUnitDraft({...UNIT_EMPTY,subject_id:selectedSubjectId})}
  function resetLesson(){setLessonDraft({...LESSON_EMPTY,unit_id:selectedUnitId})}
  function resetExperiment(){setExperimentDraft({...EXPERIMENT_EMPTY,subject_id:selectedSubjectId}) ;setPreviewOpen(false)}

  async function saveSubject(event){
    event.preventDefault();setSaving(true);setNotice(null);
    const values={...subjectDraft,name:subjectDraft.name.trim(),slug:subjectDraft.slug.trim()||slugify(subjectDraft.name,"subject"),updated_at:new Date().toISOString()};
    const result=values.id
      ? await supabase.from("learning_subjects").update(values).eq("id",values.id).select().single()
      : await supabase.from("learning_subjects").insert({...values,created_by:session?.user?.id}).select().single();
    if(result.error){setNotice({kind:"error",text:"تعذر حفظ المادة. تأكد من عدم تكرار الرابط المختصر."})}
    else {setNotice({kind:"success",text:"تم حفظ بيانات المادة."});setSubjectDraft(subjectForm(result.data));await loadData()}
    setSaving(false);
  }
  async function deleteSubject(item){
    if(!window.confirm("حذف المادة سيحذف وحداتها ودروسها وتجاربها المرتبطة. هل تريد المتابعة؟"))return;
    const {error}=await supabase.from("learning_subjects").delete().eq("id",item.id);
    setNotice(error?{kind:"error",text:"تعذر حذف المادة."}:{kind:"success",text:"تم حذف المادة ومحتواها المرتبط."});
    if(!error){if(selectedSubjectId===item.id){setSelectedSubjectId("");resetSubject()}await loadData()}
  }
  async function saveUnit(event){
    event.preventDefault();setSaving(true);setNotice(null);
    const values={...unitDraft,subject_id:unitDraft.subject_id||selectedSubjectId,title:unitDraft.title.trim(),slug:unitDraft.slug.trim()||slugify(unitDraft.title,"unit"),updated_at:new Date().toISOString()};
    const result=values.id?await supabase.from("learning_units").update(values).eq("id",values.id).select().single():await supabase.from("learning_units").insert({...values,created_by:session?.user?.id}).select().single();
    if(result.error)setNotice({kind:"error",text:"تعذر حفظ الوحدة. راجع المادة والرابط المختصر."});
    else {setNotice({kind:"success",text:"تم حفظ الوحدة."});setUnitDraft(unitForm(result.data));setSelectedSubjectId(values.subject_id);await loadData()}
    setSaving(false);
  }
  async function deleteUnit(item){
    if(!window.confirm("سيؤدي حذف الوحدة إلى حذف دروسها. هل تريد المتابعة؟"))return;
    const {error}=await supabase.from("learning_units").delete().eq("id",item.id);
    setNotice(error?{kind:"error",text:"تعذر حذف الوحدة."}:{kind:"success",text:"تم حذف الوحدة."});
    if(!error){if(selectedUnitId===item.id){setSelectedUnitId("");resetUnit();resetLesson()}await loadData()}
  }
  async function saveLesson(event){
    event.preventDefault();setSaving(true);setNotice(null);
    const content=parseJson(lessonDraft.content_text,{});
    if(!content||typeof content!=="object"||Array.isArray(content)){setSaving(false);setNotice({kind:"error",text:"محتوى الدرس يجب أن يكون كائن JSON صحيحًا."});return}
    const values={
      ...lessonDraft,unit_id:lessonDraft.unit_id||selectedUnitId,title:lessonDraft.title.trim(),
      slug:lessonDraft.slug.trim()||slugify(lessonDraft.title,"lesson"),
      summary:lessonDraft.summary.trim(),content_json:content,
      learning_objectives:textLines(lessonDraft.objectives_text),updated_at:new Date().toISOString()
    };
    delete values.content_text;delete values.objectives_text;
    const result=values.id?await supabase.from("learning_lessons").update(values).eq("id",values.id).select().single():await supabase.from("learning_lessons").insert({...values,created_by:session?.user?.id}).select().single();
    if(result.error)setNotice({kind:"error",text:"تعذر حفظ الدرس. تأكد من صحة JSON ومن اختيار الوحدة."});
    else {setNotice({kind:"success",text:"تم حفظ الدرس."});setLessonDraft(lessonForm(result.data));setSelectedUnitId(values.unit_id);await loadData()}
    setSaving(false);
  }
  async function deleteLesson(item){
    if(!window.confirm("حذف الدرس سيُبقي التجارب موجودة لكن بدون ربط بهذا الدرس. هل تريد المتابعة؟"))return;
    const {error}=await supabase.from("learning_lessons").delete().eq("id",item.id);
    setNotice(error?{kind:"error",text:"تعذر حذف الدرس."}:{kind:"success",text:"تم حذف الدرس."});
    if(!error){if(lessonDraft.id===item.id)resetLesson();await loadData()}
  }

  async function generateExperiment(){
    const subject=subjects.find(item=>item.id===experimentDraft.subject_id);
    if(!subject){setNotice({kind:"error",text:"اختر المادة أولًا قبل طلب إنشاء التجربة."});return}
    if(!session?.access_token){setNotice({kind:"error",text:"انتهت جلسة الإدارة. سجّل الدخول مرة أخرى."});return}
    setGenerating(true);setNotice(null);
    try{
      const response=await fetch("/api/ai/generate-experiment",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
        body:JSON.stringify({
          subject:subject.name,academic_stage:subject.academic_stage,grade_level:subject.grade_level,
          track:subject.track,unit:units.find(item=>item.id===experimentDraft.unit_id)?.title||"",
          lesson:lessons.find(item=>item.id===experimentDraft.lesson_id)?.title||"",
          title:experimentDraft.title,prompt:experimentDraft.ai_prompt,
          simulator_type:experimentDraft.simulator_type
        })
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw new Error(data.message||"تعذر إنشاء التجربة بالذكاء الاصطناعي.");
      const generated=data.experiment;
      setExperimentDraft(current=>({
        ...current,title:generated.title||current.title,
        slug:current.slug||slugify(generated.title,"experiment"),
        description:generated.description||current.description,
        experience_type:generated.experience_type||"simulation",
        simulator_type:generated.simulator_type||current.simulator_type,
        simulation_config_text:JSON.stringify(generated.simulation_config||{},null,2),
        intro:generated.content?.intro||"",
        objectives_text:joinLines(generated.content?.objectives),
        steps_text:joinLines(generated.content?.steps),
        observations_text:joinLines(generated.content?.observations),
        formulas_text:joinLines(generated.content?.formulas),
        questions_text:joinLines(generated.content?.reflection_questions),
        is_ai_generated:true
      }));
      setPreviewOpen(true);
      setNotice({kind:"success",text:"تم إنشاء مسودة التجربة. راجع المحتوى والمحاكاة ثم احفظها أو عدّلها قبل النشر."});
    }catch(error){setNotice({kind:"error",text:error.message||"حدث خطأ أثناء طلب التجربة."})}
    finally{setGenerating(false)}
  }

  async function saveExperiment(event){
    event.preventDefault();setSaving(true);setNotice(null);
    const config=parseJson(experimentDraft.simulation_config_text,{});
    if(!config||typeof config!=="object"||Array.isArray(config)){setSaving(false);setNotice({kind:"error",text:"إعدادات المحاكاة يجب أن تكون JSON صحيحًا."});return}
    if(!experimentDraft.subject_id){setSaving(false);setNotice({kind:"error",text:"اختر المادة التي تنتمي إليها التجربة."});return}
    if(experimentDraft.simulator_type==="auto"){setSaving(false);setNotice({kind:"error",text:"اطلب من الذكاء الاصطناعي اختيار نموذج المحاكاة أولًا، ثم راجع المسودة واحفظها."});return}
    if(["simulation","virtual_lab"].includes(experimentDraft.experience_type)&&!experimentDraft.simulator_type){setSaving(false);setNotice({kind:"error",text:"اختر نموذج محاكاة، أو غيّر نوع التجربة إلى نشاط بدون محاكاة."});return}
    const content={
      intro:experimentDraft.intro.trim(),
      objectives:textLines(experimentDraft.objectives_text),
      steps:textLines(experimentDraft.steps_text),
      observations:textLines(experimentDraft.observations_text),
      formulas:textLines(experimentDraft.formulas_text),
      reflection_questions:textLines(experimentDraft.questions_text)
    };
    const values={
      subject_id:experimentDraft.subject_id,unit_id:experimentDraft.unit_id||null,lesson_id:experimentDraft.lesson_id||null,
      title:experimentDraft.title.trim(),slug:experimentDraft.slug.trim()||slugify(experimentDraft.title,"experiment"),
      description:experimentDraft.description.trim(),experience_type:experimentDraft.experience_type,
      simulator_type:experimentDraft.simulator_type||null,simulation_config:config,content_json:content,
      is_ai_generated:experimentDraft.is_ai_generated,ai_prompt:experimentDraft.ai_prompt,
      is_published:experimentDraft.is_published,sort_order:Number(experimentDraft.sort_order)||0,updated_at:new Date().toISOString()
    };
    const result=experimentDraft.id
      ? await supabase.from("learning_experiments").update(values).eq("id",experimentDraft.id).select().single()
      : await supabase.from("learning_experiments").insert({...values,created_by:session?.user?.id}).select().single();
    if(result.error)setNotice({kind:"error",text:"تعذر حفظ التجربة. تحقق من المادة والوحدة والدرس ونوع المحاكاة."});
    else {setExperimentDraft(experimentForm(result.data));setNotice({kind:"success",text:"تم حفظ التجربة في قاعدة البيانات."});await loadData()}
    setSaving(false);
  }
  async function toggleExperiment(item){
    const {error}=await supabase.from("learning_experiments").update({is_published:!item.is_published}).eq("id",item.id);
    setNotice(error?{kind:"error",text:"تعذر تغيير حالة النشر."}:{kind:"success",text:item.is_published?"تم إخفاء التجربة عن الطلاب.":"تم نشر التجربة للطلاب."});
    if(!error)await loadData();
  }
  async function deleteExperiment(item){
    if(!window.confirm("حذف التجربة سيحذف سجل إنجازاتها أيضًا. هل تريد المتابعة؟"))return;
    const {error}=await supabase.from("learning_experiments").delete().eq("id",item.id);
    setNotice(error?{kind:"error",text:"تعذر حذف التجربة."}:{kind:"success",text:"تم حذف التجربة."});
    if(!error){if(experimentDraft.id===item.id)resetExperiment();await loadData()}
  }

  return (
    <div className="studio-dashboard">
      <div className="studio-heading">
        <div><span className="studio-kicker">منهجك ومحتواك في مكان واحد</span><h2>استوديو المواد والتجارب</h2><p>أنشئ المواد والوحدات والدروس، ثم ابنِ التجارب والمحاكاة وانشرها للطلاب.</p></div>
        <button type="button" className="studio-refresh" onClick={loadData}>تحديث البيانات</button>
      </div>
      <div className="studio-stat-row">
        <div><BookOpen size={18}/><span>المواد</span><b>{subjects.length}</b></div>
        <div><Layers3 size={18}/><span>الوحدات</span><b>{units.length}</b></div>
        <div><ListChecks size={18}/><span>الدروس</span><b>{lessons.length}</b></div>
        <div><FlaskConical size={18}/><span>التجارب</span><b>{experiments.length}</b></div>
      </div>
      <nav className="studio-tabs">
        {[["subjects","المواد الدراسية",BookOpen],["units","الوحدات والدروس",Layers3],["experiments","التجارب والمحاكاة",FlaskConical]].map(([id,label,Icon])=><button key={id} type="button" className={tab===id?"active":""} onClick={()=>{setTab(id);setNotice(null)}}><Icon size={15}/>{label}</button>)}
      </nav>
      <Notice notice={notice}/>
      {loading?<div className="studio-empty"><LoaderCircle size={20}/> جارٍ تحميل الاستوديو...</div>:null}

      {!loading&&tab==="subjects"&&(
        <div className="studio-columns">
          <form className="studio-panel studio-editor" onSubmit={saveSubject}>
            <div className="studio-panel-head"><h3>{subjectDraft.id?"تعديل المادة":"إضافة مادة جديدة"}</h3>{subjectDraft.id&&<button type="button" onClick={resetSubject}>إلغاء التعديل</button>}</div>
            <Field label="اسم المادة"><input required value={subjectDraft.name} onChange={e=>setSubjectDraft({...subjectDraft,name:e.target.value})} placeholder="مثال: الفيزياء"/></Field>
            <Field label="الرابط المختصر (اختياري)"><input dir="ltr" value={subjectDraft.slug} onChange={e=>setSubjectDraft({...subjectDraft,slug:e.target.value})} placeholder="physics"/></Field>
            <div className="studio-field-grid">
              <Field label="المرحلة"><input value={subjectDraft.academic_stage} onChange={e=>setSubjectDraft({...subjectDraft,academic_stage:e.target.value})}/></Field>
              <Field label="الصف"><input value={subjectDraft.grade_level} onChange={e=>setSubjectDraft({...subjectDraft,grade_level:e.target.value})}/></Field>
              <Field label="المسار"><input value={subjectDraft.track} onChange={e=>setSubjectDraft({...subjectDraft,track:e.target.value})}/></Field>
              <Field label="الفصل الدراسي"><input value={subjectDraft.term} onChange={e=>setSubjectDraft({...subjectDraft,term:e.target.value})} placeholder="اختياري"/></Field>
            </div>
            <Field label="وصف المادة"><textarea rows="3" value={subjectDraft.description} onChange={e=>setSubjectDraft({...subjectDraft,description:e.target.value})}/></Field>
            <label className="studio-check"><input type="checkbox" checked={subjectDraft.is_published} onChange={e=>setSubjectDraft({...subjectDraft,is_published:e.target.checked})}/> إظهار المادة للطلاب</label>
            <button className="studio-primary" disabled={saving}><Save size={15}/>{saving?"جارٍ الحفظ...":"حفظ المادة"}</button>
          </form>
          <section className="studio-panel">
            <div className="studio-panel-head"><h3>المواد الحالية</h3><span>{subjects.length} مادة</span></div>
            {subjects.length===0?<div className="studio-empty">لم تتم إضافة مواد بعد.</div>:subjects.map(item=><article className={"studio-list-row "+(subjectDraft.id===item.id?"selected":"")} key={item.id}>
              <div className="studio-row-icon"><BookOpen size={18}/></div><div className="studio-row-text"><b>{item.name}</b><small>{units.filter(unit=>unit.subject_id===item.id).length} وحدة · {lessons.filter(lesson=>units.some(unit=>unit.id===lesson.unit_id && unit.subject_id===item.id)).length} درس · {experiments.filter(experiment=>experiment.subject_id===item.id).length} نشاط · {item.is_published?"ظاهرة للطلاب":"مخفية"}</small></div>
              <div className="studio-row-actions"><button type="button" onClick={()=>setSubjectDraft(subjectForm(item))} title="تعديل"><Pencil size={15}/></button><button type="button" onClick={()=>deleteSubject(item)} title="حذف"><Trash2 size={15}/></button></div>
            </article>)}
          </section>
        </div>
      )}

      {!loading&&tab==="units"&&(
        <div className="studio-columns">
          <div className="studio-panel studio-editor">
            <div className="studio-panel-head"><h3>اختيار المادة</h3></div>
            <Field label="المادة"><select value={selectedSubjectId} onChange={e=>{setSelectedSubjectId(e.target.value);setUnitDraft({...UNIT_EMPTY,subject_id:e.target.value});setSelectedUnitId("");setLessonDraft({...LESSON_EMPTY,unit_id:""})}}><option value="">اختر مادة</option>{subjects.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></Field>
            <form className="studio-subform" onSubmit={saveUnit}>
              <div className="studio-panel-head"><h3>{unitDraft.id?"تعديل الوحدة":"إضافة وحدة"}</h3>{unitDraft.id&&<button type="button" onClick={resetUnit}>إلغاء</button>}</div>
              <Field label="اسم الوحدة"><input required value={unitDraft.title} onChange={e=>setUnitDraft({...unitDraft,title:e.target.value})} placeholder="اسم الوحدة"/></Field>
              <Field label="الرابط المختصر (اختياري)"><input dir="ltr" value={unitDraft.slug} onChange={e=>setUnitDraft({...unitDraft,slug:e.target.value})}/></Field>
              <Field label="الفصل الدراسي"><input value={unitDraft.term} onChange={e=>setUnitDraft({...unitDraft,term:e.target.value})}/></Field>
              <Field label="وصف الوحدة"><textarea rows="2" value={unitDraft.description} onChange={e=>setUnitDraft({...unitDraft,description:e.target.value})}/></Field>
              <label className="studio-check"><input type="checkbox" checked={unitDraft.is_published} onChange={e=>setUnitDraft({...unitDraft,is_published:e.target.checked})}/> نشر الوحدة</label>
              <button className="studio-primary" disabled={saving||!selectedSubjectId}><Save size={15}/>{saving?"جارٍ الحفظ...":"حفظ الوحدة"}</button>
            </form>
            <div className="studio-sublist"><div className="studio-panel-head"><h3>الوحدات</h3><button type="button" onClick={resetUnit}><Plus size={14}/> جديد</button></div>
              {subjectUnits.map(item=><article className={"studio-list-row "+(selectedUnitId===item.id?"selected":"")} key={item.id}>
                <button type="button" className="studio-row-select" onClick={()=>{setSelectedUnitId(item.id);setUnitDraft(unitForm(item));setLessonDraft({...LESSON_EMPTY,unit_id:item.id})}}><b>{item.title}</b><small>{item.is_published?"منشورة":"مسودة"}</small></button>
                <div className="studio-row-actions"><button type="button" onClick={()=>{setUnitDraft(unitForm(item));setSelectedUnitId(item.id)}}><Pencil size={15}/></button><button type="button" onClick={()=>deleteUnit(item)}><Trash2 size={15}/></button></div>
              </article>)}
            </div>
          </div>
          <div className="studio-panel studio-editor">
            <div className="studio-panel-head"><h3>{lessonDraft.id?"تعديل الدرس":"إضافة درس"}</h3>{lessonDraft.id&&<button type="button" onClick={resetLesson}>إلغاء</button>}</div>
            <Field label="الوحدة"><select value={lessonDraft.unit_id||selectedUnitId} onChange={e=>{setSelectedUnitId(e.target.value);setLessonDraft({...lessonDraft,unit_id:e.target.value})}}><option value="">اختر وحدة</option>{subjectUnits.map(u=><option value={u.id} key={u.id}>{u.title}</option>)}</select></Field>
            <form className="studio-subform" onSubmit={saveLesson}>
              <Field label="عنوان الدرس"><input required value={lessonDraft.title} onChange={e=>setLessonDraft({...lessonDraft,title:e.target.value})}/></Field>
              <Field label="الرابط المختصر (اختياري)"><input dir="ltr" value={lessonDraft.slug} onChange={e=>setLessonDraft({...lessonDraft,slug:e.target.value})}/></Field>
              <Field label="ملخص الدرس"><textarea rows="2" value={lessonDraft.summary} onChange={e=>setLessonDraft({...lessonDraft,summary:e.target.value})}/></Field>
              <Field label="أهداف التعلم (كل هدف في سطر)"><textarea rows="3" value={lessonDraft.objectives_text} onChange={e=>setLessonDraft({...lessonDraft,objectives_text:e.target.value})}/></Field>
              <Field label="محتوى الدرس بصيغة JSON"><textarea className="studio-code-input" rows="9" dir="ltr" value={lessonDraft.content_text} onChange={e=>setLessonDraft({...lessonDraft,content_text:e.target.value})}/></Field>
              <small className="studio-hint">يمكن وضع مقدمة وأقسام شرح وقوانين داخل JSON. يتم عرضها للطلاب داخل صفحة التجربة المرتبطة.</small>
              <label className="studio-check"><input type="checkbox" checked={lessonDraft.is_published} onChange={e=>setLessonDraft({...lessonDraft,is_published:e.target.checked})}/> نشر الدرس</label>
              <button className="studio-primary" disabled={saving||!(lessonDraft.unit_id||selectedUnitId)}><Save size={15}/>حفظ الدرس</button>
            </form>
            <div className="studio-sublist"><div className="studio-panel-head"><h3>دروس الوحدة المحددة</h3><span>{unitLessons.length} درس</span></div>
              {unitLessons.map(item=><article className="studio-list-row" key={item.id}><div className="studio-row-text"><b>{item.title}</b><small>{item.is_published?"منشور":"مسودة"}</small></div><div className="studio-row-actions"><button type="button" onClick={()=>setLessonDraft(lessonForm(item))}><Pencil size={15}/></button><button type="button" onClick={()=>deleteLesson(item)}><Trash2 size={15}/></button></div></article>)}
            </div>
          </div>
        </div>
      )}

      {!loading&&tab==="experiments"&&(
        <div className="studio-columns studio-experiments-columns">
          <section className="studio-panel">
            <div className="studio-panel-head"><h3>التجارب والمحاكاة</h3><button type="button" onClick={resetExperiment}><Plus size={14}/> تجربة جديدة</button></div>
            {experiments.map(item=><article className={"studio-list-row "+(experimentDraft.id===item.id?"selected":"")} key={item.id}>
              <div className="studio-row-icon"><FlaskConical size={18}/></div><div className="studio-row-text"><b>{item.title}</b><small>{subjects.find(s=>s.id===item.subject_id)?.name||"مادة"} · {item.is_published?"منشورة":"مسودة"} · {experimentCounts.get(item.id)||0} إنجاز</small></div>
              <div className="studio-row-actions"><button type="button" onClick={()=>{setExperimentDraft(experimentForm(item));setPreviewOpen(false)}} title="تعديل"><Pencil size={15}/></button><button type="button" onClick={()=>toggleExperiment(item)} title={item.is_published?"إخفاء":"نشر"}>{item.is_published?<EyeOff size={15}/>:<Eye size={15}/>}</button><button type="button" onClick={()=>deleteExperiment(item)} title="حذف"><Trash2 size={15}/></button></div>
            </article>)}
            {experiments.length===0&&<div className="studio-empty">لا توجد تجارب. أضف تجربة يدويًا أو اطلب من الذكاء الاصطناعي إنشاءها.</div>}
          </section>
          <section className="studio-panel studio-experiment-editor">
            <form className="studio-editor" onSubmit={saveExperiment}>
              <div className="studio-panel-head"><h3>{experimentDraft.id?"تعديل التجربة":"بناء تجربة جديدة"}</h3><span className="studio-ai-badge"><Sparkles size={13}/> مدعوم بالذكاء الاصطناعي</span></div>
              <div className="studio-ai-builder">
                <div><h4><WandSparkles size={17}/> اطلب تجربة من الذكاء الاصطناعي</h4><p>اكتب الفكرة التعليمية، وسيُنشئ النظام محتوى وإعدادات محاكاة قابلة للتشغيل داخل المنصة.</p></div>
                <Field label="وصف التجربة المطلوبة"><textarea rows="3" value={experimentDraft.ai_prompt} onChange={e=>setExperimentDraft({...experimentDraft,ai_prompt:e.target.value})} placeholder="مثال: أنشئ تجربة توضح تأثير الكتلة في الزمن الدوري لنابض، مع أسئلة ملاحظة للطالب."/></Field>
                <button type="button" className="studio-ai-button" disabled={generating||!experimentDraft.subject_id} onClick={generateExperiment}><Sparkles size={16}/>{generating?"الذكاء الاصطناعي يبني التجربة...":"أنشئ التجربة بالذكاء الاصطناعي"}</button>
              </div>
              <div className="studio-field-grid">
                <Field label="عنوان التجربة"><input required value={experimentDraft.title} onChange={e=>setExperimentDraft({...experimentDraft,title:e.target.value})}/></Field>
                <Field label="الرابط المختصر"><input dir="ltr" value={experimentDraft.slug} onChange={e=>setExperimentDraft({...experimentDraft,slug:e.target.value})}/></Field>
                <Field label="المادة"><select required value={experimentDraft.subject_id} onChange={e=>setExperimentDraft({...experimentDraft,subject_id:e.target.value,unit_id:"",lesson_id:""})}><option value="">اختر المادة</option>{subjects.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></Field>
                <Field label="الوحدة"><select value={experimentDraft.unit_id} onChange={e=>setExperimentDraft({...experimentDraft,unit_id:e.target.value,lesson_id:""})}><option value="">بدون ربط بوحدة</option>{expSubjectUnits.map(u=><option value={u.id} key={u.id}>{u.title}</option>)}</select></Field>
                <Field label="الدرس"><select value={experimentDraft.lesson_id} onChange={e=>setExperimentDraft({...experimentDraft,lesson_id:e.target.value})}><option value="">بدون ربط بدرس</option>{expUnitLessons.map(l=><option value={l.id} key={l.id}>{l.title}</option>)}</select></Field>
                <Field label="نوع التجربة"><select value={experimentDraft.experience_type} onChange={e=>setExperimentDraft({...experimentDraft,experience_type:e.target.value,simulator_type:["guided_activity","interactive_demo"].includes(e.target.value)?"":experimentDraft.simulator_type||"harmonic_spring"})}><option value="simulation">محاكاة</option><option value="virtual_lab">معمل افتراضي</option><option value="guided_activity">نشاط موجه بدون محاكاة</option><option value="interactive_demo">عرض تفاعلي بدون محاكاة</option></select></Field>
                {["simulation","virtual_lab"].includes(experimentDraft.experience_type) && <Field label="نموذج المحاكاة"><select value={experimentDraft.simulator_type} onChange={e=>setExperimentDraft({...experimentDraft,simulator_type:e.target.value})}>{SIMULATOR_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>}
              </div>
              <Field label="وصف يظهر للطلاب"><textarea rows="2" value={experimentDraft.description} onChange={e=>setExperimentDraft({...experimentDraft,description:e.target.value})}/></Field>
              <Field label="مقدمة التجربة"><textarea rows="3" value={experimentDraft.intro} onChange={e=>setExperimentDraft({...experimentDraft,intro:e.target.value})}/></Field>
              <div className="studio-field-grid">
                <Field label="أهداف التعلم (كل هدف في سطر)"><textarea rows="4" value={experimentDraft.objectives_text} onChange={e=>setExperimentDraft({...experimentDraft,objectives_text:e.target.value})}/></Field>
                <Field label="خطوات التجربة (كل خطوة في سطر)"><textarea rows="4" value={experimentDraft.steps_text} onChange={e=>setExperimentDraft({...experimentDraft,steps_text:e.target.value})}/></Field>
                <Field label="الملاحظات المتوقعة (كل ملاحظة في سطر)"><textarea rows="4" value={experimentDraft.observations_text} onChange={e=>setExperimentDraft({...experimentDraft,observations_text:e.target.value})}/></Field>
                <Field label="القوانين (كل قانون في سطر)"><textarea rows="4" value={experimentDraft.formulas_text} onChange={e=>setExperimentDraft({...experimentDraft,formulas_text:e.target.value})}/></Field>
              </div>
              <Field label="أسئلة التفكير (كل سؤال في سطر)"><textarea rows="3" value={experimentDraft.questions_text} onChange={e=>setExperimentDraft({...experimentDraft,questions_text:e.target.value})}/></Field>
              <Field label="إعدادات المحاكاة (JSON قابل للتعديل)"><textarea className="studio-code-input" rows="5" dir="ltr" value={experimentDraft.simulation_config_text} onChange={e=>setExperimentDraft({...experimentDraft,simulation_config_text:e.target.value})}/></Field>
              <small className="studio-hint">الذكاء الاصطناعي لا يرسل كودًا للتنفيذ. هو يختار نموذجًا علميًا معتمدًا ويضبط بياناته، والمحاكاة تُشغّل بمحرك آمن داخل Tay Space.</small>
              <label className="studio-check"><input type="checkbox" checked={experimentDraft.is_published} onChange={e=>setExperimentDraft({...experimentDraft,is_published:e.target.checked})}/> نشر التجربة للطلاب بعد الحفظ</label>
              <div className="studio-action-row"><button type="submit" className="studio-primary" disabled={saving}><Save size={15}/>{saving?"جارٍ الحفظ...":"حفظ التجربة"}</button><button type="button" className="studio-secondary" onClick={()=>setPreviewOpen(v=>!v)}><Eye size={15}/>{previewOpen?"إخفاء المعاينة":"معاينة المحاكاة"}</button></div>
            </form>
            {previewOpen&&<div className="studio-preview"><h4>معاينة التجربة</h4>{experimentDraft.simulator_type && experimentDraft.simulator_type !== "auto" ? <ExperimentSimulator simulatorType={experimentDraft.simulator_type} config={configPreview}/> : <p className="studio-hint">هذا نشاط تعليمي بدون محاكاة، أو أن الذكاء الاصطناعي لم يحدد نموذجًا بعد.</p>}</div>}
          </section>
        </div>
      )}
    </div>
  );
}
