-- Seed the original harmonic-motion educational content as editable curriculum data.
do $seed$
declare
  v_subject uuid;
  v_unit uuid;
  v_lesson uuid;
begin
  insert into public.learning_subjects
    (name, slug, academic_stage, grade_level, track, description, icon, color, is_published, sort_order)
  values
    ('الفيزياء', 'physics', 'البكالوريا المصرية', 'الصف الثاني', 'مسار الطب وعلوم الحياة',
     'محتوى الفيزياء والتجارب التفاعلية للصف الثاني من البكالوريا المصرية.',
     'atom', 'teal', true, 1)
  on conflict (slug) do nothing;
  select id into v_subject from public.learning_subjects where slug='physics';

  insert into public.learning_units(subject_id,title,slug,description,is_published,sort_order)
  values(v_subject,'الحركة التوافقية البسيطة','simple-harmonic-motion',
    'مدخل إلى الحركة التوافقية وقانون هوك والزمن الدوري والطاقة والبندول.',true,1)
  on conflict(subject_id,slug) do nothing;
  select id into v_unit from public.learning_units
    where subject_id=v_subject and slug='simple-harmonic-motion';

  insert into public.learning_lessons
    (unit_id,title,slug,summary,content_json,learning_objectives,is_published,sort_order)
  values(
    v_unit,'فهم الحركة التوافقية وقوانينها','harmonic-motion-laws',
    'افهم الفكرة، شاهد الحركة، ثم اربط بين القوة والإزاحة والزمن والطاقة.',
    jsonb_build_object(
      'intro','تخيّل جسمًا مربوطًا بنابض. عندما تسحبه قليلًا ثم تتركه، يتحرك ذهابًا وإيابًا حول موضع ثابت يسمى موضع الاتزان. ندرس الحركة من خلال التجربة ثم نربط ما نراه بالقوانين.',
      'sections',jsonb_build_array(
        jsonb_build_object('id','idea','title','يعني إيه حركة توافقية بسيطة؟','subtitle','الفكرة الأساسية','body','الحركة التوافقية البسيطة حركة اهتزازية تكون فيها قوة الإرجاع متناسبة طرديًا مع الإزاحة، وفي عكس اتجاهها. كلما ابتعد الجسم عن موضع الاتزان زاد مقدار القوة التي تعيده.','formula','F = −kx','simple','كلما أبعدت الجسم عن المنتصف، زادت قوة النابض التي تشده إلى المنتصف.','exam','قوة الإرجاع تتناسب طرديًا مع الإزاحة وتكون في عكس اتجاهها: F = −kx.','deep','السالب يعبّر عن الاتجاه لا عن مقدار الثابت. مقدار القوة |F| = k|x|، وk ثابت موجب.'),
        jsonb_build_object('id','hooke','title','قانون هوك: لماذا يعود الجسم؟','subtitle','القوة والإزاحة','body','داخل حد المرونة، يزداد مقدار قوة النابض بنفس نسبة زيادة الإزاحة. اتجاه قوة النابض يكون دائمًا عكس اتجاه الإزاحة عن موضع الاتزان.','formula','F = −kx   |   a = −(k/m)x','example','إذا كان k = 50 N/m وأزحنا الجسم 0.04 m، فإن مقدار القوة = 50 × 0.04 = 2 N، واتجاهها عكس الإزاحة.','simple','لو سحبت النابض مسافة أكبر، سيؤثر بقوة أكبر في الاتجاه العكسي.','exam','k هي صلابة النابض ووحدتها N/m. عند x = 0 تكون F = 0، وعند x = ±A تكون القوة عظمى.','deep','بالتعويض في قانون نيوتن F = ma نحصل على a = −(k/m)x، وهي صورة التسارع في الحركة التوافقية.'),
        jsonb_build_object('id','period','title','الزمن الدوري والتردد','subtitle','كم تستغرق الاهتزازة؟','body','الزمن الدوري T هو الزمن اللازم لعمل اهتزازة كاملة. التردد f هو عدد الاهتزازات الكاملة في الثانية.','formula','T = 2π√(m/k)   |   f = 1/T   |   ω = 2πf','simple','الجسم الأثقل يحتاج وقتًا أطول لإكمال الحركة. النابض الأكثر صلابة يجعل الاهتزاز أسرع.','exam','T = 2π√(m/k)، وω = √(k/m)، وf = 1/T. لا تدخل السعة A في قانون الزمن الدوري للنموذج المثالي.','deep','من F = ma وF = −kx: a = −(k/m)x. وبالمقارنة مع a = −ω²x نجد ω² = k/m، ثم T = 2π/ω.'),
        jsonb_build_object('id','energy','title','الطاقة: أين تذهب الحركة؟','subtitle','تبادل بين طاقة الوضع والحركة','body','عند أقصى إزاحة تكون السرعة لحظيًا صفرًا والطاقة مخزنة في النابض. وعند موضع الاتزان تتحول إلى طاقة حركة وتصبح السرعة أكبر ما يمكن.','formula','Ep = ½kx²   |   Ek = ½mv²   |   E = ½kA²','simple','عند الطرف يتوقف الجسم لحظة وتكون طاقة الوضع أكبر. في المنتصف تكون السرعة وطاقة الحركة أكبر.','exam','في غياب الاحتكاك تظل الطاقة الميكانيكية ثابتة: E = Ep + Ek = ½kA².','deep','عند الطرف v = 0 فتكون E = ½kA². عند الاتزان x = 0 فتكون Ek = E، ومنها vmax = ωA.')
      ),
      'laws',jsonb_build_array(
        jsonb_build_object('title','معادلة الإزاحة','formula','x = A cos(ωt)','note','عند بدء الحركة من أقصى إزاحة موجبة.'),
        jsonb_build_object('title','التسارع','formula','a = −ω²x','note','يتناسب مع الإزاحة وعكس اتجاهها.'),
        jsonb_build_object('title','قوة الإرجاع','formula','F = −kx','note','قانون هوك داخل حد المرونة.'),
        jsonb_build_object('title','التردد الزاوي','formula','ω = √(k/m)','note','وحدته راديان لكل ثانية.'),
        jsonb_build_object('title','الزمن الدوري','formula','T = 2π√(m/k)','note','يزيد مع الكتلة ويقل مع صلابة النابض.'),
        jsonb_build_object('title','التردد','formula','f = 1/T = ω/2π','note','عدد الاهتزازات في الثانية.'),
        jsonb_build_object('title','السرعة العظمى','formula','vmax = ωA','note','تحدث عند موضع الاتزان.'),
        jsonb_build_object('title','الطاقة الكلية','formula','E = ½kA²','note','ثابتة عند إهمال الاحتكاك.')
      ),
      'exam_roadmap',jsonb_build_array(
        'استخرج m وk وA مع تحويل الوحدات.',
        'احسب ω = √(k/m).',
        'احسب T = 2π/ω أو f = 1/T.',
        'حدد موضع الجسم لتعرف v وa وF والطاقة.'
      )
    ),
    '["تمييز موضع الاتزان والإزاحة والسعة","تفسير قانون هوك وقوة الإرجاع","حساب الزمن الدوري والتردد والتردد الزاوي","تفسير تبادل الطاقة في الحركة التوافقية"]'::jsonb,
    true,1
  )
  on conflict(unit_id,slug) do nothing;
  select id into v_lesson from public.learning_lessons where unit_id=v_unit and slug='harmonic-motion-laws';

  insert into public.learning_experiments
    (subject_id,unit_id,lesson_id,title,slug,description,experience_type,simulator_type,simulation_config,content_json,is_ai_generated,is_published,sort_order)
  values(
    v_subject,v_unit,v_lesson,'معمل النابض والكتلة','harmonic-spring-lab',
    'غيّر الكتلة وصلابة النابض والسعة، وشاهد الإزاحة والسرعة والعجلة والقوة والطاقة وهي تتغير.',
    'virtual_lab','harmonic_spring',
    '{"mass":0.2,"stiffness":80,"amplitude_cm":8,"phase":0,"playing":false}'::jsonb,
    jsonb_build_object(
      'intro','ابدأ من الإزاحة الموجبة العظمى، ثم شغّل الحركة وغيّر قيمة واحدة في كل مرة. لاحظ أثر الكتلة وصلابة النابض والسعة على الحركة.',
      'objectives',jsonb_build_array('ربط الكتلة والصلابة بالزمن الدوري','ملاحظة تغير الإزاحة والسرعة والعجلة خلال الدورة','مقارنة طاقة الوضع المرونية بطاقة الحركة'),
      'steps',jsonb_build_array('ابدأ بالقيم الافتراضية وشغّل المحاكاة','ضاعف الكتلة ولاحظ تغير الزمن الدوري','زد صلابة النابض ولاحظ سرعة الاهتزاز','غيّر السعة مع تثبيت الكتلة والصلابة','حرّك الجسم خلال الدورة ولاحظ تبادل الطاقة'),
      'observations',jsonb_build_array('تبلغ السرعة أكبر قيمة عند موضع الاتزان','تبلغ قوة الإرجاع أكبر مقدار عند أقصى إزاحة','مضاعفة الكتلة تغيّر الزمن الدوري وفق الجذر التربيعي','مضاعفة السعة تجعل الطاقة الكلية أربعة أمثالها في النموذج المثالي'),
      'formulas',jsonb_build_array('T = 2π√(m/k)','ω = √(k/m)','F = −kx','E = ½kA²'),
      'reflection_questions',jsonb_build_array('لماذا تكون السرعة أكبر ما يمكن عند موضع الاتزان؟','ماذا يحدث للزمن الدوري إذا زادت الكتلة إلى أربعة أمثالها؟','لماذا لا تؤثر السعة في الزمن الدوري للنموذج المثالي؟')
    ),false,true,1
  )
  on conflict(slug) do nothing;

  insert into public.learning_experiments
    (subject_id,unit_id,lesson_id,title,slug,description,experience_type,simulator_type,simulation_config,content_json,is_ai_generated,is_published,sort_order)
  values(
    v_subject,v_unit,v_lesson,'معمل البندول البسيط','simple-pendulum-lab',
    'استكشف أثر طول الخيط وكتلة الكرة وزاوية الإزاحة على حركة البندول وزمنه الدوري.',
    'virtual_lab','simple_pendulum',
    '{"length":0.8,"mass":0.3,"max_angle_deg":12,"phase":0,"playing":false}'::jsonb,
    jsonb_build_object(
      'intro','يتكون البندول البسيط من كرة صغيرة معلقة بخيط خفيف. عند إزاحتها بزاوية صغيرة ثم تركها، تتذبذب حول موضع الاتزان.',
      'objectives',jsonb_build_array('تفسير حركة البندول عند الزوايا الصغيرة','تحديد أثر طول الخيط في الزمن الدوري','التمييز بين العوامل التي تؤثر في الزمن الدوري والعوامل التي لا تؤثر فيه'),
      'steps',jsonb_build_array('شغّل المحاكاة بالقيم الافتراضية','زد طول الخيط ولاحظ الزمن الدوري','غيّر كتلة الكرة مع تثبيت الطول','قارن الحركة عند زوايا إزاحة صغيرة مختلفة'),
      'observations',jsonb_build_array('زيادة طول الخيط تزيد الزمن الدوري','كتلة الكرة لا تظهر في قانون الزمن الدوري للبندول البسيط','القانون تقريب صالح للزوايا الصغيرة'),
      'formulas',jsonb_build_array('T = 2π√(L/g)','ω = √(g/L)','g = 9.81 m/s²'),
      'reflection_questions',jsonb_build_array('لماذا لا تؤثر كتلة الكرة في الزمن الدوري للبندول البسيط؟','ما أثر مضاعفة طول الخيط على الزمن الدوري؟','لماذا نستخدم زاوية صغيرة في هذا النموذج؟')
    ),false,true,2
  )
  on conflict(slug) do nothing;
end;
$seed$;
