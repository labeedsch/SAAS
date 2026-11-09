-- إتاحة قراءة الاسترشاد (محتوى مرجعي) في الموقع العام؛ الكتابة تبقى للمنسق فقط
grant select on public.indicator_guidance, public.indicator_guidance_evidence to anon;
create policy ig_public_read on public.indicator_guidance for select to anon, authenticated using (true);
create policy ige_public_read on public.indicator_guidance_evidence for select to anon, authenticated using (true);
