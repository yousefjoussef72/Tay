import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase.js";

export const SITE_COPY_GROUPS = [
  {
    title: "اسم الموقع والهوية",
    description: "الاسم والشعار النصي الظاهرين في أعلى الموقع وأسفله.",
    fields: [
      { key: "brandName", label: "اسم الموقع", value: "مساحة" },
      { key: "brandTagline", label: "الشعار أسفل الاسم", value: "بداية تستحق" },
      { key: "publicHubTagline", label: "الشعار في صفحات المكتبة والامتحانات", value: "تعلم، نظّم، وتقدّم" },
    ],
  },
  {
    title: "القائمة الرئيسية",
    fields: [
      { key: "navHome", label: "الرئيسية", value: "الرئيسية" },
      { key: "navAbout", label: "عن الموقع", value: "عن الموقع" },
      { key: "navFeatures", label: "المميزات", value: "المميزات" },
      { key: "navContact", label: "تواصل معنا", value: "تواصل معنا" },
      { key: "navLibrary", label: "المكتبة", value: "المكتبة" },
      { key: "navExams", label: "الامتحانات", value: "الامتحانات" },
      { key: "navAccount", label: "حساب الطالب", value: "حساب الطالب" },
      { key: "navAdmin", label: "لوحة الإدارة", value: "لوحة الإدارة" },
    ],
  },
  {
    title: "الواجهة الرئيسية",
    fields: [
      { key: "heroEyebrow", label: "العبارة الصغيرة أعلى العنوان", value: "النسخة التأسيسية للموقع" },
      { key: "heroTitleLine1", label: "العنوان الرئيسي، السطر الأول", value: "كل بداية عظيمة" },
      { key: "heroTitleLine2", label: "العنوان الرئيسي، السطر الثاني", value: "تحتاج إلى مساحة." },
      { key: "heroDescription", label: "الوصف أسفل العنوان", value: "نضع الآن الأساس لموقعك. الفكرة والاسم والمحتوى سنحددها معًا، أما البنية التقنية فقد بدأت بالفعل.", multiline: true },
      { key: "heroPrimaryButton", label: "الزر الرئيسي", value: "اكتشف الموقع" },
      { key: "heroSecondaryButton", label: "الزر الثانوي", value: "ابدأ الحديث" },
      { key: "heroNote", label: "العبارة أسفل الأزرار", value: "تصميم مرن · عربي بالكامل · قابل للتطوير" },
      { key: "heroCardCaption", label: "النص على البطاقة الفنية", value: "مساحة جديدة" },
      { key: "heroBottomLeft", label: "النص أسفل اليسار", value: "01 — البداية" },
      { key: "heroBottomScroll", label: "عبارة التمرير", value: "مرّر لاكتشاف المزيد" },
    ],
  },
  {
    title: "قسم التعريف بالموقع",
    fields: [
      { key: "aboutKicker", label: "العنوان الصغير", value: "01 / الفكرة" },
      { key: "aboutTitleLine1", label: "العنوان، السطر الأول", value: "لسنا هنا لنملأ صفحة فارغة؛" },
      { key: "aboutTitleLine2", label: "العنوان، السطر الثاني", value: "بل لنصنع شيئًا له معنى." },
      { key: "aboutDescription", label: "النص التعريفي", value: "هذه نسخة أولية أنشأناها لتكون نقطة انطلاق. لا يوجد مجال أو محتوى مفروض مسبقًا؛ سنرسم تجربة الموقع معًا بعد تثبيت الأساس.", multiline: true },
      { key: "aboutLink", label: "رابط الانتقال للمميزات", value: "تعرف على ما تم تجهيزه" },
    ],
  },
  {
    title: "قسم المميزات",
    fields: [
      { key: "featuresKicker", label: "العنوان الصغير", value: "02 / ما تم بناؤه" },
      { key: "featuresTitleLine1", label: "العنوان، السطر الأول", value: "أساس قوي،" },
      { key: "featuresTitleLine2", label: "العنوان، السطر الثاني", value: "وتفاصيل نضيفها معًا." },
      { key: "featuresDescription", label: "الوصف", value: "جهزنا ما يحتاجه أي مشروع رقمي حديث قبل إدخال المحتوى النهائي.", multiline: true },
      { key: "feature1Title", label: "الميزة الأولى، العنوان", value: "هيكل مرن" },
      { key: "feature1Body", label: "الميزة الأولى، الوصف", value: "أساس منظم يسهل تطويره وتغيير صفحاته عندما تتحدد فكرة الموقع.", multiline: true },
      { key: "feature2Title", label: "الميزة الثانية، العنوان", value: "بيانات محمية" },
      { key: "feature2Body", label: "الميزة الثانية، الوصف", value: "قاعدة PostgreSQL مع صلاحيات وصول منفصلة وسياسات حماية على مستوى الصفوف.", multiline: true },
      { key: "feature3Title", label: "الميزة الثالثة، العنوان", value: "جاهز للنمو" },
      { key: "feature3Body", label: "الميزة الثالثة، الوصف", value: "إمكانية إضافة صفحات ومقالات وحسابات وخصائص جديدة دون إعادة البناء من الصفر.", multiline: true },
    ],
  },
  {
    title: "قسم أحدث المقالات",
    fields: [
      { key: "articlesKicker", label: "العنوان الصغير", value: "03 / آخر الإضافات" },
      { key: "articlesTitle", label: "عنوان القسم", value: "من داخل المساحة" },
      { key: "articlesSubtitle", label: "النص الجانبي", value: "المحتوى المنشور" },
      { key: "articleTag", label: "وسم المقال", value: "مقال · اضغط للقراءة" },
      { key: "articleFallback", label: "الوصف الافتراضي للمقال", value: "اكتشف هذا الموضوع من داخل المساحة." },
      { key: "articleReadMore", label: "رابط قراءة المقال", value: "قراءة المقال" },
    ],
  },
  {
    title: "قسم التواصل",
    fields: [
      { key: "contactKicker", label: "العنوان الصغير", value: "04 / الخطوة التالية" },
      { key: "contactTitleLine1", label: "العنوان، السطر الأول", value: "عندك فكرة؟" },
      { key: "contactTitleLine2", label: "العنوان، السطر الثاني", value: "خلّينا نبدأ." },
      { key: "contactDescription", label: "الوصف", value: "أرسل رسالة تجريبية الآن، أو استخدم هذا القسم لاحقًا لاستقبال استفسارات زوار الموقع.", multiline: true },
      { key: "contactMeta", label: "العبارة بجوار رمز البريد", value: "نموذج التواصل — تُحفظ الرسائل مباشرةً في قاعدة البيانات" },
      { key: "contactNameLabel", label: "حقل الاسم", value: "الاسم" },
      { key: "contactNamePlaceholder", label: "مثال الاسم", value: "اسمك" },
      { key: "contactEmailLabel", label: "حقل البريد الإلكتروني", value: "البريد الإلكتروني" },
      { key: "contactSubjectLabel", label: "حقل الموضوع", value: "موضوع الرسالة" },
      { key: "contactSubjectPlaceholder", label: "مثال الموضوع", value: "كيف يمكننا مساعدتك؟" },
      { key: "contactMessageLabel", label: "حقل الرسالة", value: "رسالتك" },
      { key: "contactMessagePlaceholder", label: "مثال الرسالة", value: "اكتب ما يدور في بالك..." },
      { key: "contactSubmit", label: "زر إرسال الرسالة", value: "إرسال الرسالة" },
      { key: "contactSending", label: "نص الزر أثناء الإرسال", value: "جارٍ الإرسال..." },
      { key: "contactSuccess", label: "رسالة نجاح الإرسال", value: "وصلت رسالتك بنجاح. شكرًا لتواصلك!" },
      { key: "contactFailure", label: "رسالة فشل الإرسال", value: "تعذر إرسال الرسالة الآن. حاول مرة أخرى لاحقًا." },
    ],
  },
  {
    title: "تذييل الموقع",
    fields: [
      { key: "footerText", label: "النص بجوار حقوق النشر", value: "© 2026 — نسخة تأسيسية قابلة للتطوير" },
      { key: "footerBackTop", label: "رابط العودة للأعلى", value: "العودة للأعلى" },
    ],
  },
  {
    title: "واجهة حساب الطالب",
    fields: [
      { key: "accountBrandSubtitle", label: "تعريف الحساب", value: "مساحة — حساب الطالب" },
      { key: "accountSignupTitle", label: "عنوان إنشاء الحساب", value: "ابدأ مساحتك الخاصة." },
      { key: "accountLoginTitle", label: "عنوان تسجيل الدخول", value: "سجّل دخولك من جديد." },
      { key: "accountDescription", label: "وصف إنشاء الحساب وتسجيل الدخول", value: "استخدم اسم المستخدم وكلمة المرور، من غير رسائل تأكيد بالبريد الإلكتروني.", multiline: true },
      { key: "accountSignupTab", label: "تبويب إنشاء الحساب", value: "إنشاء حساب جديد" },
      { key: "accountLoginTab", label: "تبويب تسجيل الدخول", value: "تسجيل الدخول" },
      { key: "accountFullName", label: "حقل الاسم الكامل", value: "الاسم الكامل" },
      { key: "accountFullNamePlaceholder", label: "مثال الاسم الكامل", value: "اكتب اسمك" },
      { key: "accountUsername", label: "حقل اسم المستخدم", value: "اسم المستخدم" },
      { key: "accountUsernamePlaceholder", label: "مثال اسم المستخدم", value: "مثال: yousef_123" },
      { key: "accountPassword", label: "حقل كلمة المرور", value: "كلمة المرور" },
      { key: "accountPasswordPlaceholder", label: "مثال كلمة المرور", value: "8 أحرف على الأقل" },
      { key: "accountCreateButton", label: "زر إنشاء الحساب", value: "إنشاء حساب" },
      { key: "accountLoginButton", label: "زر تسجيل الدخول", value: "تسجيل الدخول" },
      { key: "accountBackHome", label: "العودة للرئيسية", value: "العودة إلى الصفحة الرئيسية" },
      { key: "accountFootnote", label: "ملاحظة أسفل نموذج الحساب", value: "اسم المستخدم من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو _ فقط. في الحسابات السابقة، استُخدم الجزء السابق لعلامة @ من بريد التسجيل كاسم مستخدم بعد تحويله إلى أحرف صغيرة واستبدال الرموز غير المدعومة بـ _. احتفظ بكلمة المرور؛ لا يتوفر استرداد آلي لها في هذه النسخة.", multiline: true },
    ],
  },
  {
    title: "صفحة المكتبة",
    fields: [
      { key: "libraryBrandTagline", label: "الشعار العلوي", value: "تعلم، نظّم، وتقدّم" },
      { key: "libraryKicker", label: "العبارة الصغيرة", value: "مكتبة Tay Space" },
      { key: "libraryTitle", label: "عنوان الصفحة", value: "المكتبة التعليمية" },
      { key: "libraryDescription", label: "وصف الصفحة", value: "الكتب والملخصات والملفات والصور التي يضيفها فريق الموقع.", multiline: true },
      { key: "librarySearchPlaceholder", label: "مربع البحث", value: "ابحث عن كتاب أو ملخص..." },
      { key: "libraryEmpty", label: "حالة المكتبة الفارغة", value: "لا توجد ملفات منشورة تطابق بحثك حاليًا." },
      { key: "libraryOpenFile", label: "فتح/تحميل الملف", value: "فتح أو تحميل الملف" },
    ],
  },
  {
    title: "صفحة الامتحانات",
    fields: [
      { key: "examsKicker", label: "العبارة الصغيرة", value: "اختبر معلوماتك" },
      { key: "examsTitle", label: "عنوان الصفحة", value: "الامتحانات" },
      { key: "examsDescription", label: "وصف الصفحة", value: "اختبارات منشورة من فريق Tay Space، مع تصحيح تلقائي للأسئلة الموضوعية.", multiline: true },
      { key: "examsEmpty", label: "حالة عدم وجود امتحانات", value: "لا توجد امتحانات منشورة حتى الآن." },
      { key: "examStartButton", label: "زر بدء الامتحان", value: "ابدأ الامتحان" },
      { key: "examLoginButton", label: "زر الدخول قبل الامتحان", value: "تسجيل الدخول لبدء الامتحان" },
      { key: "examSubmitButton", label: "زر إرسال الإجابات", value: "إرسال الإجابات والتصحيح" },
      { key: "examResultLabel", label: "عنوان النتيجة", value: "تم تصحيح إجاباتك" },
      { key: "examBackToList", label: "العودة لقائمة الامتحانات", value: "العودة إلى قائمة الامتحانات" },
    ],
  },
];

