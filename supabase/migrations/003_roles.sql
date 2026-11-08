-- 003: دورا مدير المدرسة والمراجع (يجب أن يُنفَّذ منفصلاً قبل 004 لأن القيم الجديدة لا تُستخدم في المعاملة نفسها)
alter type public.app_role add value if not exists 'principal';
alter type public.app_role add value if not exists 'reviewer';
