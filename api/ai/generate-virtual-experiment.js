import {
  generateGroqJson,
  requireUser,
  sendApiError,
  setApiHeaders,
} from "../../lib/ai-server.js";

const SIMULATOR_TYPES = new Set([
  "harmonic_spring",
  "simple_pendulum",
  "wave_motion",
  "projectile_motion",
  "free_fall",
  "generic_model",
]);

const GENERIC_MODELS = new Set([
  "linear",
  "quadratic",
  "inverse",
  "inverse_square",
  "exponential_growth",
  "exponential_decay",
  "sinusoidal",
  "logistic_growth",
]);

const SPECIAL_CONFIGS = {
  harmonic_spring: {
    mass: [0.1, 2, 0.3],
    stiffness: [10, 200, 80],
    amplitude_cm: [2, 12, 6],
  },
  simple_pendulum: {
    length: [0.35, 1.4, 0.8],
    mass: [0.1, 1.5, 0.3],
    max_angle_deg: [3, 20, 12],
  },
  wave_motion: {
    amplitude: [0.5, 5, 2],
    frequency: [0.2, 5, 1.5],
  },
  projectile_motion: {
    speed: [2, 30, 12],
    angle_deg: [10, 80, 45],
    height: [0, 20, 0],
  },
  free_fall: {
    height: [1, 100, 20],
  },
};

function isExperimentSubject(subject) {
  const value = [subject?.name, subject?.slug].filter(Boolean).join(" ").toLowerCase();
  return /فيزياء|physics|رياضيات|mathematics|\\bmath\\b|كيمياء|chemistry/.test(value);
}

