-- 014_demo_data.sql: بيانات تجريبية قابلة للحذف بالكامل من لوحة التحكم
-- القرارات:
--  * تُحفظ في «دورة تجريبية» منفصلة غير منشورة (results_published = false)، فلا تظهر في الموقع العام ولا تختلط بالدورة الحقيقية.
--  * الدورة حالتها «نشطة» لتعمل أزرار التقييم والرفع عند المعاينة، وتاريخ إنشائها قديم عمداً كي لا تصبح الدورة الافتراضية في لوحة التحكم.
--  * الجداول العامة غير المرتبطة بدورة (الموظفون التجريبيون، الشواهد المقترحة) تُسجَّل في demo_records ليُحذف ما سُجِّل فقط.
--  * لا ملفات في الشواهد التجريبية (لا يمكن إنشاء ملفات في التخزين من SQL)، فتظهر الشواهد بلا ملفات.
--  * سجل النشاط للإلحاق فقط، فتبقى فيه آثار التعبئة والحذف.

create table if not exists public.demo_records (
  table_name text not null,
  record_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (table_name, record_id)
);
alter table public.demo_records enable row level security;
revoke all on public.demo_records from anon, authenticated;

-- ───────── التعبئة (بلا فحص صلاحية؛ لا تُستدعى إلا عبر الغلاف العام أدناه) ─────────
create or replace function private.seed_demo_data_impl() returns jsonb
language plpgsql security definer set search_path = '' as $f$
declare
  v_cycle uuid; v_guide uuid; v_cs uuid; v_cp uuid; v_ts uuid; v_tp uuid;
  v_staff uuid[] := '{}'; v_ids uuid[]; v_dom uuid[];
  s uuid; r record; k int := 0; h bigint; pct numeric; st text; ev uuid; other uuid; vv uuid; vc uuid;
  n_eval int := 0; n_evid int := 0; n_sug int := 0; n_task int := 0; n_dl int := 0; n_vis int := 0; n_asg int := 0;
  names text[] := array['موظف تجريبي ١','موظف تجريبي ٢','موظف تجريبي ٣','موظف تجريبي ٤','موظف تجريبي ٥','موظف تجريبي ٦'];
  jobs text[] := array['وكيل الشؤون التعليمية','رائد النشاط','معلم','مرشد طلابي','محضّر مختبر','أمين مصادر التعلم'];
  just text[] := array[
    '(بيانات تجريبية) تتوافر خطط وسجلات موثّقة تغطي معظم متطلبات المؤشر، مع متابعة دورية من الإدارة.',
    '(بيانات تجريبية) تُنفَّذ الممارسات بصورة منتظمة، وتحتاج بعض الإجراءات إلى توثيق أدق.',
    '(بيانات تجريبية) وُجدت شواهد على التطبيق في عدد من الصفوف، مع تفاوت بين الفصول.',
    '(بيانات تجريبية) الإجراءات قائمة وموثّقة جزئياً، ويلزم استكمال الشواهد المساندة.',
    '(بيانات تجريبية) تحقق المؤشر بدرجة جيدة، وأثره ظاهر في نتائج المتابعة.'];
  strn text[] := array['وضوح المسؤوليات والجداول الزمنية','تعاون الفريق وانتظام الاجتماعات','توثيق الإجراءات والنماذج','متابعة دورية من القيادة المدرسية','مشاركة المعلمين والطلاب'];
  gaps text[] := array['ضعف توثيق بعض الإجراءات','الحاجة إلى متابعة أدق للنتائج','تفاوت التنفيذ بين الصفوف','قلة الشواهد المساندة','تأخر إغلاق بعض الإجراءات'];
  etitle text[] := array['الخطة التشغيلية للمدرسة','محضر اجتماع اللجنة','تقرير متابعة الأداء','سجل الزيارات الصفية','نتائج استبانة المستفيدين','خطة التطوير المهني','تقرير الأنشطة الطلابية','نموذج متابعة التحصيل'];
  estat text[] := array['approved','approved','under_review','new','needs_completion'];
  ttl text[] := array['استكمال توثيق شواهد المؤشر','جمع محاضر الاجتماعات الدورية','إعداد نموذج متابعة موحّد','مراجعة سجلات الأنشطة','تحديث خطة التطوير المهني','إعداد تقرير مرحلي للمؤشر','تنظيم ملف الشواهد الورقية','متابعة توصيات الزيارة الفنية','تصوير وتوثيق نشاط','استبانة قياس رضا المستفيدين','تدقيق بيانات التحصيل','إعداد عرض لنتائج المجال'];
  ttype text[] := array['documentation','documentation','administrative','followup','development','administrative','documentation','technical_visit','documentation','followup','administrative','development'];
  tstat text[] := array['new','in_progress','awaiting_review','completed','in_progress','new','completed','in_progress','awaiting_review','new','completed','in_progress'];
