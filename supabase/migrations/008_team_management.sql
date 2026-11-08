-- 008: إدارة الفريق (المرحلة الخامسة): الاجتماعات، الزيارات الفنية، المهام، الإعلانات، المواعيد
-- لم تُختبر بعد: الاختبار والتصحيح في دفعة لاحقة.

-- ───────── الأنواع ─────────
create type public.meeting_status as enum ('draft', 'scheduled', 'held', 'cancelled');
create type public.rsvp_status as enum ('pending', 'confirmed', 'declined');
create type public.invitee_kind as enum ('team', 'support');
create type public.minutes_status as enum ('draft', 'approved');
create type public.visit_status as enum ('planned', 'done', 'cancelled');
create type public.followup_status as enum ('open', 'in_progress', 'closed');
create type public.task_type as enum ('administrative', 'documentation', 'followup', 'technical_visit', 'development');
create type public.task_status as enum ('new', 'in_progress', 'awaiting_review', 'completed', 'overdue', 'cancelled');
create type public.task_approval as enum ('proposed', 'approved', 'rejected');
create type public.announcement_priority as enum ('normal', 'important', 'urgent');

-- ───────── الاجتماعات ─────────
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id),
  title text not null,
  meeting_date date not null,
  start_time time,
  location text,
  status public.meeting_status not null default 'draft',
  domain_id uuid references public.domains(id),        -- اجتماع لمناقشة مجال أو معيار أو مؤشر
  standard_id uuid references public.standards(id),
  indicator_id uuid references public.indicators(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.meeting_agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null,
  responsible_staff_id uuid references public.staff(id),
  minutes_allocated int check (minutes_allocated is null or minutes_allocated > 0),
  sort_order int not null default 0
);

-- تأكيد الحضور المسبق (rsvp) منفصل عن الحضور الفعلي (attended)
create table public.meeting_invitees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  staff_id uuid not null references public.staff(id),
  invitee_kind public.invitee_kind not null default 'team',
  rsvp public.rsvp_status not null default 'pending',
  rsvp_at timestamptz,
  rsvp_reason text,
  attended boolean,                  -- null = لم يُسجَّل بعد
  attended_at timestamptz,
  recorded_by uuid references public.profiles(id),
  invite_token_hash text unique,     -- هاش رابط التأكيد؛ الرمز الخام لا يُخزَّن
  unique (meeting_id, staff_id)
);

create table public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.meetings(id) on delete cascade,
  discussion text,
  status public.minutes_status not null default 'draft',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  summary_sent_at timestamptz,
  check (status <> 'approved' or (approved_by is not null and approved_at is not null))
);

create table public.meeting_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  decision_text text not null,
  is_recommendation boolean not null default false,
  responsible_staff_id uuid references public.staff(id),
  due_date date
);

-- ───────── الزيارات الفنية (منفصلة عن الاجتماعات) ─────────
create table public.technical_visits (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id),
  visit_date date not null,
  visit_time time,
  target_party text,                           -- الجهة أو الشخص المستهدف
  target_staff_id uuid references public.staff(id),
  purpose text,
  notes text,
  status public.visit_status not null default 'planned',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.visit_team (
  visit_id uuid not null references public.technical_visits(id) on delete cascade,
  staff_id uuid not null references public.staff(id),
  primary key (visit_id, staff_id)
);

-- بطاقة فنية لكل مؤشر داخل الزيارة. الزيارة لا تغيّر التقييم ولا تعتمد الشواهد.
create table public.visit_cards (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.technical_visits(id) on delete cascade,
  indicator_id uuid not null references public.indicators(id),
  existing_practices text,
  verified_items text,
  strengths text,
  gaps text,
  recommendations text,
  required_actions text,
  responsible_staff_id uuid references public.staff(id),
  due_date date,
  followup public.followup_status not null default 'open',
  unique (visit_id, indicator_id)
);

alter table public.improvement_actions
  add column source_visit_card_id uuid references public.visit_cards(id);

