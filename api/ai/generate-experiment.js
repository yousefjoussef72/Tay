import { generateGroqJson, requireAdmin, sendApiError, setApiHeaders } from "../../lib/ai-server.js";

const SIMULATORS = {
  harmonic_spring: {
    label: "النابض والكتلة",
    config: { mass: [0.1, 2], stiffness: [10, 200], amplitude_cm: [2, 12] },
  },
  simple_pendulum: {
    label: "البندول البسيط",
    config: { length: [0.35, 1.4], mass: [0.1, 1.5], max_angle_deg: [3, 20] },
  },
  wave_motion: {
    label: "الموجة الجيبية",
    config: { amplitude: [0.5, 5], frequency: [0.2, 5] },
  },
  projectile_motion: {
    label: "حركة المقذوفات",
    config: { speed: [2, 30], angle_deg: [10, 80], height: [0, 20] },
  },
  free_fall: {
    label: "السقوط الحر",
    config: { height: [1, 100] },
  },
};

const EXPERIENCE_TYPES = new Set(["simulation", "virtual_lab", "guided_activity", "interactive_demo"]);

function cleanText(value, max = 1800) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function cleanArray(value, maxItems = 10, maxLength = 700) {
  return Array.isArray(value)
    ? value.map(item => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function numberInRange(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeConfig(value, simulatorType) {
  const schema = SIMULATORS[simulatorType];
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const output = {};
  for (const [key, [min, max]] of Object.entries(schema.config)) {
    const fallback = (min + max) / 2;
    output[key] = numberInRange(input[key], min, max, fallback);
  }
  return output;
}

function normalizeExperiment(value, requestedSimulator) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const contentOnly = requestedSimulator === "none";
  const experienceType = contentOnly
    ? "guided_activity"
    : EXPERIENCE_TYPES.has(value.experience_type)
      ? value.experience_type
      : "simulation";
  const simulatorType = contentOnly ? null : requestedSimulator === "auto"
    ? cleanText(value.simulator_type, 60)
    : requestedSimulator;
  if (!contentOnly && !SIMULATORS[simulatorType]) return null;

  const content = value.content && typeof value.content === "object" && !Array.isArray(value.content)
    ? value.content
    : {};

  return {
    title: cleanText(value.title, 180),
    description: cleanText(value.description, 1000),
    experience_type: contentOnly ? "guided_activity" : experienceType,
    simulator_type: simulatorType,
    simulation_config: contentOnly ? {} : normalizeConfig(value.simulation_config, simulatorType),
    content: {
      intro: cleanText(content.intro, 2200),
      objectives: cleanArray(content.objectives, 8, 400),
      steps: cleanArray(content.steps, 10, 600),
      observations: cleanArray(content.observations, 10, 600),
      formulas: cleanArray(content.formulas, 12, 200),
      reflection_questions: cleanArray(content.reflection_questions, 8, 500),
    },
  };
}

export default async function handler(req, res) {
  if (!setApiHeaders(req, res)) {
    return res.status(403).json({ ok: false, error: "origin_not_allowed" });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  const subject = cleanText(req.body?.subject, 120);
  const academicStage = cleanText(req.body?.academic_stage, 120) || "البكالوريا المصرية";
  const gradeLevel = cleanText(req.body?.grade_level, 120) || "الصف الثاني";
  const track = cleanText(req.body?.track, 160);
  const unit = cleanText(req.body?.unit, 180);
  const lesson = cleanText(req.body?.lesson, 180);
  const title = cleanText(req.body?.title, 180);
  const userPrompt = cleanText(req.body?.prompt, 3500);
  const requestedSimulator = cleanText(req.body?.simulator_type, 60);

  if (!subject || !userPrompt || userPrompt.length < 8 || (!SIMULATORS[requestedSimulator] && !["auto","none"].includes(requestedSimulator))) {
    return res.status(400).json({
      ok: false,
      error: "invalid_experiment_request",
      message: "اختر مادة ونموذج محاكاة، واكتب وصفًا واضحًا للتجربة المطلوبة.",
    });
  }

  const contentOnly = requestedSimulator === "none";
  const isEnglishSubject = /اللغة الإنجليزية|english/i.test(subject);
  const isLanguageSubject = /لغة|english|language/i.test(subject);
  const simulator = SIMULATORS[requestedSimulator] || null;
  const simulatorList = Object.entries(SIMULATORS).map(([key, value]) => ({ type: key, label: value.label, config: value.config }));
  const system = contentOnly ? [
    "أنت مصمم مناهج وأنشطة تعليمية للمرحلة الثانوية في مصر.",
    "أنشئ نشاطًا تعليميًا منظمًا في المادة المطلوبة، وليس محاكاة فيزيائية.",
    "أنشئ محتوى باللغة العربية الواضحة ومناسبًا للمرحلة والصف والمسار والمادة والوحدة والدرس المحدد.",
    "أخرج JSON صالحًا فقط دون Markdown أو أي نص خارجه.",
    "لا تنشئ أي JavaScript أو HTML أو CSS أو كود قابل للتنفيذ مطلقًا.",
    "لا تخترع حقائق أو مواد من المنهج الرسمي أو أرقام صفحات أو نتائج تعلم غير مؤكدة. إذا كان هناك تفصيل غير متحقق، صغه كنشاط عام ولا تنسبه إلى كتاب رسمي.",
    "اجعل النشاط مناسبًا لطبيعة المادة: قراءة وتحليل واستماع ومحادثة ومفردات للغات، مصادر وتسلسل زمني وتحليل أدلة للتاريخ، مفاهيم ومسائل للمواد العلمية، وتطبيقات وحالات عملية للأعمال.",
    isEnglishSubject
      ? "بما أن المادة هي اللغة الإنجليزية، اجعل نصوص القراءة والمفردات والجمل وأسئلة التدريب باللغة الإنجليزية، واجعل تعليمات المعلم وإرشادات الطالب بالعربية عند الحاجة."
      : isLanguageSubject
        ? "بما أن المادة لغة أجنبية، استخدم اللغة المستهدفة في نصوص القراءة والمفردات والتدريبات، واجعل تعليمات المعلم بالعربية عند الحاجة."
        : "استخدم لغة المادة ومصطلحاتها الصحيحة، ولا تفرض مفردات أو تدريبات لغة أجنبية على المواد غير اللغوية.",
    "أعد أهدافًا وخطوات تنفيذ وملاحظات وأسئلة تفكير، واستخدم القوانين فقط إذا كانت المادة تستلزم ذلك.",
    "أعد كائنًا بالبنية: {title, description, experience_type:'guided_activity', simulator_type:null, simulation_config:{}, content:{intro,objectives:[],steps:[],observations:[],formulas:[],reflection_questions:[]}}.",
    "أضف من 3 إلى 5 أسئلة تفكير مرتبطة بالنشاط، ولا تضع الإجابات داخل الأسئلة."
  ].join("\n") : [
    "أنت مصمم تجارب تعليمية علمية للمرحلة الثانوية.",
    "أنشئ تجربة تفاعلية باللغة العربية الفصحى الواضحة، مناسبة لمستوى الطالب المحدد.",
    "أخرج JSON صالحًا فقط دون Markdown أو أي نص خارجه.",
    "لا تنشئ أي JavaScript أو HTML أو CSS أو كود قابل للتنفيذ مطلقًا.",
    "لا تقترح تشغيل كود أو تحميله. المحاكاة تُنفذ في الموقع بواسطة محرك ثابت وآمن.",
    requestedSimulator === "auto"
      ? "اختر بنفسك أنسب نموذج محاكاة من القائمة المعتمدة، وأعد قيمته في simulator_type."
      : "يجب أن تستخدم نموذج المحاكاة المحدد فقط ولا تغيّره.",
    "استخدم حقائق وقوانين علمية دقيقة، ولا تخترع تفاصيل من المنهج الرسمي أو أرقام صفحات أو نواتج تعلم غير مؤكدة.",
    "اجعل الأهداف والخطوات والملاحظات والأسئلة مترابطة مع النموذج العلمي المختار.",
    "أضف 3 إلى 5 أسئلة تفكير تساعد الطالب على تفسير ما يلاحظه، ولا تضع الإجابات ضمن الأسئلة.",
    "أعد كائنًا بالبنية: {title, description, experience_type, simulator_type, simulation_config, content:{intro,objectives:[],steps:[],observations:[],formulas:[],reflection_questions:[]}}.",
    "النماذج المعتمدة وإعدادات كل نموذج وحدودها: " + JSON.stringify(simulatorList) + ".",
    "استخدم مفاتيح النموذج الذي اخترته فقط، والتزم بحدود قيمه حرفيًا.",
    "لا تضع أي مفاتيح إضافية أو إعدادات غير معروفة في simulation_config.",
    "يجب أن يكون experience_type إما simulation أو virtual_lab."
  ].join("\n");

  const user = [
    "المرحلة: " + academicStage,
    "الصف: " + gradeLevel,
    track ? "المسار: " + track : "",
    "المادة: " + subject,
    unit ? "الوحدة: " + unit : "",
    lesson ? "الدرس المرتبط: " + lesson : "",
    title ? "العنوان المقترح: " + title : "",
    contentOnly ? "نوع النشاط: نشاط تعليمي دون محاكاة" : "نموذج المحاكاة المطلوب: " + (simulator?.label ? simulator.label + " (" + requestedSimulator + ")" : "اختَر النموذج الأنسب من قائمة النماذج المعتمدة"),
    "طلب المعلم: " + userPrompt,
    contentOnly
      ? "صمّم نشاطًا ملائمًا لطبيعة المادة يتضمن تمهيدًا وأهدافًا وخطوات واضحة وملاحظات أو نواتج متوقعة وأسئلة تفكير."
      : "اكتب تجربة عملية يمكن للطالب تنفيذها على المحاكاة داخل الصفحة، مع خطوات واضحة وقوانين وملاحظات وأسئلة تفكير.",
    "أعد JSON فقط."
  ].filter(Boolean).join("\n");

  try {
    const result = await generateGroqJson({ system, user, maxTokens: 5000 });
    const experiment = normalizeExperiment(result.data?.experiment || result.data, requestedSimulator);
    if (!experiment || !experiment.title || !experiment.content.intro || experiment.content.steps.length < 2) {
      return res.status(502).json({
        ok: false,
        error: "incomplete_experiment",
        message: "لم تجتز التجربة المولدة فحص الجودة. أعد المحاولة أو وضّح المطلوب أكثر.",
      });
    }
    return res.status(200).json({ ok: true, experiment, model: result.model });
  } catch (error) {
    return sendApiError(res, error);
  }
}
