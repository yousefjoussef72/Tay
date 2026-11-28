import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";
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
      { key: "navHomeUrl", label: "رابط الرئيسية", value: "/#home" },
      { key: "navAboutUrl", label: "رابط عن الموقع", value: "/#about" },
      { key: "navFeaturesUrl", label: "رابط المميزات", value: "/#features" },
      { key: "navContactUrl", label: "رابط التواصل", value: "/#contact" },
      { key: "navLibraryUrl", label: "رابط المكتبة", value: "/library" },
      { key: "navExamsUrl", label: "رابط الامتحانات", value: "/exams" },
      { key: "navAccountUrl", label: "رابط الحساب", value: "/account" },
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
      { key: "heroPrimaryUrl", label: "رابط الزر الرئيسي", value: "#about" },
      { key: "heroSecondaryUrl", label: "رابط الزر الثانوي", value: "#contact" },
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
      { key: "aboutLinkUrl", label: "وجهة رابط قسم التعريف", value: "#features" },
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
      { key: "contactEmailPlaceholder", label: "مثال البريد الإلكتروني", value: "name@example.com" },
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
      { key: "accountUsernameLabel", label: "حقل اسم المستخدم", value: "اسم المستخدم" },
      { key: "accountPasswordLabel", label: "حقل كلمة المرور", value: "كلمة المرور" },
      { key: "accountBusy", label: "حالة تنفيذ تسجيل الدخول", value: "جارٍ التنفيذ..." },
      { key: "accountReturnToSite", label: "العودة إلى الموقع بعد تسجيل الدخول", value: "العودة إلى الموقع" },
      { key: "accountSignOut", label: "زر تسجيل الخروج", value: "تسجيل الخروج" },
      { key: "accountAdminRole", label: "اسم دور المدير", value: "مدير الموقع" },
      { key: "accountStudentRole", label: "اسم دور الطالب", value: "حساب طالب" },
      { key: "accountSignupCreated", label: "إشعار إنشاء الحساب", value: "تم إنشاء الحساب. سجّل الدخول الآن باسم المستخدم وكلمة المرور." },
      { key: "accountSessionStartError", label: "تعذر بدء الجلسة", value: "تم تنفيذ الطلب لكن تعذر بدء الجلسة. حاول تسجيل الدخول." },
      { key: "accountUsernameTaken", label: "اسم المستخدم المحجوز", value: "اسم المستخدم مستخدم بالفعل." },
      { key: "accountAuthError", label: "بيانات دخول غير صحيحة", value: "اسم المستخدم أو كلمة المرور غير صحيحة. راجع البيانات وحاول مرة أخرى." },
      
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
      { key: "libraryFileUnavailable", label: "رسالة عدم توفر رابط الملف", value: "تعذر تجهيز رابط هذا الملف، حدّث الصفحة وحاول مرة أخرى." },
      { key: "libraryNavLibrary", label: "رابط المكتبة", value: "المكتبة" },
      { key: "libraryGeneralCategory", label: "التصنيف العام الافتراضي", value: "عام" },
    ],
  },
  {
    title: "صفحة الامتحانات",
    fields: [
      { key: "examsKicker", label: "العبارة الصغيرة", value: "اختبر معلوماتك" },
      { key: "examsTitle", label: "عنوان الصفحة", value: "الامتحانات" },
      { key: "examsDescription", label: "وصف الصفحة", value: "اختبارات منشورة من فريق Tay Space، مع تصحيح تلقائي للأسئلة الموضوعية.", multiline: true },
      { key: "examsEmpty", label: "حالة عدم وجود امتحانات", value: "لا توجد امتحانات منشورة حتى الآن." },
      { key: "examViewButton", label: "زر عرض الامتحان", value: "عرض الامتحان" },
      { key: "examsLoading", label: "حالة تحميل قائمة الامتحانات", value: "جارٍ تحميل الامتحانات..." },
      { key: "examLoading", label: "حالة تحميل الامتحان", value: "جارٍ تحميل الامتحان..." },
      { key: "examDetailFallback", label: "وصف صفحة الامتحان الافتراضي", value: "اقرأ الأسئلة جيدًا ثم أرسل إجاباتك للتصحيح." },
      { key: "examNoQuestions", label: "رسالة عدم وجود أسئلة", value: "لا يحتوي هذا الامتحان على أسئلة حتى الآن." },
      { key: "examListLoadError", label: "رسالة فشل تحميل الامتحانات", value: "تعذر تحميل قائمة الامتحانات." },
      { key: "examAuthRequired", label: "رسالة ضرورة تسجيل الدخول", value: "سجّل الدخول أولًا لإرسال إجاباتك." },
      { key: "examStartButton", label: "زر بدء الامتحان", value: "ابدأ الامتحان" },
      { key: "examStarting", label: "حالة تجهيز الامتحان", value: "جارٍ تجهيز الامتحان..." },
      { key: "examStartError", label: "رسالة فشل بدء الامتحان", value: "تعذر بدء الامتحان. تحقق من اتصالك وحاول مرة أخرى." },
      { key: "examTimeExpired", label: "رسالة انتهاء وقت الامتحان", value: "انتهى وقت الامتحان ولم تُحفظ المحاولة. يمكنك بدء محاولة جديدة." },
      { key: "examRetrySubmitButton", label: "زر إعادة إرسال الإجابات", value: "إعادة إرسال الإجابات" },
      { key: "examLoginButton", label: "زر الدخول قبل الامتحان", value: "تسجيل الدخول لبدء الامتحان" },
      { key: "examSubmitButton", label: "زر إرسال الإجابات", value: "إرسال الإجابات والتصحيح" },
      { key: "examResultLabel", label: "عنوان النتيجة", value: "تم تصحيح إجاباتك" },
      { key: "examBackToList", label: "العودة لقائمة الامتحانات", value: "العودة إلى قائمة الامتحانات" },
      { key: "examsNavExams", label: "رابط الامتحانات", value: "الامتحانات" },
    ],
  },
];