function cleanText(value, max = 600) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function cleanArray(value, maxItems = 8, maxLength = 400) {
  return Array.isArray(value)
    ? value.map(item => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function bounded(value, min, max, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function normalizeConfig(value, simulatorType) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (SPECIAL_CONFIGS[simulatorType]) {
    return Object.fromEntries(Object.entries(SPECIAL_CONFIGS[simulatorType]).map(([key, [min, max, fallback]]) => [
      key,
      bounded(input[key], min, max, fallback),
    ]));
  }

  const model = GENERIC_MODELS.has(input.model) ? input.model : "linear";
  let xMin = bounded(input.x_min, -1000, 1000, 0);
  let xMax = bounded(input.x_max, -999.99, 10000, 10);
  if (xMax <= xMin) {
    xMin = 0;
    xMax = 10;
  }

  return {
    model,
    x_label: cleanText(input.x_label, 70) || "المتغير المستقل",
    y_label: cleanText(input.y_label, 70) || "المتغير الناتج",
    x_unit: cleanText(input.x_unit, 18),
    y_unit: cleanText(input.y_unit, 18),
    x_min: xMin,
    x_max: xMax,
    x_value: bounded(input.x_value, xMin, xMax, (xMin + xMax) / 2),
    initial_value: bounded(input.initial_value, 0.001, 10000, 1),
    rate: bounded(input.rate, -5, 5, 0.5),
    amplitude: bounded(input.amplitude, 0, 10000, 1),
    offset: bounded(input.offset, -10000, 10000, 0),
    frequency: bounded(input.frequency, 0.01, 10, 1),
    carrying_capacity: bounded(input.carrying_capacity, 0.01, 10000, 100),
  };
}

function normalizeExperiment(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.blocked === true) return { blocked: true };

  const simulatorType = SIMULATOR_TYPES.has(value.simulator_type)
    ? value.simulator_type
    : "generic_model";
  const experiment = {
    title: cleanText(value.title, 160),
    description: cleanText(value.description, 900),
    hypothesis: cleanText(value.hypothesis, 700),
    simulator_type: simulatorType,
    simulation_config: normalizeConfig(value.simulation_config, simulatorType),
    variables: {
      independent: cleanText(value.variables?.independent, 240),
      dependent: cleanText(value.variables?.dependent, 240),
      controlled: cleanArray(value.variables?.controlled, 6, 180),
    },
    steps: cleanArray(value.steps, 8, 420),
    expected_observations: cleanArray(value.expected_observations, 6, 350),
    analysis_questions: cleanArray(value.analysis_questions, 5, 300),
    safety_notes: cleanArray(value.safety_notes, 5, 300),
    model_limitations: cleanText(value.model_limitations, 600),
  };

  if (
    !experiment.title ||
    !experiment.description ||
    experiment.steps.length < 3 ||
    experiment.expected_observations.length < 1
  ) return null;

  if (simulatorType === "generic_model" && !GENERIC_MODELS.has(value.simulation_config?.model)) {
    experiment.simulation_config.model = "linear";
  }

  return experiment;
}

async function refundReservation(client, reservation) {
  if (!reservation?.id) return;
  try {
    const { error } = await client.rpc("refund_learning_research_generation", {
      p_reservation_id: reservation.id,
    });
    if (error) console.error("virtual_experiment_quota_refund_failed", { code: error.code || "unknown" });
  } catch (error) {
    console.error("virtual_experiment_quota_refund_failed", { code: error?.code || "network_error" });
  }
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
  const unsafeTopicPattern = /(?:سلاح|اسلحه|قنبله|متفجر|سموم|سم قاتل|تسميم|إيذاء|ايذاء|انتحار|إيذاء النفس|weapon|firearm|bomb|explosive|poison|toxin|self.?harm)/i;
  if (unsafeTopicPattern.test(topic)) {
    return res.status(400).json({
      ok: false,
      error: "unsafe_experiment_topic",
      message: "هذا الموضوع لا يمكن تحويله إلى تجربة. اختر ظاهرة علمية آمنة للمحاكاة الرقمية.",
    });
  }
  if (!subjectId || topic.length < 3) {
    return res.status(400).json({
      ok: false,
      error: "invalid_experiment_request",
      message: "اختر مجالًا للتجربة واكتب فكرتها في ثلاثة أحرف على الأقل.",
    });
  }

  const { data: subject, error: subjectError } = await auth.client
    .from("learning_subjects")
    .select("id,name,slug,academic_stage,grade_level,track,description")
    .eq("id", subjectId)
    .eq("is_published", true)
    .maybeSingle();

  if (subjectError || !subject) {
    return res.status(404).json({
      ok: false,
      error: "subject_not_available",
      message: "تعذر تحميل المجال المحدد. ارجع واختر مجالًا آخر.",
    });
  }

  if (!isExperimentSubject(subject)) {
    return res.status(400).json({
      ok: false,
      error: "experiment_subject_not_supported",
      message: "مختبر التجارب التفاعلي مخصص للفيزياء والرياضيات والكيمياء فقط. استخدم مساعد الأسئلة لبقية المواد.",
    });
  }

  const { data: reservation, error: reservationError } = await auth.client.rpc(
    "reserve_learning_research_generation"
  );
  if (reservationError || !reservation?.id) {
    if (reservationError?.message?.includes("research_daily_limit")) {
      return res.status(429).json({
        ok: false,
        error: "experiment_daily_limit",
        message: "وصلت إلى الحد اليومي، وهو 5 محاولات لإنشاء محاكاة خلال 24 ساعة.",
      });
    }
    return res.status(500).json({
      ok: false,
      error: "experiment_quota_failed",
      message: "تعذر حجز محاولة المحاكاة. حاول مرة أخرى.",
    });
  }

  let activeReservation = reservation;
  const releaseReservation = async () => {
    const pending = activeReservation;
    activeReservation = null;
    await refundReservation(auth.client, pending);
  };

  const system = [
    "أنت مصمم تجارب ومحاكاة علمية تفاعلية للمتعلمين.",
    "أنشئ تجربة يمكن استكشافها داخل محاكي تفاعلي، وليس بحثًا أو مقالًا أو شرحًا مطولًا.",
    "اسمح بموضوعات من خارج المناهج الدراسية ومن أي مجال علمي أو تقني آمن. المجال الدراسي المرسل مجرد تصنيف للحفظ ولا يقيّد الموضوع.",
    "اختر محاكيًا مناسبًا من الأنواع المدعومة: harmonic_spring, simple_pendulum, wave_motion, projectile_motion, free_fall, generic_model.",
    "استخدم أحد المحاكيات الخمسة المتخصصة فقط عندما يطابق الظاهرة فعلًا. وإلا استخدم generic_model بوصفه نموذجًا رياضيًا مبسطًا لعلاقة علمية قابلة للقياس.",
    "في generic_model اختر model واحدًا فقط من: linear, quadratic, inverse, inverse_square, exponential_growth, exponential_decay, sinusoidal, logistic_growth.",
    "لا تخترع قانونًا أو علاقة علمية. إذا لم تكن العلاقة مؤكدة، صرّح في model_limitations بأنها فرضية تعليمية مبسطة وليست تنبؤًا علميًا موثوقًا.",
    "لا تقترح تجربة واقعية خطرة، أو تصنيع أسلحة، أو متفجرات، أو إيذاء أشخاص أو حيوانات، أو التعامل مع مواد سامة/مسببة للحريق أو ضغط عالٍ. عند طلب موضوع خطر أعد blocked:true ولا تضع خطواته.",
    "المحاكاة رقمية فقط. لا تطلب من الطالب شراء مواد أو تنفيذ نشاط واقعي قد يسبب إصابة. يمكن أن تذكر تنبيهًا بضرورة إشراف المعلم لأي تطبيق خارج الشاشة.",
    "أخرج JSON صالحًا فقط دون Markdown أو أي نص خارجه.",
    "البنية المطلوبة: {blocked:false, title, description, hypothesis, simulator_type, simulation_config, variables:{independent,dependent,controlled:[]}, steps:[], expected_observations:[], analysis_questions:[], safety_notes:[], model_limitations}.",
    "اجعل الخطوات من 3 إلى 6 خطوات قصيرة موجّهة لاستخدام المحاكي وتغيير المتغيرات ومقارنة النتائج.",
    "في simulation_config للمحاكيات المتخصصة استخدم مفاتيحها المعروفة فقط.",
    "في generic_model اجعل simulation_config بهذه المفاتيح: model, x_label, y_label, x_unit, y_unit, x_min, x_max, x_value, initial_value, rate, amplitude, offset, frequency, carrying_capacity.",
    "استخدم نطاقات معقولة وغير سالبة في initial_value وamplitude وcarrying_capacity. اجعل x_min أقل من x_max. واجعل rate بين -5 و5.",
    "لا تُرجع كود JavaScript أو HTML أو CSS أو أي معادلات قابلة للتنفيذ. اختر فقط من أنواع العلاقات المحددة مسبقًا.",
    "لا تدّع أن المحاكاة تمثل كل تفاصيل الواقع؛ اذكر الافتراضات أو حدود النموذج عند الحاجة."
  ].join("\n");

  const user = [
    "فكرة التجربة: " + topic,
    "المجال المختار للتصنيف والحفظ فقط: " + subject.name,
    "المرحلة الدراسية: " + (subject.academic_stage || "غير محدد"),
    "السياق الدراسي: " + (subject.grade_level || "غير محدد"),
    "ملاحظة: اسم المجال لا يفرض أن تكون التجربة من المنهج. اتبع موضوع الطالب نفسه.",
    "أعد تجربة ومحاكاة تفاعلية، لا بحثًا مكتوبًا."
  ].join("\n");

  try {
    const result = await generateGroqJson({ system, user, maxTokens: 2200 });
    const experiment = normalizeExperiment(result.data?.experiment || result.data);

    if (experiment?.blocked) {
      await releaseReservation();
      return res.status(400).json({
        ok: false,
        error: "unsafe_experiment_topic",
        message: "لا أستطيع إنشاء محاكاة لهذا الطلب. جرّب ظاهرة علمية آمنة يمكن استكشافها رقميًا.",
      });
    }

    if (!experiment) {
      await releaseReservation();
      return res.status(502).json({
        ok: false,
        error: "incomplete_experiment",
        message: "لم تكتمل المحاكاة أو لم تطابق النماذج المدعومة. لم تُخصم محاولتك. جرّب صياغة الفكرة بصورة أوضح.",
      });
    }

    const content = {
      kind: "virtual_experiment",
      ...experiment,
      model: result.model || null,
      generated_at: new Date().toISOString(),
    };

    const { data: savedExperiment, error: saveError } = await auth.client.rpc(
      "save_learning_research_project",
      {
        p_reservation_id: reservation.id,
        p_subject_id: subject.id,
        p_topic: topic,
        p_title: experiment.title,
        p_content_json: content,
        p_simulator_type: experiment.simulator_type,
        p_simulation_config: experiment.simulation_config,
      }
    );

    if (saveError || !savedExperiment) {
      await releaseReservation();
      console.error("virtual_experiment_save_failed", { code: saveError?.code || "unknown" });
      return res.status(500).json({
        ok: false,
        error: "experiment_save_failed",
        message: "أُنشئت المحاكاة لكن تعذر حفظها. لم تُخصم محاولتك، ويمكنك إعادة المحاولة.",
      });
    }

    activeReservation = null;
    return res.status(200).json({
      ok: true,
      experiment: savedExperiment,
      model: result.model || null,
    });
  } catch (error) {
    await releaseReservation();
    console.error("virtual_experiment_generation_failed", {
      code: error?.code || "unknown",
      status: error?.status || null,
    });
    return sendApiError(res, error);
  }
}
