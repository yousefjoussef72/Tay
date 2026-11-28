import { generateJson, requireAdmin, sendApiError, setApiHeaders } from "../../lib/ai-server.js";

const TYPES = new Set(["mcq", "true_false", "short_answer", "essay"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard", "mixed"]);

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeQuestion(item, index) {
  const questionType = TYPES.has(item?.question_type) ? item.question_type : "";
  const prompt = text(item?.prompt, 3000);
  const correctAnswer = text(item?.correct_answer, 6000);
  const points = Math.max(1, Math.min(100, Math.round(Number(item?.points) || 1)));
  if (!questionType || !prompt || !correctAnswer) return null;

  let options = [];
  if (questionType === "mcq") {
    options = Array.isArray(item.options) ? item.options.map(option => text(option, 500)).filter(Boolean).slice(0, 6) : [];
    if (options.length < 3 || options.length > 6 || !options.includes(correctAnswer)) return null;
  } else if (questionType === "true_false") {
    options = ["صحيح", "خطأ"];
    if (!options.includes(correctAnswer)) return null;
  }

  const gradingRubric = questionType === "essay" ? text(item.grading_rubric, 4000) : "";
  if (questionType === "essay" && !gradingRubric) return null;

  return {
    prompt,
    question_type: questionType,
    options,
    correct_answer: correctAnswer,
    grading_mode: questionType === "essay" ? "ai" : "auto",
    grading_rubric: gradingRubric,
    points,
    sort_order: index,
  };
}

export default async function handler(req, res) {
  if (!setApiHeaders(req, res)) return res.status(403).json({ ok: false, error: "origin_not_allowed" });
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

  const topic = text(req.body?.topic, 1800);
  const subject = text(req.body?.subject, 120);
  const level = text(req.body?.level, 120);
  const difficulty = DIFFICULTIES.has(req.body?.difficulty) ? req.body.difficulty : "mixed";
  const count = Math.max(1, Math.min(20, Math.round(Number(req.body?.count) || 8)));
  const types = Array.isArray(req.body?.types)
    ? [...new Set(req.body.types.filter(type => TYPES.has(type)))]
    : ["mcq", "short_answer"];
  if (topic.length < 3 || types.length === 0) {
    return res.status(400).json({ ok: false, error: "invalid_generation_settings", message: "اكتب موضوعًا واختر نوعًا واحدًا على الأقل." });
  }

  const requestedTypes = types.map(type => ({
    mcq: "اختيار من متعدد",
    true_false: "صح أو خطأ",
    short_answer: "إجابة قصيرة",
    essay: "مقالي",
  }[type])).join("، ");

  const system = [
    "أنت خبير في بناء الاختبارات التعليمية وقياس نواتج التعلم.",
    "اكتب بالعربية الفصحى الواضحة، وراعِ المستوى الدراسي المحدد.",
    "أنشئ أسئلة أصلية دقيقة وغير مكررة، تقيس الفهم والتطبيق والتحليل لا الحفظ وحده.",
    "لا تخترع حقائق علمية. إذا كان الموضوع غير محدد بما يكفي، أنشئ أسئلة عامة صالحة فقط.",
    "أخرج JSON صالحًا فقط بالشكل { questions: [...] } من دون Markdown أو نص خارج JSON.",
    "كل سؤال يجب أن يحتوي prompt وquestion_type وoptions وcorrect_answer وpoints.",
    "في MCQ أنشئ 4 اختيارات معقولة، اختيارًا صحيحًا واحدًا فقط، ومشتتات غير مضللة، ويجب أن يطابق correct_answer نص أحد الخيارات حرفيًا.",
    "في true_false اجعل options مساوية تمامًا [صحيح, خطأ] وcorrect_answer واحدة منهما.",
    "في short_answer اكتب إجابة نموذجية قصيرة ودقيقة.",
    "في essay اكتب إجابة نموذجية وعناصر تصحيح واضحة في grading_rubric، واجعل grading_mode ai.",
    "لا تضع الإجابات ضمن نص السؤال أو الاختيارات بطريقة تكشفها.",
  ].join("\n");

  const prompt = [
    "الموضوع: " + topic,
    subject ? "المادة: " + subject : "",
    level ? "المستوى الدراسي: " + level : "",
    "الصعوبة: " + ({ easy: "سهل", medium: "متوسط", hard: "متقدم", mixed: "متدرجة ومتنوعة" }[difficulty]),
    "عدد الأسئلة المطلوب بالضبط: " + count,
    "الأنواع المسموح بها: " + requestedTypes,
    "وزّع الأسئلة على الأنواع المختارة بصورة متوازنة. لا تضف نوعًا غير مختار.",
    "اجعل الدرجة بين 1 و5 لكل سؤال، وراعِ صعوبة السؤال في توزيع الدرجة.",
    "أعد JSON فقط بهذه البنية: { \"questions\": [{ \"prompt\": \"...\", \"question_type\": \"mcq|true_false|short_answer|essay\", \"options\": [], \"correct_answer\": \"...\", \"grading_rubric\": \"...\", \"points\": 1 }] }",
  ].filter(Boolean).join("\n");

  try {
    const result = await generateJson(req, { system, user: prompt, maxTokens: Math.min(12000, count * 700) });
    const questions = Array.isArray(result.data?.questions)
      ? result.data.questions.map(normalizeQuestion).filter(Boolean)
      : [];
    if (questions.length !== count) {
      return res.status(502).json({
        ok: false,
        error: "incomplete_generation",
        message: "الأسئلة المولدة لم تجتز فحص الجودة. أعد المحاولة أو قلّل العدد.",
      });
    }
    return res.status(200).json({ ok: true, questions, model: result.model });
  } catch (error) {
    return sendApiError(res, error);
  }
}