begin
  if exists (select 1 from public.demo_records where table_name = 'cycles') then
    raise exception 'البيانات التجريبية موجودة مسبقاً؛ احذفها أولاً' using errcode = '23505';
  end if;
  select guide_version_id into v_guide from public.cycles order by created_at desc limit 1;
  if v_guide is null then raise exception 'لا توجد دورة مرجعية لاستخراج إصدار الدليل'; end if;
  select staff_id, id into v_cs, v_cp from public.profiles where role = 'coordinator' and staff_id is not null limit 1;
  select staff_id, id into v_ts, v_tp from public.profiles where role = 'team_member' and staff_id is not null limit 1;
  v_ts := coalesce(v_ts, v_cs); v_tp := coalesce(v_tp, v_cp);

  insert into public.cycles (name, school_year, start_date, end_date, status, coordinator_id, guide_version_id, results_published, created_at)
  values ('الدورة التجريبية', '1448', '2026-11-01', '2026-12-31', 'active', v_cs, v_guide, false, '2020-01-01') returning id into v_cycle;
  insert into public.demo_records values ('cycles', v_cycle);

  for k in 1..6 loop
    insert into public.staff (full_name, job_title, is_active) values (names[k], jobs[k], true) returning id into s;
    v_staff := v_staff || s; insert into public.demo_records values ('staff', s);
  end loop;

  select array_agg(id order by sort_order) into v_ids from public.indicators where is_government_applicable;
  select array_agg(id order by sort_order) into v_dom from public.domains where guide_version_id = v_guide;

  k := 0;
  for r in select id, code, standard_id from public.indicators where is_government_applicable order by sort_order loop
    k := k + 1; h := abs(hashtext(r.code)::bigint);
    -- الإسناد: مسؤول (منسوب بلا حساب) ومقيّم (عضو فريق بحساب)
    insert into public.indicator_assignments (cycle_id, indicator_id, staff_id, kind, due_date)
      values (v_cycle, r.id, v_staff[1 + (h % 6)::int], 'responsible', date '2026-12-05' + (h % 12)::int);
    insert into public.indicator_assignments (cycle_id, indicator_id, staff_id, kind, due_date)
      values (v_cycle, r.id, case when h % 2 = 0 then v_ts else v_cs end, 'evaluator', date '2026-12-12' + (h % 10)::int);
    n_asg := n_asg + 2;
    -- التقييم لنحو ستين بالمئة من المؤشرات بحالات ومستويات متنوعة
    if h % 10 < 6 then
      pct := 30 + (h % 71); st := case when h % 3 = 0 then 'submitted' when h % 7 = 0 then 'draft' else 'approved' end;
      insert into public.evaluations (cycle_id, indicator_id, status, achievement_pct, justification, strengths, gaps_notes, data_sources, evaluated_by, approved_by)
      values (v_cycle, r.id, st::public.eval_status, pct, just[1 + (h % 5)::int], strn[1 + (h % 5)::int], gaps[1 + ((h / 5) % 5)::int],
              'سجلات المدرسة والنماذج المعتمدة (بيانات تجريبية)', case when h % 2 = 0 then v_tp else v_cp end, case when st = 'approved' then v_cp end);
      n_eval := n_eval + 1;
    end if;
    -- الشواهد: بعضها مشترك مع مؤشر من معيار آخر
    if h % 10 < 5 then
      insert into public.evidence (cycle_id, indicator_id, title, description, status, uploaded_by, reviewed_by, reviewed_at, evidence_date, category)
      values (v_cycle, r.id, etitle[1 + (h % 8)::int], '(بيانات تجريبية) شاهد توضيحي مرتبط بالمؤشر ' || r.code,
              estat[1 + (h % 5)::int]::public.evidence_status, v_cp, case when estat[1 + (h % 5)::int] in ('approved','needs_completion') then v_cp end,
              case when estat[1 + (h % 5)::int] in ('approved','needs_completion') then now() end, date '2026-11-01' + (h % 20)::int, 'وثيقة')
      returning id into ev;
      insert into public.evidence_indicators (evidence_id, indicator_id) values (ev, r.id) on conflict do nothing;
      if h % 3 = 0 then
        select id into other from public.indicators where is_government_applicable and standard_id <> r.standard_id order by hashtext(code || r.code) limit 1;
        if other is not null then insert into public.evidence_indicators (evidence_id, indicator_id) values (ev, other) on conflict do nothing; end if;
      end if;
      n_evid := n_evid + 1;
    end if;
    -- شواهد مقترحة (مرجع مشترك بين الدورات؛ تُسجَّل للحذف وتُوسَم بـ«تجريبي»)
    if k <= 24 then
      insert into public.suggested_evidence (indicator_id, title, description) values
        (r.id, '(تجريبي) ' || etitle[1 + (h % 8)::int], 'مثال استرشادي للشاهد المطلوب لهذا المؤشر.') returning id into s;
      insert into public.demo_records values ('suggested_evidence', s);
      insert into public.suggested_evidence (indicator_id, title, description) values
        (r.id, '(تجريبي) ' || etitle[1 + ((h + 3) % 8)::int], 'مثال استرشادي ثانٍ.') returning id into s;
      insert into public.demo_records values ('suggested_evidence', s);
      n_sug := n_sug + 2;
    end if;
  end loop;

  -- زيارات فنية: تشمل كل زيارة مؤشرات من مجالات مختلفة
  for k in 1..4 loop
    insert into public.technical_visits (cycle_id, visit_date, visit_time, target_party, purpose, notes, status, created_by)
    values (v_cycle, date '2026-11-02' + (k * 4), time '09:30', (array['المعلمون','الإدارة المدرسية','لجنة التوجيه والإرشاد','النشاط الطلابي'])[k],
            'زيارة فنية للتحقق من تنفيذ مؤشرات التقويم الذاتي (بيانات تجريبية)', 'ملاحظات عامة تجريبية.', (case when k <= 2 then 'done' else 'planned' end)::public.visit_status, v_cp)
    returning id into vv;
    insert into public.visit_team values (vv, v_cs), (vv, v_staff[k]) on conflict do nothing;
    for r in select unnest(array[v_ids[least(k * 3, array_length(v_ids, 1))], v_ids[least(k * 3 + 17, array_length(v_ids, 1))], v_ids[least(k * 3 + 31, array_length(v_ids, 1))]]) as iid loop
      insert into public.visit_cards (visit_id, indicator_id, existing_practices, verified_items, strengths, gaps, recommendations, required_actions, responsible_staff_id, due_date, followup)
      values (vv, r.iid, 'ممارسات قائمة موثّقة جزئياً.', 'اطُّلع على السجلات والنماذج المتاحة.', 'التزام الفريق وانتظام المتابعة.', 'نقص في توثيق بعض الإجراءات.',
              'توحيد النماذج واستكمال التوثيق.', 'استكمال الشواهد وتحديث السجلات.', v_staff[1 + (k % 6)], date '2026-12-08' + k, (array['open','in_progress','closed'])[1 + (k % 3)]::public.followup_status)
      returning id into vc;
      if k = 1 then
        insert into public.tasks (cycle_id, title, description, task_type, status, approval, proposed_by, assignee_staff_id, start_date, due_date, required_output, indicator_id, visit_id, visit_card_id)
        values (v_cycle, 'متابعة توصية الزيارة الفنية', 'تنفيذ الإجراء المطلوب من بطاقة الزيارة (بيانات تجريبية)', 'technical_visit', 'in_progress', 'approved', v_cp, v_staff[2], '2026-11-10', '2026-12-01', 'نموذج موثّق', r.iid, vv, vc);
        n_task := n_task + 1;
      end if;
    end loop;
    n_vis := n_vis + 1;
  end loop;

  -- مهام متنوعة مرتبطة بمؤشرات
  for k in 1..12 loop
    insert into public.tasks (cycle_id, title, description, task_type, status, approval, proposed_by, assignee_staff_id, start_date, due_date, required_output, indicator_id)
    values (v_cycle, ttl[k], '(بيانات تجريبية) مهمة توضيحية.', ttype[k]::public.task_type, tstat[k]::public.task_status, 'approved', v_cp, v_staff[1 + (k % 6)],
            date '2026-11-05' + k, date '2026-11-20' + (k * 3), 'مخرج موثّق', v_ids[least(k * 4, array_length(v_ids, 1))]);
    n_task := n_task + 1;
  end loop;

  -- مواعيد إغلاق المؤشرات والمجالات
  for k in 1..array_length(v_ids, 1) loop
    if k % 5 = 0 then
      insert into public.deadlines (cycle_id, kind, indicator_id, title, due_date, created_by)
      values (v_cycle, 'indicator_close', v_ids[k], 'إغلاق المؤشر (تجريبي)', date '2026-12-15' + (k % 10), v_cp); n_dl := n_dl + 1;
    end if;
  end loop;
  for k in 1..coalesce(array_length(v_dom, 1), 0) loop
    insert into public.deadlines (cycle_id, kind, domain_id, title, due_date, created_by)
    values (v_cycle, 'domain_close', v_dom[k], 'إغلاق المجال (تجريبي)', date '2026-12-20' + k, v_cp); n_dl := n_dl + 1;
  end loop;

  return jsonb_build_object('cycle_id', v_cycle, 'assignments', n_asg, 'evaluations', n_eval, 'evidence', n_evid, 'suggested_evidence', n_sug, 'visits', n_vis, 'tasks', n_task, 'deadlines', n_dl);