-- ───────── المهام والتكليفات ─────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id),
  title text not null,
  description text,
  task_type public.task_type not null default 'administrative',
  status public.task_status not null default 'new',
  approval public.task_approval not null default 'proposed',
  proposed_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  assignee_staff_id uuid references public.staff(id),
  start_date date,
  due_date date,
  required_output text,
  indicator_id uuid references public.indicators(id),
  meeting_id uuid references public.meetings(id),
  visit_id uuid references public.technical_visits(id),
  visit_card_id uuid references public.visit_cards(id),
  completion_note text,
  completed_at timestamptz,
  closed_approved_by uuid references public.profiles(id),
  closed_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date is null or start_date is null or due_date >= start_date)
);

-- ───────── الملفات المرفقة (زيارات، مهام، إعلانات، اجتماعات) ─────────
create table public.team_files (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('meeting', 'visit', 'task', 'announcement')),
  owner_id uuid not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ───────── الإعلانات ─────────
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references public.cycles(id),
  title text not null,
  body text not null,
  priority public.announcement_priority not null default 'normal',
  audience text not null default 'all_team' check (audience in ('all_team', 'selected')),
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > publish_at)
);

create table public.announcement_recipients (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  staff_id uuid not null references public.staff(id),
  primary key (announcement_id, staff_id)
);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  read_at timestamptz not null default now(),
  primary key (announcement_id, profile_id)
);

-- ───────── المواعيد النهائية ─────────
create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id),
  kind text not null check (kind in ('domain_close', 'indicator_close')),
  domain_id uuid references public.domains(id),
  indicator_id uuid references public.indicators(id),
  title text not null,
  due_date date not null,
  original_due_date date,
  extension_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((kind = 'domain_close' and domain_id is not null and indicator_id is null)
      or (kind = 'indicator_close' and indicator_id is not null and domain_id is null))
);
create unique index deadlines_unique_target on public.deadlines
  (cycle_id, kind, coalesce(domain_id, indicator_id));

-- ───────── مشغّلات الحماية ─────────
create function private.invitee_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not private.is_coordinator() and (
       new.meeting_id is distinct from old.meeting_id or new.staff_id is distinct from old.staff_id
    or new.invitee_kind is distinct from old.invitee_kind or new.attended is distinct from old.attended
    or new.attended_at is distinct from old.attended_at or new.recorded_by is distinct from old.recorded_by
    or new.invite_token_hash is distinct from old.invite_token_hash) then
    raise exception 'المدعو يعدّل تأكيد الحضور أو الاعتذار فقط';
  end if;
  if new.rsvp is distinct from old.rsvp then new.rsvp_at := now(); end if;
  if new.attended is distinct from old.attended then
    new.attended_at := case when new.attended is null then null else now() end;
    new.recorded_by := auth.uid();
  end if;
  return new;
end $$;
create trigger trg_invitee_guard before update on public.meeting_invitees
  for each row execute function private.invitee_guard();

create function private.minutes_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.approved_by := coalesce(new.approved_by, auth.uid());
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  return new;
end $$;
create trigger trg_minutes_before_write before insert or update on public.meeting_minutes
  for each row execute function private.minutes_before_write();

create function private.tasks_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and not (private.is_coordinator() or private.is_principal()) then
    if new.cycle_id is distinct from old.cycle_id or new.approval is distinct from old.approval
       or new.assignee_staff_id is distinct from old.assignee_staff_id
       or new.start_date is distinct from old.start_date or new.due_date is distinct from old.due_date
       or new.required_output is distinct from old.required_output or new.task_type is distinct from old.task_type
       or new.indicator_id is distinct from old.indicator_id or new.meeting_id is distinct from old.meeting_id
       or new.visit_id is distinct from old.visit_id or new.visit_card_id is distinct from old.visit_card_id
       or new.proposed_by is distinct from old.proposed_by or new.approved_by is distinct from old.approved_by
       or new.closed_approved_by is distinct from old.closed_approved_by then
      raise exception 'تعديل بيانات التكليف من صلاحية المنسق';
    end if;
    if new.status is distinct from old.status and new.status not in ('in_progress', 'awaiting_review') then
      raise exception 'اعتماد إغلاق المهمة أو إلغاؤها من صلاحية المنسق';
    end if;
  end if;
  if new.approval = 'approved' and (tg_op = 'INSERT' or old.approval is distinct from 'approved') then
    new.approved_by := coalesce(new.approved_by, auth.uid());
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at := now();
    new.closed_approved_by := auth.uid();
    new.closed_approved_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger trg_tasks_guard before insert or update on public.tasks
  for each row execute function private.tasks_guard();

