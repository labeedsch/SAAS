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
(App.HUBS ||= {}).dashboard = { title: 'التقويم الذاتي', tabs: DASH }; App.HUBS.inds = { title: 'إدارة المؤشرات', tabs: INDS };
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

/* ===== خريطة التقدم: معيار فمؤشر، بالتفصيل ===== */
const STC = { approved: 'ok', submitted: 'info', draft: 'warn', not_evaluated: 'mute' };
Pages.indmap = async ([onlyDom] = []) => {
  const nc = App.needCycle(); if (nc) return nc;
  const D = await App.data(), { ref, om, resp } = D, sid = S.me.staff_id;
  const mine = new Set(resp.filter(r => r.staff_id === sid).map(r => r.indicator_id)), who = {};
  resp.filter(r => r.kind === 'evaluator').forEach(r => (who[r.indicator_id] ||= []).push(staffName(r.staff_id)));
  const stOf = i => om[i.id]?.eval_status || 'not_evaluated';
  const summ = xs => ({ n: xs.length, ok: xs.filter(i => stOf(i) === 'approved').length, sub: xs.filter(i => stOf(i) === 'submitted').length, nev: xs.filter(i => stOf(i) === 'not_evaluated').length, ev: xs.filter(i => !who[i.id]).length });
  const bar = (a, b) => h`<span class="mp-bar" role="img" aria-label="${nf(a)} من ${nf(b)}"><i style="width:${b ? Math.round(a / b * 100) : 0}%"></i></span>`;
  const all = summ(ref.inds);
  return h`<div class="mp-sum"><div><b>${nf(all.ok)}</b><small>معتمد من ${nf(all.n)}</small></div><div><b>${nf(all.sub)}</b><small>بانتظار الاعتماد</small></div><div><b>${nf(all.nev)}</b><small>لم يُقيَّم بعد</small></div><div class="${all.ev ? 'warnc' : ''}"><b>${nf(all.ev)}</b><small>بلا مقيّم</small></div></div>
  <div class="db-leg"><span class="ok">معتمد</span><span class="info">بانتظار الاعتماد</span><span class="warn">مسودة</span><span class="mute">لم يُقيَّم</span>${sid ? h`<span class="mine">مؤشراتي</span>` : ''}</div>
  ${onlyDom ? h`<p><a class="btn sm" href="#inds/map">عرض كل المجالات</a></p>` : ''}
  ${ref.domains.map((d, di) => { if (onlyDom && d.id !== onlyDom) return ''; const dx = ref.inds.filter(i => i.dom?.id === d.id), ds = summ(dx);
    return h`<section class="pn mp-d" style="--b:var(--c${di % 4}b);--f:var(--c${di % 4}f)"><div class="pnh"><h2>${d.name_ar}</h2><div class="pa"><span class="muted">${nf(ds.ok)} / ${nf(ds.n)} معتمد</span>${bar(ds.ok, ds.n)}</div></div>
    ${ref.standards.filter(s => s.domain_id === d.id).map(s => { const xs = dx.filter(i => i.std?.id === s.id).sort((a, b) => App.codeCmp(a.code, b.code)), ss = summ(xs), pend = ss.sub + ss.nev + ss.ev;
      return h`<details class="mp-s" ${pend ? raw('open') : ''}><summary><b>${s.name_ar}</b><span class="muted">${nf(ss.ok)} / ${nf(ss.n)} معتمد</span>${bar(ss.ok, ss.n)}${ss.sub ? h`<span class="bdg info">${nf(ss.sub)} بانتظار الاعتماد</span>` : ''}${ss.ev ? h`<span class="bdg warn">${nf(ss.ev)} بلا مقيّم</span>` : ''}</summary>
      <ul class="mp-ul">${xs.map(i => { const o = om[i.id] || {}, st = stOf(i);
        return h`<li class="${STC[st]} ${mine.has(i.id) ? 'me' : ''}"><a href="#ind/${i.id}" dir="ltr"><b>${i.code}</b></a><span class="mp-t">${short(i.official_text, 90)}</span><small class="muted">${(who[i.id] || []).join('، ') || 'بلا مقيّم'}</small><small class="muted">شواهد ${nf(o.approved_evidence || 0)}/${nf(o.total_evidence || 0)}</small>${sb_('eval', st)}</li>`; })}</ul></details>`; })}</section>`; })}`;
};
})();
