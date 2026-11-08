-- دخول باسم مستخدم (أو رقم هوية) بدل البريد: الاسم يُخزَّن بحروف صغيرة ويُشتق منه بريد داخلي لا يُراسَل.
alter table public.profiles add column if not exists username text;
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9._-]{3,40}$');
create unique index if not exists profiles_username_key on public.profiles (username) where username is not null;
comment on column public.profiles.username is 'اسم الدخول (حروف لاتينية صغيرة وأرقام و . _ -). يقابله في المصادقة بريد داخلي username@labeed.local';
