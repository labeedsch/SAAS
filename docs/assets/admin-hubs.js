/* الأقسام الرئيسية الأربعة: لوحة المتابعة الشاملة، إدارة المؤشرات، (إدارة الفريق وإدارة المنصة في admin-team.js).
   كل قسم يغلّف الصفحات القائمة بتبويبات داخلية دون تكرار منطقها. تُحمَّل بعد admin-team.js وقبل admin.js. */
(() => {
const { sb, h, raw, S, L, nf, short, sb_, badge, btn, table, panel, must, staffName, role, isCoord } = App;
const CP = ['coordinator', 'principal'], CPR = ['coordinator', 'principal', 'reviewer'];
const ok = r => r === '*' || r.includes(role());

const DASH = [
  ['overview', 'نظرة عامة', '*', 'ما ينتظرك الآن من اعتمادات ومتابعات، وما هو قادم في الأسبوع.'],
  ['reports', 'التقارير', '*', 'تقارير الدورة والمجالات والمعايير والمؤشرات والشواهد والمسؤوليات والمهام، للعرض والطباعة والتصدير.'],
  ['log', 'سجل النشاط', CP, 'من أنشأ ومن عدّل ومن اعتمد ومتى، لكل العمليات الحساسة.'],
];
const INDS = [
  ['list', 'المؤشرات والتقييم', '*', 'المؤشرات الاثنان والخمسون مع المسؤول والمقيّم والحالة والمستوى وعدد الشواهد المعتمدة.'],
  ['evidence', 'الشواهد', '*', 'الشواهد المرفوعة وحالة مراجعتها واعتمادها، ومعاينة ملفاتها.'],
  ['map', 'خريطة التقدم', CPR, 'كل معيار ومؤشراته بحالتها ومقيّمها وشواهدها، لمعرفة أين يتوقف العمل.'],
];
(App.HUBS ||= {}).dashboard = { title: 'مكتبي الإلكتروني', tabs: DASH }; App.HUBS.inds = { title: 'إدارة المؤشرات', tabs: INDS };
App.DASH_TABS = DASH.map(t => t[0]).filter(t => t !== 'overview');
App.INDS_TABS = INDS.map(t => t[0]).filter(t => t !== 'list');

/* شارات التبويبات من تنبيهات حقيقية */
const cnt = (A, keys) => { const s = new Set(); (A?.groups || []).filter(g => keys.includes(g.key)).forEach(g => g.items.forEach(i => s.add(i.uid))); return s.size; };
App.hubBadges = A => ({
  alerts: A?.total || 0,
  inds: cnt(A, ['evid', 'eval', 'myeval', 'myfix', 'myresp']),
  team: cnt(A, ['tprop', 'trev', 'min', 'tlate', 'mytask', 'rsvp', 'visit', 'dl']),
  platform: cnt(A, ['noassign', 'ann']),
  desk: cnt(A, ['mytask', 'rsvp', 'visit', 'dl', 'ann']),
});

/* ===== لوحة المتابعة الشاملة ===== */
const dashOverview = Pages.dashboard, indList = Pages.inds;
Pages.dashboard = async (parts = []) => {
  const tab = DASH.some(t => t[0] === parts[0]) ? parts[0] : 'overview', tabs = DASH.filter(t => ok(t[2]));
  if (!tabs.some(t => t[0] === tab)) return h`<div class="pn"><p>هذه الصفحة غير متاحة لدورك.</p></div>`;
  const A = S.cid ? await App.alerts().catch(() => null) : null;
  const r = await (tab === 'overview' ? dashOverview() : Pages[tab](parts.slice(1)));
  return App.shell('لوحة المتابعة الشاملة', 'نظرة شاملة على المنصة والتقارير وسجل النشاط', 'dashboard', tabs, tab, {}, '', r?.html || r, r?.after);
};

/* ===== إدارة المؤشرات ===== */
Pages.inds = async (parts = []) => {
  const tab = INDS.some(t => t[0] === parts[0]) ? parts[0] : 'list', tabs = INDS.filter(t => ok(t[2]));
  const A = S.cid ? await App.alerts().catch(() => null) : null;
  if (tab === 'list' && parts[1] && App.indFilter) App.indFilter({ st: parts[1] === 'mine' ? '' : parts[1], mine: parts[1] === 'mine' });
  if (tab === 'evidence' && parts[1] && App.evFilter) App.evFilter(parts[1]);
  const r = await (tab === 'list' ? indList() : Pages[tab === 'map' ? 'indmap' : tab](parts.slice(1)));
  return App.shell('إدارة المؤشرات', 'المؤشرات والتقييم والشواهد وخريطة التقدم', 'inds', tabs, tab, { list: cnt(A, ['eval', 'myeval']), evidence: cnt(A, ['evid', 'myfix']) }, '', r?.html || r, r?.after);
};

/* ===== خريطة التقدم: كل المشروع في نظرة واحدة. مجال فمعيار فمؤشرات كمربعات ملوّنة بحالتها ===== */
const DOMK = [0, 3, 2, 1];
Pages.indmap = async ([onlyDom] = []) => {
  const nc = App.needCycle(); if (nc) return nc;
  const D = await App.data(), { ref, om, resp } = D, sid = S.me.staff_id;
  const mine = new Set(resp.filter(r => r.staff_id === sid).map(r => r.indicator_id)), who = {};
  resp.filter(r => r.kind === 'evaluator').forEach(r => (who[r.indicator_id] ||= []).push(staffName(r.staff_id)));
  const stOf = i => om[i.id]?.eval_status || 'not_evaluated', SL = { approved: 'معتمد', submitted: 'بانتظار الاعتماد', draft: 'مسودة', not_evaluated: 'لم يُقيَّم' };
  const summ = xs => ({ n: xs.length, ok: xs.filter(i => stOf(i) === 'approved').length, sub: xs.filter(i => stOf(i) === 'submitted').length, dr: xs.filter(i => stOf(i) === 'draft').length, nev: xs.filter(i => stOf(i) === 'not_evaluated').length, ne: xs.filter(i => !who[i.id]).length });
  const seg = x => h`<span class="hm-bar" role="img" aria-label="${nf(x.ok)} معتمد من ${nf(x.n)}"><i class="ok" style="width:${x.n ? x.ok / x.n * 100 : 0}%"></i><i class="info" style="width:${x.n ? x.sub / x.n * 100 : 0}%"></i><i class="warn" style="width:${x.n ? x.dr / x.n * 100 : 0}%"></i></span>`;
  const chip = i => { const o = om[i.id] || {}, st = stOf(i), ev = who[i.id];
    return h`<a class="hm-c ${st} ${mine.has(i.id) ? 'me' : ''} ${ev ? '' : 'noev'}" href="#ind/${i.id}" dir="ltr" title="${i.code} — ${SL[st]} — ${ev ? ev.join('، ') : 'بلا مقيّم'} — شواهد ${o.approved_evidence || 0}/${o.total_evidence || 0}"><b>${i.code}</b>${ev ? '' : h`<em aria-label="بلا مقيّم"></em>`}</a>`; };
  const all = summ(ref.inds);
  return h`${App.tlSum([[all.ok, 'معتمد من ' + nf(all.n), 'ok'], [all.sub, 'بانتظار الاعتماد', 'info'], [all.dr, 'مسودة', 'warn'], [all.nev, 'لم يُقيَّم بعد'], [all.ne, 'بلا مقيّم', all.ne ? 'bad' : '']])}
  <div class="hm-leg"><span class="approved">معتمد</span><span class="submitted">بانتظار الاعتماد</span><span class="draft">مسودة</span><span class="not_evaluated">لم يُقيَّم</span>${sid ? h`<span class="me">مؤشراتي</span>` : ''}<span class="noev"><em></em>بلا مقيّم</span></div>
  ${onlyDom ? h`<p><a class="btn sm" href="#inds/map">عرض كل المجالات</a></p>` : ''}
  <div class="hm-grid">${ref.domains.map((d, di) => { if (onlyDom && d.id !== onlyDom) return ''; const dx = ref.inds.filter(i => i.dom?.id === d.id), ds = summ(dx), k = DOMK[di % 4];
    return h`<section class="hm-d" style="--b:var(--c${k}b);--f:var(--c${k}f)"><header><div><h2>${d.name_ar}</h2><small>${nf(ds.n)} مؤشراً</small></div><div class="hm-pc"><b>${nf(ds.n ? Math.round(ds.ok / ds.n * 100) : 0)}%</b><small>${nf(ds.ok)} من ${nf(ds.n)} معتمد</small></div></header>${seg(ds)}<div class="hm-dc"><span class="approved">${nf(ds.ok)} معتمد</span><span class="submitted">${nf(ds.sub)} بانتظار الاعتماد</span><span class="draft">${nf(ds.dr)} مسودة</span><span class="not_evaluated">${nf(ds.nev)} لم يُقيَّم</span></div>
    ${ref.standards.filter(s => s.domain_id === d.id).map(s => { const xs = dx.filter(i => i.std?.id === s.id).sort((a, b) => App.codeCmp(a.code, b.code)), ss = summ(xs);
      return h`<div class="hm-s"><div class="hm-sh"><b>${s.name_ar}</b><span>${nf(ss.ok)} معتمد من ${nf(ss.n)}</span>${seg(ss)}</div><div class="hm-cs">${xs.map(chip)}</div></div>`; })}</section>`; })}</div>`;
};
})();