end $f$;

-- ───────── الحذف الشامل ─────────
create or replace function private.clear_demo_data_impl() returns jsonb
language plpgsql security definer set search_path = '' as $f$
declare c uuid; kept int := 0; n int; r record;
begin
  for c in select record_id from public.demo_records where table_name = 'cycles' loop
    delete from public.tasks where cycle_id = c;
    delete from public.improvement_actions where cycle_id = c;
    delete from public.whatsapp_messages where cycle_id = c;
    delete from public.indicator_access_links where cycle_id = c;
    delete from public.technical_visits where cycle_id = c;       -- تحذف بطاقاتها وفريقها تلقائياً
    delete from public.evaluations where cycle_id = c;
    delete from public.evidence where cycle_id = c;               -- تحذف ملفاتها وروابطها تلقائياً
    delete from public.indicator_assignments where cycle_id = c;
    delete from public.domain_assignments where cycle_id = c;
    delete from public.deadlines where cycle_id = c;
    delete from public.announcements where cycle_id = c;
    delete from public.meetings where cycle_id = c;
    delete from public.cycles where id = c;
  end loop;
  delete from public.suggested_evidence where id in (select record_id from public.demo_records where table_name = 'suggested_evidence');
  get diagnostics n = row_count;
  for r in select record_id from public.demo_records where table_name = 'staff' loop
    begin
      delete from public.staff where id = r.record_id;
    exception when foreign_key_violation then
      update public.staff set is_active = false where id = r.record_id; kept := kept + 1;  -- استُخدم خارج الدورة التجريبية: يُعطَّل بدل الحذف
    end;
  end loop;
  delete from public.demo_records;
  return jsonb_build_object('suggested_evidence', n, 'staff_kept_inactive', kept);
