/* صفحات: لوحة المتابعة، الدورات، المنسوبون والحسابات، المسؤوليات */
(() => {
const { sb, h, raw, $, put, S, L, lab, opts, nf, dt, dtt, today, codeCmp, staffName, staffOpts, toast, run, must, ask, sure, badge, sb_, table, btn, pageHead, panel, isCoord, role, csv } = App;

// ===== بيانات مرجعية (مشتركة بين الدورات) =====
let REF;
App.ref = async (force) => {
  if (REF && !force) return REF;
  const [d, s, i] = await Promise.all([
    must(sb.from('domains').select('*').order('sort_order')),
    must(sb.from('standards').select('*').order('sort_order')),
    must(sb.from('indicators').select('*').eq('is_government_applicable', true).order('sort_order')),
  ]);
  const dm = Object.fromEntries(d.map(x => [x.id, x])), sm = Object.fromEntries(s.map(x => [x.id, x]));
  i.sort((a, b) => codeCmp(a.code, b.code));
  i.forEach(x => { x.std = sm[x.standard_id]; x.dom = dm[x.std?.domain_id]; });
  REF = { domains: d, standards: s, inds: i, im: Object.fromEntries(i.map(x => [x.id, x])), dm, sm };
  return REF;
};
const needCycle = () => S.cid ? null : h`${pageHead('لا توجد دورة')}<div class="pn"><p>أنشئ دورة أولاً من صفحة «دورات التقويم».</p><a class="btn pri" href="#cycles">دورات التقويم</a></div>`;
App.needCycle = needCycle;
const short = (t, n = 90) => t && t.length > n ? t.slice(0, n) + '…' : t;
App.short = short;
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const bar = p => h`<div class="bar2"><span style="width:${p}%"></span></div>`;

// ===== لوحة المتابعة =====
Pages.dashboard = async () => {
  const nc = needCycle(); if (nc) return nc;
  const ref = await App.ref(); const c = App.cycle();
  const [ov, ev, ts, cal, tk, lvs] = await Promise.all([
    must(sb.from('cycle_indicator_overview').select('*').eq('cycle_id', S.cid)),
    must(sb.from('evidence').select('status').eq('cycle_id', S.cid)),
    sb.from('team_task_stats').select('*').eq('cycle_id', S.cid),
    sb.from('team_calendar').select('*').eq('cycle_id', S.cid).gte('event_date', today()).order('event_date').limit(8),
    sb.from('tasks').select('status,approval').eq('cycle_id', S.cid),
    must(sb.from('evaluation_levels').select('*').order('sort_order')),
  ]);
  const cnt = (k) => ov.filter(o => o.eval_status === k).length;
  const evc = (k) => ev.filter(e => e.status === k).length;
  const tasks = (tk.data || []).filter(t => t.approval === 'approved');
  const domRows = ref.domains.map(d => {
    const rs = ov.filter(o => o.domain_id === d.id), a = rs.filter(o => o.eval_status === 'approved').length;
    // نتيجة المجال: متوسط نسب المؤشرات المعتمدة (طريقة مؤقتة غير واردة في الدليل) ومستواها من عتبات الدليل
    const v = rs.filter(o => o.eval_status === 'approved' && o.achievement_pct != null).map(o => Number(o.achievement_pct)), avg = v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
    const lv = avg == null ? null : lvs.find(l => avg >= Number(l.min_pct)) || lvs[lvs.length - 1];
    return { d, total: rs.length, a, p: pct(a, rs.length), avg, lv, ev: rs.reduce((s, o) => s + Number(o.approved_evidence), 0) };
  });
  return h`${pageHead(c.name, h`${sb_('cycle', c.status)}`)}
  <div class="kpis">
    <div class="kpi"><b>${nf(ov.length)}</b><span>مؤشراً في الدورة</span></div>
    <div class="kpi"><b>${nf(cnt('approved'))}</b><span>تقييم معتمد</span></div>
    <div class="kpi"><b>${nf(cnt('submitted'))}</b><span>بانتظار الاعتماد</span></div>
    <div class="kpi"><b>${nf(cnt('not_evaluated'))}</b><span>لم يُقيَّم</span></div>
    <div class="kpi"><b>${nf(evc('approved'))} / ${nf(ev.length)}</b><span>شواهد معتمدة</span></div>
    <div class="kpi"><b>${nf(evc('new') + evc('under_review'))}</b><span>شواهد تنتظر المراجعة</span></div>
  </div>
  ${panel('تقدم المجالات', table([
    { h: 'المجال', f: r => r.d.name_ar },
    { h: 'النتيجة', f: r => r.avg == null ? h`<span class="muted">—</span>` : h`<div class="ires"><b>${nf(Math.round(r.avg))}٪</b><span class="lvl ${({ excellence: 'excellence', advancement: 'advancement', launch: 'launch', preparation: 'preparation' })[r.lv?.code] || 'none'}">${r.lv?.label_ar || ''}</span></div>` },
    { h: 'المؤشرات', f: r => nf(r.total) }, { h: 'المعتمدة', f: r => nf(r.a) },
    { h: 'التقدم', f: r => h`<div style="display:flex;gap:8px;align-items:center">${bar(r.p)}<span>${nf(r.p)}٪</span></div>` }, { h: 'شواهد معتمدة', f: r => nf(r.ev) },
  ], domRows))}
  <div class="two">
    ${panel('أداء الفريق (المهام المعتمدة)', table([
      { h: 'العضو', f: r => r.full_name }, { h: 'مكتملة', f: r => nf(r.completed) }, { h: 'جارية', f: r => nf(r.in_progress) }, { h: 'متأخرة', f: r => r.overdue ? badge(nf(r.overdue), 'bad') : '0' },
    ], ts.data || [], 'لا توجد مهام معتمدة بعد'), h`<small class="muted">${nf(tasks.length)} مهمة معتمدة</small>`)}
    ${panel('المواعيد القادمة', table([
      { h: 'التاريخ', f: r => dt(r.event_date) }, { h: 'النوع', f: r => ({ meeting: 'اجتماع', task: 'مهمة', deadline: 'موعد إغلاق', visit: 'زيارة' })[r.kind] }, { h: 'العنوان', f: r => r.title },
    ], cal.data || [], 'لا توجد مواعيد قادمة'))}
  </div>`;
};

// ===== الدورات =====
const cycleFields = (gv) => [
  { k: 'name', l: 'اسم الدورة', req: 1, ph: 'الدورة الأولى' }, { k: 'school_year', l: 'السنة الدراسية', req: 1, ph: '1447/1448' },
  { k: 'start_date', l: 'تاريخ البداية', t: 'date' }, { k: 'end_date', l: 'تاريخ النهاية', t: 'date' },
  { k: 'coordinator_id', l: 'منسق الدورة', t: 'select', o: staffOpts() },
  ...(gv ? [{ k: 'guide_version_id', l: 'إصدار الدليل المرجعي', t: 'select', o: gv.map(g => [g.id, `${g.edition} ${g.hijri_year}هـ`]), req: 1 }] : []),
];
Pages.cycles = async () => {
  const gv = await must(sb.from('guide_versions').select('*'));
  const coord = isCoord();
  const demo = coord ? (await sb.rpc('demo_status')).data : null;
  const demoPanel = !coord ? '' : panel('البيانات التجريبية', h`<p>${demo?.exists ? 'توجد دورة تجريبية مليئة ببيانات للمعاينة (مؤشرات، تقييمات، شواهد، زيارات فنية، مهام، مواعيد). هي غير منشورة ولا تظهر في الموقع العام.' : 'لا توجد بيانات تجريبية. يمكنك تعبئة دورة تجريبية منفصلة لمعاينة الصفحات كاملة، وتُحذف كلها بزر واحد.'}</p>
    <div class="chips">${demo?.exists ? h`${btn('عرض الدورة التجريبية', 'demoView', { id: demo.cycle_id }, 'pri')}${btn('حذف البيانات التجريبية', 'demoClear', {}, 'bad')}` : btn('تعبئة بيانات تجريبية', 'demoSeed', {}, 'pri')}</div>
    <small class="muted">الحذف يزيل الدورة التجريبية وكل ما فيها، والموظفين التجريبيين، والشواهد المقترحة التجريبية فقط. الدورة الحقيقية لا تُمسّ. يبقى أثر العملية في سجل النشاط.</small>`);
  return h`${pageHead('دورات التقويم الذاتي', coord ? btn('+ دورة جديدة', 'cycNew', {}, 'pri') : '')}
  <div class="pn">${table([
    { h: 'الدورة', f: c => h`<b>${c.name}</b><br><small class="muted">${c.school_year}</small>` },
    { h: 'الحالة', f: c => sb_('cycle', c.status) }, { h: 'الفترة', f: c => `${dt(c.start_date)} ← ${dt(c.end_date)}` },
    { h: 'المنسق', f: c => staffName(c.coordinator_id) },
    { h: 'الدليل', f: c => { const g = gv.find(x => x.id === c.guide_version_id); return g ? `${g.edition} ${g.hijri_year}هـ` : '—'; } },
    { h: 'النتائج', f: c => c.results_published ? badge('منشورة', 'ok') : badge('غير منشورة') },
    { h: '', f: c => !coord ? '' : h`<div class="chips">${btn('تعديل', 'cycEdit', { id: c.id })}
      ${c.status !== 'active' ? btn(c.status === 'closed' ? 'إعادة فتح' : c.status === 'paused' ? 'استئناف' : 'إطلاق', 'cycSet', { id: c.id, st: 'active' }, 'pri') : btn('إيقاف مؤقت', 'cycSet', { id: c.id, st: 'paused' })}
      ${c.status !== 'closed' ? btn('إغلاق', 'cycSet', { id: c.id, st: 'closed' }) : ''}
      ${btn(c.results_published ? 'إلغاء النشر' : 'نشر النتائج', 'cycPub', { id: c.id, v: c.results_published ? '' : '1' })}</div>` },
  ], S.cycles, 'لا توجد دورات. ابدأ بإنشاء الدورة الأولى.')}</div>
  <p class="muted">كل دورة لها تقييماتها وشواهدها ومهامها المستقلة، ولا تُنقل تلقائياً بين الدورات. المجالات والمعايير والمؤشرات مرجع مشترك مثبّت بإصدار الدليل.</p>
  ${demoPanel}`;
};
const demoRefresh = async () => { await Promise.all([App.reloadCycles(), App.reloadStaff()]); try { await App.ref(true); } catch {} App.refresh(); };
Act.demoSeed = async () => {
  if (!await sure('ستُنشأ دورة تجريبية منفصلة غير منشورة مع موظفين وتقييمات وشواهد وزيارات ومهام تجريبية. المتابعة؟')) return;
  const { error } = await sb.rpc('seed_demo_data'); if (error) return toast(App.errMsg(error), true);
  toast('تمت تعبئة البيانات التجريبية'); await demoRefresh();
};
Act.demoView = async ({ id }) => { S.cid = id; try { localStorage.setItem('cyc', id); } catch {} await App.reloadCycles(); location.hash = '#dashboard'; };
Act.demoClear = async () => {
  if (!await sure('سيُحذف كل ما هو تجريبي: الدورة التجريبية وتقييماتها وشواهدها وزياراتها ومهامها، والموظفون والشواهد المقترحة التجريبية. الدورة الحقيقية لا تتأثر. المتابعة؟')) return;
  const { data, error } = await sb.rpc('clear_demo_data'); if (error) return toast(App.errMsg(error), true);
  toast(data?.staff_kept_inactive ? `حُذفت البيانات التجريبية، وعُطّل ${data.staff_kept_inactive} موظف لاستخدامه خارج الدورة التجريبية` : 'حُذفت البيانات التجريبية');
  try { if (!S.cycles.find(c => c.id === localStorage.getItem('cyc'))) localStorage.removeItem('cyc'); } catch {}
  await App.reloadCycles(); await demoRefresh();
};
Act.cycNew = async () => {
  const gv = await must(sb.from('guide_versions').select('*'));
  const v = await ask('دورة تقويم جديدة', cycleFields(gv), { guide_version_id: gv[0]?.id, coordinator_id: S.me.staff_id });
  if (!v) return; if (await run(sb.from('cycles').insert({ ...v, status: 'draft' }), 'أُنشئت الدورة')) { await App.reloadCycles(); App.refresh(); }
};
Act.cycEdit = async ({ id }) => {
  const c = S.cycles.find(x => x.id === id); const v = await ask('تعديل الدورة', cycleFields(null), c); if (!v) return;
  if (await run(sb.from('cycles').update(v).eq('id', id), 'حُفظت')) { await App.reloadCycles(); App.refresh(); }
};
Act.cycSet = async ({ id, st }) => {
  if (st === 'closed' && !await sure('إغلاق الدورة يمنع تعديل التقييمات. متابعة؟')) return;
  if (await run(sb.from('cycles').update({ status: st }).eq('id', id), 'تم تغيير حالة الدورة')) { await App.reloadCycles(); App.refresh(); }
};
Act.cycPub = async ({ id, v }) => {
  if (v && !await sure('سيرى الزائر التقييمات المعتمدة وحدها (المبررات والنسب). متابعة النشر؟')) return;
  if (await run(sb.from('cycles').update({ results_published: !!v }).eq('id', id), v ? 'نُشرت النتائج' : 'أُلغي النشر')) { await App.reloadCycles(); App.refresh(); }
};

// ===== المنسوبون والحسابات =====
const staffFields = [{ k: 'full_name', l: 'الاسم الكامل', req: 1 }, { k: 'job_title', l: 'المسمى الوظيفي' }, { k: 'phone', l: 'رقم الجوال (واتساب)', ph: '9665xxxxxxxx', hint: 'بصيغة دولية بلا + أو أصفار' },
  { k: 'whatsapp_opt_in', l: 'موافق على استقبال رسائل واتساب', t: 'checkbox' }, { k: 'is_active', l: 'على رأس العمل', t: 'checkbox', def: true }];
const genPw = () => { const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = crypto.getRandomValues(new Uint32Array(14)); return [...r].map(x => a[x % a.length]).join('') + '#7'; };
// عند رفض الخادم (400/403) يُعيد supabase-js الخطأ بلا جسم الرد؛ نقرأ رسالة الدالة من الاستجابة ليراها المنسق
const fn = async (body) => {
  const { data, error } = await sb.functions.invoke('admin-users', { body });
  if (error) { let m = 'تعذّر تنفيذ العملية'; try { const j = await error.context.json(); if (j?.error) m = j.error; } catch {} toast(m, true); return null; }
  if (data?.error) { toast(data.error, true); return null; }
  return data;
};
const unameField = { k: 'username', l: 'اسم المستخدم (أو رقم الهوية)', req: 1, ph: 'مثال: ahmed.a', hint: 'حروف لاتينية صغيرة أو أرقام أو . _ - (3 إلى 40 حرفاً، بلا مسافات). يدخل به المستخدم بدل البريد.' };
Pages.staff = async () => {
  const [prof] = await Promise.all([must(sb.from('profiles').select('*')), App.reloadStaff()]);
  const pm = Object.fromEntries(prof.filter(p => p.staff_id).map(p => [p.staff_id, p]));
  const ext = prof.filter(p => p.role === 'external_evaluator');
  return h`${pageHead('المنسوبون والحسابات', btn('+ منسوب', 'stNew', {}, 'pri'))}
  ${panel('منسوبو المدرسة', table([
    { h: 'الاسم', f: s => h`<b>${s.full_name}</b><br><small class="muted">${s.job_title || ''}</small>` }, { h: 'الجوال', f: s => h`<span dir="ltr">${s.phone || '—'}</span>` },
    { h: 'واتساب', f: s => s.whatsapp_opt_in ? badge('موافق', 'ok') : badge('—') },
    { h: 'الحالة', f: s => s.is_active ? badge('على رأس العمل', 'ok') : badge('غير نشط') },
    { h: 'الحساب', f: s => { const p = pm[s.id]; return p ? h`${badge(L.role[p.role], 'info')} ${p.is_active ? '' : badge('موقوف', 'bad')}${p.username ? h`<br><small class="muted">اسم المستخدم: <span dir="ltr">${p.username}</span></small>` : ''}` : h`<span class="muted">بلا حساب</span>`; } },
    { h: '', f: s => { const p = pm[s.id]; return h`<div class="chips">${btn('تعديل', 'stEdit', { id: s.id })}
      ${p ? h`${btn('كلمة مرور', 'acPw', { id: p.id })} ${btn(p.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب', 'acToggle', { id: p.id, v: p.is_active ? '' : '1' })}` : btn('إنشاء حساب', 'acNew', { sid: s.id }, 'pri')}</div>`; } },
  ], S.staff, 'أضف منسوبي المدرسة (المسؤولون عن المؤشرات لا يحتاجون حساباً).'))}
  ${panel('حسابات المقيمين الخارجيين', table([
    { h: 'الاسم', f: p => p.display_name || '—' }, { h: 'اسم المستخدم', f: p => h`<span dir="ltr">${p.username || '—'}</span>` }, { h: 'الحالة', f: p => p.is_active ? badge('مفعّل', 'ok') : badge('موقوف', 'bad') },
    { h: '', f: p => h`<div class="chips">${btn('كلمة مرور', 'acPw', { id: p.id })} ${btn(p.is_active ? 'إيقاف' : 'تفعيل', 'acToggle', { id: p.id, v: p.is_active ? '' : '1' })}</div>` },
  ], ext, 'لا يوجد مقيم خارجي'), btn('+ مقيم خارجي', 'acExt', {}, 'pri'))}
  <p class="muted">الأدوار: منسق، عضو فريق، مدير المدرسة، مراجع (دخول اللوحة)؛ مقيم خارجي (دخول الموقع العام فقط). المسؤول عن مؤشر لا يحتاج حساباً ويصله رابط خاص.</p>`;
};
Act.stNew = async () => { const v = await ask('منسوب جديد', staffFields); if (v && await run(sb.from('staff').insert(v), 'أُضيف المنسوب')) { await App.reloadStaff(); App.refresh(); } };
Act.stEdit = async ({ id }) => { const v = await ask('تعديل المنسوب', staffFields, S.staff.find(s => s.id === id)); if (v && await run(sb.from('staff').update(v).eq('id', id), 'حُفظ')) { await App.reloadStaff(); App.refresh(); } };
Act.acNew = async ({ sid }) => {
  const v = await ask(`إنشاء حساب: ${staffName(sid)}`, [
    unameField, { k: 'role', l: 'الدور', t: 'select', req: 1, o: [['team_member', L.role.team_member], ['coordinator', L.role.coordinator], ['principal', L.role.principal], ['reviewer', L.role.reviewer]] },
    { k: 'password', l: 'كلمة مرور مؤقتة', req: 1, def: genPw(), hint: 'سجّلها وسلّمها للمستخدم؛ لا تُعرض مرة أخرى' }], { role: 'team_member' }, { submit: 'إنشاء الحساب' });
  if (!v) return; const r = await fn({ action: 'create_user', ...v, staff_id: sid, display_name: staffName(sid) });
  if (r) { App.modal('تم إنشاء الحساب', h`<p>اسم المستخدم: <b dir="ltr">${r.login}</b></p><p>كلمة المرور المؤقتة: <b dir="ltr">${v.password}</b></p><p class="muted">انسخها الآن؛ لن تظهر مرة أخرى.</p>`); App.refresh(); }
};
Act.acExt = async () => {
  const v = await ask('حساب مقيم خارجي', [{ k: 'display_name', l: 'الاسم' }, unameField, { k: 'password', l: 'كلمة مرور مؤقتة', req: 1, def: genPw() }], {}, { submit: 'إنشاء الحساب' });
  if (!v) return; const r = await fn({ action: 'create_user', ...v, role: 'external_evaluator' });
  if (r) { App.modal('تم إنشاء الحساب', h`<p>اسم المستخدم: <b dir="ltr">${r.login}</b></p><p>كلمة المرور المؤقتة: <b dir="ltr">${v.password}</b></p><p class="muted">انسخها الآن؛ لن تظهر مرة أخرى.</p>`); App.refresh(); }
};
Act.acToggle = async ({ id, v }) => { if (await fn({ action: 'set_active', id, active: !!v })) { toast('تم'); App.refresh(); } };
Act.acPw = async ({ id }) => { const v = await ask('كلمة مرور جديدة', [{ k: 'password', l: 'كلمة المرور', req: 1, def: genPw() }]); if (v && await fn({ action: 'reset_password', id, password: v.password })) App.modal('تم التغيير', h`<p>كلمة المرور الجديدة: <b dir="ltr">${v.password}</b></p>`); };

// ===== المسؤوليات =====
Pages.assign = async (a) => {
  const nc = needCycle(); if (nc) return nc;
  const ref = await App.ref();
  const [da, ia] = await Promise.all([
    must(sb.from('domain_assignments').select('*').eq('cycle_id', S.cid)),
    must(sb.from('indicator_assignments').select('*').eq('cycle_id', S.cid)),
  ]);
  const sid = a[0] || '';
  let mine = [];
  if (sid) mine = (await must(sb.from('staff_responsibilities').select('*').eq('cycle_id', S.cid).eq('staff_id', sid))).sort((x, y) => codeCmp(x.code, y.code));
  const chips = (list, kind, iid) => h`<div class="chips">${list.filter(x => x.kind === kind).map(x => h`<span class="chip2">${staffName(x.staff_id)}${x.due_date ? h` <small>${dt(x.due_date)}</small>` : ''} <button data-a="asDel" data-t="indicator_assignments" data-id="${x.id}" aria-label="إزالة">✕</button></span>`)}${btn('+', 'asAdd', { iid, kind })}</div>`;
  return h`${pageHead('إدارة المسؤوليات')}
  ${panel('ملف مسؤوليات منسوب', h`<div class="flt"><label>المنسوب <select id="asPick"><option value="">اختر…</option>${S.staff.map(s => h`<option value="${s.id}" ${s.id === sid ? raw('selected') : ''}>${s.full_name}</option>`)}</select></label></div>
    ${sid ? h`<h3 style="margin:8px 0">${staffName(sid)}: ${nf(mine.length)} مؤشراً</h3>${table([
      { h: 'الرمز', f: r => h`<a href="#ind/${r.indicator_id}" dir="ltr">${r.code}</a>` }, { h: 'نص المؤشر', f: r => r.official_text }, { h: 'الدور', f: r => badge(L.kind[r.kind], r.kind === 'responsible' ? 'warn' : 'info') },
      { h: 'عبر', f: r => r.via === 'domain' ? 'المجال' : 'المؤشر' }, { h: '', f: r => r.kind === 'responsible' ? btn('رابط وصول', 'asLink', { iid: r.indicator_id, sid }) : '' },
    ], mine, 'لا توجد مسؤوليات في هذه الدورة')}
    <div class="pa noprint" style="margin-top:10px">${btn('طباعة', 'print')} ${btn('تصدير CSV', 'asCsv', { sid })}</div>` : h`<p class="muted">اختر منسوباً لعرض ما أُسند إليه عبر المجالات الأربعة.</p>`}`)}
  ${panel('إسناد المجالات', h`${table([
    { h: 'المجال', f: r => ref.dm[r.domain_id]?.name_ar }, { h: 'المنسوب', f: r => staffName(r.staff_id) }, { h: 'الدور', f: r => L.kind[r.kind] },
    { h: '', f: r => btn('إزالة', 'asDel', { t: 'domain_assignments', id: r.id }, 'bad') }], da, 'لا توجد إسنادات مجالات')}`, btn('+ إسناد مجال', 'asDom', {}, 'pri'))}
  ${panel('إسناد المؤشرات', table([
    { h: 'الرمز', f: i => h`<a href="#ind/${i.id}" dir="ltr">${i.code}</a>` }, { h: 'المؤشر', f: i => App.short(i.official_text, 70) },
    { h: 'المسؤولون', f: i => chips(ia.filter(x => x.indicator_id === i.id), 'responsible', i.id) }, { h: 'المقيّمون', f: i => chips(ia.filter(x => x.indicator_id === i.id), 'evaluator', i.id) },
  ], ref.inds), h`<small class="muted">المسؤول يوفّر المعلومات والشواهد ولا يقيّم؛ المقيّم عضو في فريق التقويم.</small>`)}`;
  // (الربط بعد الرسم أدناه)
};
const origAssign = Pages.assign;
Pages.assign = async (a) => { const r = await origAssign(a); return { html: r, after: v => { const s = $('#asPick', v); if (s) s.onchange = () => { location.hash = '#assign/' + s.value; }; } }; };
Act.asDom = async () => {
  const ref = await App.ref(); const v = await ask('إسناد مجال', [{ k: 'domain_id', l: 'المجال', t: 'select', req: 1, o: ref.domains.map(d => [d.id, d.name_ar]) }, { k: 'staff_id', l: 'المنسوب', t: 'select', req: 1, o: staffOpts() }, { k: 'kind', l: 'الدور', t: 'select', req: 1, o: Object.entries(L.kind) }], { kind: 'evaluator' });
  if (v && await run(sb.from('domain_assignments').insert({ ...v, cycle_id: S.cid }), 'أُسند المجال')) App.refresh();
};
Act.asAdd = async ({ iid, kind }) => {
  const f = [{ k: 'staff_id', l: kind === 'evaluator' ? 'المقيّم (عضو فريق التقويم)' : 'المسؤول', t: 'select', req: 1, o: staffOpts() }];
  if (kind === 'responsible') f.push({ k: 'due_date', l: 'الموعد النهائي لتوفير الشواهد', t: 'date' });
  const v = await ask(kind === 'evaluator' ? 'إضافة مقيّم' : 'إضافة مسؤول', f); if (!v) return;
  if (await run(sb.from('indicator_assignments').insert({ ...v, cycle_id: S.cid, indicator_id: iid, kind }), 'تم الإسناد')) App.refresh();
};
Act.asDel = async ({ t, id }) => { if (await sure('إزالة هذا الإسناد؟') && await run(sb.from(t).delete().eq('id', id), 'أُزيل')) App.refresh(); };
Act.asCsv = async ({ sid }) => {
  const rs = await must(sb.from('staff_responsibilities').select('*').eq('cycle_id', S.cid).eq('staff_id', sid));
  csv('مسؤوليات-' + staffName(sid), [{ h: 'الرمز', x: r => r.code }, { h: 'نص المؤشر', x: r => r.official_text }, { h: 'الدور', x: r => L.kind[r.kind] }], rs.sort((a, b) => codeCmp(a.code, b.code)));
};
Act.asLink = async ({ iid, sid }) => {
  const { data, error } = await sb.rpc('create_access_link', { p_cycle: S.cid, p_indicator: iid, p_staff: sid, p_days: 30 });
  if (error) return toast(App.errMsg(error), true);
  const url = new URL('access.html#' + data, location.href.replace(/admin\.html.*$/, '')).href;
  App.modal('رابط وصول المسؤول', h`<p>رابط للاطلاع على تفاصيل المؤشر دون حساب (قراءة فقط، صالح 30 يوماً):</p><input readonly value="${url}" dir="ltr" style="width:100%;padding:8px" onclick="this.select()"><p class="muted">لا يُحفظ الرابط في النظام؛ انسخه الآن. إنشاء رابط جديد يُبقي القديم صالحاً حتى انتهائه.</p>`);
};
})();
