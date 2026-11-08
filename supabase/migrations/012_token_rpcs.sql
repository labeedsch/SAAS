-- 012: روابط الحضور وروابط وصول المسؤولين بلا حساب. الرمز الخام لا يُخزَّن، يُخزَّن SHA-256 فقط.

create function public.create_invite_tokens(p_meeting uuid)
returns table(staff_id uuid, token text)
language plpgsql security definer set search_path = '' as $$
declare r record; t text;
begin
  if not private.is_coordinator() then raise exception 'غير مصرح'; end if;
  for r in select i.id, i.staff_id as sid from public.meeting_invitees i where i.meeting_id = p_meeting loop
    t := encode(extensions.gen_random_bytes(18), 'hex');
    update public.meeting_invitees set invite_token_hash = encode(extensions.digest(t, 'sha256'), 'hex') where id = r.id;
    staff_id := r.sid; token := t; return next;
  end loop;
end $$;
revoke execute on function public.create_invite_tokens(uuid) from public, anon;
grant execute on function public.create_invite_tokens(uuid) to authenticated;

create function public.get_invite(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  select i.rsvp, i.rsvp_reason, s.full_name, m.title, m.meeting_date, m.start_time, m.location, m.status
    into r from public.meeting_invitees i
    join public.meetings m on m.id = i.meeting_id join public.staff s on s.id = i.staff_id
    where i.invite_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not found then return null; end if;
  return to_jsonb(r);
end $$;

create function public.rsvp_by_token(p_token text, p_answer public.rsvp_status, p_reason text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if p_answer not in ('confirmed', 'declined') then raise exception 'إجابة غير صالحة'; end if;
  update public.meeting_invitees set rsvp = p_answer, rsvp_reason = left(p_reason, 500)
   where invite_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     and exists (select 1 from public.meetings m where m.id = meeting_id and m.status in ('draft', 'scheduled'));
  get diagnostics n = row_count;
  return n = 1;
end $$;
revoke execute on function public.get_invite(text), public.rsvp_by_token(text, public.rsvp_status, text) from public;
grant execute on function public.get_invite(text), public.rsvp_by_token(text, public.rsvp_status, text) to anon, authenticated;

create function public.create_access_link(p_cycle uuid, p_indicator uuid, p_staff uuid, p_days int default 30)
returns text language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  if not private.is_coordinator() then raise exception 'غير مصرح'; end if;
  t := encode(extensions.gen_random_bytes(18), 'hex');
  insert into public.indicator_access_links(cycle_id, indicator_id, staff_id, token_hash, expires_at, created_by)
  values (p_cycle, p_indicator, p_staff, encode(extensions.digest(t, 'sha256'), 'hex'),
          now() + make_interval(days => greatest(1, least(p_days, 365))), auth.uid());
  return t;
end $$;
revoke execute on function public.create_access_link(uuid, uuid, uuid, int) from public, anon;
grant execute on function public.create_access_link(uuid, uuid, uuid, int) to authenticated;

create function public.get_access_link_data(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l record; res jsonb;
begin
  select * into l from public.indicator_access_links
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and revoked_at is null and expires_at > now();
  if not found then return null; end if;
  update public.indicator_access_links set last_used_at = now() where id = l.id;
  select jsonb_build_object(
    'staff_name', (select full_name from public.staff where id = l.staff_id),
    'cycle_name', (select name from public.cycles where id = l.cycle_id),
    'code', i.code, 'official_text', i.official_text, 'requirements', i.requirements_text,
    'domain', d.name_ar, 'standard', s.name_ar,
    'due_date', (select min(a.due_date) from public.indicator_assignments a
                  where a.cycle_id = l.cycle_id and a.indicator_id = i.id and a.staff_id = l.staff_id and a.kind = 'responsible'),
    'suggested', coalesce((select jsonb_agg(jsonb_build_object('title', se.title, 'description', se.description))
                  from public.suggested_evidence se where se.indicator_id = i.id), '[]'::jsonb),
    'evidence', coalesce((select jsonb_agg(jsonb_build_object('title', e.title, 'status', e.status))
                  from public.evidence e where e.cycle_id = l.cycle_id and e.indicator_id = i.id), '[]'::jsonb),
    'expires_at', l.expires_at)
  into res
  from public.indicators i join public.standards s on s.id = i.standard_id join public.domains d on d.id = s.domain_id
  where i.id = l.indicator_id;
  return res;
end $$;
revoke execute on function public.get_access_link_data(text) from public;
grant execute on function public.get_access_link_data(text) to anon, authenticated;
