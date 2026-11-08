-- 004: دور مدير المدرسة والمراجع، حقول التقييم والشواهد، خطة التحسين، والبيانات المرجعية
-- (يعتمد على 003_roles.sql الذي أضاف القيمتين principal و reviewer إلى app_role)
-- المصدر: الدليل الإجرائي للتقويم المدرسي الذاتي للتعليم العام، الإصدار الثالث 1447هـ.
-- المؤشرات الـ52 لا تُدرج هنا: تنتظر النص الرسمي من الملحق (أ) ص21-25.

-- ───────── الأدوار ─────────
create or replace function private.is_principal() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(private.current_app_role() = 'principal', false) $$;
create or replace function private.is_reviewer() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(private.current_app_role() = 'reviewer', false) $$;
create or replace function private.is_team() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(private.current_app_role() in ('coordinator','team_member','principal','reviewer'), false) $$;
grant execute on function private.is_principal(), private.is_reviewer() to anon, authenticated;

-- المدير: اطلاع كامل واعتماد نهائي. المراجع: اطلاع ومراجعة الشواهد.
drop policy log_read on public.activity_log;
create policy log_read on public.activity_log for select to authenticated
  using (private.is_coordinator() or private.is_principal());

drop policy eval_update on public.evaluations;
create policy eval_update on public.evaluations for update to authenticated
  using (private.is_coordinator() or private.is_principal()
    or (private.is_team() and status in ('draft','submitted') and private.cycle_is_open(cycle_id)
        and private.i_evaluate(cycle_id, indicator_id)))
  with check (private.is_coordinator() or private.is_principal()
    or (private.is_team() and status in ('draft','submitted') and private.i_evaluate(cycle_id, indicator_id)));

drop policy ev_update on public.evidence;
create policy ev_update on public.evidence for update to authenticated
  using (private.is_coordinator() or private.is_principal() or private.is_reviewer())
  with check (private.is_coordinator() or private.is_principal() or private.is_reviewer());

-- ───────── حقول جديدة ─────────
alter table public.indicators
  add column is_government_applicable boolean not null default true;   -- 49 من 52 للمدارس الحكومية

alter table public.evaluation_levels
  add column min_pct numeric check (min_pct between 0 and 100),
  add column max_pct numeric check (max_pct between 0 and 100);        -- الحد الأعلى غير شامل

alter table public.evaluations
  add column achievement_pct numeric check (achievement_pct is null or achievement_pct between 0 and 100),
  add column strengths text,
  add column data_sources text;
-- لا صف تقييم = «لم يُقيَّم» ولا يُعامل صفراً.

alter table public.evidence
  add column evidence_date date,
  add column category text,
  add column external_url text;
alter table public.evidence_files add column sha256 text;

-- ربط الشاهد الواحد بعدة مؤشرات دون تكرار الملف (indicator_id في evidence هو المؤشر الأساسي)
create table public.evidence_indicators (
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  indicator_id uuid not null references public.indicators(id),
  primary key (evidence_id, indicator_id)
);

-- ───────── خطة التحسين ─────────
create table public.improvement_actions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id),
  gap_description text not null,
  root_cause text,
  goal text,
  action text not null,
  responsible_staff_id uuid references public.staff(id),
  start_date date,
  end_date date,
  success_measure text,
  required_evidence text,
  progress_pct numeric not null default 0 check (progress_pct between 0 and 100),
  status text not null default 'new' check (status in ('new','in_progress','done','cancelled')),
  followup_result text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.improvement_action_indicators (
  action_id uuid not null references public.improvement_actions(id) on delete cascade,
  indicator_id uuid not null references public.indicators(id),
  primary key (action_id, indicator_id)
);

-- ───────── RLS للجداول الجديدة ─────────
alter table public.evidence_indicators enable row level security;
alter table public.improvement_actions enable row level security;
alter table public.improvement_action_indicators enable row level security;
revoke all on public.evidence_indicators, public.improvement_actions, public.improvement_action_indicators from anon;

create policy evi_read on public.evidence_indicators for select to authenticated
  using (private.is_team() or (private.is_external() and exists (
    select 1 from public.evidence e where e.id = evidence_id
      and e.status = 'approved' and private.cycle_is_published(e.cycle_id))));
