/* إدارة الفريق: صفحة واحدة تجمع الأعضاء والحسابات والإسناد والمهام والاجتماعات والزيارات والإعلانات والمواعيد.
   تغلّف الصفحات القائمة بتبويبات (لا تكرّر منطقها)، وتضيف «نظرة عامة» تفحص جاهزية الفريق من بيانات الدورة.
   تُحمَّل بعد admin-dashboard.js وقبل admin.js. */
(() => {
const { h, raw, S, L, nf, dt, staffName, badge, btn, table, panel, isCoord, role } = App;
const MS = 864e5, pad = n => String(n).padStart(2, '0');
const tod = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dayDiff = s => Math.round((new Date(String(s).slice(0, 10) + 'T00:00:00') - new Date(tod() + 'T00:00:00')) / MS);
const pctOf = (a, b) => b ? Math.round(a / b * 100) : 0;
const CO = ['coordinator'], CP = ['coordinator', 'principal'], CPR = ['coordinator', 'principal', 'reviewer'];
const TABS = [['overview', 'نظرة عامة', '*', 'ما يتطلب قراراً أو تنفيذاً من الفريق الآن: الأجندة القادمة ولوحة المهام والزيارات.'], ['tasks', 'المهام والتكليفات', '*', 'اقتراح المهام واعتمادها وتكليف الأعضاء ومتابعة التنفيذ وإغلاقها.'], ['meetings', 'الاجتماعات', '*', 'جدولة الاجتماعات والدعوات وتأكيد الحضور والحضور الفعلي والمحاضر والقرارات.'], ['visits', 'الزيارات الفنية', '*', 'زيارات المؤشرات وبطاقاتها الفنية والتوصيات ومتابعة الإجراءات التحسينية.'], ['cal', 'المواعيد والتقويم', '*', 'تقويم موحّد للاجتماعات والمهام والمواعيد النهائية لإغلاق المجالات والمؤشرات.']];
const PLAT = [['staff', 'الأعضاء والحسابات', CO, 'منسوبو المدرسة وحسابات الدخول والأدوار وبيانات التواصل.'], ['assign', 'الإسناد والمسؤوليات', CP, 'إسناد المجالات والمؤشرات للمسؤولين والمقيّمين وملف مسؤوليات كل شخص.'], ['ann', 'الإعلانات', '*', 'إعلانات الفريق ودرجة أهميتها والمستلمون ومن اطّلع عليها.'], ['cycles', 'دورات التقويم', CPR, 'إنشاء الدورات وإطلاقها وإيقافها وإغلاقها مع حفظ سجلّ الدورات السابقة.'], ['wa', 'واتساب', CO, 'إعدادات الإشعارات وقوالب الرسائل وسجل الإرسال ونجاحه أو فشله.']];
const ok = r => r === '*' || r.includes(role());
App.TEAM_TABS = TABS.map(t => t[0]).filter(t => t !== 'overview');
App.PLATFORM_TABS = PLAT.map(t => t[0]);
App.teamTabAllowed = t => { const x = [...TABS, ...PLAT].find(y => y[0] === t); return !x || ok(x[2]); };

/* ===== فحوص الجاهزية: كل بند محسوب من بيانات حقيقية ===== */
function readiness(D) {
  const { ref, resp } = D, accounts = new Map(D.profs.filter(p => p.staff_id && p.role !== 'external_evaluator').map(p => [p.staff_id, p]));
  const st = id => S.staff.find(s => s.id === id), names = ids => [...ids].map(id => st(id)?.full_name).filter(Boolean);
  const kindSet = k => new Set(resp.filter(r => r.kind === k).map(r => r.staff_id));
  const evS = kindSet('evaluator'), rsS = kindSet('responsible'), assigned = new Set([...evS, ...rsS]);
  const canSeeAcc = isCoord() || role() === 'principal';
  const hasEv = new Set(resp.filter(r => r.kind === 'evaluator').map(r => r.indicator_id)), hasRs = new Set(resp.filter(r => r.kind === 'responsible').map(r => r.indicator_id));
  const rows = [];
  const add = (key, label, why, items, tab, go) => rows.push({ key, label, why, items, tab, go, bad: items.length > 0 });
  if (canSeeAcc) add('evnoacc', 'مقيّمون بلا حساب دخول', 'المقيّم يسجّل تقييمه من لوحة التحكم، فلا بد من حساب له.', names([...evS].filter(id => !accounts.has(id) && st(id)?.is_active)), 'staff', 'إنشاء الحساب');
  if (canSeeAcc) add('inactive', 'إسنادات لمنسوبين غير على رأس العمل', 'أعد إسناد مؤشراتهم لمن هو على رأس العمل.', names([...assigned].filter(id => st(id) && !st(id).is_active)), 'assign', 'إعادة الإسناد');
  add('wa', 'مسؤولون ومقيّمون لا تصلهم رسائل واتساب', 'لا جوال مسجّل أو لا موافقة على الاستقبال.', names([...assigned].filter(id => st(id)?.is_active && (!st(id).phone || !st(id).whatsapp_opt_in))), 'staff', 'تحديث البيانات');
  add('noev', 'مؤشرات بلا مقيّم', 'لا يمكن تقييم مؤشر لم يُسنَد إلى مقيّم.', ref.inds.filter(i => !hasEv.has(i.id)).map(i => i.code), 'assign', 'إسناد مقيّم');
  add('nors', 'مؤشرات بلا مسؤول', 'لا أحد مكلّف بتوفير شواهدها.', ref.inds.filter(i => !hasRs.has(i.id)).map(i => i.code), 'assign', 'إسناد مسؤول');
  if (canSeeAcc) add('idle', 'أعضاء بحساب بلا أي إسناد', 'عضو فريق مفعّل لم يُسنَد إليه مؤشر.', names([...accounts].filter(([id, p]) => p.is_active && p.role === 'team_member' && !assigned.has(id)).map(([id]) => id)), 'assign', 'إسناد مؤشرات');
  return rows;
}

/* ===== أداء الأعضاء ===== */
function teamRows(D) {
  const by = {}, slot = s => (by[s] ||= { ev: new Set(), rs: new Set() }), acc = new Map(D.profs.filter(p => p.staff_id).map(p => [p.staff_id, p]));
  D.resp.forEach(r => (r.kind === 'evaluator' ? slot(r.staff_id).ev : slot(r.staff_id).rs).add(r.indicator_id));
  D.tasks.filter(t => t.approval === 'approved' && t.assignee_staff_id).forEach(t => slot(t.assignee_staff_id));
  D.profs.filter(p => p.staff_id && p.is_active && p.role === 'team_member').forEach(p => slot(p.staff_id));
  return Object.entries(by).map(([id, o]) => {
    const s = S.staff.find(x => x.id === id); if (!s) return null;
    const ev = [...o.ev], tk = D.tasks.filter(t => t.approval === 'approved' && t.assignee_staff_id === id), cn = k => ev.filter(i => D.om[i]?.eval_status === k).length;
    return { id, s, acc: acc.get(id), ne: ev.length, nr: o.rs.size, a: cn('approved'), sb: cn('submitted'),
      open: tk.filter(t => !['completed', 'cancelled'].includes(t.status)).length, done: tk.filter(t => t.status === 'completed').length,
      late: tk.filter(t => !['completed', 'cancelled'].includes(t.status) && t.due_date && dayDiff(t.due_date) < 0).length };
  }).filter(Boolean).sort((x, y) => y.late - x.late || y.sb - x.sb || x.s.full_name.localeCompare(y.s.full_name, 'ar'));
}

/* ===== النظرة العامة: لوحة متابعة تشغيلية (ماذا عندنا وما الذي يحتاج حركة)، لا إحصاءات ===== */
const dueTxt = s => { const n = dayDiff(s); return n < 0 ? `متأخر ${nf(-n)} يوم` : n === 0 ? 'اليوم' : n === 1 ? 'غداً' : `بعد ${nf(n)} أيام`; };
const longDate = s => new Date(String(s).slice(0, 10) + 'T00:00:00').toLocaleDateString('ar-SA-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' });
const DAYS = [['late', 'متأخر', d => d < 0], ['today', 'اليوم', d => d === 0], ['tomorrow', 'غداً', d => d === 1], ['week', 'هذا الأسبوع', d => d >= 2 && d <= 7], ['month', 'خلال شهر', d => d >= 8 && d <= 30]];
const act = (label, a, data, cls) => ({ label, a, data, cls }), lnk = (label, href, cls) => ({ label, href, cls });

function agenda(D) {
  const co = isCoord(), pr = role() === 'principal', rv = role() === 'reviewer', mgr = co || pr || rv, me = S.me.staff_id, out = [];
  const mine = new Set(D.resp.filter(r => r.staff_id === me).map(r => r.indicator_id));
  const domInds = Object.fromEntries(D.ref.domains.map(d => [d.id, D.ref.inds.filter(i => i.dom?.id === d.id).map(i => i.id)]));
  const put = (d, time, kind, tone, title, sub, acts) => out.push({ d: String(d).slice(0, 10), time: time ? String(time).slice(0, 5) : '', kind, tone, title, sub, acts });
  D.meetings.filter(m => m.status === 'scheduled').forEach(m => {
    const iv = D.inv.filter(i => i.meeting_id === m.id), my = iv.find(i => i.staff_id === me && i.rsvp === 'pending'), past = dayDiff(m.meeting_date) < 0;
    put(m.meeting_date, m.start_time, 'اجتماع', past ? 'bad' : 'info', m.title, past ? 'مضى موعده ولم تُحدَّث حالته (عُقد / ملغى)' : `${m.location || 'المكان غير محدد'} · أكّد ${nf(iv.filter(i => i.rsvp === 'confirmed').length)} من ${nf(iv.length)} مدعواً${iv.some(i => i.rsvp === 'declined') ? ' · اعتذر ' + nf(iv.filter(i => i.rsvp === 'declined').length) : ''}`,
      [...(my && !past ? [act('سأحضر', 'dbRsvp', { i: my.id, v: 'confirmed' }, 'pri'), act('أعتذر', 'dbRsvp', { i: my.id, v: 'declined' })] : []), lnk('فتح الاجتماع', '#meeting/' + m.id)]);
  });
  D.vis.filter(v => v.status === 'planned').forEach(v => { const past = dayDiff(v.visit_date) < 0, n = D.cards.filter(c => c.visit_id === v.id).length;
    put(v.visit_date, null, 'زيارة فنية', past ? 'bad' : 'info', v.target_party, past ? 'مضى موعدها ولم تُحدَّث حالتها (تمت / ملغاة)' : `${nf(n)} بطاقة مؤشر مجهّزة`, [lnk('فتح الزيارة', '#visit/' + v.id)]); });
  D.cards.filter(c => c.followup !== 'closed' && c.due_date && (mgr || c.responsible_staff_id === me)).forEach(c =>
    put(c.due_date, null, 'متابعة زيارة', dayDiff(c.due_date) < 0 ? 'bad' : 'warn', `${D.ref.im[c.indicator_id]?.code || ''} — ${App.short(c.required_actions || c.recommendations || 'متابعة زيارة فنية', 70)}`, `${D.vis.find(v => v.id === c.visit_id)?.target_party || ''} · ${staffName(c.responsible_staff_id)}`, [lnk('فتح الزيارة', '#visit/' + c.visit_id)]));
  D.tasks.filter(t => t.approval === 'approved' && !['completed', 'cancelled'].includes(t.status) && t.due_date && (co || pr || rv || t.assignee_staff_id === me)).forEach(t => {
    const own = t.assignee_staff_id === me, acts = [];
    if (co && t.status === 'awaiting_review') acts.push(act('اعتماد الإغلاق', 'dbTkClose', { i: t.id }, 'pri'), act('إعادة للتنفيذ', 'dbTkReopen', { i: t.id }));
    else if (own) { if (['new', 'overdue'].includes(t.status)) acts.push(act('بدء', 'dbTkStart', { i: t.id })); if (t.status !== 'awaiting_review') acts.push(act('إرسال للمراجعة', 'dbTkSubmit', { i: t.id }, 'pri')); }
    if (!acts.length) acts.push(lnk('فتح المهام', '#team/tasks'));
    put(t.due_date, null, 'مهمة', dayDiff(t.due_date) < 0 ? 'bad' : t.status === 'awaiting_review' ? 'warn' : 'info', t.title, `${L.task[t.status]} · ${staffName(t.assignee_staff_id)}`, acts);
  });
  D.dls.forEach(d => {
    const rel = mgr || (d.kind === 'indicator_close' ? mine.has(d.indicator_id) : (domInds[d.domain_id] || []).some(i => mine.has(i)));
    const unfinished = d.kind === 'indicator_close' ? D.om[d.indicator_id]?.eval_status !== 'approved' : (domInds[d.domain_id] || []).some(i => D.om[i]?.eval_status !== 'approved');
    if (rel && unfinished) put(d.due_date, null, 'إغلاق', dayDiff(d.due_date) < 0 ? 'bad' : 'warn', d.title, 'موعد إغلاق لم يكتمل ما يتعلق به', [lnk('المواعيد', '#team/cal')]);
  });
  return out.sort((a, b) => a.d.localeCompare(b.d) || a.time.localeCompare(b.time));
}
function agendaSections(items) {
  return DAYS.map(([k, label, f]) => { const xs = items.filter(x => f(dayDiff(x.d))); return xs.length ? h`<section class="tm-day ${k}"><h3>${label}${k === 'today' || k === 'tomorrow' ? h` <small>${longDate(xs[0].d)}</small>` : ''}</h3>
    <ul class="tm-ul">${xs.map(x => h`<li class="db-it ${x.tone}"><div class="db-itx"><b><span class="bdg ${x.tone === 'bad' ? 'bad' : x.kind === 'مهمة' || x.kind === 'إغلاق' || x.kind === 'متابعة زيارة' ? 'warn' : 'info'}">${x.kind}</span> ${x.title}</b><small>${k === 'late' || k === 'week' || k === 'month' ? dt(x.d) + ' · ' : ''}${x.time ? x.time + ' · ' : ''}${x.sub}</small></div><div class="chips">${x.acts.map(a => a.href ? h`<a class="btn sm ${a.cls || ''}" href="${a.href}">${a.label}</a>` : btn(a.label, a.a, a.data || {}, a.cls || ''))}</div></li>`)}</ul></section>` : ''; });
}
App.agendaHtml = (D, days) => { const xs = agenda(D).filter(x => dayDiff(x.d) <= days); return xs.length ? agendaSections(xs) : null; };
const KCOL = [['new', 'جديدة'], ['in_progress', 'قيد التنفيذ'], ['awaiting_review', 'بانتظار المراجعة'], ['late', 'متأخرة']];

async function overview() {
  const nc = App.needCycle(); if (nc) return nc;
  const [D, A] = await Promise.all([App.data(), App.alerts()]);
  const co = isCoord(), pr = role() === 'principal', me = S.me.staff_id, mgr = co || pr || role() === 'reviewer';
  const ag = agenda(D), shown = ag.filter(x => dayDiff(x.d) <= 30);
  // ما ينتظر قرارك (المنسق) أو ما يخصّك (العضو): عمليات الفريق فقط (مهام واجتماعات ومحاضر)؛ مراجعة الشواهد واعتماد التقييم في صفحتيهما
  const keys = co ? ['tprop', 'trev', 'min'] : ['mytask', 'rsvp'];
  const gs = A.groups.filter(g => keys.includes(g.key));
  // لوحة المهام: المهام النشطة المعتمدة
  const tk = D.tasks.filter(t => t.approval === 'approved' && !['completed', 'cancelled'].includes(t.status) && (mgr || t.assignee_staff_id === me));
  const isLate = t => t.status === 'overdue' || (t.due_date && dayDiff(t.due_date) < 0);
  const colOf = t => isLate(t) ? 'late' : t.status === 'overdue' ? 'late' : t.status;
  const card = t => h`<a class="tm-kc ${isLate(t) ? 'bad' : ''}" href="#team/tasks"><b>${t.title}</b><small>${staffName(t.assignee_staff_id)}${t.due_date ? ' · ' + dueTxt(t.due_date) : ' · بلا موعد'}</small></a>`;
  const vplan = D.vis.filter(v => v.status === 'planned').sort((a, b) => a.visit_date.localeCompare(b.visit_date));
  const rows = teamRows(D);
  const quick = co ? h`<div class="tm-quick"><a class="btn sm pri" href="#team/tasks">+ مهمة</a><a class="btn sm pri" href="#team/meetings">+ اجتماع</a><a class="btn sm pri" href="#team/visits">+ زيارة فنية</a><a class="btn sm" href="#team/cal">+ موعد إغلاق</a></div>` : '';
  return h`${quick}
  ${gs.length ? panel(co ? 'ينتظر قرارك الآن' : 'يخصّك الآن', h`<div class="db-ac">${gs.map(g => App.groupCard(g, 4))}</div>`, h`<a class="btn sm" href="#alerts">كل التنبيهات</a>`) : ''}
  ${panel('الأجندة: ما هو قادم', shown.length ? agendaSections(shown) : h`<p class="muted empty">لا اجتماعات ولا زيارات ولا مواعيد ولا مهام ذات موعد خلال الشهر القادم.</p>`)}
  ${panel(co ? 'متابعة المهام' : 'مهامي', tk.length ? h`<div class="tm-kb">${KCOL.map(([k, l]) => { const xs = tk.filter(t => colOf(t) === k).sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9'));
      return h`<div class="tm-kcol ${k}"><h3>${l}${xs.length ? h` <span class="bdg ${k === 'late' ? 'bad' : ''}">${nf(xs.length)}</span>` : ''}</h3>${xs.length ? xs.slice(0, 6).map(card) : h`<p class="muted">—</p>`}${xs.length > 6 ? h`<a class="db-more" href="#team/tasks">+ ${nf(xs.length - 6)} أخرى</a>` : ''}</div>`; })}</div>` : h`<p class="muted empty">لا مهام نشطة${co ? '. أنشئ مهمة أو راجع مقترحات الأعضاء من تبويب المهام' : ''}.</p>`, h`<a class="btn sm" href="#team/tasks">كل المهام</a>`)}
  ${panel('الزيارات الفنية القادمة', vplan.length ? h`<ul class="tm-ul">${vplan.slice(0, 6).map(v => { const cs = D.cards.filter(c => c.visit_id === v.id); return h`<li class="db-it ${dayDiff(v.visit_date) < 0 ? 'bad' : 'info'}"><div class="db-itx"><b>${v.target_party}</b><small>${dt(v.visit_date)} · ${dueTxt(v.visit_date)} · ${cs.length ? nf(cs.length) + ' بطاقة مؤشر' : 'لم تُجهَّز البطاقات بعد'}</small></div><a class="btn sm" href="#visit/${v.id}">فتح</a></li>`; })}</ul>` : h`<p class="muted empty">لا زيارات فنية مخططة.</p>`, h`<a class="btn sm" href="#team/visits">كل الزيارات</a>`)}
  <details class="pn tm-more"><summary>أعضاء الفريق وأعمالهم</summary>${table([
    { h: 'المنسوب', f: r => h`<b>${r.s.full_name}</b><br><small class="muted">${r.s.job_title || ''}</small>` },
    { h: 'مقيّم / مسؤول', f: r => `${nf(r.ne)} / ${nf(r.nr)}` }, { h: 'مهام جارية', f: r => nf(r.open) }, { h: 'متأخرة', f: r => r.late ? badge(nf(r.late), 'bad') : '0' },
    { h: '', f: r => co || pr ? h`<a class="btn sm" href="#platform/assign/${r.id}">ملف المسؤوليات</a>` : '' },
  ], rows, 'لم يُسنَد أي مؤشر أو مهمة بعد.')}</details>`;
}


/* ===== جاهزية المنصة: حسابات وإسناد وقنوات تواصل ===== */
function readinessPanel(D) {
  const rd = readiness(D), issues = rd.filter(r => r.bad);
  return h`<details class="pn tm-more"${issues.length ? raw(' open') : ''}><summary>جاهزية الحسابات والإسناد <span class="bdg ${issues.length ? 'warn' : 'ok'}">${issues.length ? nf(issues.length) + ' ملاحظة' : 'جاهز'}</span></summary><ul class="tm-rd">${rd.map(r => h`<li class="${r.bad ? 'bad' : 'ok'}"><span class="tm-ri">${r.bad ? '!' : '✓'}</span><div><b>${r.label}${r.bad ? h` <span class="bdg ${r.key === 'wa' || r.key === 'idle' ? 'warn' : 'bad'}">${nf(r.items.length)}</span>` : ''}</b>
    <small>${r.bad ? h`${r.items.slice(0, 6).join('، ')}${r.items.length > 6 ? '…' : ''} — ${r.why}` : 'لا ملاحظات'}</small></div>${r.bad ? h`<a class="btn sm" href="#platform/${r.tab}">${r.go}</a>` : ''}</li>`)}</ul></details>`;
}

/* ===== التبويبات ===== */
const shell = (title, sub, base, tabs, tab, bg, extra, body, after) => ({ html: h`<div class="ph"><h1>${title}</h1><div class="pa"><span class="muted">${sub}</span></div></div>
  <nav class="tt" aria-label="أقسام ${title}">${tabs.map(t => h`<a href="#${base}/${t[0]}" class="${t[0] === tab ? 'on' : ''}" ${t[0] === tab ? raw('aria-current="page"') : ''}>${t[1]}${bg[t[0]] ? h` <span class="tb">${nf(bg[t[0]])}</span>` : ''}</a>`)}</nav>${tabs.find(t => t[0] === tab)?.[3] ? h`<p class="tdesc">${tabs.find(t => t[0] === tab)[3]}</p>` : ''}${extra}<div class="tbody">${body}</div>`, after });
App.shell = shell;
async function badges() {
  try {
    const D = await App.data(), co = isCoord(), me = S.me.staff_id, out = {};
    out.tasks = co ? D.tasks.filter(t => t.approval === 'proposed' || t.status === 'awaiting_review').length : D.tasks.filter(t => t.approval === 'approved' && t.assignee_staff_id === me && ['new', 'in_progress', 'overdue'].includes(t.status)).length;
    out.meetings = D.meetings.filter(m => m.status === 'scheduled' && dayDiff(m.meeting_date) >= 0).length;
    out.visits = D.cards.filter(c => c.followup !== 'closed' && (co || c.responsible_staff_id === me)).length;
    return out;
  } catch { return {}; }
}
async function platBadges() {
  try {
    const D = await App.data(), out = {};
    if (isCoord()) { const r = readiness(D); out.staff = r.filter(x => ['evnoacc', 'wa'].includes(x.key)).reduce((a, x) => a + x.items.length, 0); out.assign = r.filter(x => ['noev', 'nors', 'idle', 'inactive'].includes(x.key) && x.bad).length; }
    else out.ann = D.anns.filter(a => !D.reads.some(r => r.announcement_id === a.id && r.profile_id === S.me.id)).length;
    return out;
  } catch { return {}; }
}
Pages.team = async (parts) => {
  if (App.PLATFORM_TABS.includes(parts[0])) return Pages.platform(parts);       // روابط قديمة (#team/staff…) تُحوَّل إلى إدارة المنصة
  const tab = TABS.some(t => t[0] === parts[0]) ? parts[0] : 'overview', sub = parts.slice(1), tabs = TABS.filter(t => ok(t[2]));
  const [r, bg] = await Promise.all([tab === 'overview' ? overview() : Pages[tab](sub), S.cid ? badges() : {}]);
  return shell('إدارة الفريق', 'متابعة المهام والاجتماعات والزيارات والمواعيد', 'team', tabs, tab, bg, '', r?.html || r, r?.after);
};
Pages.platform = async (parts) => {
  const tabs = PLAT.filter(t => ok(t[2])), tab = tabs.some(t => t[0] === parts[0]) ? parts[0] : tabs[0]?.[0];
  if (!tab) return h`<div class="pn"><p>هذه الصفحة غير متاحة لدورك.</p></div>`;
  const canSee = isCoord() || role() === 'principal';
  const [r, bg, D] = await Promise.all([Pages[tab](parts.slice(1)), S.cid ? platBadges() : {}, canSee && S.cid ? App.data().catch(() => null) : null]);
  return shell('إدارة المنصة', 'الأعضاء والحسابات والإسناد والإعلانات ودورات التقويم وواتساب', 'platform', tabs, tab, bg, D ? readinessPanel(D) : '', r?.html || r, r?.after);
};
})();