end $f$;

-- ───────── الواجهات العامة (للمنسق فقط) ─────────
create or replace function public.demo_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when coalesce(private.is_coordinator(), false)
    then jsonb_build_object('exists', exists (select 1 from public.demo_records where table_name = 'cycles'),
                            'cycle_id', (select record_id from public.demo_records where table_name = 'cycles' limit 1))
    else null end
$$;

create or replace function public.seed_demo_data() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(private.is_coordinator(), false) then raise exception 'تعبئة البيانات التجريبية من صلاحية المنسق' using errcode = '42501'; end if;
  return private.seed_demo_data_impl();
end $$;

create or replace function public.clear_demo_data() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(private.is_coordinator(), false) then raise exception 'حذف البيانات التجريبية من صلاحية المنسق' using errcode = '42501'; end if;
  return private.clear_demo_data_impl();
end $$;

revoke all on function private.seed_demo_data_impl() from public, anon, authenticated;
revoke all on function private.clear_demo_data_impl() from public, anon, authenticated;
revoke all on function public.demo_status() from public, anon;
revoke all on function public.seed_demo_data() from public, anon;
revoke all on function public.clear_demo_data() from public, anon;
grant execute on function public.demo_status() to authenticated;
grant execute on function public.seed_demo_data() to authenticated;
grant execute on function public.clear_demo_data() to authenticated;