SITE_COPY_GROUPS.push(
  {
    title: "صفحة قراءة المقال",
    fields: [
      { key: "articlePageBack", label: "العودة إلى الرئيسية", value: "العودة إلى الرئيسية" },
      { key: "articlePageBrand", label: "اسم الموقع أعلى المقال", value: "مساحة" },
      { key: "articlePageLabel", label: "نوع المحتوى", value: "مقال من داخل المساحة" },
      { key: "articlePageNotFound", label: "رسالة المقال غير المتاح", value: "المقال غير متاح" },
      { key: "articlePageNotFoundBody", label: "توضيح عدم توفر المقال", value: "قد يكون المقال حُذف أو لم يعد منشورًا." },
      { key: "articlePageMissingContent", label: "النص عند عدم وجود محتوى", value: "لم تتم إضافة محتوى لهذا المقال بعد." },
      { key: "articlePageBrowseMore", label: "رابط تصفح بقية الموقع", value: "تصفح بقية المساحة" },
    ],
  },
  {
    title: "تفاصيل المكتبة",
    fields: [
      { key: "libraryNavHome", label: "رابط الرئيسية", value: "الرئيسية" },
      { key: "libraryNavAccount", label: "رابط حسابي", value: "حسابي" },
      { key: "libraryAllCategories", label: "كل الأقسام", value: "الكل" },
      { key: "libraryFileFallback", label: "الوصف الافتراضي للملف", value: "ملف تعليمي مضاف إلى المكتبة." },
      { key: "libraryImageOpen", label: "عرض الصورة", value: "عرض الصورة" },
      { key: "libraryLinkOpen", label: "فتح الرابط الخارجي", value: "فتح الرابط" },
      { key: "libraryLoadError", label: "رسالة فشل المكتبة", value: "تعذر تحميل المكتبة الآن." },
      { key: "libraryLoading", label: "حالة تحميل المكتبة", value: "جارٍ تحميل الملفات..." },
    ],
  },
  {
    title: "تفاصيل الامتحانات",
    fields: [
      { key: "examsNavHome", label: "رابط الرئيسية", value: "الرئيسية" },
      { key: "examsNavAccount", label: "رابط حسابي", value: "حسابي" },
      { key: "examBackLabel", label: "العودة إلى الامتحانات", value: "العودة إلى الامتحانات" },
      { key: "examTrainingLabel", label: "عنوان نوع الامتحان", value: "امتحان تدريبي" },
      { key: "examDescriptionFallback", label: "وصف الامتحان الافتراضي", value: "اختبار تدريبي لقياس مدى استيعابك." },
      { key: "examDurationLabel", label: "مدة الامتحان", value: "مدة الامتحان" },
      { key: "examMinuteUnit", label: "وحدة الدقائق", value: "دقيقة" },
      { key: "examQuestionsCountLabel", label: "عدد الأسئلة", value: "عدد الأسئلة" },
      { key: "examLoginNotice", label: "تنبيه تسجيل الدخول", value: "تحتاج إلى تسجيل الدخول بحساب الطالب قبل بدء الامتحان." },
      { key: "examNoAnswersNotice", label: "تعليمات بدء الامتحان", value: "لن تظهر لك الإجابات الصحيحة أثناء الحل. سيحسب النظام درجتك بعد الإرسال." },
      { key: "examQuestionPoint", label: "وحدة الدرجة", value: "درجة" },
      { key: "examTimerLabel", label: "الوقت المتبقي", value: "الوقت المتبقي" },
      { key: "examShortAnswerPlaceholder", label: "حقل الإجابة القصيرة", value: "اكتب إجابتك هنا..." },
      { key: "examSubmitConfirm", label: "رسالة تأكيد الإرسال", value: "إرسال الإجابات وإنهاء الامتحان؟" },
      { key: "examSubmitting", label: "حالة إرسال الامتحان", value: "جارٍ التصحيح..." },
      { key: "examResultSaved", label: "رسالة حفظ النتيجة", value: "تم حفظ محاولتك في سجل الامتحان." },
      { key: "examQuestionsLoadError", label: "رسالة تعذر تحميل الأسئلة", value: "تعذر تحميل أسئلة الامتحان." },
      { key: "examUnavailable", label: "رسالة عدم توفر الامتحان", value: "الامتحان غير موجود أو لم يعد منشورًا." },
      { key: "examSubmitError", label: "رسالة فشل التصحيح", value: "تعذر تصحيح الامتحان. تأكد من اتصالك ثم حاول مرة أخرى." },
    ],
  },
  {
    title: "حالات ورسائل عامة",
    fields: [
      { key: "notFoundTitle", label: "عنوان صفحة 404", value: "هذه الصفحة غير موجودة." },
      { key: "notFoundBack", label: "العودة من صفحة 404", value: "العودة للرئيسية" },
      { key: "articlesEmpty", label: "حالة عدم وجود مقالات", value: "لا توجد مقالات منشورة بعد." },
      { key: "accountLoggedInLabel", label: "حالة تسجيل الدخول", value: "تم تسجيل الدخول" },
      { key: "accountWelcomeBack", label: "الترحيب بعد الدخول", value: "أهلًا بعودتك." },
      { key: "accountProfileDescription", label: "وصف الحساب بعد الدخول", value: "أصبح لديك حساب خاص. يمكنك العودة إلى الموقع ومتابعة المحتوى." },
      { key: "accountChecking", label: "حالة التحقق من الحساب", value: "جارٍ التحقق من حسابك..." },
      { key: "accountSignupSuccess", label: "رسالة نجاح إنشاء الحساب", value: "تم إنشاء حسابك وتسجيل دخولك بنجاح." },
      { key: "accountLoginSuccess", label: "رسالة نجاح تسجيل الدخول", value: "تم تسجيل الدخول بنجاح." },
      { key: "accountConnectionError", label: "رسالة خطأ الاتصال", value: "حدثت مشكلة اتصال. تحقق من الإنترنت وحاول مرة أخرى." },
    ],
  }
);

