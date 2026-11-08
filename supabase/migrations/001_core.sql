-- نظام التقويم الذاتي الذكي - متوسطة لبيد بن ربيعة
-- 001: النواة (مستخدمون، أدوار، دليل مرجعي، دورات، إسناد، تقييم، شواهد، سجل نشاط)
-- الزائر = دور anon (بلا حساب). لا يوجد دور مستقل باسم "مطلع".

create extension if not exists pgcrypto;

-- ───────── الأنواع ─────────
create type app_role as enum ('coordinator', 'team_member', 'external_evaluator');
create type cycle_status as enum ('draft', 'active', 'paused', 'closed');
create type assignment_kind as enum ('responsible', 'evaluator');   -- مسؤول المؤشر / مقيم المؤشر
create type eval_status as enum ('draft', 'submitted', 'approved');
create type evidence_status as enum ('new', 'under_review', 'approved', 'needs_completion', 'rejected');

-- ───────── المستخدمون ومنسوبو المدرسة ─────────
-- منسوب المدرسة قد لا يملك حساباً (مسؤول مؤشر فقط).
create table staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  job_title text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- حساب الدخول. الدور هنا هو المرجع الوحيد للصلاحيات.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null,
  staff_id uuid unique references staff(id),
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- المقيم الخارجي ليس من منسوبي المدرسة
  check (role <> 'external_evaluator' or staff_id is null)
);

-- ───────── الدليل المرجعي (مشترك، بلا بيانات دورة) ─────────
create table guide_versions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text,
  edition text,
  hijri_year int,
  gregorian_year int,
  created_at timestamptz not null default now()
);

create table domains (
  id uuid primary key default gen_random_uuid(),
  guide_version_id uuid not null references guide_versions(id),
  code text not null,
  name_ar text not null,
  sort_order int not null default 0,
  unique (guide_version_id, code)
);

create table standards (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references domains(id),
  code text not null,
  name_ar text not null,
  sort_order int not null default 0,
  unique (domain_id, code)
);

create table indicators (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references standards(id),
  code text not null,
  official_text text not null,        -- النص الرسمي كما في الدليل، دون تعديل
  requirements_text text,             -- شرح المتطلبات إن وُجد في المرجع
  sort_order int not null default 0,
  unique (standard_id, code)
);

-- مستويات التقييم قابلة للضبط حسب الدليل (لا نفترض مستويات أو أوزاناً)
create table evaluation_levels (
  id uuid primary key default gen_random_uuid(),
  guide_version_id uuid not null references guide_versions(id),
  code text not null,
  label_ar text not null,
  weight numeric,
  sort_order int not null default 0,
  unique (guide_version_id, code)
);

-- ───────── دورات التقويم ─────────
create table cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- الدورة الأولى ...
  school_year text not null,
  start_date date,
  end_date date,
  status cycle_status not null default 'draft',
  coordinator_id uuid references staff(id),
  guide_version_id uuid not null references guide_versions(id),  -- يُثبَّت للدورة
  results_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  unique (name, school_year)
);

-- ───────── الإسناد ─────────
create table domain_assignments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles(id),
  domain_id uuid not null references domains(id),
  staff_id uuid not null references staff(id),
  kind assignment_kind not null,
  created_at timestamptz not null default now(),
  unique (cycle_id, domain_id, staff_id, kind)
);

create table indicator_assignments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles(id),
  indicator_id uuid not null references indicators(id),
  staff_id uuid not null references staff(id),
  kind assignment_kind not null,
  due_date date,
  created_at timestamptz not null default now(),
  unique (cycle_id, indicator_id, staff_id, kind)
);

-- المقيم يجب أن يكون عضو فريق بحساب فعّال؛ المسؤول لا يشترط له حساب.
create function check_evaluator_is_team_member() returns trigger
language plpgsql as $$
begin
  if new.kind = 'evaluator' and not exists (
    select 1 from profiles p
    where p.staff_id = new.staff_id
      and p.role in ('team_member', 'coordinator') and p.is_active
  ) then
    raise exception 'مقيم المؤشر يجب أن يكون عضواً في فريق التقويم';
  end if;
  return new;
end $$;

create trigger trg_ia_evaluator before insert or update on indicator_assignments
  for each row execute function check_evaluator_is_team_member();