create function private.deadline_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.original_due_date := coalesce(new.original_due_date, new.due_date);
  elsif new.due_date is distinct from old.due_date then
    new.original_due_date := coalesce(old.original_due_date, old.due_date);
  end if;
  return new;
end $$;
create trigger trg_deadline_before_write before insert or update on public.deadlines
  for each row execute function private.deadline_before_write();

-- يُستدعى من مهمة مجدولة لتحويل المهام المتأخرة (لم يُجدوَل بعد)
create function private.mark_overdue_tasks() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.tasks set status = 'overdue'
  where approval = 'approved' and status in ('new', 'in_progress') and due_date < current_date;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function private.mark_overdue_tasks() from public, anon, authenticated;

-- ───────── العروض ─────────
create view public.team_calendar with (security_invoker = true) as
select 'meeting'::text as kind, m.id as ref_id, m.cycle_id, m.title, m.meeting_date as event_date, m.start_time as event_time
  from public.meetings m where m.status <> 'cancelled'
union all
select 'task', t.id, t.cycle_id, t.title, t.due_date, null::time
  from public.tasks t where t.approval = 'approved' and t.due_date is not null and t.status not in ('cancelled', 'completed')
union all
select 'deadline', d.id, d.cycle_id, d.title, d.due_date, null::time from public.deadlines d
union all
select 'visit', v.id, v.cycle_id, 'زيارة فنية: ' || coalesce(v.target_party, ''), v.visit_date, v.visit_time
  from public.technical_visits v where v.status <> 'cancelled';

create view public.team_task_stats with (security_invoker = true) as
select s.id as staff_id, s.full_name, t.cycle_id,
       count(*) filter (where t.status = 'completed') as completed,
       count(*) filter (where t.status in ('new', 'in_progress', 'awaiting_review')) as in_progress,
       count(*) filter (where t.status = 'overdue') as overdue,
       count(*) as total
from public.staff s
join public.tasks t on t.assignee_staff_id = s.id and t.approval = 'approved'
group by s.id, s.full_name, t.cycle_id;

-- ───────── RLS ─────────
do $$ declare t text; begin
  foreach t in array array['meetings','meeting_agenda_items','meeting_invitees','meeting_minutes','meeting_decisions',
    'technical_visits','visit_team','visit_cards','tasks','team_files','announcements','announcement_recipients',
    'announcement_reads','deadlines']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
  revoke all on public.team_calendar, public.team_task_stats from anon;
  grant select on public.team_calendar, public.team_task_stats to authenticated;
end $$;