export const SITE_MEDIA_FIELDS = [
  { key: "brandLogoUrl", label: "شعار الموقع", description: "صورة الشعار التي تظهر بجوار اسم الموقع." },
  { key: "heroImageUrl", label: "صورة الواجهة الرئيسية", description: "صورة بديلة/إضافية لواجهة البداية." },
  { key: "aboutImageUrl", label: "صورة قسم التعريف", description: "صورة توضيحية لقسم عن الموقع." },
  { key: "featuresImageUrl", label: "صورة قسم المميزات", description: "صورة أو بانر لقسم المميزات." },
  { key: "contactImageUrl", label: "صورة قسم التواصل", description: "صورة خلفية أو صورة جانبية لقسم التواصل." },
  { key: "footerLogoUrl", label: "شعار التذييل", description: "صورة الشعار في أسفل الموقع." },
  { key: "feature1ImageUrl", label: "صورة بطاقة الميزة الأولى", description: "صورة اختيارية داخل البطاقة الأولى." },
  { key: "feature2ImageUrl", label: "صورة بطاقة الميزة الثانية", description: "صورة اختيارية داخل البطاقة الثانية." },
  { key: "feature3ImageUrl", label: "صورة بطاقة الميزة الثالثة", description: "صورة اختيارية داخل البطاقة الثالثة." },
];

