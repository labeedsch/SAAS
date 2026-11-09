-- صورة المستخدم (المنسوب): مسار الملف في حاوية avatars
alter table public.staff add column if not exists avatar_path text;

-- حاوية عامة للقراءة (صور شخصية صغيرة بأسماء عشوائية)، والكتابة والحذف للمنسق فقط
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy avatars_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and private.is_coordinator());
create policy avatars_objects_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and private.is_coordinator()) with check (bucket_id = 'avatars' and private.is_coordinator());
create policy avatars_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and private.is_coordinator());
