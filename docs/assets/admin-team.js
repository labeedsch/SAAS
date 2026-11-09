/* إدارة الفريق: صفحة واحدة تجمع الأعضاء والحسابات والإسناد والمهام والاجتماعات والزيارات والإعلانات والمواعيد.
   تغلّف الصفحات القائمة بتبويبات (لا تكرّر منطقها)، وتضيف «نظرة عامة» تفحص جاهزية الفريق من بيانات الدورة.
   تُحمَّل بعد admin-dashboard.js وقبل admin.js. */
(() => {
const { h, raw, S, L, nf, dt, staffName, badge, table, panel, isCoord, role } = App;
const MS = 864e5, pad = n => String(n).padStart(2, '0');
const tod = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dayDiff = s => Math.round((new Date(String(s).slice(0, 10) + 'T00:00:00') - new Date(tod() + 'T00:00:00')) / MS);
const pctOf = (a, b) => b ? Math.round(a / b * 100) : 0;
const CO = ['coordinator'], CP = ['coordinator', 'principal'];
const TABS = [['overview', 'نظرة عامة', '*'], ['staff', 'الأعضاء والحسابات', CO], ['assign', 'الإسناد والمسؤوليات', CP], ['tasks', 'المهام والتكليفات', '*'],
  ['meetings', 'الاجتماعات', '*'], ['visits', 'الزيارات الفنية', '*'], ['ann', 'الإعلانات', '*'], ['cal', 'المواعيد والتقويم', '*']];
const ok = r => r === '*' || r.includes(role());
App.TEAM_TABS = TABS.map(t => t[0]).filter(t => t !== 'overview');
App.teamTabAllowed = t => { const x = TABS.find(y => y[0] === t); return !x || ok(x[2]); };

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

/* ===== النظرة العامة ===== */
async function overview() {
  const nc = App.needCycle(); if (nc) return nc;
  const D = await App.data(), T = tod(), co = isCoord(), me = S.me.staff_id;
  const rd = readiness(D), rows = teamRows(D), issues = rd.filter(r => r.bad);
  const tk = D.tasks.filter(t => t.approval === 'approved'), act = tk.filter(t => !['completed', 'cancelled'].includes(t.status));
  const late = act.filter(t => t.due_date && dayDiff(t.due_date) < 0).length, proposed = D.tasks.filter(t => t.approval === 'proposed').length, review = tk.filter(t => t.status === 'awaiting_review').length;
  const up = D.meetings.filter(m => m.status === 'scheduled' && dayDiff(m.meeting_date) >= 0), vp = D.vis.filter(v => v.status === 'planned' && dayDiff(v.visit_date) >= 0);
  const accts = D.profs.filter(p => p.is_active && p.role !== 'external_evaluator').length, activeStaff = S.staff.filter(s => s.is_active).length;
  const evS = new Set(D.resp.filter(r => r.kind === 'evaluator').map(r => r.staff_id)).size, rsS = new Set(D.resp.filter(r => r.kind === 'responsible').map(r => r.staff_id)).size;
  const kp = [
    { l: 'منسوبو المدرسة', n: activeStaff, s: `${nf(accts)} منهم بحساب دخول`, t: 'brand', go: 'staff' }, { l: 'مقيّمون / مسؤولون', n: `${nf(evS)} / ${nf(rsS)}`, s: 'منسوبون أُسند إليهم مؤشرات', t: 'info', go: 'assign' },
    { l: 'مهام جارية', n: act.length, s: late ? `${nf(late)} متأخرة` : 'لا متأخرة', t: late ? 'bad' : 'ok', go: 'tasks' },
    { l: co ? 'تنتظر قرارك' : 'اقتراحاتي بانتظار المنسق', n: co ? proposed + review : D.tasks.filter(t => t.approval === 'proposed' && t.proposed_by === S.me.id).length, s: co ? `${nf(proposed)} مقترحة · ${nf(review)} للإغلاق` : 'مهام اقترحتها', t: 'warn', go: 'tasks' },
    { l: 'اجتماعات قادمة', n: up.length, s: up[0] ? `التالي ${dt(up.sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))[0].meeting_date)}` : 'لا اجتماعات مجدولة', t: 'info', go: 'meetings' },
    { l: 'زيارات فنية مخططة', n: vp.length, s: `${nf(D.cards.filter(c => c.followup !== 'closed').length)} متابعة مفتوحة`, t: 'brand', go: 'visits' },
  ];
  const soon = [
    ...up.map(m => ({ d: m.meeting_date, k: 'اجتماع', t: m.title, href: '#meeting/' + m.id })), ...vp.map(v => ({ d: v.visit_date, k: 'زيارة فنية', t: v.target_party, href: '#visit/' + v.id })),
    ...act.filter(t => t.due_date && dayDiff(t.due_date) >= 0 && dayDiff(t.due_date) <= 7 && (co || t.assignee_staff_id === me)).map(t => ({ d: t.due_date, k: 'موعد مهمة', t: t.title, href: '#team/tasks' })),
    ...D.dls.filter(d => dayDiff(d.due_date) >= 0 && dayDiff(d.due_date) <= 14).map(d => ({ d: d.due_date, k: 'إغلاق', t: d.title, href: '#team/cal' })),
  ].sort((a, b) => a.d.localeCompare(b.d)).slice(0, 8);
  const accBadge = r => r.acc ? h`${badge(L.role[r.acc.role], 'info')}${r.acc.is_active ? '' : badge('موقوف', 'bad')}` : h`<span class="muted">بلا حساب</span>`;
  return h`
  <div class="db-kpis">${kp.map(k => { const inner = h`<small>${k.l}</small><b>${typeof k.n === 'number' ? nf(k.n) : k.n}</b><em>${k.s}</em>`; return App.teamTabAllowed(k.go) ? h`<a class="db-k ${k.t}" href="#team/${k.go}">${inner}</a>` : h`<div class="db-k ${k.t}">${inner}</div>`; })}</div>
  ${(co || role() === 'principal') ? panel('جاهزية الفريق', h`<ul class="tm-rd">${rd.map(r => h`<li class="${r.bad ? 'bad' : 'ok'}"><span class="tm-ri">${r.bad ? '!' : '✓'}</span><div><b>${r.label}${r.bad ? h` <span class="bdg ${r.key === 'wa' || r.key === 'idle' ? 'warn' : 'bad'}">${nf(r.items.length)}</span>` : ''}</b>
      <small>${r.bad ? h`${r.items.slice(0, 6).join('، ')}${r.items.length > 6 ? '…' : ''} — ${r.why}` : 'لا ملاحظات'}</small></div>${r.bad ? h`<a class="btn sm" href="#team/${r.tab}">${r.go}</a>` : ''}</li>`)}</ul>`,
    h`<span class="bdg ${issues.length ? 'warn' : 'ok'}">${issues.length ? nf(issues.length) + ' ملاحظة' : 'الفريق جاهز'}</span>`) : ''}
  ${panel('أداء أعضاء الفريق', table([
    { h: 'المنسوب', f: r => h`<b>${r.s.full_name}</b><br><small class="muted">${r.s.job_title || ''}</small>` }, { h: 'الحساب', f: accBadge },
    { h: 'مقيّم', f: r => nf(r.ne) }, { h: 'مسؤول', f: r => nf(r.nr) }, { h: 'معتمد', f: r => nf(r.a) }, { h: 'بانتظار الاعتماد', f: r => r.sb ? badge(nf(r.sb), 'warn') : '0' },
    { h: 'مهام جارية', f: r => nf(r.open) }, { h: 'مكتملة', f: r => nf(r.done) }, { h: 'متأخرة', f: r => r.late ? badge(nf(r.late), 'bad') : '0' },
    { h: 'الإنجاز', f: r => r.ne ? h`<div class="db-pr"><div class="bar2"><span style="width:${pctOf(r.a, r.ne)}%"></span></div><span>${nf(pctOf(r.a, r.ne))}٪</span></div>` : h`<span class="muted">—</span>` },
    { h: '', f: r => isCoord() || role() === 'principal' ? h`<a class="btn sm" href="#team/assign/${r.id}">ملف المسؤوليات</a>` : '' },
  ], rows, 'لم يُسنَد أي مؤشر أو مهمة بعد. ابدأ من تبويب «الأعضاء والحسابات» ثم «الإسناد والمسؤوليات».'))}
  ${panel('الأعمال القادمة', soon.length ? h`<ul class="db-log">${soon.map(x => h`<li><span><span class="bdg info">${x.k}</span> <a href="${x.href}">${x.t}</a></span><small class="muted">${dt(x.d)}</small></li>`)}</ul>` : h`<p class="muted empty">لا أعمال قادمة خلال الأيام القريبة.</p>`)}`;
}

/* ===== التبويبات ===== */
async function badges(tab) {
  try {
    const D = await App.data(), co = isCoord(), me = S.me.staff_id, out = {};
    out.tasks = co ? D.tasks.filter(t => t.approval === 'proposed' || t.status === 'awaiting_review').length : D.tasks.filter(t => t.approval === 'approved' && t.assignee_staff_id === me && ['new', 'in_progress', 'overdue'].includes(t.status)).length;
    out.meetings = D.meetings.filter(m => m.status === 'scheduled' && dayDiff(m.meeting_date) >= 0).length;
    out.visits = D.cards.filter(c => c.followup !== 'closed' && (co || c.responsible_staff_id === me)).length;
    if (co) { const r = readiness(D); out.staff = r.filter(x => ['evnoacc', 'wa'].includes(x.key)).reduce((a, x) => a + x.items.length, 0); out.assign = r.filter(x => ['noev', 'nors', 'idle', 'inactive'].includes(x.key) && x.bad).length; }
    return out;
  } catch { return {}; }
}
Pages.team = async (parts) => {
  const tab = TABS.some(t => t[0] === parts[0]) ? parts[0] : 'overview', sub = parts.slice(1), tabs = TABS.filter(t => ok(t[2]));
  if (!ok(TABS.find(t => t[0] === tab)[2])) return h`<div class="pn"><p>هذا التبويب غير متاح لدورك.</p></div>`;
  const [r, bg] = await Promise.all([tab === 'overview' ? overview() : Pages[tab](sub), S.cid ? badges() : {}]);
  const body = r?.html || r;
  const nav = h`<nav class="tt" aria-label="أقسام إدارة الفريق">${tabs.map(t => h`<a href="#team/${t[0]}" class="${t[0] === tab ? 'on' : ''}" ${t[0] === tab ? raw('aria-current="page"') : ''}>${t[1]}${bg[t[0]] ? h` <span class="tb">${nf(bg[t[0]])}</span>` : ''}</a>`)}</nav>`;
  return { html: h`<div class="ph"><h1>إدارة الفريق</h1><div class="pa"><span class="muted">الأعضاء والحسابات والإسناد والمهام والاجتماعات والزيارات والإعلانات والمواعيد في مكان واحد</span></div></div>${nav}<div class="tbody">${body}</div>`, after: r?.after };
};
})();
