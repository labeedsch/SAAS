-- اختبار 008/009 كشف أن الزائر (anon) يملك صلاحية SELECT على ثلاثة جداول (RLS كانت تمنع الصفوف). نسحبها كطبقة ثانية.
revoke all on public.staff, public.profiles, public.activity_log from anon;
