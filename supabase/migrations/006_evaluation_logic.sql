-- 006: منطق التقييم ومتابعة المسؤوليات (المرحلة الثالثة)
-- 1) المستوى يُشتق من نسبة التحقق وفق حدود الدليل (التميز 90+، التقدم 75-<90، الانطلاق 50-<75، التهيئة <50)
-- 2) تاريخ الاعتماد يُسجَّل تلقائياً
-- 3) عرض متابعة المؤشرات لكل دورة: المؤشر غير المُقيَّم يظهر «لم يُقيَّم» ولا يُحسب صفراً
-- 4) عرض مسؤوليات كل منسوب (مباشرة أو عبر إسناد المجال) للطباعة والتصدير

create or replace function private.level_for_pct(p_guide uuid, p_pct numeric) returns uuid
language sql stable set search_path = '' as $$
  select id from public.evaluation_levels
  where guide_version_id = p_guide and p_pct >= min_pct
    and (p_pct < max_pct or (max_pct = 100 and p_pct <= 100))
  order by sort_order limit 1
$$;

create or replace function private.eval_before_write() returns trigger
language plpgsql set search_path = '' as $$
declare g uuid;
begin
  if new.achievement_pct is not null then
    select guide_version_id into g from public.cycles where id = new.cycle_id;
    new.level_id := private.level_for_pct(g, new.achievement_pct);
  end if;
  if new.status = 'approved' and new.approved_at is null then
    new.approved_at := now();
  end if;
  if new.status <> 'approved' then
    new.approved_at := null;
  end if;
  return new;
end $$;

create trigger trg_eval_before_write before insert or update on public.evaluations
  for each row execute function private.eval_before_write();

create view public.cycle_indicator_overview with (security_invoker = true) as
select c.id as cycle_id, d.id as domain_id, s.id as standard_id, i.id as indicator_id, i.code,
       e.id as evaluation_id,
       coalesce(e.status::text, 'not_evaluated') as eval_status,
       e.achievement_pct, e.level_id,
       (select count(*) from public.evidence ev
         where ev.cycle_id = c.id and ev.status = 'approved'
           and (ev.indicator_id = i.id or exists (select 1 from public.evidence_indicators l
                                                   where l.evidence_id = ev.id and l.indicator_id = i.id))) as approved_evidence,
       (select count(*) from public.evidence ev
         where ev.cycle_id = c.id
           and (ev.indicator_id = i.id or exists (select 1 from public.evidence_indicators l
                                                   where l.evidence_id = ev.id and l.indicator_id = i.id))) as total_evidence
from public.cycles c
join public.domains d on d.guide_version_id = c.guide_version_id
join public.standards s on s.domain_id = d.id
join public.indicators i on i.standard_id = s.id and i.is_government_applicable
left join public.evaluations e on e.cycle_id = c.id and e.indicator_id = i.id;

create view public.staff_responsibilities with (security_invoker = true) as
select ia.cycle_id, ia.staff_id, ia.kind, i.id as indicator_id, i.code, i.official_text,
       'indicator'::text as via
from public.indicator_assignments ia join public.indicators i on i.id = ia.indicator_id
union
select da.cycle_id, da.staff_id, da.kind, i.id, i.code, i.official_text, 'domain'::text
from public.domain_assignments da
join public.standards s on s.domain_id = da.domain_id
join public.indicators i on i.standard_id = s.id and i.is_government_applicable;

revoke all on public.cycle_indicator_overview, public.staff_responsibilities from anon;
grant select on public.cycle_indicator_overview, public.staff_responsibilities to authenticated;
