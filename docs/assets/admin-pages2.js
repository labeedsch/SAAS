/* صفحات: المؤشرات والتقييم، صفحة المؤشر، الشواهد */
(() => {
const { sb, h, raw, $, put, S, L, lab, opts, nf, dt, dtt, today, codeCmp, staffName, staffOpts, toast, run, must, ask, sure, badge, sb_, table, btn, pageHead, panel, isCoord, role, canReview, csv } = App;
const F = { dom: '', st: '', mine: false, q: '' };
const MIME_OK = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

// المؤشرات المسندة لي (مباشرة أو عبر المجال) كمقيّم أو مسؤول
async function myIndicators() {
  if (!S.me.staff_id) return new Set();
  const r = await must(sb.from('staff_responsibilities').select('indicator_id').eq('cycle_id', S.cid).eq('staff_id', S.me.staff_id));
  return new Set(r.map(x => x.indicator_id));
}

Pages.inds = async () => {
  const nc = App.needCycle(); if (nc) return nc;
  const ref = await App.ref();
  const [ov, ia, mine] = await Promise.all([
    must(sb.from('cycle_indicator_overview').select('*').eq('cycle_id', S.cid)),
    must(sb.from('indicator_assignments').select('indicator_id,staff_id,kind').eq('cycle_id', S.cid)),
    F.mine ? myIndicators() : Promise.resolve(null),
  ]);
  const om = Object.fromEntries(ov.map(o => [o.indicator_id, o]));
  let rows = ref.inds.map(i => ({ i, o: om[i.id] || {}, ev: ia.filter(a => a.indicator_id === i.id && a.kind === 'evaluator'), rs: ia.filter(a => a.indicator_id === i.id && a.kind === 'responsible') }));
  if (F.dom) rows = rows.filter(r => r.i.dom.id === F.dom);
  if (F.st) rows = rows.filter(r => (r.o.eval_status || 'not_evaluated') === F.st);
  if (mine) rows = rows.filter(r => mine.has(r.i.id));
  if (F.q) rows = rows.filter(r => (r.i.code + ' ' + r.i.official_text).includes(F.q));
  const lv = await must(sb.from('evaluation_levels').select('id,label_ar'));
  const lm = Object.fromEntries(lv.map(l => [l.id, l.label_ar]));
  const html = h`${pageHead('المؤشرات والتقييم', btn('تصدير CSV', 'indCsv'))}
  <div class="flt"><select id="fDom"><option value="">كل المجالات</option>${ref.domains.map(d => h`<option value="${d.id}" ${F.dom === d.id ? raw('selected') : ''}>${d.name_ar}</option>`)}</select>
   <select id="fSt"><option value="">كل الحالات</option>${Object.entries(L.eval).map(([k, v]) => h`<option value="${k}" ${F.st === k ? raw('selected') : ''}>${v}</option>`)}</select>
   <label class="chk"><input type="checkbox" id="fMine" ${F.mine ? raw('checked') : ''}> مؤشراتي فقط</label>
   <input id="fQ" placeholder="بحث بالرمز أو النص" value="${F.q}"></div>
  <div class="pn">${table([
    { h: 'الرمز', f: r => h`<a href="#ind/${r.i.id}" dir="ltr"><b>${r.i.code}</b></a>` }, { h: 'المؤشر', f: r => App.short(r.i.official_text, 80) },
    { h: 'المسؤول', f: r => r.rs.map(x => staffName(x.staff_id)).join('، ') || '—' }, { h: 'المقيّم', f: r => r.ev.map(x => staffName(x.staff_id)).join('، ') || '—' },
    { h: 'الحالة', f: r => sb_('eval', r.o.eval_status || 'not_evaluated') }, { h: 'النسبة', f: r => r.o.achievement_pct != null ? nf(r.o.achievement_pct) + '٪' : '—' },
    { h: 'المستوى', f: r => lm[r.o.level_id] || '—' }, { h: 'الشواهد', f: r => `${nf(r.o.approved_evidence || 0)} / ${nf(r.o.total_evidence || 0)}` },
  ], rows, 'لا توجد مؤشرات مطابقة')}</div>
  <p class="muted">الشواهد: المعتمدة / الإجمالي. المؤشر الذي لا تقييم له يظهر «لم يُقيَّم» ولا يُحسب صفراً.</p>`;
  Act.indCsv = () => csv('المؤشرات', [{ h: 'الرمز', x: r => r.i.code }, { h: 'المؤشر', x: r => r.i.official_text }, { h: 'الحالة', x: r => L.eval[r.o.eval_status || 'not_evaluated'] }, { h: 'النسبة', x: r => r.o.achievement_pct ?? '' }, { h: 'المستوى', x: r => lm[r.o.level_id] || '' }], rows);
  return { html, after: v => { const re = () => App.refresh();
    $('#fDom', v).onchange = e => { F.dom = e.target.value; re(); }; $('#fSt', v).onchange = e => { F.st = e.target.value; re(); }; $('#fMine', v).onchange = e => { F.mine = e.target.checked; re(); };
    $('#fQ', v).onchange = e => { F.q = e.target.value.trim(); re(); }; } };
};

// ===== صفحة المؤشر =====
Pages.ind = async ([id]) => {
  const nc = App.needCycle(); if (nc) return nc;
  const ref = await App.ref(); const ind = ref.im[id]; if (!ind) return h`<div class="pn"><p>المؤشر غير موجود.</p></div>`;
  const [ev, ia, da, se, evd, vc, tk, dl, lv, ei] = await Promise.all([
    must(sb.from('evaluations').select('*').eq('cycle_id', S.cid).eq('indicator_id', id).maybeSingle()),
    must(sb.from('indicator_assignments').select('*').eq('cycle_id', S.cid).eq('indicator_id', id)),
    must(sb.from('domain_assignments').select('*').eq('cycle_id', S.cid).eq('domain_id', ind.dom.id)),
    must(sb.from('suggested_evidence').select('*').eq('indicator_id', id).order('created_at')),
    must(sb.from('evidence').select('*, evidence_files(id)').eq('cycle_id', S.cid).eq('indicator_id', id).order('created_at', { ascending: false })),
    must(sb.from('visit_cards').select('*, technical_visits!inner(id,visit_date,target_party,cycle_id,status)').eq('indicator_id', id).eq('technical_visits.cycle_id', S.cid)),
    must(sb.from('tasks').select('*').eq('cycle_id', S.cid).eq('indicator_id', id)),
    must(sb.from('deadlines').select('*').eq('cycle_id', S.cid).eq('indicator_id', id)),
    must(sb.from('evaluation_levels').select('*').order('sort_order')),
    must(sb.from('evidence_indicators').select('evidence_id').eq('indicator_id', id)),
  ]);
  const lm = Object.fromEntries(lv.map(l => [l.id, l.label_ar]));
  const resp = ia.filter(a => a.kind === 'responsible'), evalr = ia.filter(a => a.kind === 'evaluator');
  const dResp = da.filter(a => a.kind === 'responsible'), dEval = da.filter(a => a.kind === 'evaluator');
  const iEvaluate = isCoord() || role() === 'principal' || evalr.some(a => a.staff_id === S.me.staff_id) || dEval.some(a => a.staff_id === S.me.staff_id);
  const canUpload = ['coordinator', 'team_member'].includes(role());
  const cyc = App.cycle();
  const names = l => l.length ? l.map(a => staffName(a.staff_id)).join('، ') : '—';
  // حفظ دوال المعالجة المرتبطة بهذا المؤشر
  Act.evEdit = async () => {
    const stOpts = [['draft', L.eval.draft], ['submitted', L.eval.submitted]]; if (isCoord() || role() === 'principal') stOpts.push(['approved', L.eval.approved]);
    const v = await ask('تقييم المؤشر ' + ind.code, [
      { k: 'achievement_pct', l: 'نسبة التحقق (٪)', t: 'number', min: 0, max: 100, hint: 'يُشتق المستوى منها: التميز 90+، التقدم 75، الانطلاق 50، التهيئة أقل' },
      { k: 'status', l: 'حالة التقييم', t: 'select', req: 1, o: stOpts }, { k: 'justification', l: 'مبررات التقييم', t: 'textarea', rows: 5 },
      { k: 'strengths', l: 'جوانب القوة', t: 'textarea' }, { k: 'gaps_notes', l: 'الفجوات والملاحظات', t: 'textarea' }, { k: 'data_sources', l: 'مصادر البيانات', t: 'textarea', rows: 2 }], ev || { status: 'draft' }, { wide: true });
    if (!v) return;
    if (v.status !== 'draft' && (v.achievement_pct == null || !v.justification)) return toast('النسبة والمبررات مطلوبتان قبل الإرسال أو الاعتماد', true);
    const row = { ...v, cycle_id: S.cid, indicator_id: id, evaluated_by: ev?.evaluated_by || S.me.id, approved_by: v.status === 'approved' ? S.me.id : null };
    if (await run(sb.from('evaluations').upsert(row, { onConflict: 'cycle_id,indicator_id' }), 'حُفظ التقييم')) App.refresh();
  };
  Act.seAdd = async () => { const v = await ask('شاهد مقترح', [{ k: 'title', l: 'العنوان', req: 1 }, { k: 'description', l: 'الوصف أو المثال', t: 'textarea' }]); if (v && await run(sb.from('suggested_evidence').insert({ ...v, indicator_id: id }), 'أُضيف')) App.refresh(); };
  Act.seDel = async ({ i }) => { if (await sure('حذف الشاهد المقترح؟') && await run(sb.from('suggested_evidence').delete().eq('id', i), 'حُذف')) App.refresh(); };
  Act.evAdd = () => evAdd(id);
  Act.dlSet = () => App.dlForm({ kind: 'indicator_close', indicator_id: id }, dl[0]);
  Act.indWa = () => App.waIndicator(id, resp);
  const T = x => x instanceof App.Raw ? x.s : String(x ?? '');
  const LVC = { 'التميز': 'excellence', 'التقدم': 'advancement', 'الانطلاق': 'launch', 'التهيئة': 'preparation' };
  const uniq = l => [...new Set(l)];
  const respNames = uniq([...resp, ...dResp].map(a => staffName(a.staff_id))), evalNames = uniq([...evalr, ...dEval].map(a => staffName(a.staff_id)));
  const domIdx = Math.max(0, ref.domains.findIndex(d => d.id === ind.dom.id));
  const DOMC = [0, 3, 2, 1][domIdx % 4];
  const evStatus = ev?.status || 'not_evaluated', lvLabel = ev ? lm[ev.level_id] : null;
  const evApproved = evd.filter(e => e.status === 'approved').length, tkDone = tk.filter(t => t.status === 'completed').length;
  const due = dl[0]?.due_date;
  const evCards = evd.length ? `<div class="ievs">${evd.map(e => T(h`<div class="iev"><div class="iev-h"><span class="iev-ic">${raw(IndPage.ic('clip'))}</span><div><b>${e.title}</b>${e.description ? h`<small>${App.short(e.description, 90)}</small>` : ''}</div></div>
      <div class="chips">${sb_('evid', e.status)}<span class="bdg">${dt(e.evidence_date)}</span><span class="bdg info">${nf(e.evidence_files.length)} ملف</span></div>
      ${e.external_url ? h`<a href="${e.external_url}" target="_blank" rel="noopener">رابط خارجي</a>` : ''}${e.review_note ? h`<small class="muted">${e.review_note}</small>` : ''}
      <div class="chips">${btn('معاينة', 'evView', { id: e.id, t: e.title })}${canReview() ? btn('مراجعة', 'evReview', { id: e.id }) : ''}${isCoord() ? btn('حذف', 'evDel', { id: e.id }, 'bad') : ''}</div></div>`)).join('')}</div>` : '<p class="muted">لم تُرفع شواهد فعلية لهذا المؤشر بعد.</p>';
  const evalBody = ev ? T(h`<dl class="ikv"><dt>المستوى</dt><dd>${lvLabel || '—'}</dd><dt>نسبة التحقق</dt><dd>${ev.achievement_pct != null ? nf(ev.achievement_pct) + '٪' : '—'}</dd>
    <dt>المبررات</dt><dd>${ev.justification || '—'}</dd><dt>جوانب القوة</dt><dd>${ev.strengths || '—'}</dd><dt>الفجوات والملاحظات</dt><dd>${ev.gaps_notes || '—'}</dd><dt>مصادر البيانات</dt><dd>${ev.data_sources || '—'}</dd>
    <dt>الاعتماد</dt><dd>${ev.approved_at ? dtt(ev.approved_at) : '—'}</dd></dl>`) : '<p class="muted">لم يُسجَّل تقييم لهذا المؤشر في هذه الدورة.</p>';
  const evalAct = iEvaluate && cyc.status === 'active' ? T(btn(ev ? 'تعديل التقييم' : 'تسجيل التقييم', 'evEdit', {}, 'pri')) : `<small class="muted">${cyc.status !== 'active' ? 'الدورة غير نشطة' : 'التقييم للمقيّم المسند'}</small>`;
  const siblings = ref.inds.filter(i => i.standard_id === ind.standard_id && i.id !== id).map(i => ({ href: '#ind/' + i.id, code: i.code, text: i.official_text, dom: DOMC }));
  // سجل التعديلات: للمنسق فقط (تفرضه سياسات قاعدة البيانات)، ويفشل بصمت لغيره
  let logHtml = null;
  if (isCoord()) {
    const lg = await sb.from('activity_log').select('action,entity_type,actor_id,created_at,new_data').filter('new_data->>indicator_id', 'eq', id).order('created_at', { ascending: false }).limit(15);
    if (!lg.error) {
      const ids = [...new Set(lg.data.map(x => x.actor_id).filter(Boolean))];
      const pr = ids.length ? await sb.from('profiles').select('id,display_name').in('id', ids) : { data: [] };
      const pm = Object.fromEntries((pr.data || []).map(p => [p.id, p.display_name]));
      const AC = { insert: 'إضافة', update: 'تعديل', delete: 'حذف' }, EN = { evaluations: 'تقييم', evidence: 'شاهد', tasks: 'مهمة', deadlines: 'موعد', indicator_assignments: 'إسناد', visit_cards: 'بطاقة زيارة', suggested_evidence: 'شاهد مقترح' };
      logHtml = lg.data.length ? T(h`<ul class="ilist">${lg.data.map(x => h`<li><b>${AC[x.action] || x.action} ${EN[x.entity_type] || x.entity_type}</b> <small class="muted">— ${pm[x.actor_id] || 'النظام'} · ${dtt(x.created_at)}</small></li>`)}</ul>`) : '<p class="muted">لا سجلات لهذا المؤشر بعد.</p>';
    }
  }
  const page = IndPage.render({
    back: { href: '#inds', label: 'العودة للمؤشرات' }, dom: DOMC, domIdx, code: ind.code, text: ind.official_text, domName: ind.dom.name_ar, stdName: ind.std.name_ar, cycleName: cyc.name,
    status: { label: L.eval[evStatus], cls: evStatus === 'approved' ? 'ok' : evStatus === 'submitted' ? 'info' : evStatus === 'draft' ? 'warn' : '' },
    level: lvLabel ? { label: lvLabel, cls: LVC[lvLabel] || '' } : null, pct: ev?.achievement_pct, req: ind.requirements_text,
    owners: [{ label: 'مسؤول المؤشر', names: respNames }, { label: 'مقيّم المؤشر', names: evalNames }],
    heroActions: isCoord() ? T(btn('إرسال التفاصيل للمسؤولين (واتساب)', 'indWa')) : '',
    stats: [{ label: 'نسبة التحقق', value: ev?.achievement_pct != null ? nf(ev.achievement_pct) + '٪' : '—' }, { label: 'الشواهد المعتمدة', value: `${nf(evApproved)} / ${nf(evd.length)}` },
      { label: 'المهام المكتملة', value: `${nf(tkDone)} / ${nf(tk.length)}` }, { label: 'الزيارات الفنية', value: nf(vc.length) }],
    about: [{ ico: 'layers', k: 'المجال', v: ind.dom.name_ar }, { ico: 'doc', k: 'المعيار', v: ind.std.name_ar }, { ico: 'check', k: 'الشواهد المقترحة', v: se.length ? nf(se.length) + ' شواهد استرشادية' : 'لا توجد شواهد مقترحة' }],
    ident: [{ ico: 'grid', k: 'رمز المؤشر', v: ind.code }, { ico: 'layers', k: 'المجال', v: ind.dom.name_ar }, { ico: 'doc', k: 'المعيار', v: ind.std.name_ar }, { ico: 'cal', k: 'الدورة', v: `${cyc.name} · ${cyc.school_year}` },
      { ico: 'check', k: 'حالة التقييم', v: L.eval[evStatus] }, { ico: 'bars', k: 'مستوى التقييم', v: lvLabel || '—' }, { ico: 'user', k: 'مسؤول المؤشر', v: respNames.join('، ') || '—' }, { ico: 'users', k: 'مقيّم المؤشر', v: evalNames.join('، ') || '—' },
      { ico: 'clock', k: 'موعد إغلاق المؤشر', v: dt(due) }, { ico: 'history', k: 'آخر اعتماد', v: ev?.approved_at ? dtt(ev.approved_at) : '—' }],
    note: 'الشواهد المقترحة استرشادية ولا تدخل في حساب اكتمال الشواهد، والزيارة الفنية لا تغيّر التقييم تلقائياً؛ التقييم من اختصاص مقيّم المؤشر.',
    suggested: { html: (se.length ? T(h`<ul class="ilist">${se.map(s => h`<li><b>${s.title}</b>${s.description ? h` — ${s.description}` : ''} ${isCoord() ? btn('✕', 'seDel', { i: s.id }, 'bad') : ''}</li>`)}</ul>`) : '<p class="muted">لا توجد شواهد مقترحة.</p>'), actions: isCoord() ? T(btn('+ شاهد مقترح', 'seAdd')) : '' },
    timeline: { start: cyc.start_date, end: cyc.end_date, deadline: due, lines: [['مدة الدورة', cyc.start_date || cyc.end_date ? `${dt(cyc.start_date)} إلى ${dt(cyc.end_date)}` : '—'], ['موعد إغلاق المؤشر', dt(due)]] },
    evalCard: { html: evalBody, actions: evalAct },
    evidence: { html: evCards, count: evd.length, actions: canUpload && cyc.status === 'active' ? T(btn('+ رفع شاهد', 'evAdd', {}, 'pri')) : '' },
    extra: [
      { title: 'الزيارات الفنية', ico: 'visit', html: T(table([{ h: 'التاريخ', f: v => dt(v.technical_visits.visit_date) }, { h: 'الجهة', f: v => v.technical_visits.target_party || '—' }, { h: 'الفجوات', f: v => App.short(v.gaps, 60) || '—' }, { h: 'المتابعة', f: v => sb_('follow', v.followup) }, { h: '', f: v => h`<a href="#visit/${v.visit_id}">فتح</a>` }], vc, 'لا زيارات مرتبطة')) },
      { title: 'المهام المرتبطة', ico: 'task', html: T(table([{ h: 'المهمة', f: t => t.title }, { h: 'المكلّف', f: t => staffName(t.assignee_staff_id) }, { h: 'الموعد', f: t => dt(t.due_date) }, { h: 'الحالة', f: t => sb_('task', t.status) }], tk, 'لا مهام مرتبطة')) }],
    related: siblings, log: logHtml ? { html: logHtml } : null });
  return raw(page);
};

// ===== رفع الشواهد =====
async function sha256(file) { try { const b = await crypto.subtle.digest('SHA-256', await file.arrayBuffer()); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch { return null; } }
async function evAdd(iid) {
  const ref = await App.ref();
  const f = [];
  if (!iid) f.push({ k: 'indicator_id', l: 'المؤشر', t: 'select', req: 1, o: ref.inds.map(i => [i.id, `${i.code} — ${App.short(i.official_text, 50)}`]) });
  f.push({ k: 'title', l: 'عنوان الشاهد', req: 1 }, { k: 'description', l: 'الوصف', t: 'textarea', rows: 3 }, { k: 'category', l: 'التصنيف', ph: 'سجل، تقرير، صورة…' },
    { k: 'evidence_date', l: 'تاريخ الشاهد', t: 'date' }, { k: 'external_url', l: 'رابط خارجي (اختياري)', t: 'url' },
    { k: 'files', l: 'الملفات', t: 'file', multiple: 1, accept: '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx', hint: 'PDF وصور ومستندات، حتى 25 ميغابايت للملف' });
  const v = await ask('رفع شاهد', f, {}, { submit: 'رفع', wide: true }); if (!v) return;
  const files = v.files || [];
  for (const x of files) { if (!MIME_OK.includes(x.type)) return toast(`نوع الملف غير مدعوم: ${x.name}`, true); if (x.size > 26214400) return toast(`الملف أكبر من 25 ميغابايت: ${x.name}`, true); }
  if (!files.length && !v.external_url) return toast('أرفق ملفاً أو أدخل رابطاً', true);
  const eid = crypto.randomUUID(), ind = iid || v.indicator_id;
  const { files: _f, indicator_id: _i, ...meta } = v;
  if (!await run(sb.from('evidence').insert({ ...meta, id: eid, cycle_id: S.cid, indicator_id: ind, uploaded_by: S.me.id, status: 'new' }))) return;
  let ok = 0;
  for (const x of files) {
    const ext = (x.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${S.cid}/${eid}/${crypto.randomUUID()}.${ext}`;
    const up = await sb.storage.from('evidence').upload(path, x, { contentType: x.type });
    if (up.error) { toast('فشل رفع ' + x.name + ': ' + up.error.message, true); continue; }
    const r = await sb.from('evidence_files').insert({ evidence_id: eid, storage_path: path, file_name: x.name, mime_type: x.type, size_bytes: x.size, sha256: await sha256(x) });
    if (r.error) { toast(App.errMsg(r.error), true); continue; } ok++;
  }
  toast(`رُفع الشاهد (${nf(ok)} ملف)`); App.refresh();
}
Act.evView = ({ id, t }) => App.openViewer(id, t, true);
Act.evReview = async ({ id }) => {
  const v = await ask('مراجعة الشاهد', [{ k: 'status', l: 'الحالة', t: 'select', req: 1, o: Object.entries(L.evid) }, { k: 'review_note', l: 'ملاحظة المراجعة', t: 'textarea', hint: 'اذكر المطلوب عند اختيار «يحتاج استكمالاً» أو «مرفوض»' }]);
  if (v && await run(sb.from('evidence').update({ ...v, reviewed_by: S.me.id, reviewed_at: new Date().toISOString() }).eq('id', id), 'حُفظت المراجعة')) App.refresh();
};
Act.evDel = async ({ id }) => {
  if (!await sure('حذف الشاهد وملفاته نهائياً؟ لا يمكن التراجع.')) return;
  const fs = await must(sb.from('evidence_files').select('storage_path').eq('evidence_id', id));
  if (fs.length) await sb.storage.from('evidence').remove(fs.map(f => f.storage_path));
  await sb.from('evidence_files').delete().eq('evidence_id', id);
  if (await run(sb.from('evidence').delete().eq('id', id), 'حُذف الشاهد')) App.refresh();
};

// ===== صفحة الشواهد =====
const EF = { st: '' };
Pages.evidence = async () => {
  const nc = App.needCycle(); if (nc) return nc;
  const ref = await App.ref();
  let q = sb.from('evidence').select('*, evidence_files(id)').eq('cycle_id', S.cid).order('created_at', { ascending: false });
  if (EF.st) q = q.eq('status', EF.st);
  const ev = await must(q);
  Act.evAddAny = () => evAdd(null);
  const html = h`${pageHead('الشواهد', ['coordinator', 'team_member'].includes(role()) ? btn('+ رفع شاهد', 'evAddAny', {}, 'pri') : '')}
  <div class="flt"><select id="efSt"><option value="">كل الحالات</option>${Object.entries(L.evid).map(([k, v]) => h`<option value="${k}" ${EF.st === k ? raw('selected') : ''}>${v}</option>`)}</select></div>
  <div class="pn">${table([
    { h: 'المؤشر', f: e => h`<a href="#ind/${e.indicator_id}" dir="ltr">${ref.im[e.indicator_id]?.code || '—'}</a>` }, { h: 'الشاهد', f: e => h`<b>${e.title}</b>` },
    { h: 'رفعه', f: e => dtt(e.created_at) }, { h: 'الملفات', f: e => nf(e.evidence_files.length) }, { h: 'الحالة', f: e => sb_('evid', e.status) },
    { h: '', f: e => h`<div class="chips">${btn('معاينة', 'evView', { id: e.id, t: e.title })}${canReview() ? btn('مراجعة', 'evReview', { id: e.id }) : ''}</div>` },
  ], ev, 'لا توجد شواهد')}</div>`;
  return { html, after: v => { $('#efSt', v).onchange = e => { EF.st = e.target.value; App.refresh(); }; } };
};
})();
