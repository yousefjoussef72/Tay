import { generateJson, requireUser, sendApiError, setApiHeaders } from "../../lib/ai-server.js";

const SIMULATORS = {
  harmonic_spring: { mass: [0.1, 2], stiffness: [10, 200], amplitude_cm: [2, 12] },
  simple_pendulum: { length: [0.35, 1.4], mass: [0.1, 1.5], max_angle_deg: [3, 20] },
  wave_motion: { amplitude: [0.5, 5], frequency: [0.2, 5] },
  projectile_motion: { speed: [2, 30], angle_deg: [10, 80], height: [0, 20] },
  free_fall: { height: [1, 100] },
};

function cleanText(value, max = 1800) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function cleanArray(value, maxItems = 10, maxLength = 900) {
  return Array.isArray(value)
    ? value.map(item => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function cleanSections(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map(section => ({
    heading: cleanText(section?.heading, 160),
    body: cleanText(section?.body, 2600),
  })).filter(section => section.heading && section.body);
}

function normalizeSimulationConfig(value, simulatorType) {
  const schema = SIMULATORS[simulatorType];
  if (!schema) return {};
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(schema).map(([key, [min, max]]) => {
    const parsed = Number(input[key]);
    const fallback = (min + max) / 2;
    return [key, Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback];
  }));
}

function normalizePractical(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const variables = value.variables && typeof value.variables === "object" ? value.variables : {};
  const practical = {
    title: cleanText(value.title, 180),
    purpose: cleanText(value.purpose, 1000),
    hypothesis: cleanText(value.hypothesis, 1000),
    materials: cleanArray(value.materials, 10, 300),
    steps: cleanArray(value.steps, 10, 700),
    variables: {
      independent: cleanText(variables.independent, 400),
      dependent: cleanText(variables.dependent, 400),
      controlled: cleanArray(variables.controlled, 6, 300),
    },
    expected_observations: cleanArray(value.expected_observations, 8, 500),
    analysis_questions: cleanArray(value.analysis_questions, 6, 500),
    safety_notes: cleanArray(value.safety_notes, 5, 400),
  };
  return practical.title && practical.purpose && practical.steps.length >= 2 ? practical : null;
}

function matchPhysicsSimulator(subject, topic) {
  const isPhysics = subject.slug === "physics" || /فيزياء|physics/i.test(subject.name || "");
  if (!isPhysics) return null;

  const normalized = String(topic || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/[ًٌٍَُِّْـ]/g, "");

  if (/بندول|pendulum/.test(normalized)) return "simple_pendulum";
  if (/زنبرك|نابض|حركة توافقية بسيطة|spring/.test(normalized)) return "harmonic_spring";
  if (/موجة|الموجات|انتشار الموج|wave/.test(normalized)) return "wave_motion";
  if (/مقذوف|المقذوفات|القذف|قذيفة|projectile/.test(normalized)) return "projectile_motion";
  if (/السقوط الحر|سقوط حر|free.?fall|تسارع الجاذبية/.test(normalized)) return "free_fall";
  return null;
}

function createSimulatorPractical(simulatorType, topic) {
  const practicalByType = {
    simple_pendulum: {
      title: "دراسة أثر طول البندول في الزمن الدوري",
      purpose: "استخدام محاكي البندول البسيط لملاحظة كيف يؤثر طول الخيط في الزمن الدوري للاهتزازة.",
      hypothesis: "عند زيادة طول البندول يزداد الزمن الدوري، مع ثبات العوامل الأخرى.",
      materials: ["محاكي البندول البسيط التفاعلي داخل Tay Space"],
      steps: [
        "افتح المحاكي واترك قيمة الكتلة وزاوية الإزاحة ثابتتين.",
        "غيّر طول البندول بين أكثر من قيمة ضمن المجال المتاح.",
        "سجّل الزمن الدوري الذي يعرضه المحاكي لكل طول.",
        "قارن القيم ولاحظ اتجاه التغير، ثم أجب عن أسئلة التحليل."
      ],
      variables: {
        independent: "طول خيط البندول",
        dependent: "الزمن الدوري للاهتزازة",
        controlled: ["كتلة الثقل", "زاوية الإزاحة الصغيرة", "قيمة عجلة الجاذبية"]
      },
      expected_observations: [
        "يزداد الزمن الدوري عند زيادة طول البندول ضمن شروط النموذج.",
        "تساعد مقارنة القيم على توضيح العلاقة بين طول البندول والزمن الدوري."
      ],
      analysis_questions: [
        "ماذا يحدث للزمن الدوري عندما يزداد طول البندول؟",
        "لماذا يجب تثبيت الكتلة وزاوية الإزاحة عند المقارنة؟"
      ],
      safety_notes: ["هذا نشاط محاكاة رقمية ولا يتطلب أدوات أو تنفيذًا ماديًا."]
    },
    harmonic_spring: {
      title: "دراسة الحركة الاهتزازية لنظام كتلة ونابض",
      purpose: "ملاحظة كيف يؤثر ثابت النابض والكتلة في خصائص الحركة الاهتزازية باستخدام المحاكي.",
      hypothesis: "تؤثر الكتلة وثابت النابض في الزمن الدوري للنظام الاهتزازي.",
      materials: ["محاكي الكتلة والنابض التفاعلي داخل Tay Space"],
      steps: [
        "افتح المحاكي وابدأ بالقيم الافتراضية.",
        "غيّر الكتلة مع إبقاء ثابت النابض ثابتًا.",
        "سجّل التغير الظاهر في الزمن الدوري والتردد.",
        "أعد النشاط مع تغيير ثابت النابض ومقارنة النتائج."
      ],
      variables: {
        independent: "الكتلة أو ثابت النابض، مع تغيير متغير واحد في كل مرة",
        dependent: "الزمن الدوري والتردد",
        controlled: ["سعة الاهتزاز الابتدائية", "المتغير الآخر الذي لا يجري تغييره"]
      },
      expected_observations: ["تتغير خصائص الاهتزاز عند تغيير الكتلة أو ثابت النابض."],
      analysis_questions: ["كيف أثرت زيادة الكتلة في الزمن الدوري؟", "كيف أثّر تغيير ثابت النابض؟"],
      safety_notes: ["هذا نشاط محاكاة رقمية ولا يتطلب أدوات أو تنفيذًا ماديًا."]
    },
    wave_motion: {
      title: "استكشاف خصائص الموجة",
      purpose: "مقارنة شكل الموجة عند تغيير السعة أو التردد في المحاكي.",
      hypothesis: "تغيير السعة يؤثر في ارتفاع الموجة، وتغيير التردد يؤثر في عدد الاهتزازات خلال الزمن.",
      materials: ["محاكي الموجات التفاعلي داخل Tay Space"],
      steps: [
        "افتح محاكي الموجات وسجّل الشكل الابتدائي.",
        "غيّر السعة وحدها ولاحظ ارتفاع الموجة.",
        "أعد الإعداد ثم غيّر التردد وحده.",
        "قارن الملاحظات وأجب عن أسئلة التحليل."
      ],
      variables: {
        independent: "سعة الموجة أو ترددها",
        dependent: "شكل الموجة وعدد الاهتزازات",
        controlled: ["المتغير الذي لا يجري تغييره"]
      },
      expected_observations: ["تغيير السعة يغيّر ارتفاع الموجة.", "تغيير التردد يغيّر عدد الاهتزازات في الزمن."],
      analysis_questions: ["ما الفرق بين السعة والتردد؟", "لماذا نغيّر متغيرًا واحدًا كل مرة؟"],
      safety_notes: ["هذا نشاط محاكاة رقمية ولا يتطلب أدوات أو تنفيذًا ماديًا."]
    },
    projectile_motion: {
      title: "استكشاف مسار المقذوف",
      purpose: "ملاحظة أثر سرعة الانطلاق وزاويتها في مسار المقذوف داخل المحاكي.",
      hypothesis: "تؤثر سرعة الانطلاق وزاويتها في المدى والارتفاع الأقصى للمقذوف.",
      materials: ["محاكي حركة المقذوفات التفاعلي داخل Tay Space"],
      steps: [
        "افتح المحاكي وسجّل المسار الابتدائي.",
        "غيّر زاوية الإطلاق مع تثبيت السرعة والارتفاع.",
        "قارن المدى والارتفاع الأقصى.",
        "أعد النشاط مع تغيير السرعة وحدها."
      ],
      variables: {
        independent: "زاوية الإطلاق أو سرعة الانطلاق",
        dependent: "المدى الأفقي والارتفاع الأقصى",
        controlled: ["المتغير الذي لا يجري تغييره", "عجلة الجاذبية"]
      },
      expected_observations: ["يتغير مسار المقذوف عند تغيير زاوية الإطلاق أو سرعته."],
      analysis_questions: ["كيف أثرت زاوية الإطلاق في المدى؟", "كيف أثرت سرعة الانطلاق؟"],
      safety_notes: ["هذا نشاط محاكاة رقمية ولا يتطلب أدوات أو تنفيذًا ماديًا."]
    },
    free_fall: {
      title: "استكشاف السقوط الحر",
      purpose: "ملاحظة علاقة ارتفاع السقوط بزمنه في نموذج السقوط الحر.",
      hypothesis: "يزداد زمن السقوط عند زيادة الارتفاع، بافتراض إهمال مقاومة الهواء.",
      materials: ["محاكي السقوط الحر التفاعلي داخل Tay Space"],
      steps: [
        "افتح المحاكي وسجّل زمن السقوط عند ارتفاع ابتدائي.",
        "غيّر الارتفاع مع تثبيت قيمة الجاذبية.",
        "قارن الزمن والسرعة النهائية التي يعرضها النموذج.",
        "لخّص ما توضحه المقارنة عن السقوط الحر."
      ],
      variables: {
        independent: "ارتفاع السقوط",
        dependent: "زمن السقوط والسرعة النهائية",
        controlled: ["عجلة الجاذبية", "إعدادات النموذج"]
      },
      expected_observations: ["يزداد زمن السقوط عند زيادة الارتفاع في النموذج."],
      analysis_questions: ["ما أثر زيادة الارتفاع في زمن السقوط؟", "ما الافتراض الذي يتخذه نموذج السقوط الحر؟"],
      safety_notes: ["هذا نشاط محاكاة رقمية ولا يتطلب أدوات أو تنفيذًا ماديًا."]
    }
  };
  return practicalByType[simulatorType] || null;
}

function createGeneralResearchActivity(subjectName, topic) {
  return {
    title: "نشاط تحليلي مرتبط بموضوع البحث",
    purpose: "تحويل سؤال البحث إلى نشاط قابل للملاحظة والمقارنة باستخدام مصادر تعليمية موثوقة.",
    hypothesis: "اكتب توقعًا مبدئيًا يمكن مراجعته في ضوء المعلومات التي تجمعها.",
    materials: ["مصدران تعليميان موثوقان على الأقل", "ورقة لتسجيل الملاحظات والمقارنة"],
    steps: [
      "حوّل موضوع البحث إلى سؤال محدد يمكن الإجابة عنه.",
      "اجمع معلومات مرتبطة بالسؤال من مصدرين موثوقين وقارن بينهما.",
      "نظّم الملاحظات في جدول يوضح أوجه الاتفاق والاختلاف.",
      "اكتب استنتاجًا يجيب عن سؤال البحث مع ذكر حدود المعلومات التي جمعتها."
    ],
    variables: {
      independent: "الفكرة أو العامل الذي يتناوله البحث: " + topic,
      dependent: "الملاحظات أو النتائج التي يجمعها الطالب",
      controlled: ["معايير المقارنة", "نوعية المصادر المستخدمة"]
    },
    expected_observations: ["قد تظهر أوجه اتفاق أو اختلاف بين المصادر، ويجب التحقق من أسبابها."],
    analysis_questions: ["ما أقوى دليل يدعم استنتاجك؟", "ما المعلومات التي ما زالت تحتاج إلى تحقق؟"],
    safety_notes: ["نشاط بحثي وتحليلي آمن ولا يتطلب تنفيذ تجارب أو استخدام مواد خطرة."]
  };
}

async function refundReservation(client, reservation) {
  if (!reservation?.id) return;
  const { error } = await client.rpc("refund_learning_research_generation", {
    p_reservation_id: reservation.id
  });
  if (error) {
    console.error("research_quota_refund_failed", { code: error.code || "unknown" });
  }
}

function normalizeResearch(value, subject, includePractical) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const isPhysicsSubject = subject.slug === "physics" || /فيزياء|physics/i.test(subject.name || "");
  const simulatorType = includePractical && isPhysicsSubject && SIMULATORS[value.simulator_type]
    ? value.simulator_type
    : null;
  const practical = includePractical ? normalizePractical(value.practical_experiment) : null;

  return {
    title: cleanText(value.title, 180),
    abstract: cleanText(value.abstract, 2200),
    keywords: cleanArray(value.keywords, 8, 80),
    research_problem: cleanText(value.research_problem, 1600),
    research_questions: cleanArray(value.research_questions, 6, 500),
    objectives: cleanArray(value.objectives, 8, 400),
    importance: cleanText(value.importance, 1400),
    introduction: cleanText(value.introduction, 2200),
    methodology: {
      approach: cleanText(value.methodology?.approach, 700),
      steps: cleanArray(value.methodology?.steps, 8, 600),
    },
    sections: cleanSections(value.sections),
    expected_results: cleanText(value.expected_results, 1800),
    discussion: cleanText(value.discussion, 1800),
    conclusion: cleanText(value.conclusion, 1600),
    recommendations: cleanArray(value.recommendations, 8, 500),
    limitations: cleanArray(value.limitations, 6, 400),
    references: cleanArray(value.references, 8, 500),
    practical_experiment: practical,
    simulator_type: simulatorType,
    simulation_config: simulatorType ? normalizeSimulationConfig(value.simulation_config, simulatorType) : {},
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

  const auth = await requireUser(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  const subjectId = cleanText(req.body?.subject_id, 80);
  const topic = cleanText(req.body?.topic, 240);
  const detailLevel = req.body?.detail_level === "deep" ? "deep" : "standard";
  const includePractical = req.body?.include_practical !== false;

  if (!subjectId || topic.length < 3) {
    return res.status(400).json({
      ok: false,
      error: "invalid_research_request",
      message: "اختر المادة واكتب موضوع البحث في ثلاثة أحرف على الأقل.",
    });
  }

  const { data: subject, error: subjectError } = await auth.client
    .from("learning_subjects")
    .select("id,name,slug,academic_stage,grade_level,track,curriculum_year,description")
    .eq("id", subjectId)
    .eq("is_published", true)
    .maybeSingle();

  if (subjectError || !subject) {
    return res.status(404).json({
      ok: false,
      error: "subject_not_available",
      message: "المادة غير متاحة حاليًا. ارجع إلى قائمة المواد واختر مادة منشورة.",
    });
  }

  // Reserve the student's rolling 24-hour generation quota before spending AI tokens.
  const { data: reservation, error: reservationError } = await auth.client.rpc(
    "reserve_learning_research_generation"
  );
  if (reservationError || !reservation?.id) {
    if (reservationError?.message?.includes("research_daily_limit")) {
      return res.status(429).json({
        ok: false,
        error: "research_daily_limit",
        message: "وصلت إلى الحد اليومي، وهو 5 محاولات لإنشاء بحث خلال 24 ساعة.",
      });
    }
    return res.status(500).json({
      ok: false,
      error: "research_quota_reservation_failed",
      message: "تعذر حجز محاولة إنشاء البحث. حاول مرة أخرى.",
    });
  }

  let activeReservation = reservation;

  const releaseReservation = async () => {
    const pending = activeReservation;
    activeReservation = null;
    await refundReservation(auth.client, pending);
  };

  const system = [
    "أنت باحث أكاديمي ومشرف مشاريع للمرحلة الثانوية في البكالوريا المصرية.",
    "أنشئ مسودة بحث تعليمية متكاملة، واضحة ومترابطة، تساعد الطالب على التعلم والتوثيق، وليست بديلًا عن مراجعة الطالب أو مصادره الأصلية.",
    "اكتب البحث بالعربية الفصحى السهلة، مع استخدام المصطلحات العلمية الدقيقة وذكر المصطلح الإنجليزي بين قوسين عند الحاجة.",
    "راعِ الصف والمسار وطبيعة المادة. لا تنسب معلومة إلى المنهج الرسمي إلا إذا كانت مؤكدة من البيانات المعطاة.",
    "اكتب محتوى أصليًا، وليس حشوًا أو تكرارًا. اجعل الملخص والمقدمة ومحاور البحث والمنهجية والنتائج المتوقعة والخاتمة متسقة مع سؤال البحث.",
    "لا تخترع أرقامًا أو نتائج تجارب فعلية أو إحصاءات أو أسماء دراسات أو مؤلفين أو سنوات نشر أو روابط أو أرقام صفحات.",
    "قسم المراجع إلى اقتراحات للتحقق فقط: اذكر مؤسسات علمية أو كتبًا مرجعية عامة معروفة حين تكون واثقًا، وإلا اقترح نوع المصدر المطلوب دون اختراع مرجع محدد.",
    "إذا كانت التجربة عملية، فلا تدّعِ أن الطالب نفّذها بالفعل. اكتب الفرضية والخامات والخطوات والمتغيرات والملاحظات المتوقعة، وميّز بوضوح بين المتوقع والنتيجة التي سيجمعها الطالب بنفسه.",
    "لا تقترح أنشطة خطرة أو مواد كيميائية أو أدوات مؤذية. اجعل أي نشاط عملي آمنًا وبسيطًا ومناسبًا لبيئة تعليمية وتحت إشراف معلم عند الحاجة.",
    "أخرج JSON صالحًا فقط دون Markdown أو نص خارج JSON.",
    "البنية المطلوبة: {title,abstract,keywords:[],research_problem,research_questions:[],objectives:[],importance,introduction,methodology:{approach,steps:[]},sections:[{heading,body}],expected_results,discussion,conclusion,recommendations:[],limitations:[],references:[],practical_experiment:{title,purpose,hypothesis,materials:[],steps:[],variables:{independent,dependent,controlled:[]},expected_observations:[],analysis_questions:[],safety_notes:[]}|null,simulator_type,simulation_config}.",
    "أنشئ من 5 إلى 7 محاور بحثية مفيدة، ولا تضع إجابات أسئلة البحث داخل قائمة الأسئلة.",
    (subject.slug === "physics" || /فيزياء|physics/i.test(subject.name || ""))
      ? "يمكن اختيار محاكي فيزياء فقط إذا كان ملائمًا علميًا للموضوع: harmonic_spring أو simple_pendulum أو wave_motion أو projectile_motion أو free_fall. لا تختَر محاكيًا لمجرد ملء الحقل."
      : "هذه المادة لا تملك محاكيًا تفاعليًا معتمدًا في النظام حاليًا؛ اجعل simulator_type مساويًا null واكتب نشاطًا عمليًا أو تحليليًا آمنًا عند طلبه.",
    includePractical
      ? "أرفق تجربة أو نشاطًا تطبيقيًا مرتبطًا بسؤال البحث. إذا كان الموضوع فيزيائيًا ويناسب نموذجًا موجودًا، اربط التجربة بنوع المحاكي وإعداداته. وإلا قدم تجربة موجهة بلا محاكاة."
      : "اجعل practical_experiment مساويًا null وsimulator_type مساويًا null.",
    detailLevel === "deep"
      ? "اكتب بحثًا موسعًا، مع شرح عميق وتحليل مترابط، بما يقارب 1200 إلى 1600 كلمة عربية."
      : "اكتب بحثًا متوسط التفصيل ومتكامل العناصر، بما يقارب 800 إلى 1100 كلمة عربية.",
  ].join("\n");

  const user = [
    "المرحلة: " + (subject.academic_stage || "البكالوريا المصرية"),
    "الصف: " + (subject.grade_level || ("الصف " + subject.curriculum_year)),
    subject.track ? "المسار: " + subject.track : "",
    "المادة: " + subject.name,
    subject.description ? "وصف المادة: " + cleanText(subject.description, 600) : "",
    "موضوع البحث الذي اختاره الطالب: " + topic,
    "مستوى التفصيل: " + (detailLevel === "deep" ? "موسع" : "متوسط"),
    "إضافة نشاط عملي: " + (includePractical ? "نعم، إذا كان مناسبًا وآمنًا" : "لا"),
    "ابدأ البحث بتحديد نطاق الموضوع وسؤال بحث واضح، ثم ابنِ المحاور حوله. لا تدّعِ أن البحث يطابق كتابًا رسميًا بعينه.",
    "أعد JSON فقط بالبنية المحددة.",
  ].filter(Boolean).join("\n");

  try {
    const result = await generateJson(req, { system, user, maxTokens: 8500 });
    const research = normalizeResearch(result.data?.research || result.data, subject, includePractical);

    if (
      !research ||
      !research.title ||
      !research.abstract ||
      !research.research_problem ||
      research.objectives.length < 2 ||
      research.sections.length < 4 ||
      research.conclusion.length < 20
    ) {
      await releaseReservation();
      console.error("research_generation_quality_check_failed");
      return res.status(502).json({
        ok: false,
        error: "incomplete_research_project",
        message: "لم تكتمل عناصر البحث بشكل كافٍ. لم تُخصم المحاولة، ويمكنك إعادة المحاولة أو جعل الموضوع أكثر تحديدًا.",
      });
    }

    const topicSimulator = includePractical ? matchPhysicsSimulator(subject, topic) : null;
    research.simulator_type = topicSimulator;
    research.simulation_config = topicSimulator
      ? normalizeSimulationConfig({}, topicSimulator)
      : {};

    if (includePractical) {
      if (topicSimulator) {
        research.practical_experiment = createSimulatorPractical(topicSimulator, topic);
      } else if (!research.practical_experiment) {
        research.practical_experiment = createGeneralResearchActivity(subject.name, topic);
      }
    } else {
      research.practical_experiment = null;
    }

    const { data: savedProject, error: saveError } = await auth.client.rpc(
      "save_learning_research_project",
      {
        p_reservation_id: reservation.id,
        p_subject_id: subject.id,
        p_topic: topic,
        p_title: research.title,
        p_content_json: research,
        p_simulator_type: research.simulator_type,
        p_simulation_config: research.simulation_config,
      }
    );

    if (saveError || !savedProject) {
      await releaseReservation();
      console.error("research_project_save_failed", { code: saveError?.code || "unknown" });
      if (saveError?.message?.includes("research_daily_limit")) {
        return res.status(429).json({
          ok: false,
          error: "research_daily_limit",
          message: "وصلت إلى الحد اليومي، وهو 5 محاولات لإنشاء بحث خلال 24 ساعة.",
        });
      }
      return res.status(500).json({
        ok: false,
        error: "research_save_failed",
        message: "تم إعداد البحث لكن تعذر حفظه. لم تُخصم المحاولة، ويمكنك إعادة المحاولة.",
      });
    }

    // A successful save consumes the reservation permanently.
    activeReservation = null;
    return res.status(200).json({ ok: true, project: savedProject, model: result.model });
  } catch (error) {
    await releaseReservation();
    console.error("research_ai_generation_failed", {
      code: error?.code || "unknown",
      status: error?.status || null
    });
    return sendApiError(res, error);
  }
}