export const DEFAULT_SITE_COPY = Object.fromEntries(
  SITE_COPY_GROUPS.flatMap(group => group.fields.map(field => [field.key, field.value]))
);

const SiteCopyContext = createContext(null);

export function SiteCopyProvider({ children }) {
  const [copy, setCopy] = useState(DEFAULT_SITE_COPY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (supabase) {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "site_copy")
          .maybeSingle();
        if (active && data?.value && typeof data.value === "object") {
          setCopy({ ...DEFAULT_SITE_COPY, ...data.value });
        }
      }
      if (active) setLoaded(true);
    }
    load();
    return () => { active = false; };
  }, []);

  async function saveCopy(nextCopy) {
    if (!supabase) return { error: new Error("خدمة قاعدة البيانات غير متاحة.") };
    const { error } = await supabase.from("site_settings").upsert({
      key: "site_copy",
      value: nextCopy,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    if (!error) setCopy({ ...DEFAULT_SITE_COPY, ...nextCopy });
    return { error };
  }

  const value = useMemo(() => ({ copy, setCopy, loaded, saveCopy }), [copy, loaded]);
  return <SiteCopyContext.Provider value={value}>{children}</SiteCopyContext.Provider>;
}

export function useSiteCopy() {
  const value = useContext(SiteCopyContext);
  if (!value) throw new Error("useSiteCopy must be used inside SiteCopyProvider");
  return value;
}
