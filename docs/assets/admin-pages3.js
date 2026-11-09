/* صفحات: الاجتماعات، الزيارات الفنية، المهام، الإعلانات، المواعيد، واتساب، التقارير، سجل النشاط */
(() => {
const { sb, h, raw, $, put, S, L, lab, opts, nf, dt, dtt, today, codeCmp, staffName, staffOpts, toast, run, must, ask, sure, badge, sb_, table, btn, pageHead, panel, isCoord, role, canReview, csv } = App;
const BASE = () => location.href.replace(/admin\.html.*$/, '').replace(/#.*$/, '');
const MIME_OK = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

// ===== واتساب: وضع الرسائل في الطابور (الإرسال الفعلي عبر مزود معتمد لاحقاً) =====
let TPL;
const tpl = async code => { if (!TPL) TPL = Object.fromEntries((await must(sb.from('whatsapp_templates').select('*'))).map(t => [t.code, t])); return TPL[code]; };
const fill = (s, v) => s.replace(/\{\{([^}]+)\}\}/g, (_, k) => v[k.trim()] ?? '');
async function queueWa(code, staffId, vars, link) {
  const t = await tpl(code); const st = S.staff.find(s => s.id === staffId);
  if (!t) return 'no-template'; if (!st?.phone || !st.whatsapp_opt_in) return 'no-optin';
  if (t.link_policy === 'required' && !link) return 'no-link';
  const body = fill(t.body_ar, { ...vars, رابط: t.link_policy === 'required' ? link : '' }).trim();
  const r = await sb.from('whatsapp_messages').insert({ template_code: code, staff_id: staffId, cycle_id: S.cid, body, has_link: t.link_policy === 'required', status: 'queued', created_by: S.me.id });
  return r.error ? 'error:' + r.error.message : 'ok';
}
const waReport = res => { const c = res.reduce((a, r) => (a[r] = (a[r] || 0) + 1, a), {}); toast(`في الطابور: ${nf(c.ok || 0)}${c['no-optin'] ? ` · بلا موافقة/جوال: ${nf(c['no-optin'])}` : ''}${c['no-template'] ? ' · القالب غير موجود' : ''}`); };
App.queueWa = queueWa; App.waReport = waReport;
App.waIndicator = async (iid, resp) => {
  const ref = await App.ref(); const ind = ref.im[iid];
  const da = await must(sb.from('domain_assignments').select('staff_id').eq('cycle_id', S.cid).eq('domain_id', ind.dom.id).eq('kind', 'responsible'));
  const ids = [...new Set([...resp.map(r => r.staff_id), ...da.map(d => d.staff_id)])]; if (!ids.length) return toast('لا مسؤول مسند لهذا المؤشر', true);
  const se = await must(sb.from('suggested_evidence').select('title').eq('indicator_id', iid));
  const out = [];
  for (const sid of ids) {
    const { data, error } = await sb.rpc('create_access_link', { p_cycle: S.cid, p_indicator: iid, p_staff: sid, p_days: 30 }); if (error) { toast(App.errMsg(error), true); return; }
    const due = resp.find(r => r.staff_id === sid)?.due_date;
    out.push(await queueWa('indicator_assigned', sid, { اسم: staffName(sid), رمز_المؤشر: ind.code, المجال: ind.dom.name_ar, المعيار: ind.std.name_ar, نص_المؤشر: ind.official_text, المطلوب: ind.requirements_text || 'توفير الشواهد والوثائق المتعلقة بالمؤشر', الشواهد: se.map(x => x.title).join('، ') || '—', موعد: due ? dt(due) : 'يحدده المنسق' }, BASE() + 'access.html#' + data));
  }
  waReport(out);
};

// ===== المرفقات العامة (اجتماع/زيارة/مهمة/إعلان) =====
Act.tfOpen = async ({ t, id }) => {
  const draw = async () => {
    const fs = await must(sb.from('team_files').select('*').eq('owner_type', t).eq('owner_id', id).order('created_at'));
    const body = App.modal('المرفقات', h`${table([{ h: 'الملف', f: f => f.file_name }, { h: 'الحجم', f: f => f.size_bytes ? nf(Math.round(f.size_bytes / 1024)) + ' ك.ب' : '—' }, { h: '', f: f => h`<div class="chips">${btn('تنزيل', 'tfGet', { p: f.storage_path, n: f.file_name })}${isCoord() ? btn('حذف', 'tfDel', { id: f.id, p: f.storage_path, t, o: id }, 'bad') : ''}</div>` }], fs, 'لا مرفقات')}
      <div class="acts" style="margin-top:12px">${btn('+ إرفاق ملف', 'tfUp', { t, id }, 'pri')}</div>`);
  };
  Act.tfRefresh = draw; draw();
};
Act.tfUp = async ({ t, id }) => {
  const v = await ask('إرفاق ملفات', [{ k: 'files', l: 'الملفات', t: 'file', multiple: 1, req: 1, accept: '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx' }]); if (!v) return;
  for (const x of v.files) {
    if (!MIME_OK.includes(x.type) || x.size > 26214400) { toast('ملف غير مقبول: ' + x.name, true); continue; }
    const ext = (x.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, ''); const p = `${t}/${id}/${crypto.randomUUID()}.${ext}`;
    const up = await sb.storage.from('team-files').upload(p, x, { contentType: x.type }); if (up.error) { toast(up.error.message, true); continue; }
    await run(sb.from('team_files').insert({ owner_type: t, owner_id: id, storage_path: p, file_name: x.name, mime_type: x.type, size_bytes: x.size, uploaded_by: S.me.id }));
  }
  Act.tfOpen({ t, id });
};
Act.tfGet = async ({ p, n }) => { const r = await sb.storage.from('team-files').createSignedUrl(p, 120, { download: n }); if (r.error) return toast(App.errMsg(r.error), true); window.open(r.data.signedUrl, '_blank', 'noopener'); };
Act.tfDel = async ({ id, p, t, o }) => { if (!await sure('حذف المرفق؟')) return; await sb.storage.from('team-files').remove([p]); if (await run(sb.from('team_files').delete().eq('id', id), 'حُذف')) Act.tfOpen({ t, id: o }); };

// ===== الاجتماعات =====
const meetFields = async () => { const ref = await App.ref(); return [{ k: 'title', l: 'عنوان الاجتماع', req: 1 }, { k: 'meeting_date', l: 'التاريخ', t: 'date', req: 1 }, { k: 'start_time', l: 'الوقت', t: 'time' }, { k: 'location', l: 'المكان' },
  { k: 'status', l: 'الحالة', t: 'select', req: 1, o: Object.entries(L.meet) }, { k: 'domain_id', l: 'المجال المرتبط (اختياري)', t: 'select', o: ref.domains.map(d => [d.id, d.name_ar]) }]; };
Pages.meetings = async () => {
  const nc = App.needCycle(); if (nc) return nc;
  const [ms, inv] = await Promise.all([must(sb.from('meetings').select('*').eq('cycle_id', S.cid).order('meeting_date', { ascending: false })), must(sb.from('meeting_invitees').select('meeting_id,rsvp,attended'))]);
  return h`${pageHead('الاجتماعات', isCoord() ? btn('+ اجتماع', 'mtNew', {}, 'pri') : '')}<div class="pn">${table([
    { h: 'الاجتماع', f: m => h`<a href="#meeting/${m.id}"><b>${m.title}</b></a>` }, { h: 'التاريخ', f: m => dt(m.meeting_date) + (m.start_time ? ' · ' + m.start_time.slice(0, 5) : '') }, { h: 'المكان', f: m => m.location || '—' },
    { h: 'الحالة', f: m => sb_('meet', m.status) }, { h: 'المدعوون', f: m => { const x = inv.filter(i => i.meeting_id === m.id); return `${nf(x.length)} (أكّد ${nf(x.filter(i => i.rsvp === 'confirmed').length)} · حضر ${nf(x.filter(i => i.attended).length)})`; } },
  ], ms, 'لا اجتماعات في هذه الدورة')}</div>`;
};
Act.mtNew = async () => { const v = await ask('اجتماع جديد', await meetFields(), { status: 'scheduled' }); if (!v) return; const r = await run(sb.from('meetings').insert({ ...v, cycle_id: S.cid, created_by: S.me.id }).select('id').single(), 'أُنشئ الاجتماع'); if (r) location.hash = '#meeting/' + r.id; };
Pages.meeting = async ([id]) => {
  const [m, ag, inv, mn, dc] = await Promise.all([
    must(sb.from('meetings').select('*').eq('id', id).maybeSingle()), must(sb.from('meeting_agenda_items').select('*').eq('meeting_id', id).order('sort_order')),
    must(sb.from('meeting_invitees').select('*').eq('meeting_id', id)), must(sb.from('meeting_minutes').select('*').eq('meeting_id', id).maybeSingle()),
    must(sb.from('meeting_decisions').select('*').eq('meeting_id', id)),
  ]);
  if (!m) return h`<div class="pn"><p>الاجتماع غير موجود.</p></div>`;
  const co = isCoord(), mine = inv.find(i => i.staff_id === S.me.staff_id);
  Act.mtEdit = async () => { const v = await ask('تعديل الاجتماع', await meetFields(), m); if (v && await run(sb.from('meetings').update(v).eq('id', id), 'حُفظ')) App.refresh(); };
  Act.mtDel = async () => { if (await sure('حذف الاجتماع وكل ما يتبعه؟') && await run(sb.from('meetings').delete().eq('id', id), 'حُذف')) location.hash = '#meetings'; };
  Act.agAdd = async () => { const v = await ask('محور', [{ k: 'title', l: 'المحور', req: 1 }, { k: 'responsible_staff_id', l: 'المسؤول عن المحور', t: 'select', o: staffOpts() }, { k: 'minutes_allocated', l: 'الوقت (دقيقة)', t: 'number', min: 1 }]); if (v && await run(sb.from('meeting_agenda_items').insert({ ...v, meeting_id: id, sort_order: ag.length + 1 }))) App.refresh(); };
  Act.agDel = async ({ i }) => { if (await run(sb.from('meeting_agenda_items').delete().eq('id', i))) App.refresh(); };
  Act.ivAdd = async () => {
    const have = new Set(inv.map(i => i.staff_id));
    const v = await ask('دعوة مدعوين', [{ k: 'ids', l: 'المنسوبون', t: 'multi', req: 1, o: staffOpts(s => !have.has(s.id)) }, { k: 'kind', l: 'الصفة', t: 'select', req: 1, o: [['team', 'عضو فريق التقويم'], ['support', 'طرف مساند']] }], { kind: 'team' }); if (!v) return;
    if (await run(sb.from('meeting_invitees').insert(v.ids.map(s => ({ meeting_id: id, staff_id: s, invitee_kind: v.kind }))), 'أُضيف المدعوون')) App.refresh();
  };
  Act.ivDel = async ({ i }) => { if (await run(sb.from('meeting_invitees').delete().eq('id', i))) App.refresh(); };
  Act.ivAtt = async ({ i, v }) => { if (await run(sb.from('meeting_invitees').update({ attended: v === '' ? null : v === '1' }).eq('id', i))) App.refresh(); };
  Act.myRsvp = async ({ i, v }) => { let reason = null; if (v === 'declined') { const r = await ask('سبب الاعتذار', [{ k: 'reason', l: 'السبب (اختياري)' }]); if (!r) return; reason = r.reason; } if (await run(sb.from('meeting_invitees').update({ rsvp: v, rsvp_reason: reason }).eq('id', i), 'سُجّل ردّك')) App.refresh(); };
  Act.ivInvite = async () => {
    if (!inv.length) return toast('أضف مدعوين أولاً', true);
    const { data, error } = await sb.rpc('create_invite_tokens', { p_meeting: id }); if (error) return toast(App.errMsg(error), true);
    const out = []; for (const x of data) out.push(await queueWa('meeting_invite', x.staff_id, { اسم: staffName(x.staff_id), عنوان: m.title, تاريخ: dt(m.meeting_date), وقت: m.start_time?.slice(0, 5) || '', مكان: m.location || '' }, BASE() + 'rsvp.html#' + x.token));
    waReport(out);
  };
  Act.mnEdit = async () => { const v = await ask('محضر الاجتماع', [{ k: 'discussion', l: 'المناقشات', t: 'textarea', rows: 8 }], mn || {}, { wide: true }); if (v && await run(sb.from('meeting_minutes').upsert({ meeting_id: id, discussion: v.discussion, status: mn?.status || 'draft' }, { onConflict: 'meeting_id' }), 'حُفظ المحضر')) App.refresh(); };
  Act.mnApprove = async () => { if (await sure('اعتماد المحضر؟') && await run(sb.from('meeting_minutes').update({ status: 'approved' }).eq('meeting_id', id), 'اعتُمد المحضر')) App.refresh(); };
  Act.mnSend = async () => {
    const att = inv.filter(i => i.attended); if (!att.length) return toast('سجّل الحضور الفعلي أولاً', true);
    const txt = dc.length ? dc.map((d, i) => `${nf(i + 1)}. ${d.decision_text}`).join('\n') : 'لا قرارات مسجلة.';
    const out = []; for (const a of att) out.push(await queueWa('minutes_summary', a.staff_id, { عنوان: m.title, القرارات: txt }, null));
    await sb.from('meeting_minutes').update({ summary_sent_at: new Date().toISOString() }).eq('meeting_id', id); waReport(out); App.refresh();
  };
  Act.dcAdd = async ({ i }) => { const old = i ? dc.find(d => d.id === i) : {}; const v = await ask('قرار أو توصية', [{ k: 'decision_text', l: 'النص', t: 'textarea', req: 1 }, { k: 'is_recommendation', l: 'توصية (وليس قراراً)', t: 'checkbox' }, { k: 'responsible_staff_id', l: 'المسؤول', t: 'select', o: staffOpts() }, { k: 'due_date', l: 'الموعد', t: 'date' }], old); if (!v) return; if (await run(i ? sb.from('meeting_decisions').update(v).eq('id', i) : sb.from('meeting_decisions').insert({ ...v, meeting_id: id }))) App.refresh(); };
  Act.dcDel = async ({ i }) => { if (await run(sb.from('meeting_decisions').delete().eq('id', i))) App.refresh(); };
  Act.dcTask = async ({ i }) => { const d = dc.find(x => x.id === i); await taskForm({ title: d.decision_text.slice(0, 120), description: d.decision_text, assignee_staff_id: d.responsible_staff_id, due_date: d.due_date, meeting_id: id, task_type: 'followup' }); };
  return h`${pageHead(m.title, h`${sb_('meet', m.status)} ${co ? h`${btn('تعديل', 'mtEdit')} ${btn('حذف', 'mtDel', {}, 'bad')}` : ''} ${btn('المرفقات', 'tfOpen', { t: 'meeting', id })}`)}
  <div class="pn"><dl class="kv"><dt>التاريخ</dt><dd>${dt(m.meeting_date)} ${m.start_time ? '· ' + m.start_time.slice(0, 5) : ''}</dd><dt>المكان</dt><dd>${m.location || '—'}</dd></dl></div>
  ${mine && m.status !== 'cancelled' ? panel('حضورك', h`<p>ردّك الحالي: ${sb_('rsvp', mine.rsvp)}</p>`, h`${btn('سأحضر', 'myRsvp', { i: mine.id, v: 'confirmed' }, 'pri')} ${btn('أعتذر', 'myRsvp', { i: mine.id, v: 'declined' })}`) : ''}
  ${panel('محاور الاجتماع', table([{ h: 'المحور', f: a => a.title }, { h: 'المسؤول', f: a => staffName(a.responsible_staff_id) }, { h: 'الوقت', f: a => a.minutes_allocated ? nf(a.minutes_allocated) + ' د' : '—' }, { h: '', f: a => co ? btn('✕', 'agDel', { i: a.id }, 'bad') : '' }], ag, 'لا محاور'), co ? btn('+ محور', 'agAdd') : '')}
  ${panel('المدعوون والحضور', h`${table([{ h: 'الاسم', f: i => staffName(i.staff_id) }, { h: 'الصفة', f: i => i.invitee_kind === 'team' ? 'فريق التقويم' : 'طرف مساند' },
    { h: 'تأكيد الحضور المسبق', f: i => h`${sb_('rsvp', i.rsvp)}${i.rsvp_reason ? h`<br><small class="muted">${i.rsvp_reason}</small>` : ''}` },
    { h: 'الحضور الفعلي', f: i => i.attended === true ? badge('حضر', 'ok') : i.attended === false ? badge('غاب', 'bad') : badge('لم يُسجَّل') },
    { h: '', f: i => co ? h`<div class="chips">${btn('حضر', 'ivAtt', { i: i.id, v: '1' })}${btn('غاب', 'ivAtt', { i: i.id, v: '0' })}${btn('✕', 'ivDel', { i: i.id }, 'bad')}</div>` : '' }], inv, 'لا مدعوون')}<p class="muted">تأكيد الحضور المسبق لا يُعدّ حضوراً فعلياً؛ يُسجَّل الحضور الفعلي أثناء الاجتماع.</p>`, co ? h`${btn('+ مدعوون', 'ivAdd')} ${btn('تجهيز دعوات واتساب', 'ivInvite')}` : '')}
  ${panel('المحضر', mn ? h`<p>${mn.status === 'approved' ? badge('معتمد ' + dtt(mn.approved_at), 'ok') : badge('مسودة', 'warn')}${mn.summary_sent_at ? badge('أُرسل الملخص', 'info') : ''}</p><div class="txt">${mn.discussion || '—'}</div>` : h`<p class="muted">لم يُكتب محضر.</p>`,
    co ? h`${btn(mn ? 'تعديل المحضر' : 'كتابة المحضر', 'mnEdit')} ${mn && mn.status !== 'approved' ? btn('اعتماد', 'mnApprove', {}, 'pri') : ''} ${mn?.status === 'approved' ? btn('إرسال الملخص (واتساب)', 'mnSend') : ''}` : '')}
  ${panel('القرارات والتوصيات', table([{ h: 'النص', f: d => h`${d.is_recommendation ? badge('توصية', 'info') : badge('قرار', 'ok')} ${d.decision_text}` }, { h: 'المسؤول', f: d => staffName(d.responsible_staff_id) }, { h: 'الموعد', f: d => dt(d.due_date) },
    { h: '', f: d => co ? h`<div class="chips">${btn('تعديل', 'dcAdd', { i: d.id })}${btn('إلى مهمة', 'dcTask', { i: d.id })}${btn('✕', 'dcDel', { i: d.id }, 'bad')}</div>` : '' }], dc, 'لا قرارات'), co ? btn('+ قرار/توصية', 'dcAdd') : '')}`;
};

// ===== الزيارات الفنية =====
const visitFields = [{ k: 'visit_date', l: 'التاريخ', t: 'date', req: 1 }, { k: 'visit_time', l: 'الوقت', t: 'time' }, { k: 'target_party', l: 'الجهة أو الشخص المستهدف', req: 1 }, { k: 'target_staff_id', l: 'المنسوب المستهدف', t: 'select', o: () => staffOpts() },
  { k: 'purpose', l: 'غرض الزيارة', t: 'textarea', rows: 3 }, { k: 'notes', l: 'ملاحظات', t: 'textarea', rows: 3 }, { k: 'status', l: 'الحالة', t: 'select', req: 1, o: Object.entries(L.visit) }];
const vf = () => visitFields.map(f => typeof f.o === 'function' ? { ...f, o: f.o() } : f);
Pages.visits = async () => {
  const nc = App.needCycle(); if (nc) return nc;
  const [vs, vt, vc] = await Promise.all([must(sb.from('technical_visits').select('*').eq('cycle_id', S.cid).order('visit_date', { ascending: false })), must(sb.from('visit_team').select('*')), must(sb.from('visit_cards').select('visit_id'))]);
  return h`${pageHead('الزيارات الفنية للمؤشرات', isCoord() ? btn('+ زيارة', 'vsNew', {}, 'pri') : '')}<p class="muted">الزيارة الفنية منفصلة عن الاجتماعات، ولا تغيّر تقييم المؤشر ولا تعتمد الشواهد.</p><div class="pn">${table([
    { h: 'الزيارة', f: v => h`<a href="#visit/${v.id}"><b>${v.target_party}</b></a>` }, { h: 'التاريخ', f: v => dt(v.visit_date) }, { h: 'الفريق', f: v => vt.filter(t => t.visit_id === v.id).map(t => staffName(t.staff_id)).join('، ') || '—' },
    { h: 'البطاقات', f: v => nf(vc.filter(c => c.visit_id === v.id).length) }, { h: 'الحالة', f: v => sb_('visit', v.status) }], vs, 'لا زيارات')}</div>`;
};
Act.vsNew = async () => {
  const v = await ask('زيارة فنية جديدة', [...vf(), { k: 'team', l: 'فريق الزيارة', t: 'multi', o: staffOpts() }], { status: 'planned' }, { wide: true }); if (!v) return;
  const { team, ...row } = v; const r = await run(sb.from('technical_visits').insert({ ...row, cycle_id: S.cid, created_by: S.me.id }).select('id').single()); if (!r) return;
  if (team.length) await run(sb.from('visit_team').insert(team.map(s => ({ visit_id: r.id, staff_id: s })))); toast('أُنشئت الزيارة'); location.hash = '#visit/' + r.id;
};
Pages.visit = async ([id]) => {
  const ref = await App.ref();
  const [v, vt, cards] = await Promise.all([must(sb.from('technical_visits').select('*').eq('id', id).maybeSingle()), must(sb.from('visit_team').select('*').eq('visit_id', id)), must(sb.from('visit_cards').select('*').eq('visit_id', id))]);
  if (!v) return h`<div class="pn"><p>الزيارة غير موجودة.</p></div>`;
  const co = isCoord(), inTeam = vt.some(t => t.staff_id === S.me.staff_id), can = co || inTeam;
  const cf = (adding) => [...(adding ? [{ k: 'indicator_id', l: 'المؤشر', t: 'select', req: 1, o: ref.inds.filter(i => !cards.some(c => c.indicator_id === i.id)).map(i => [i.id, `${i.code} — ${App.short(i.official_text, 50)}`]) }] : []),
    { k: 'existing_practices', l: 'الممارسات والإجراءات القائمة', t: 'textarea' }, { k: 'verified_items', l: 'ما تم الاطلاع عليه والتحقق منه', t: 'textarea' }, { k: 'strengths', l: 'جوانب القوة', t: 'textarea' },
    { k: 'gaps', l: 'الفجوات والنواقص', t: 'textarea' }, { k: 'recommendations', l: 'التوصيات الفنية', t: 'textarea' }, { k: 'required_actions', l: 'الإجراءات المطلوبة', t: 'textarea' },
    { k: 'responsible_staff_id', l: 'المسؤول عن الإجراء', t: 'select', o: staffOpts() }, { k: 'due_date', l: 'موعد التنفيذ', t: 'date' }, { k: 'followup', l: 'حالة المتابعة', t: 'select', req: 1, o: Object.entries(L.follow) }];
  Act.vsEdit = async () => { const x = await ask('تعديل الزيارة', vf(), v, { wide: true }); if (x && await run(sb.from('technical_visits').update(x).eq('id', id), 'حُفظ')) App.refresh(); };
  Act.vsDel = async () => { if (await sure('حذف الزيارة وبطاقاتها؟') && await run(sb.from('technical_visits').delete().eq('id', id), 'حُذفت')) location.hash = '#visits'; };
  Act.vsTeam = async () => { const have = new Set(vt.map(t => t.staff_id)); const x = await ask('إضافة لفريق الزيارة', [{ k: 'ids', l: 'الأعضاء', t: 'multi', req: 1, o: staffOpts(s => !have.has(s.id)) }]); if (x && await run(sb.from('visit_team').insert(x.ids.map(s => ({ visit_id: id, staff_id: s }))))) App.refresh(); };
  Act.vsTeamDel = async ({ s }) => { if (await run(sb.from('visit_team').delete().eq('visit_id', id).eq('staff_id', s))) App.refresh(); };
  Act.vcAdd = async () => { const x = await ask('بطاقة مؤشر', cf(true), { followup: 'open' }, { wide: true }); if (x && await run(sb.from('visit_cards').insert({ ...x, visit_id: id }), 'أُضيفت البطاقة')) App.refresh(); };
  Act.vcEdit = async ({ c }) => { const x = await ask('بطاقة المؤشر', cf(false), cards.find(k => k.id === c), { wide: true }); if (x && await run(sb.from('visit_cards').update(x).eq('id', c), 'حُفظت')) App.refresh(); };
  Act.vcDel = async ({ c }) => { if (await sure('حذف البطاقة؟') && await run(sb.from('visit_cards').delete().eq('id', c))) App.refresh(); };
  Act.vcTask = async ({ c }) => { const k = cards.find(x => x.id === c); await taskForm({ title: App.short(k.required_actions || k.recommendations || 'متابعة زيارة فنية', 100), description: k.recommendations, assignee_staff_id: k.responsible_staff_id, due_date: k.due_date, indicator_id: k.indicator_id, visit_id: id, visit_card_id: c, task_type: 'technical_visit', required_output: k.required_actions }); };
  Act.vcImp = async ({ c }) => {
    const k = cards.find(x => x.id === c); if (!k.gaps) return toast('سجّل الفجوة أولاً', true);
    if (await run(sb.from('improvement_actions').insert({ cycle_id: S.cid, gap_description: k.gaps, action: k.required_actions || k.recommendations || '—', responsible_staff_id: k.responsible_staff_id, end_date: k.due_date, source_visit_card_id: c, created_by: S.me.id }), 'أُضيف إلى خطة التحسين')) {
      await sb.from('improvement_action_indicators').insert({ action_id: (await sb.from('improvement_actions').select('id').eq('source_visit_card_id', c).order('created_at', { ascending: false }).limit(1).single()).data.id, indicator_id: k.indicator_id });
    }
  };
  return h`${pageHead('زيارة فنية: ' + v.target_party, h`${sb_('visit', v.status)} ${co ? h`${btn('تعديل', 'vsEdit')} ${btn('حذف', 'vsDel', {}, 'bad')}` : ''} ${btn('المرفقات', 'tfOpen', { t: 'visit', id })}`)}
  <div class="pn"><dl class="kv"><dt>التاريخ</dt><dd>${dt(v.visit_date)} ${v.visit_time ? '· ' + v.visit_time.slice(0, 5) : ''}</dd><dt>المنسوب المستهدف</dt><dd>${staffName(v.target_staff_id)}</dd><dt>الغرض</dt><dd class="txt">${v.purpose || '—'}</dd><dt>ملاحظات</dt><dd class="txt">${v.notes || '—'}</dd></dl>
   <p class="muted">لا تغيّر الزيارة تقييم المؤشر تلقائياً ولا تعتمد الشواهد؛ التقييم من اختصاص مقيّمي المؤشرات.</p></div>
  ${panel('فريق الزيارة', h`<div class="chips">${vt.length ? vt.map(t => h`<span class="chip2">${staffName(t.staff_id)} ${co ? h`<button data-a="vsTeamDel" data-s="${t.staff_id}" aria-label="إزالة">✕</button>` : ''}</span>`) : h`<span class="muted">لا أعضاء</span>`}</div>`, co ? btn('+ عضو', 'vsTeam') : '')}
  ${panel('البطاقات الفنية للمؤشرات', cards.length ? cards.map(k => h`<div class="pn" style="box-shadow:none"><div class="pnh"><h2><a href="#ind/${k.indicator_id}" dir="ltr">${ref.im[k.indicator_id]?.code}</a> ${sb_('follow', k.followup)}</h2>
    <div class="pa">${can ? h`${btn('تعديل', 'vcEdit', { c: k.id })}` : ''}${co ? h`${btn('إلى مهمة', 'vcTask', { c: k.id })} ${btn('إلى خطة التحسين', 'vcImp', { c: k.id })} ${btn('✕', 'vcDel', { c: k.id }, 'bad')}` : ''}</div></div>
    <p class="muted">${ref.im[k.indicator_id]?.official_text}</p>
    <dl class="kv"><dt>الممارسات القائمة</dt><dd class="txt">${k.existing_practices || '—'}</dd><dt>ما تم التحقق منه</dt><dd class="txt">${k.verified_items || '—'}</dd><dt>جوانب القوة</dt><dd class="txt">${k.strengths || '—'}</dd><dt>الفجوات</dt><dd class="txt">${k.gaps || '—'}</dd>
    <dt>التوصيات</dt><dd class="txt">${k.recommendations || '—'}</dd><dt>الإجراءات المطلوبة</dt><dd class="txt">${k.required_actions || '—'}</dd><dt>المسؤول / الموعد</dt><dd>${staffName(k.responsible_staff_id)} · ${dt(k.due_date)}</dd></dl></div>`) : h`<p class="muted">لم تُضف بطاقات مؤشرات.</p>`, can ? btn('+ بطاقة مؤشر', 'vcAdd', {}, 'pri') : '')}`;
};

// ===== المهام =====
const TF = { who: '', st: '', ap: '' };
async function taskForm(base = {}, existing = null) {
  const ref = await App.ref(); const co = isCoord();
  const f = [{ k: 'title', l: 'عنوان المهمة', req: 1 }, { k: 'description', l: 'الوصف', t: 'textarea' }, { k: 'task_type', l: 'النوع', t: 'select', req: 1, o: Object.entries(L.ttype) },
    { k: 'indicator_id', l: 'المؤشر المرتبط', t: 'select', o: ref.inds.map(i => [i.id, `${i.code} — ${App.short(i.official_text, 45)}`]) }, { k: 'required_output', l: 'المخرج المطلوب' }];
  if (co) f.push({ k: 'assignee_staff_id', l: 'المكلّف', t: 'select', o: staffOpts() }, { k: 'start_date', l: 'تاريخ البداية', t: 'date' }, { k: 'due_date', l: 'تاريخ النهاية', t: 'date' });
  const v = await ask(existing ? 'تعديل المهمة' : co ? 'مهمة جديدة' : 'اقتراح مهمة', f, { task_type: 'administrative', ...base, ...(existing || {}) }, { wide: true }); if (!v) return;
  let r;
  if (existing) r = await run(sb.from('tasks').update(v).eq('id', existing.id), 'حُفظت');
  else if (co) r = await run(sb.from('tasks').insert({ ...v, ...(base.meeting_id ? { meeting_id: base.meeting_id } : {}), ...(base.visit_id ? { visit_id: base.visit_id, visit_card_id: base.visit_card_id } : {}), cycle_id: S.cid, approval: 'approved', proposed_by: S.me.id }), 'أُنشئت المهمة');
  else r = await run(sb.from('tasks').insert({ ...v, cycle_id: S.cid, proposed_by: S.me.id, approval: 'proposed', status: 'new' }), 'أُرسل الاقتراح للمنسق');
  if (r) { if (co && !existing && v.assignee_staff_id) waReport([await queueWa('task_new', v.assignee_staff_id, { عنوان: v.title, موعد: v.due_date ? dt(v.due_date) : '—', مخرج: v.required_output || '—' }, null)]); App.refresh(); }
}
App.taskForm = taskForm;
Pages.tasks = async () => {
  const nc = App.needCycle(); if (nc) return nc;
  let ts = await must(sb.from('tasks').select('*').eq('cycle_id', S.cid).order('created_at', { ascending: false }));
  const me = S.me.staff_id, co = isCoord();
  if (TF.who === 'mine') ts = ts.filter(t => t.assignee_staff_id === me); if (TF.st) ts = ts.filter(t => t.status === TF.st); if (TF.ap) ts = ts.filter(t => t.approval === TF.ap);
  const all = ts;
  Act.tkNew = () => taskForm(); Act.tkEdit = async ({ i }) => taskForm({}, all.find(t => t.id === i));
  Act.tkApprove = async ({ i }) => { const t = all.find(x => x.id === i); const v = await ask('اعتماد المهمة', [{ k: 'assignee_staff_id', l: 'المكلّف', t: 'select', req: 1, o: staffOpts() }, { k: 'start_date', l: 'البداية', t: 'date' }, { k: 'due_date', l: 'النهاية', t: 'date' }, { k: 'required_output', l: 'المخرج المطلوب' }, { k: 'task_type', l: 'النوع', t: 'select', req: 1, o: Object.entries(L.ttype) }], t); if (!v) return;
    if (await run(sb.from('tasks').update({ ...v, approval: 'approved' }).eq('id', i), 'اعتُمدت المهمة')) { waReport([await queueWa('task_new', v.assignee_staff_id, { عنوان: t.title, موعد: v.due_date ? dt(v.due_date) : '—', مخرج: v.required_output || '—' }, null)]); App.refresh(); } };
  Act.tkReject = async ({ i }) => { if (await run(sb.from('tasks').update({ approval: 'rejected', status: 'cancelled' }).eq('id', i), 'رُفض الاقتراح')) App.refresh(); };
  Act.tkSt = async ({ i, s }) => { let note; if (s === 'awaiting_review') { const v = await ask('إرسال للمراجعة', [{ k: 'completion_note', l: 'ملاحظة الإنجاز والمخرج', t: 'textarea' }]); if (!v) return; note = v.completion_note; } if (await run(sb.from('tasks').update({ status: s, ...(note ? { completion_note: note } : {}) }).eq('id', i), 'حُدّثت الحالة')) App.refresh(); };
  Act.tkDel = async ({ i }) => { if (await sure('حذف المهمة؟') && await run(sb.from('tasks').delete().eq('id', i))) App.refresh(); };
  const html = h`${pageHead('المهام والتكليفات', btn(co ? '+ مهمة' : '+ اقتراح مهمة', 'tkNew', {}, 'pri'))}
  <div class="flt"><select id="tfW"><option value="">كل المهام</option><option value="mine" ${TF.who ? raw('selected') : ''}>مهامي</option></select>
  <select id="tfS"><option value="">كل الحالات</option>${Object.entries(L.task).map(([k, v]) => h`<option value="${k}" ${TF.st === k ? raw('selected') : ''}>${v}</option>`)}</select>
  <select id="tfA"><option value="">كل الاعتمادات</option>${Object.entries(L.appr).map(([k, v]) => h`<option value="${k}" ${TF.ap === k ? raw('selected') : ''}>${v}</option>`)}</select></div>
  <div class="pn">${table([
    { h: 'المهمة', f: t => h`<b>${t.title}</b><br><small class="muted">${L.ttype[t.task_type]}${t.indicator_id ? '' : ''}${t.required_output ? ' · المخرج: ' + t.required_output : ''}</small>` },
    { h: 'المكلّف', f: t => staffName(t.assignee_staff_id) }, { h: 'الفترة', f: t => `${dt(t.start_date)} ← ${dt(t.due_date)}` },
    { h: 'الحالة', f: t => h`${sb_('task', t.status)}${t.approval !== 'approved' ? ' ' : ''}${t.approval !== 'approved' ? sb_('appr', t.approval) : ''}${t.completion_note ? h`<br><small class="muted">${t.completion_note}</small>` : ''}` },
    { h: '', f: t => { const mineT = t.assignee_staff_id === me && t.approval === 'approved'; return h`<div class="chips">
      ${co && t.approval === 'proposed' ? h`${btn('اعتماد', 'tkApprove', { i: t.id }, 'pri')}${btn('رفض', 'tkReject', { i: t.id }, 'bad')}` : ''}
      ${mineT && ['new', 'overdue'].includes(t.status) ? btn('بدء', 'tkSt', { i: t.id, s: 'in_progress' }) : ''}${mineT && ['in_progress', 'overdue'].includes(t.status) ? btn('إرسال للمراجعة', 'tkSt', { i: t.id, s: 'awaiting_review' }, 'pri') : ''}
      ${co && t.status === 'awaiting_review' ? btn('اعتماد الإغلاق', 'tkSt', { i: t.id, s: 'completed' }, 'pri') : ''}${co && !['completed', 'cancelled'].includes(t.status) && t.approval === 'approved' ? btn('إلغاء', 'tkSt', { i: t.id, s: 'cancelled' }) : ''}
      ${co ? h`${btn('تعديل', 'tkEdit', { i: t.id })}${btn('✕', 'tkDel', { i: t.id }, 'bad')}` : ''}${btn('مرفقات', 'tfOpen', { t: 'task', id: t.id })}</div>`; } },
  ], ts, 'لا مهام')}</div><p class="muted">المسؤولية عن المؤشر مستمرة، أما المهمة فعمل محدد له بداية ونهاية ومخرج. اقتراحات الأعضاء لا تصبح تكليفاً إلا باعتماد المنسق.</p>`;
  return { html, after: v => { $('#tfW', v).onchange = e => { TF.who = e.target.value; App.refresh(); }; $('#tfS', v).onchange = e => { TF.st = e.target.value; App.refresh(); }; $('#tfA', v).onchange = e => { TF.ap = e.target.value; App.refresh(); }; } };
};

// ===== الإعلانات =====
const annFields = () => [{ k: 'title', l: 'العنوان', req: 1 }, { k: 'body', l: 'النص', t: 'textarea', req: 1, rows: 6 }, { k: 'priority', l: 'الأهمية', t: 'select', req: 1, o: Object.entries(L.prio) }, { k: 'audience', l: 'المستلمون', t: 'select', req: 1, o: [['all_team', 'كل أعضاء الفريق'], ['selected', 'منسوبون محددون']] },
    { k: 'recipients', l: 'المنسوبون المحددون', t: 'multi', o: staffOpts() }, { k: 'publish_at', l: 'يُنشر في', t: 'datetime-local' }, { k: 'expires_at', l: 'ينتهي في', t: 'datetime-local' }];
Act.anNew = async () => { const v = await ask('إعلان جديد', annFields(), { priority: 'normal', audience: 'all_team' }, { wide: true }); if (!v) return; const { recipients, ...row } = v;
    if (row.audience === 'selected' && !recipients.length) return toast('اختر المستلمين', true);
    const r = await run(sb.from('announcements').insert({ ...row, publish_at: row.publish_at ? new Date(row.publish_at).toISOString() : new Date().toISOString(), expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null, cycle_id: S.cid, created_by: S.me.id }).select('id').single(), 'نُشر الإعلان'); if (!r) return;
    if (row.audience === 'selected') await sb.from('announcement_recipients').insert(recipients.map(s => ({ announcement_id: r.id, staff_id: s })));
    const targets = row.audience === 'selected' ? recipients : S.staff.filter(s => s.is_active).map(s => s.id);
    if (await sure('إضافة رسائل واتساب بنص الإعلان إلى الطابور للمستلمين؟')) { const out = []; for (const s of targets) out.push(await queueWa('announcement_new', s, { عنوان: row.title, نص: row.body.slice(0, 300) }, null)); waReport(out); }
    App.refresh(); };
Pages.ann = async () => {
  const [as, rd, rc] = await Promise.all([must(sb.from('announcements').select('*').order('publish_at', { ascending: false })), must(sb.from('announcement_reads').select('*')), isCoord() ? must(sb.from('announcement_recipients').select('*')) : Promise.resolve([])]);
  const co = isCoord();
  Act.anDel = async ({ i }) => { if (await sure('حذف الإعلان؟') && await run(sb.from('announcements').delete().eq('id', i))) App.refresh(); };
  Act.anRead = async ({ i }) => { if (await run(sb.from('announcement_reads').upsert({ announcement_id: i, profile_id: S.me.id }, { onConflict: 'announcement_id,profile_id', ignoreDuplicates: true }))) App.refresh(); };
  Act.anWho = async ({ i }) => { const r = rd.filter(x => x.announcement_id === i); const pr = (await sb.from('profiles').select('id,display_name')).data || []; const nm = Object.fromEntries(pr.map(p => [p.id, p.display_name])); App.modal('من اطّلع على الإعلان', r.length ? h`<ul>${r.map(x => h`<li>${nm[x.profile_id] || 'عضو'} — ${dtt(x.read_at)}</li>`)}</ul><p class="muted">${nf(r.length)} اطّلعوا</p>` : h`<p class="muted">لم يطّلع أحد بعد.</p>`); };
  return h`${pageHead('إعلانات الفريق', co ? btn('+ إعلان', 'anNew', {}, 'pri') : '')}${as.length ? as.map(a => { const read = rd.some(r => r.announcement_id === a.id && r.profile_id === S.me.id);
    return h`<div class="pn"><div class="pnh"><h2>${a.title} ${a.priority !== 'normal' ? badge(L.prio[a.priority], a.priority === 'urgent' ? 'bad' : 'warn') : ''}</h2><div class="pa"><small class="muted">${dtt(a.publish_at)}</small>
      ${co ? h`${btn('المطّلعون (' + nf(rd.filter(r => r.announcement_id === a.id).length) + ')', 'anWho', { i: a.id })}${btn('مرفقات', 'tfOpen', { t: 'announcement', id: a.id })}${btn('✕', 'anDel', { i: a.id }, 'bad')}` : (read ? badge('اطّلعت', 'ok') : btn('تعليم كمقروء', 'anRead', { i: a.id }))}</div></div>
      <div class="txt">${a.body}</div>${a.expires_at ? h`<small class="muted">ينتهي ${dtt(a.expires_at)}</small>` : ''}${co && a.audience === 'selected' ? h`<br><small class="muted">إلى: ${rc.filter(r => r.announcement_id === a.id).map(r => staffName(r.staff_id)).join('، ')}</small>` : ''}</div>`; }) : h`<div class="pn"><p class="muted">لا توجد إعلانات.</p></div>`}`;
};

// ===== المواعيد والتقويم الموحد =====
App.dlForm = async (base, ex) => {
  const ref = await App.ref(); const f = [];
  if (!base.kind) f.push({ k: 'kind', l: 'النوع', t: 'select', req: 1, o: [['domain_close', 'إغلاق مجال'], ['indicator_close', 'إغلاق مؤشر']] });
  const kind = base.kind || null;
  if (!ex) { if (!kind || kind === 'domain_close') f.push({ k: 'domain_id', l: 'المجال (لإغلاق المجال)', t: 'select', o: ref.domains.map(d => [d.id, d.name_ar]) }); if (!kind || kind === 'indicator_close') f.push({ k: 'indicator_id', l: 'المؤشر (لإغلاق المؤشر)', t: 'select', o: ref.inds.map(i => [i.id, `${i.code} — ${App.short(i.official_text, 45)}`]) }); }
  f.push({ k: 'due_date', l: 'الموعد النهائي', t: 'date', req: 1 }); if (ex) f.push({ k: 'extension_reason', l: 'سبب التمديد' });
  const v = await ask(ex ? 'تمديد الموعد' : 'موعد نهائي', f, { ...base, ...(ex || {}) }); if (!v) return;
  if (ex) { if (await run(sb.from('deadlines').update({ due_date: v.due_date, extension_reason: v.extension_reason }).eq('id', ex.id), 'حُدّث الموعد')) App.refresh(); return; }
  const k = base.kind || v.kind; const tid = k === 'domain_close' ? v.domain_id : (base.indicator_id || v.indicator_id); if (!tid) return toast('اختر المجال أو المؤشر', true);
  const title = k === 'domain_close' ? 'إغلاق مجال ' + ref.dm[tid].name_ar : 'إغلاق المؤشر ' + ref.im[tid].code;
  const row = { cycle_id: S.cid, kind: k, title, due_date: v.due_date, created_by: S.me.id, ...(k === 'domain_close' ? { domain_id: tid } : { indicator_id: tid }) };
  if (await run(sb.from('deadlines').insert(row), 'أُضيف الموعد')) App.refresh();
};
Pages.cal = async () => {
  const nc = App.needCycle(); if (nc) return nc;
  const [cal, dl] = await Promise.all([must(sb.from('team_calendar').select('*').eq('cycle_id', S.cid).order('event_date')), must(sb.from('deadlines').select('*').eq('cycle_id', S.cid).order('due_date'))]);
  const KL = { meeting: 'اجتماع', task: 'موعد مهمة', deadline: 'إغلاق', visit: 'زيارة فنية' };
  const months = {}; cal.forEach(e => { const k = e.event_date.slice(0, 7); (months[k] = months[k] || []).push(e); });
  Act.dlNew = () => App.dlForm({}); Act.dlExt = ({ i }) => App.dlForm({}, dl.find(d => d.id === i)); Act.dlDel = async ({ i }) => { if (await sure('حذف الموعد؟') && await run(sb.from('deadlines').delete().eq('id', i))) App.refresh(); };
  const link = e => ({ meeting: '#meeting/' + e.ref_id, visit: '#visit/' + e.ref_id }[e.kind] || null);
  return h`${pageHead('التقويم والمواعيد', isCoord() ? btn('+ موعد إغلاق', 'dlNew', {}, 'pri') : '')}
  ${panel('التقويم الموحد', Object.keys(months).length ? Object.entries(months).map(([m, es]) => h`<h3 style="margin:10px 0 6px">${new Date(m + '-01').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' })}</h3>${table([{ h: 'التاريخ', f: e => dt(e.event_date) + (e.event_time ? ' · ' + e.event_time.slice(0, 5) : '') }, { h: 'النوع', f: e => badge(KL[e.kind], e.kind === 'deadline' ? 'warn' : 'info') }, { h: 'العنوان', f: e => link(e) ? h`<a href="${link(e)}">${e.title}</a>` : e.title }], es)}`) : h`<p class="muted">لا أحداث.</p>`)}
  ${panel('مواعيد الإغلاق', table([{ h: 'الموعد', f: d => d.title }, { h: 'التاريخ', f: d => dt(d.due_date) }, { h: 'الأصلي', f: d => d.original_due_date !== d.due_date ? dt(d.original_due_date) : '—' }, { h: 'سبب التمديد', f: d => d.extension_reason || '—' },
    { h: '', f: d => isCoord() ? h`<div class="chips">${btn('تمديد', 'dlExt', { i: d.id })}${btn('✕', 'dlDel', { i: d.id }, 'bad')}</div>` : '' }], dl, 'لا مواعيد إغلاق'))}`;
};

// ===== واتساب =====
Pages.wa = async () => {
  const [st, ts, ms] = await Promise.all([must(sb.from('whatsapp_settings').select('*').single()), must(sb.from('whatsapp_templates').select('*').order('code')), must(sb.from('whatsapp_messages').select('*').order('created_at', { ascending: false }).limit(100))]);
  Act.waSet = async () => { const v = await ask('إعدادات واتساب', [{ k: 'enabled', l: 'تشغيل الخدمة', t: 'checkbox' }, { k: 'send_from', l: 'بداية وقت الإرسال', t: 'time', req: 1 }, { k: 'send_to', l: 'نهاية وقت الإرسال', t: 'time', req: 1 }, { k: 'timezone', l: 'المنطقة الزمنية', req: 1 }, { k: 'bulk_allowed', l: 'السماح بالإرسال الجماعي', t: 'checkbox' }, { k: 'allowed_types', l: 'أنواع الرسائل المسموحة', t: 'multi', o: ts.map(t => [t.code, t.title_ar]) }], st); if (v && await run(sb.from('whatsapp_settings').update(v).eq('id', true), 'حُفظت الإعدادات')) App.refresh(); };
  Act.waTpl = async ({ c }) => { const t = ts.find(x => x.code === c); const v = await ask('قالب: ' + t.title_ar, [{ k: 'title_ar', l: 'الاسم', req: 1 }, { k: 'body_ar', l: 'نص الرسالة', t: 'textarea', rows: 7, req: 1, hint: 'المتغيرات بين {{ }}' + (t.link_policy === 'required' ? ' — القالب يتطلب {{رابط}}' : ' — لا تضع روابط في هذا القالب') }, { k: 'provider_template_name', l: 'اسم القالب لدى المزود' }, { k: 'enabled', l: 'مفعّل', t: 'checkbox' }], t, { wide: true }); if (!v) return;
    if (t.link_policy === 'forbidden' && /https?:\/\/|\{\{\s*رابط\s*\}\}/.test(v.body_ar)) return toast('هذا القالب لا يسمح بروابط', true);
    if (t.link_policy === 'required' && !/\{\{\s*رابط\s*\}\}/.test(v.body_ar)) return toast('يجب أن يحتوي القالب على {{رابط}}', true);
    if (await run(sb.from('whatsapp_templates').update(v).eq('code', c), 'حُفظ القالب')) { TPL = null; App.refresh(); } };
  return h`${pageHead('رسائل واتساب', btn('الإعدادات', 'waSet', {}, 'pri'))}
  <div class="pn"><p>حالة الخدمة: ${st.enabled ? badge('مشغّلة', 'ok') : badge('متوقفة', 'warn')} · الإرسال ${st.send_from.slice(0, 5)} – ${st.send_to.slice(0, 5)} (${st.timezone})</p>
   <p class="muted">تُسجَّل الرسائل هنا في الطابور. الإرسال الفعلي يتطلب ربط حساب WhatsApp Business Platform عبر دالة خادم تحفظ المفتاح كسرّ، ولم يُربط بعد؛ لا تُرسل رسائل حالياً.</p></div>
  ${panel('القوالب', table([{ h: 'القالب', f: t => h`<b>${t.title_ar}</b><br><small class="muted txt">${App.short(t.body_ar, 110)}</small>` }, { h: 'الرابط', f: t => t.link_policy === 'required' ? badge('يتضمن رابطاً', 'info') : badge('بلا رابط') }, { h: 'التفعيل', f: t => t.enabled ? badge('مفعّل', 'ok') : badge('معطّل') }, { h: '', f: t => btn('تعديل', 'waTpl', { c: t.code }) }], ts))}
  ${panel('سجل الرسائل (آخر 100)', table([{ h: 'الوقت', f: m => dtt(m.created_at) }, { h: 'المستلم', f: m => staffName(m.staff_id) }, { h: 'القالب', f: m => ts.find(t => t.code === m.template_code)?.title_ar }, { h: 'الحالة', f: m => h`${sb_('wa', m.status)}${m.error ? h`<br><small class="err">${m.error}</small>` : ''}` }, { h: 'النص', f: m => App.short(m.body, 70) }], ms, 'لا رسائل'))}`;
};

// ===== التقارير =====
const R = {
  results: ['نتائج التقويم (تفصيل كل مؤشر)', async () => { const ref = await App.ref(); const [ov, ev, lv] = await Promise.all([must(sb.from('cycle_indicator_overview').select('*').eq('cycle_id', S.cid)), must(sb.from('evaluations').select('*').eq('cycle_id', S.cid)), must(sb.from('evaluation_levels').select('*'))]);
    const em = Object.fromEntries(ev.map(e => [e.indicator_id, e])), lm = Object.fromEntries(lv.map(l => [l.id, l.label_ar]));
    return { cols: [['المجال', r => r.i.dom.name_ar], ['المعيار', r => r.i.std.name_ar], ['الرمز', r => r.i.code], ['المؤشر', r => r.i.official_text], ['الحالة', r => L.eval[r.e?.status || 'not_evaluated']], ['النسبة %', r => r.e?.achievement_pct ?? ''], ['المستوى', r => lm[r.e?.level_id] || ''], ['المبررات', r => r.e?.justification || ''], ['جوانب القوة', r => r.e?.strengths || ''], ['الفجوات', r => r.e?.gaps_notes || '']], rows: ref.inds.map(i => ({ i, e: em[i.id] })) }; }],
  domains: ['تقرير المجالات', async () => { const ref = await App.ref(); const [ov, lv] = await Promise.all([must(sb.from('cycle_indicator_overview').select('*').eq('cycle_id', S.cid)), must(sb.from('evaluation_levels').select('id,label_ar'))]);
    const lm = Object.fromEntries(lv.map(l => [l.id, l.label_ar])); const cnt = (rs, l) => rs.filter(o => o.eval_status === 'approved' && lm[o.level_id] === l).length;
    return { cols: [['المجال', r => r.d.name_ar], ['المؤشرات', r => r.rs.length], ['معتمد', r => r.rs.filter(o => o.eval_status === 'approved').length], ['التميز', r => cnt(r.rs, 'التميز')], ['التقدم', r => cnt(r.rs, 'التقدم')], ['الانطلاق', r => cnt(r.rs, 'الانطلاق')], ['التهيئة', r => cnt(r.rs, 'التهيئة')], ['لم يُقيَّم', r => r.rs.filter(o => o.eval_status === 'not_evaluated').length]], rows: ref.domains.map(d => ({ d, rs: ov.filter(o => o.domain_id === d.id) })) }; }],
  standards: ['تقرير المعايير', async () => { const ref = await App.ref(); const ov = await must(sb.from('cycle_indicator_overview').select('*').eq('cycle_id', S.cid));
    return { cols: [['المجال', r => ref.dm[r.s.domain_id].name_ar], ['المعيار', r => r.s.name_ar], ['المؤشرات', r => r.rs.length], ['معتمد', r => r.rs.filter(o => o.eval_status === 'approved').length], ['قيد التقييم', r => r.rs.filter(o => ['draft', 'submitted'].includes(o.eval_status)).length], ['لم يُقيَّم', r => r.rs.filter(o => o.eval_status === 'not_evaluated').length]], rows: ref.standards.map(s => ({ s, rs: ov.filter(o => o.standard_id === s.id) })) }; }],
  evidence: ['حالة الشواهد', async () => { const ref = await App.ref(); const ev = await must(sb.from('evidence').select('indicator_id,status').eq('cycle_id', S.cid)); const n = (id, s) => ev.filter(e => e.indicator_id === id && (!s || e.status === s)).length;
    return { cols: [['الرمز', r => r.code], ['المؤشر', r => r.official_text], ['الإجمالي', r => n(r.id)], ['معتمد', r => n(r.id, 'approved')], ['قيد المراجعة', r => n(r.id, 'under_review') + n(r.id, 'new')], ['يحتاج استكمالاً', r => n(r.id, 'needs_completion')], ['مرفوض', r => n(r.id, 'rejected')]], rows: ref.inds }; }],
  resp: ['مسؤوليات منسوبي المدرسة', async () => { const rs = await must(sb.from('staff_responsibilities').select('*').eq('cycle_id', S.cid)); rs.sort((a, b) => staffName(a.staff_id).localeCompare(staffName(b.staff_id), 'ar') || codeCmp(a.code, b.code));
    return { cols: [['المنسوب', r => staffName(r.staff_id)], ['الدور', r => L.kind[r.kind]], ['الرمز', r => r.code], ['المؤشر', r => r.official_text], ['عبر', r => r.via === 'domain' ? 'المجال' : 'المؤشر']], rows: rs }; }],
  evaluators: ['أداء مقيّمي المؤشرات', async () => { const [rs, ov] = await Promise.all([must(sb.from('staff_responsibilities').select('staff_id,indicator_id').eq('cycle_id', S.cid).eq('kind', 'evaluator')), must(sb.from('cycle_indicator_overview').select('indicator_id,eval_status').eq('cycle_id', S.cid))]);
    const st = Object.fromEntries(ov.map(o => [o.indicator_id, o.eval_status])); const ids = [...new Set(rs.map(r => r.staff_id))];
    return { cols: [['المقيّم', r => staffName(r.id)], ['المؤشرات المسندة', r => r.m.length], ['مسودة', r => r.m.filter(x => st[x.indicator_id] === 'draft').length], ['مُرسل', r => r.m.filter(x => st[x.indicator_id] === 'submitted').length], ['معتمد', r => r.m.filter(x => st[x.indicator_id] === 'approved').length], ['لم يبدأ', r => r.m.filter(x => !st[x.indicator_id] || st[x.indicator_id] === 'not_evaluated').length]], rows: ids.map(id => ({ id, m: rs.filter(x => x.staff_id === id) })) }; }],
  visits: ['الزيارات الفنية', async () => { const ref = await App.ref(); const vs = await must(sb.from('technical_visits').select('*, visit_cards(*)').eq('cycle_id', S.cid).order('visit_date')); const rows = vs.flatMap(v => (v.visit_cards.length ? v.visit_cards : [null]).map(c => ({ v, c })));
    return { cols: [['التاريخ', r => r.v.visit_date], ['الجهة', r => r.v.target_party], ['الحالة', r => L.visit[r.v.status]], ['المؤشر', r => ref.im[r.c?.indicator_id]?.code || ''], ['الفجوات', r => r.c?.gaps || ''], ['التوصيات', r => r.c?.recommendations || ''], ['المتابعة', r => r.c ? L.follow[r.c.followup] : '']], rows }; }],
  gaps: ['الفجوات والتوصيات', async () => { const ref = await App.ref(); const [vc, ev] = await Promise.all([must(sb.from('visit_cards').select('*, technical_visits!inner(cycle_id)').eq('technical_visits.cycle_id', S.cid)), must(sb.from('evaluations').select('indicator_id,gaps_notes').eq('cycle_id', S.cid).not('gaps_notes', 'is', null))]);
    const rows = [...ev.map(e => ({ s: 'التقييم', id: e.indicator_id, g: e.gaps_notes, r: '' })), ...vc.filter(c => c.gaps || c.recommendations).map(c => ({ s: 'زيارة فنية', id: c.indicator_id, g: c.gaps, r: c.recommendations }))];
    return { cols: [['المصدر', r => r.s], ['المؤشر', r => ref.im[r.id]?.code], ['الفجوة', r => r.g || ''], ['التوصية', r => r.r || '']], rows }; }],
  tasks: ['المهام والتكليفات', async () => { const ts = await must(sb.from('tasks').select('*').eq('cycle_id', S.cid).order('due_date'));
    return { cols: [['المهمة', r => r.title], ['النوع', r => L.ttype[r.task_type]], ['المكلّف', r => staffName(r.assignee_staff_id)], ['البداية', r => r.start_date || ''], ['النهاية', r => r.due_date || ''], ['الاعتماد', r => L.appr[r.approval]], ['الحالة', r => L.task[r.status]]], rows: ts }; }],
  meetings: ['الاجتماعات ومحاضرها', async () => { const ms = await must(sb.from('meetings').select('*, meeting_invitees(rsvp,attended), meeting_minutes(status), meeting_decisions(id)').eq('cycle_id', S.cid).order('meeting_date'));
    return { cols: [['الاجتماع', r => r.title], ['التاريخ', r => r.meeting_date], ['الحالة', r => L.meet[r.status]], ['المدعوون', r => r.meeting_invitees.length], ['أكّدوا', r => r.meeting_invitees.filter(i => i.rsvp === 'confirmed').length], ['حضروا فعلياً', r => r.meeting_invitees.filter(i => i.attended).length], ['المحضر', r => r.meeting_minutes?.status === 'approved' ? 'معتمد' : r.meeting_minutes ? 'مسودة' : '—'], ['القرارات', r => r.meeting_decisions.length]], rows: ms }; }],
  team: ['إنجاز الفريق', async () => { const ts = await must(sb.from('team_task_stats').select('*').eq('cycle_id', S.cid)); return { cols: [['العضو', r => r.full_name], ['الإجمالي', r => r.total], ['مكتملة', r => r.completed], ['جارية', r => r.in_progress], ['متأخرة', r => r.overdue]], rows: ts }; }],
};
Pages.reports = async ([k]) => {
  const nc = App.needCycle(); if (nc) return nc;
  const menu = h`<div class="flt noprint">${Object.entries(R).map(([key, v]) => h`<a class="btn sm ${key === k ? 'pri' : ''}" href="#reports/${key}">${v[0]}</a>`)}</div>`;
  if (!k || !R[k]) return h`${pageHead('التقارير')}${menu}<p class="muted">اختر تقريراً. كل تقرير يخص الدورة المحددة أعلاه ويمكن طباعته أو تصديره إلى CSV.</p>`;
  const d = await R[k][1](); const cols = d.cols.map(([hd, f]) => ({ h: hd, f: r => String(f(r) ?? ''), x: f }));
  Act.rpCsv = () => csv(R[k][0] + '-' + App.cycle().name, cols, d.rows);
  return h`${pageHead(R[k][0], h`${btn('طباعة', 'print')} ${btn('تصدير CSV', 'rpCsv')}`)}${menu}<p class="muted">مدرسة لبيد بن ربيعة المتوسطة · ${App.cycle().name} · ${dt(today())}</p><div class="pn">${table(cols, d.rows, 'لا بيانات')}</div>`;
};

// ===== سجل النشاط =====
Pages.log = async () => {
  const [lg, pr] = await Promise.all([must(sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200)), sb.from('profiles').select('id,display_name')]);
  const pm = Object.fromEntries((pr.data || []).map(p => [p.id, p.display_name])); const AC = { INSERT: 'إضافة', UPDATE: 'تعديل', DELETE: 'حذف' };
  const diff = r => { if (!r.new_data || !r.old_data) return ''; return Object.keys(r.new_data).filter(k => JSON.stringify(r.new_data[k]) !== JSON.stringify(r.old_data[k]) && k !== 'updated_at').slice(0, 6).join('، '); };
  return h`${pageHead('سجل النشاط')}<p class="muted">آخر 200 عملية. السجل للإضافة فقط ولا يمكن تعديله أو حذفه.</p><div class="pn">${table([
    { h: 'الوقت', f: r => dtt(r.created_at) }, { h: 'المنفّذ', f: r => pm[r.actor_id] || (r.actor_id ? r.actor_id.slice(0, 8) : 'النظام') }, { h: 'الإجراء', f: r => AC[r.action] || r.action }, { h: 'الكيان', f: r => r.entity_type }, { h: 'الحقول المتغيرة', f: r => diff(r) }], lg, 'لا سجلات')}</div>`;
};
})();
