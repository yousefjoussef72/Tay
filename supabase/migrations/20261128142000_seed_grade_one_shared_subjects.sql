-- The first Baccalaureate year is a common preparatory year before track specialization.
insert into public.learning_subjects
 (name,slug,academic_stage,grade_level,track,term,description,icon,color,is_published,sort_order,curriculum_year,subject_kind,choice_group,choice_rule)
values
 ('اللغة العربية','arabic-grade-1','البكالوريا المصرية','الصف الأول','جميع المسارات','','مادة أساسية مشتركة تدخل في مجموع الصف الأول الثانوي.','book-open','teal',true,1,1,'core','','none'),
 ('اللغة الأجنبية الأولى','first-foreign-language-grade-1','البكالوريا المصرية','الصف الأول','جميع المسارات','','مادة أساسية مشتركة. يمكن للمدرسة تحديد اللغة المقدمة ضمن إعدادات المحتوى.','languages','blue',true,2,1,'core','','none'),
 ('التاريخ المصري','egyptian-history-grade-1','البكالوريا المصرية','الصف الأول','جميع المسارات','','مادة أساسية مشتركة تدخل في مجموع الصف الأول الثانوي.','landmark','amber',true,3,1,'core','','none'),
 ('الرياضيات','mathematics-grade-1','البكالوريا المصرية','الصف الأول','جميع المسارات','','مادة أساسية مشتركة تدخل في مجموع الصف الأول الثانوي.','calculator','teal',true,4,1,'core','','none'),
 ('العلوم المتكاملة','integrated-science-grade-1','البكالوريا المصرية','الصف الأول','جميع المسارات','','مادة أساسية مشتركة تجمع مفاهيم العلوم للصف الأول الثانوي.','flask-conical','green',true,5,1,'core','','none'),
 ('الفلسفة والمنطق','philosophy-logic-grade-1','البكالوريا المصرية','الصف الأول','جميع المسارات','','مادة أساسية مشتركة لتنمية التفكير النقدي والاستدلال المنطقي.','brain','coral',true,6,1,'core','','none'),
 ('التربية الدينية','religious-education-grade-1','البكالوريا المصرية','الصف الأول','جميع المسارات','','مادة مشتركة للنجاح والرسوب ولا تضاف درجاتها إلى المجموع، ويشترط تحقيق الحد الأدنى المقرر للنجاح.','book-open','green',true,7,1,'non_counting','','none'),
 ('اللغة الأجنبية الثانية','second-foreign-language-grade-1','البكالوريا المصرية','الصف الأول','جميع المسارات','','مادة مشتركة للنجاح والرسوب وفق نظام الصف الأول.','languages','blue',true,8,1,'non_counting','','none'),
 ('البرمجة والذكاء الاصطناعي','programming-ai-grade-1','البكالوريا المصرية','الصف الأول','جميع المسارات','','مادة مشتركة للنجاح والرسوب في الصف الأول الثانوي.','code','blue',true,9,1,'non_counting','','none'),
 ('التربية الرياضية','physical-education-grade-1','البكالوريا المصرية','الصف الأول','جميع المسارات','','نشاط عملي ضمن أنشطة الصف الأول الثانوي، ولا تضاف درجاته إلى المجموع.','activity','green',true,10,1,'activity','','none')
on conflict (slug) do nothing;
