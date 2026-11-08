-- 007: حماية ملفات الشواهد (المرحلة الرابعة)
-- حاوية خاصة. الصلاحية تُفحص عند كل قراءة أو رفع على مستوى قاعدة البيانات.
-- مسار الملف: {cycle_id}/{evidence_id}/{اسم الملف}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 26214400, array[
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- القراءة: الفريق (بمن فيهم المدير والمراجع) لكل الملفات المسجلة،
-- والمقيم الخارجي لملفات الشواهد المعتمدة في دورة منشورة فقط. الزائر لا يقرأ شيئاً.
create policy evidence_objects_read on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and exists (
    select 1 from public.evidence_files f join public.evidence e on e.id = f.evidence_id
    where f.storage_path = name
      and (private.is_team()
           or (private.is_external() and e.status = 'approved' and private.cycle_is_published(e.cycle_id)))));

-- الرفع: المنسق، أو عضو الفريق إلى شاهد جديد أضافه هو بنفس المسار
create policy evidence_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (
    private.is_coordinator()
    or (private.is_team() and exists (
      select 1 from public.evidence e
      where e.uploaded_by = auth.uid() and e.status = 'new'
        and name like e.cycle_id::text || '/' || e.id::text || '/%'))));

create policy evidence_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and private.is_coordinator());

-- أنواع الملفات المسموحة على مستوى الجدول أيضاً
alter table public.evidence_files add constraint evidence_files_mime_ok check (
  mime_type is null or mime_type in (
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
