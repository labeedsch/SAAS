-- 002: تحصين أمني بعد فحص Supabase Advisors
-- 1) نقل دوال الصلاحيات المساعدة إلى مخطط private غير المكشوف عبر REST
-- 2) تثبيت search_path لكل الدوال
-- 3) عرض الزائر يعمل بصلاحيات المستعلم (security_invoker) مع صلاحيات أعمدة محدودة

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter function public.current_app_role()            set schema private;
alter function public.is_coordinator()              set schema private;
alter function public.is_team()                     set schema private;
alter function public.is_external()                 set schema private;
alter function public.my_staff_id()                 set schema private;
alter function public.i_evaluate(uuid, uuid)        set schema private;
alter function public.cycle_is_open(uuid)           set schema private;
alter function public.cycle_is_published(uuid)      set schema private;

create or replace function private.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function private.is_coordinator() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(private.current_app_role() = 'coordinator', false)
$$;

create or replace function private.is_team() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(private.current_app_role() in ('coordinator','team_member'), false)
$$;

create or replace function private.is_external() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(private.current_app_role() = 'external_evaluator', false)
$$;

create or replace function private.my_staff_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select staff_id from public.profiles where id = auth.uid() and is_active
$$;

create or replace function private.i_evaluate(p_cycle uuid, p_indicator uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.indicator_assignments ia
    where ia.cycle_id = p_cycle and ia.indicator_id = p_indicator
      and ia.kind = 'evaluator' and ia.staff_id = private.my_staff_id()
  ) or exists (
    select 1 from public.domain_assignments da
    join public.standards s on s.domain_id = da.domain_id
    join public.indicators i on i.standard_id = s.id
    where da.cycle_id = p_cycle and i.id = p_indicator
      and da.kind = 'evaluator' and da.staff_id = private.my_staff_id()
  )
$$;

create or replace function private.cycle_is_open(p_cycle uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cycles where id = p_cycle and status = 'active')
$$;

create or replace function private.cycle_is_published(p_cycle uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cycles where id = p_cycle and results_published)
$$;

revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated;

-- دوال المشغّلات: تثبيت search_path، وسحب الاستدعاء المباشر
create or replace function public.check_evaluator_is_team_member() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind = 'evaluator' and not exists (
    select 1 from public.profiles p
    where p.staff_id = new.staff_id
      and p.role in ('team_member', 'coordinator') and p.is_active
  ) then
    raise exception 'مقيم المؤشر يجب أن يكون عضواً في فريق التقويم';
  end if;
  return new;
end $$;

alter function public.activity_log_immutable() set search_path = '';
alter function public.touch_updated_at()       set search_path = '';

revoke execute on function public.log_activity()                        from public, anon, authenticated;
revoke execute on function public.check_evaluator_is_team_member()      from public, anon, authenticated;
revoke execute on function public.activity_log_immutable()              from public, anon, authenticated;
revoke execute on function public.touch_updated_at()                    from public, anon, authenticated;

-- عرض الزائر: بلا security definer. الزائر يقرأ أعمدة محددة فقط من evidence،
-- ولا يصل إلى العنوان أو الوصف أو الملفات.
alter view public.public_evidence_stubs set (security_invoker = true);
revoke all on public.evidence from anon;
grant select (id, cycle_id, indicator_id, status) on public.evidence to anon;
create policy ev_public_stub on public.evidence for select to anon
  using (status = 'approved' and private.cycle_is_published(cycle_id));