-- الاجتماعات وتوابعها والزيارات والمواعيد: الفريق يقرأ، المنسق يدير
do $$ declare t text; begin
  foreach t in array array['meetings','meeting_agenda_items','meeting_decisions','meeting_minutes',
    'technical_visits','visit_team','deadlines']
  loop
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (private.is_team())', t);
    execute format('create policy %1$s_write on public.%1$s for all to authenticated
                    using (private.is_coordinator()) with check (private.is_coordinator())', t);
  end loop;
end $$;

-- المدعوون: الفريق يقرأ، المنسق يدير، والمدعو يعدّل تأكيده هو (يحميه المشغّل)
create policy invitees_read on public.meeting_invitees for select to authenticated using (private.is_team());
create policy invitees_write on public.meeting_invitees for all to authenticated
  using (private.is_coordinator()) with check (private.is_coordinator());
create policy invitees_rsvp on public.meeting_invitees for update to authenticated
  using (staff_id = private.my_staff_id()) with check (staff_id = private.my_staff_id());

-- البطاقات الفنية: الفريق يقرأ، المنسق يدير، وعضو فريق الزيارة يوثّق بطاقاتها
create policy vcards_read on public.visit_cards for select to authenticated using (private.is_team());
create policy vcards_write on public.visit_cards for all to authenticated
  using (private.is_coordinator()) with check (private.is_coordinator());
create policy vcards_member on public.visit_cards for all to authenticated
  using (exists (select 1 from public.visit_team vt where vt.visit_id = visit_cards.visit_id and vt.staff_id = private.my_staff_id()))
  with check (exists (select 1 from public.visit_team vt where vt.visit_id = visit_cards.visit_id and vt.staff_id = private.my_staff_id()));

-- المهام
create policy tasks_read on public.tasks for select to authenticated
  using (private.is_coordinator() or private.is_principal() or private.is_reviewer()
         or assignee_staff_id = private.my_staff_id() or proposed_by = auth.uid());
create policy tasks_insert on public.tasks for insert to authenticated
  with check (private.is_coordinator()
    or (private.current_app_role() = 'team_member' and approval = 'proposed' and status = 'new'
        and proposed_by = auth.uid() and assignee_staff_id is null));
create policy tasks_update on public.tasks for update to authenticated
  using (private.is_coordinator() or private.is_principal() or assignee_staff_id = private.my_staff_id()
         or (proposed_by = auth.uid() and approval = 'proposed'))
  with check (private.is_coordinator() or private.is_principal() or assignee_staff_id = private.my_staff_id()
         or (proposed_by = auth.uid() and approval = 'proposed'));
create policy tasks_delete on public.tasks for delete to authenticated using (private.is_coordinator());

-- الملفات المرفقة
create policy tfiles_read on public.team_files for select to authenticated using (private.is_team());
create policy tfiles_insert on public.team_files for insert to authenticated
  with check (private.is_team() and uploaded_by = auth.uid());
create policy tfiles_delete on public.team_files for delete to authenticated using (private.is_coordinator());

-- الإعلانات
create policy ann_read on public.announcements for select to authenticated
  using (private.is_coordinator() or private.is_principal()
    or (private.is_team() and publish_at <= now() and (expires_at is null or expires_at > now())
        and (audience = 'all_team' or exists (
          select 1 from public.announcement_recipients r
          where r.announcement_id = announcements.id and r.staff_id = private.my_staff_id()))));
create policy ann_write on public.announcements for all to authenticated
  using (private.is_coordinator()) with check (private.is_coordinator());
create policy annr_read on public.announcement_recipients for select to authenticated
  using (private.is_coordinator() or staff_id = private.my_staff_id());
create policy annr_write on public.announcement_recipients for all to authenticated
  using (private.is_coordinator()) with check (private.is_coordinator());
create policy annread_read on public.announcement_reads for select to authenticated
  using (private.is_coordinator() or profile_id = auth.uid());
create policy annread_insert on public.announcement_reads for insert to authenticated
  with check (private.is_team() and profile_id = auth.uid());

-- ───────── سجل النشاط ─────────
do $$ declare t text; begin
  foreach t in array array['meetings','meeting_agenda_items','meeting_invitees','meeting_minutes','meeting_decisions',
    'technical_visits','visit_cards','tasks','team_files','announcements','deadlines']
  loop
    execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
                    for each row execute function public.log_activity()', t);
  end loop;
end $$;

-- ───────── حاوية ملفات الفريق ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-files', 'team-files', false, 26214400, array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create policy teamfiles_objects_read on storage.objects for select to authenticated
  using (bucket_id = 'team-files' and private.is_team());
create policy teamfiles_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'team-files' and private.is_team());
create policy teamfiles_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'team-files' and private.is_coordinator());
