-- 009: واتساب، روابط وصول المسؤولين بلا حساب، وعروض النتائج العامة
-- لا أسرار في الجداول: رمز واتساب يوضع في أسرار Edge Functions فقط.

alter table public.staff add column if not exists whatsapp_opt_in boolean not null default false;

create type public.wa_message_status as enum ('queued', 'sent', 'delivered', 'failed', 'skipped');
create type public.wa_link_policy as enum ('required', 'forbidden');

-- إعدادات الخدمة: صف واحد
create table public.whatsapp_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  send_from time not null default '08:00',
  send_to time not null default '20:00',
  timezone text not null default 'Asia/Riyadh',
  bulk_allowed boolean not null default true,
  allowed_types text[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.whatsapp_settings default values;

create table public.whatsapp_templates (
  code text primary key,
  title_ar text not null,
  body_ar text not null,                       -- قابل للتعديل، مع متغيرات {{اسم}}
  link_policy public.wa_link_policy not null,  -- رسائل المؤشر والدعوة: رابط مطلوب؛ غيرها: ممنوع
  provider_template_name text,
  enabled boolean not null default false
);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  template_code text not null references public.whatsapp_templates(code),
  staff_id uuid not null references public.staff(id),
  cycle_id uuid references public.cycles(id),
  body text not null,
  has_link boolean not null default false,
  status public.wa_message_status not null default 'queued',
  provider_message_id text,
  error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- قاعدة الروابط تُفرض في قاعدة البيانات
create function private.wa_link_rule() returns trigger
language plpgsql set search_path = '' as $$
declare p public.wa_link_policy;
begin
  select link_policy into p from public.whatsapp_templates where code = new.template_code;
  if p = 'required' and not new.has_link then raise exception 'هذا القالب يتطلب رابطاً'; end if;
  if p = 'forbidden' and (new.has_link or new.body ~* 'https?://') then
    raise exception 'هذا القالب لا يسمح بروابط';
  end if;
  return new;
end $$;
create trigger trg_wa_link_rule before insert or update on public.whatsapp_messages
  for each row execute function private.wa_link_rule();

-- روابط وصول المسؤول بلا حساب: الرمز الخام لا يُخزَّن
create table public.indicator_access_links (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id),
  indicator_id uuid not null references public.indicators(id),
  staff_id uuid not null references public.staff(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['whatsapp_settings','whatsapp_templates','whatsapp_messages','indicator_access_links']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %1$s_coord on public.%1$s for all to authenticated
                    using (private.is_coordinator()) with check (private.is_coordinator())', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
                    for each row execute function public.log_activity()', t);
  end loop;
end $$;
-- المدير يطّلع على السجل
create policy wa_messages_principal on public.whatsapp_messages for select to authenticated
  using (private.is_principal());

-- قوالب افتراضية (معطّلة حتى يضبطها المنسق)
insert into public.whatsapp_templates(code, title_ar, body_ar, link_policy) values
 ('meeting_invite', 'دعوة اجتماع', 'السلام عليكم {{اسم}}، ندعوكم لاجتماع «{{عنوان}}» بتاريخ {{تاريخ}} الساعة {{وقت}} في {{مكان}}. لتأكيد الحضور أو الاعتذار: {{رابط}}', 'required'),
 ('meeting_reminder', 'تذكير بالاجتماع', 'تذكير: اجتماع «{{عنوان}}» بتاريخ {{تاريخ}} الساعة {{وقت}} في {{مكان}}.', 'forbidden'),
 ('task_new', 'تكليف جديد', 'تم تكليفكم بمهمة: «{{عنوان}}»، والموعد النهائي {{موعد}}. المخرج المطلوب: {{مخرج}}.', 'forbidden'),
 ('task_reminder', 'تذكير بمهمة', 'تذكير بالمهمة «{{عنوان}}» ويحل موعدها في {{موعد}}.', 'forbidden'),
 ('task_overdue', 'تنبيه تأخر مهمة', 'تنبيه: تأخر موعد المهمة «{{عنوان}}» المحدد في {{موعد}}.', 'forbidden'),
 ('indicator_deadline', 'اقتراب إغلاق مؤشر', 'يقترب موعد إغلاق المؤشر {{رمز_المؤشر}} في {{موعد}}. تفاصيل المؤشر: {{رابط}}', 'required'),
 ('announcement_new', 'إعلان جديد', 'إعلان جديد: {{عنوان}}. {{نص}}', 'forbidden'),
 ('schedule_change', 'تعديل موعد', 'تم تعديل الموعد «{{عنوان}}» ليصبح {{موعد}}.', 'forbidden'),
 ('indicator_assigned', 'تفاصيل المؤشر للمسؤول',
  'السلام عليكم {{اسم}}، أُسند إليكم المؤشر {{رمز_المؤشر}}.' || E'\n' ||
  'المجال: {{المجال}}' || E'\n' || 'المعيار: {{المعيار}}' || E'\n' ||
  'نص المؤشر: {{نص_المؤشر}}' || E'\n' || 'المطلوب منكم: {{المطلوب}}' || E'\n' ||
  'الشواهد الاسترشادية: {{الشواهد}}' || E'\n' || 'الموعد النهائي: {{موعد}}' || E'\n' ||
  'صفحة المؤشر: {{رابط}}', 'required'),
 ('evidence_request', 'طلب استكمال الشواهد', 'نأمل استكمال شواهد المؤشر {{رمز_المؤشر}}. التفاصيل: {{رابط}}', 'required'),
 ('minutes_summary', 'ملخص المحضر والقرارات', 'ملخص محضر اجتماع «{{عنوان}}»:' || E'\n' || '{{القرارات}}', 'forbidden');

-- ───────── عروض النتائج العامة (للزائر) ─────────
-- المنشور فقط: دورة منشورة + تقييم معتمد. المؤشر غير المعتمد يظهر «غير منشور» لا «غير مُقيَّم».
create view public.public_results with (security_invoker = true) as
select c.id as cycle_id, c.name as cycle_name,
       d.id as domain_id, d.code as domain_code, d.name_ar as domain_name,
       s.id as standard_id, s.code as standard_code, s.name_ar as standard_name,
       i.id as indicator_id, i.code as indicator_code, i.official_text,
       case when e.id is null then 'unpublished' else 'published' end as publish_state,
       e.achievement_pct, l.label_ar as level_label, e.justification, e.strengths
from public.cycles c
join public.domains d on d.guide_version_id = c.guide_version_id
join public.standards s on s.domain_id = d.id
join public.indicators i on i.standard_id = s.id and i.is_government_applicable
left join public.evaluations e on e.cycle_id = c.id and e.indicator_id = i.id and e.status = 'approved'
left join public.evaluation_levels l on l.id = e.level_id
where c.results_published;

grant select on public.public_results to anon, authenticated;

-- تقدم المجالات: أعداد فقط، بلا أوزان أو متوسطات غير معتمدة في الدليل
create view public.cycle_domain_progress with (security_invoker = true) as
select o.cycle_id, o.domain_id,
       count(*) as indicators_total,
       count(*) filter (where o.eval_status = 'approved') as approved,
       count(*) filter (where o.eval_status in ('draft', 'submitted')) as in_progress,
       count(*) filter (where o.eval_status = 'not_evaluated') as not_evaluated
from public.cycle_indicator_overview o
group by o.cycle_id, o.domain_id;
revoke all on public.cycle_domain_progress from anon;
grant select on public.cycle_domain_progress to authenticated;
