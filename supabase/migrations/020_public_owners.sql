-- 020: إظهار مسؤول المؤشر ومقيّمه (الاسم والصورة فقط) في الموقع العام
-- قرار مالك المشروع: الأسماء والصور تظهر لكل الزوار.
-- الدالة تكشف حقولاً محددة فقط (الاسم، مسار الصورة، النوع، ومعرّف المؤشر/المجال) ولا تكشف أي بيانات أخرى عن المنسوب
-- (جوال، واتساب، حساب...)، وللدورات المنشورة نتائجها فقط، فهي متسقة مع public_results.
create or replace function public.public_owners()
returns table (cycle_id uuid, indicator_id uuid, domain_id uuid, kind text, full_name text, avatar_path text)
language sql stable security definer set search_path = ''
as $$
  select a.cycle_id, a.indicator_id, null::uuid, case a.kind when 'evaluator' then 'evaluator' else 'responsible' end,
         s.full_name, s.avatar_path
  from public.indicator_assignments a
  join public.cycles c on c.id = a.cycle_id and c.results_published
  join public.staff s on s.id = a.staff_id and s.is_active
  union all
  select a.cycle_id, null::uuid, a.domain_id, case a.kind when 'evaluator' then 'evaluator' else 'responsible' end,
         s.full_name, s.avatar_path
  from public.domain_assignments a
  join public.cycles c on c.id = a.cycle_id and c.results_published
  join public.staff s on s.id = a.staff_id and s.is_active
$$;
revoke all on function public.public_owners() from public;
grant execute on function public.public_owners() to anon, authenticated;