create policy evi_insert on public.evidence_indicators for insert to authenticated
  with check (private.is_coordinator() or exists (
    select 1 from public.evidence e where e.id = evidence_id
      and e.uploaded_by = auth.uid() and e.status = 'new'));
create policy evi_delete on public.evidence_indicators for delete to authenticated
  using (private.is_coordinator());

create policy ia2_read on public.improvement_actions for select to authenticated using (private.is_team());
create policy ia2_write on public.improvement_actions for all to authenticated
  using (private.is_coordinator()) with check (private.is_coordinator());
create policy ia2_progress on public.improvement_actions for update to authenticated
  using (responsible_staff_id = private.my_staff_id())
  with check (responsible_staff_id = private.my_staff_id());

create policy iai_read on public.improvement_action_indicators for select to authenticated using (private.is_team());
create policy iai_write on public.improvement_action_indicators for all to authenticated
  using (private.is_coordinator()) with check (private.is_coordinator());

create trigger trg_audit_evidence_indicators after insert or update or delete on public.evidence_indicators
  for each row execute function public.log_activity();
create trigger trg_audit_improvement_actions after insert or update or delete on public.improvement_actions
  for each row execute function public.log_activity();
create trigger trg_audit_improvement_action_indicators after insert or update or delete on public.improvement_action_indicators
  for each row execute function public.log_activity();

-- ───────── البيانات المرجعية ─────────
-- رموز المجالات والمعايير هنا أرقام ترتيبية مؤقتة (1..4 و1..11) إلى حين تحقق الرموز من الدليل.
do $$
declare gv uuid; d uuid;
begin
  if exists (select 1 from public.guide_versions where edition = 'الإصدار الثالث' and hijri_year = 1447) then
    return;
  end if;

  insert into public.guide_versions(title, issuer, edition, hijri_year, gregorian_year)
  values ('الدليل الإجرائي للتقويم المدرسي الذاتي للتعليم العام', 'هيئة تقويم التعليم والتدريب',
          'الإصدار الثالث', 1447, 2026)
  returning id into gv;

  insert into public.evaluation_levels(guide_version_id, code, label_ar, min_pct, max_pct, sort_order) values
    (gv, 'excellence',  'التميز',   90, 100, 1),
    (gv, 'advancement', 'التقدم',   75, 90,  2),
    (gv, 'launch',      'الانطلاق', 50, 75,  3),
    (gv, 'preparation', 'التهيئة',  0,  50,  4);

  insert into public.domains(guide_version_id, code, name_ar, sort_order)
    values (gv, '1', 'الإدارة المدرسية', 1) returning id into d;
  insert into public.standards(domain_id, code, name_ar, sort_order) values
    (d, '1', 'التخطيط', 1), (d, '2', 'قيادة العملية التعليمية', 2), (d, '3', 'المجتمع المدرسي', 3),
    (d, '4', 'التطوير المؤسسي', 4), (d, '5', 'حقوق المتعلم وحمايته', 5);

  insert into public.domains(guide_version_id, code, name_ar, sort_order)
    values (gv, '2', 'التعليم والتعلم', 2) returning id into d;
  insert into public.standards(domain_id, code, name_ar, sort_order) values
    (d, '6', 'بناء خبرات التعلم', 6), (d, '7', 'تقويم التعلم', 7);

  insert into public.domains(guide_version_id, code, name_ar, sort_order)
    values (gv, '3', 'نواتج التعلم', 3) returning id into d;
  insert into public.standards(domain_id, code, name_ar, sort_order) values
    (d, '8', 'التحصيل التعليمي', 8), (d, '9', 'التطور الشخصي والصحي والاجتماعي', 9);

  insert into public.domains(guide_version_id, code, name_ar, sort_order)
    values (gv, '4', 'البيئة المدرسية', 4) returning id into d;
  insert into public.standards(domain_id, code, name_ar, sort_order) values
    (d, '10', 'المبنى المدرسي', 10), (d, '11', 'الأمن والسلامة', 11);
end $$;