export const SITE_SECTION_FIELDS = [
  { key: "showHeader", label: "القائمة العلوية", description: "إظهار أو إخفاء شريط التنقل." },
  { key: "showHero", label: "واجهة البداية", description: "إظهار أو إخفاء الواجهة الرئيسية." },
  { key: "showAbout", label: "قسم التعريف", description: "إظهار أو إخفاء قسم التعريف بالموقع." },
  { key: "showFeatures", label: "قسم المميزات", description: "إظهار أو إخفاء بطاقات المميزات." },
  { key: "showArticles", label: "آخر المقالات", description: "إظهار أو إخفاء أحدث المقالات المنشورة." },
  { key: "showContact", label: "قسم التواصل", description: "إظهار أو إخفاء نموذج التواصل." },
  { key: "showCustomBlocks", label: "الأقسام الإضافية", description: "إظهار أو إخفاء الأقسام التي تنشئها بنفسك." },
  { key: "showFooter", label: "تذييل الموقع", description: "إظهار أو إخفاء الجزء السفلي من الصفحة." },
];

export const DEFAULT_SITE_BLOCKS = [];

export const DEFAULT_SITE_COPY = Object.fromEntries(
  [...SITE_COPY_GROUPS.flatMap(group => group.fields.map(field => [field.key, field.value])), ...SITE_MEDIA_FIELDS.map(field => [field.key, ""]), ...SITE_SECTION_FIELDS.map(field => [field.key, true]), ["customBlocks", DEFAULT_SITE_BLOCKS]]
);

const SiteCopyContext = createContext(null);

export function SiteCopyProvider({ children }) {
  const [copy, setCopy] = useState(DEFAULT_SITE_COPY);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoaded(false);
      setLoadError("");
      try {
        if (!supabase) throw new Error("خدمة قاعدة البيانات غير متاحة.");
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "site_copy")
          .maybeSingle();
        if (error) throw error;
        if (active && data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
          setCopy({ ...DEFAULT_SITE_COPY, ...data.value });
        }
      } catch (error) {
        if (active) setLoadError(error?.message || "تعذر تحميل إعدادات الموقع.");
      } finally {
        if (active) setLoaded(true);
      }
    }
    load();
    return () => { active = false; };
  }, [loadVersion]);

  function reloadCopy() {
    setLoadVersion(version => version + 1);
  }

  async function saveCopy(nextCopy) {
    if (loadError) return { error: new Error("يجب تحميل إعدادات الموقع بنجاح قبل الحفظ.") };
    if (!supabase) return { error: new Error("خدمة قاعدة البيانات غير متاحة.") };
    const { error } = await supabase.from("site_settings").upsert({
      key: "site_copy",
      value: nextCopy,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    if (!error) setCopy({ ...DEFAULT_SITE_COPY, ...nextCopy });
    return { error };
  }

  const value = useMemo(() => ({ copy, setCopy, loaded, loadError, reloadCopy, saveCopy }), [copy, loaded, loadError]);
  return createElement(SiteCopyContext.Provider, { value }, children);
}

export function useSiteCopy() {
  const value = useContext(SiteCopyContext);
  if (!value) throw new Error("useSiteCopy must be used inside SiteCopyProvider");
  return value;
}