create trigger trg_da_evaluator before insert or update on domain_assignments
  for each row execute function check_evaluator_is_team_member();

-- ───────── التقييم ─────────
create table evaluations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles(id),
  indicator_id uuid not null references indicators(id),
  level_id uuid references evaluation_levels(id),
  status eval_status not null default 'draft',
  justification text,
  gaps_notes text,
  evaluated_by uuid references profiles(id),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (cycle_id, indicator_id),
  check (status <> 'approved' or (level_id is not null and approved_by is not null))
);

-- ───────── الشواهد ─────────
create table suggested_evidence (            -- استرشادية، لا تدخل في الاكتمال
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references indicators(id),
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table evidence (                      -- فعلية، ضمن دورة
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles(id),
  indicator_id uuid not null references indicators(id),
  title text not null,
  description text,
  status evidence_status not null default 'new',
  uploaded_by uuid references profiles(id),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create table evidence_files (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references evidence(id) on delete cascade,
  storage_path text not null unique,         -- في حاوية خاصة private
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

-- ───────── سجل النشاط (إلحاق فقط) ─────────
create table activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,                      -- insert / update / delete
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create function activity_log_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'سجل النشاط للإلحاق فقط ولا يمكن تعديله أو حذفه';
end $$;
create trigger trg_activity_immutable before update or delete on activity_log
  for each row execute function activity_log_immutable();

create function log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into activity_log(actor_id, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(), lower(tg_op), tg_table_name,
    coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['cycles','domain_assignments','indicator_assignments',
                           'evaluations','evidence','evidence_files','profiles','staff']
  loop
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s
                    for each row execute function log_activity()', t);
  end loop;
end $$;

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_eval_touch before update on evaluations
  for each row execute function touch_updated_at();

-- ───────── دوال الصلاحيات ─────────
create function current_app_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active
$$;
create function is_coordinator() returns boolean
language sql stable as $$ select coalesce(current_app_role() = 'coordinator', false) $$;
create function is_team() returns boolean
language sql stable as $$ select coalesce(current_app_role() in ('coordinator','team_member'), false) $$;
create function is_external() returns boolean
language sql stable as $$ select coalesce(current_app_role() = 'external_evaluator', false) $$;
create function my_staff_id() returns uuid
language sql stable security definer set search_path = public as $$
  select staff_id from profiles where id = auth.uid() and is_active
$$;

-- هل أنا مقيم هذا المؤشر (إسناد مباشر أو عبر المجال)؟
create function i_evaluate(p_cycle uuid, p_indicator uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from indicator_assignments ia
    where ia.cycle_id = p_cycle and ia.indicator_id = p_indicator
      and ia.kind = 'evaluator' and ia.staff_id = my_staff_id()
  ) or exists (
    select 1 from domain_assignments da
    join standards s on s.domain_id = da.domain_id
    join indicators i on i.standard_id = s.id
    where da.cycle_id = p_cycle and i.id = p_indicator
      and da.kind = 'evaluator' and da.staff_id = my_staff_id()
  )
$$;

create function cycle_is_open(p_cycle uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cycles where id = p_cycle and status = 'active')
$$;
create function cycle_is_published(p_cycle uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cycles where id = p_cycle and results_published)
$$;

-- ───────── RLS ─────────
do $$ declare t text; begin
  foreach t in array array['staff','profiles','guide_versions','domains','standards','indicators',
    'evaluation_levels','cycles','domain_assignments','indicator_assignments','evaluations',
    'suggested_evidence','evidence','evidence_files','activity_log']
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

-- مرجع الدليل: قراءة للجميع (بما فيهم الزائر)، كتابة للمنسق
do $$ declare t text; begin
  foreach t in array array['guide_versions','domains','standards','indicators','evaluation_levels']
  loop
    execute format('create policy %1$s_read on %1$s for select to anon, authenticated using (true)', t);
    execute format('create policy %1$s_write on %1$s for all to authenticated
                    using (is_coordinator()) with check (is_coordinator())', t);
  end loop;
end $$;

-- الدورات: الزائر يرى المنشورة فقط
create policy cycles_public on cycles for select to anon using (results_published);
create policy cycles_auth on cycles for select to authenticated
  using (is_team() or (is_external() and results_published));
create policy cycles_write on cycles for all to authenticated
  using (is_coordinator()) with check (is_coordinator());

-- منسوبو المدرسة والحسابات: الفريق يقرأ، المنسق يدير؛ لا وصول للزائر/الخارجي
create policy staff_read on staff for select to authenticated using (is_team());
create policy staff_write on staff for all to authenticated
  using (is_coordinator()) with check (is_coordinator());
create policy profiles_self on profiles for select to authenticated
  using (id = auth.uid() or is_coordinator());
create policy profiles_write on profiles for all to authenticated
  using (is_coordinator()) with check (is_coordinator());

-- الإسناد: الفريق يقرأ، المنسق يعدّل
create policy da_read on domain_assignments for select to authenticated using (is_team());
create policy da_write on domain_assignments for all to authenticated
  using (is_coordinator()) with check (is_coordinator());
create policy ia_read on indicator_assignments for select to authenticated using (is_team());
create policy ia_write on indicator_assignments for all to authenticated
  using (is_coordinator()) with check (is_coordinator());

-- التقييمات: الزائر والخارجي يريان المعتمد في دورة منشورة؛ المقيم يعدّل مسودته فقط
create policy eval_public on evaluations for select to anon
  using (status = 'approved' and cycle_is_published(cycle_id));
create policy eval_read on evaluations for select to authenticated
  using (is_team() or (is_external() and status = 'approved' and cycle_is_published(cycle_id)));
create policy eval_insert on evaluations for insert to authenticated
  with check (is_coordinator()
    or (is_team() and status in ('draft','submitted') and cycle_is_open(cycle_id)
        and i_evaluate(cycle_id, indicator_id)));
create policy eval_update on evaluations for update to authenticated
  using (is_coordinator()
    or (is_team() and status in ('draft','submitted') and cycle_is_open(cycle_id)
        and i_evaluate(cycle_id, indicator_id)))
  with check (is_coordinator()
    or (is_team() and status in ('draft','submitted') and i_evaluate(cycle_id, indicator_id)));
create policy eval_delete on evaluations for delete to authenticated using (is_coordinator());

-- الشواهد المقترحة: الفريق يقرأ، المنسق يدير
create policy se_read on suggested_evidence for select to authenticated using (is_team());
create policy se_write on suggested_evidence for all to authenticated
  using (is_coordinator()) with check (is_coordinator());

-- الشواهد الفعلية: الفريق يرى الكل؛ الخارجي المعتمد في دورة منشورة؛ الزائر لا يرى شيئاً
create policy ev_read on evidence for select to authenticated
  using (is_team() or (is_external() and status = 'approved' and cycle_is_published(cycle_id)));
create policy ev_insert on evidence for insert to authenticated
  with check (is_coordinator() or (is_team() and status = 'new' and cycle_is_open(cycle_id)
              and uploaded_by = auth.uid() and i_evaluate(cycle_id, indicator_id)));
create policy ev_update on evidence for update to authenticated
  using (is_coordinator()) with check (is_coordinator());
create policy ev_delete on evidence for delete to authenticated using (is_coordinator());

create policy evf_read on evidence_files for select to authenticated
  using (exists (select 1 from evidence e where e.id = evidence_id
         and (is_team() or (is_external() and e.status = 'approved' and cycle_is_published(e.cycle_id)))));
create policy evf_insert on evidence_files for insert to authenticated
  with check (exists (select 1 from evidence e where e.id = evidence_id
         and (is_coordinator() or (is_team() and e.uploaded_by = auth.uid() and e.status = 'new'))));
create policy evf_delete on evidence_files for delete to authenticated using (is_coordinator());

-- سجل النشاط: المنسق يقرأ فقط
create policy log_read on activity_log for select to authenticated using (is_coordinator());

-- الزائر: بطاقة "الشاهد محجوب" تحتاج وجود الشاهد دون كشف عنوانه أو ملفاته
create view public_evidence_stubs with (security_invoker = false) as
  select e.id, e.cycle_id, e.indicator_id
  from evidence e
  join cycles c on c.id = e.cycle_id
  where e.status = 'approved' and c.results_published;
grant select on public_evidence_stubs to anon, authenticated;
