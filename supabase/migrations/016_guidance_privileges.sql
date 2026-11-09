-- 016: سحب صلاحيات TRUNCATE/TRIGGER/REFERENCES الزائدة عن جدولي الاسترشاد (على نهج 011)
revoke truncate, trigger, references on public.indicator_guidance, public.indicator_guidance_evidence from authenticated, anon;
