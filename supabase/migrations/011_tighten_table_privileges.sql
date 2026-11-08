-- TRUNCATE/REFERENCES/TRIGGER لا تخضع لـ RLS؛ تُسحب من كل الأدوار العامة.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- الزائر: قراءة فقط للمرجع والنتائج المنشورة، وكل شيء آخر مسحوب (RLS تقيّد الصفوف).
revoke insert, update, delete on all tables in schema public from anon;
revoke select on public.domain_assignments, public.indicator_assignments, public.evidence_files,
  public.suggested_evidence from anon;

-- أي جدول/عرض جديد مستقبلاً لا يمنح الزائر شيئاً تلقائياً
alter default privileges in schema public revoke all on tables from anon;
