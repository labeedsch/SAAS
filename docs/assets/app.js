(() => {
const sb = App.sb;
const $ = s => document.querySelector(s), view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LV = { 'التميز':'excellence','التقدم':'advancement','الانطلاق':'launch','التهيئة':'preparation' };
const lvl = l => `<span class="lvl ${LV[l]||'none'}">${esc(l||'غير مُقيَّم')}</span>`;
const num = n => Number(n).toLocaleString('ar-SA');
const DOM = [0, 3, 2, 1]; // ألوان المجالات الأربعة: تيل، ذهبي، بنفسجي، أزرق
const IC = {
  layers:'<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>', check:'<path d="M5 12l5 5 9-10"/>',
  doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5M10 17h5"/>', shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  bell:'<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>', cal:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  bars:'<path d="M5 20V10M12 20V4M19 20v-7"/>', target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  book:'<path d="M5 4h9a4 4 0 014 4v12H9a4 4 0 01-4-4z"/><path d="M5 16a4 4 0 014-4h9"/>', eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
const ic = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const DIC = ['book', 'bars', 'target', 'shield'];
let rows = [], session = null, role = null;

async function load() {
  const { data, error } = await sb.from('public_results').select('*').order('indicator_code');
  if (error) throw error; rows = data || [];
  const { data: s } = await sb.auth.getSession(); session = s.session;
  role = null;
  if (session) { const { data: p } = await sb.from('profiles').select('role,display_name').eq('id', session.user.id).maybeSingle(); role = p; }
  $('#loginLink').textContent = session ? 'خروج' : 'دخول';
  $('#adminLink').hidden = !(role && ['coordinator','team_member','principal','reviewer'].includes(role.role));
  await loadOwners();
}
// المسؤولون والمقيمون: تقرؤهم قاعدة البيانات للفريق فقط (RLS)؛ الزائر والمقيم الخارجي لا يصلهم شيء.
const newOw = () => ({ resp: { ind: new Map(), dom: new Map() }, eval: { ind: new Map(), dom: new Map() } });
let owners = newOw();
const isTeam = () => !!(role && ['coordinator','team_member','principal','reviewer'].includes(role.role));
async function loadOwners() {
  owners = newOw();
  if (!isTeam()) return;
  const [st, ia, da] = await Promise.all([
    sb.from('staff').select('id,full_name'),
    sb.from('indicator_assignments').select('cycle_id,indicator_id,staff_id,kind'),
    sb.from('domain_assignments').select('cycle_id,domain_id,staff_id,kind')]);
  if (st.error || ia.error || da.error) { console.error(st.error || ia.error || da.error); return; }
  const nm = new Map((st.data || []).map(x => [x.id, x.full_name]));
  const add = (m, k, sid) => { const n = nm.get(sid); if (n) m.set(k, [...new Set([...(m.get(k) || []), n])]); };
  const kk = a => a.kind === 'evaluator' ? 'eval' : 'resp';
  (ia.data || []).forEach(a => add(owners[kk(a)].ind, a.cycle_id + '|' + a.indicator_id, a.staff_id));
  (da.data || []).forEach(a => add(owners[kk(a)].dom, a.cycle_id + '|' + a.domain_id, a.staff_id));
}
const ownersOf = (r, kind = 'resp') => [...new Set([...(owners[kind].ind.get(r.cycle_id + '|' + r.indicator_id) || []), ...(owners[kind].dom.get(r.cycle_id + '|' + r.domain_id) || [])])];
const peopleOf = (rs, kind) => [...new Set(rs.flatMap(r => ownersOf(r, kind)))];
const NONE = 'لم يُسند بعد';
const names = a => a.length ? esc(a.join('، ')) : NONE;
const cycles = () => [...new Map(rows.map(r => [r.cycle_id, r.cycle_name]))];
const byCycle = id => rows.filter(r => r.cycle_id === id);
const pubCount = rs => rs.filter(r => r.publish_state === 'published').length;
const sortCodes = (a, b) => a.localeCompare(b, 'en', { numeric: true });

function crumbs(parts) { return `<div class="crumbs">${parts.map(p => p[1] ? `<a href="${p[1]}">${esc(p[0])}</a>` : esc(p[0])).join(' ‹ ')}</div>`; }
function noResults() { return `<div class="panel"><h2>لا توجد نتائج منشورة بعد</h2><p class="muted">تُنشر نتائج التقويم الذاتي هنا بعد اعتمادها من منسق التقويم.</p></div>`; }

const pctOf = (p, n) => n ? Math.round(p / n * 100) : 0;
function domCards(id, rs) {
  const doms = [...new Map(rs.map(r => [r.domain_id, r]))].map(([, r]) => r).sort((a, b) => sortCodes(a.domain_code, b.domain_code));
  return `<div class="grid g4">${doms.map((d, i) => {
    const dr = rs.filter(r => r.domain_id === d.domain_id), p = pubCount(dr), k = DOM[i % 4];
    return `<a class="card" style="--b:var(--c${k}b);--f:var(--c${k}f)" href="#domain/${id}/${d.domain_id}"><span class="ic">${ic(DIC[i % 4])}</span>
      <div class="ct"><h3>${esc(d.domain_name)}</h3><small>${num(p)} من ${num(dr.length)} مؤشراً منشور</small></div><b class="big">${num(pctOf(p, dr.length))}٪</b>
      <div class="bar"><span style="width:${pctOf(p, dr.length)}%"></span></div>${isTeam() ? `<span class="muted">المقيم: ${names(peopleOf(dr, 'eval'))}</span>` : ''}</a>`;
  }).join('')}</div>`;
}

const MODES = [['domain', 'بالمجال', false], ['resp', 'بالمسؤول', true], ['eval', 'بالمقيم', true], ['full', 'التفاصيل كاملة', false]];
let hm = { mode: 'domain', q: '' };
const dColor = r => DOM[Math.max(0, domIdx(r.cycle_id, r.domain_id)) % 4];

function icard(r, full) {
  const k = dColor(r), pub = r.publish_state === 'published';
  return `<a class="card icard${full ? ' full' : ''}" style="--b:var(--c${k}b);--f:var(--c${k}f)" href="#ind/${r.cycle_id}/${r.indicator_id}">
    <div class="ih"><code>${esc(r.indicator_code)}</code><span>${pub ? lvl(r.level_label) + (full ? ` <span class="pct">${num(r.achievement_pct)}٪</span>` : '') : '<span class="lvl none">غير منشور</span>'}</span></div>
    <p class="idesc">${esc(r.official_text)}</p>
    ${full && pub && r.justification ? `<p class="ijust"><b>مبررات التقييم:</b> ${esc(r.justification)}</p>` : ''}
    <div class="imeta"><span><b>المجال:</b> ${esc(r.domain_name)}</span>${full ? `<span><b>المعيار:</b> ${esc(r.standard_name)}</span>` : ''}${isTeam() ? `<span><b>المسؤول:</b> ${names(ownersOf(r, 'resp'))}</span><span><b>المقيم:</b> ${names(ownersOf(r, 'eval'))}</span>` : ''}</div></a>`;
}

function tabsHtml() {
  return MODES.filter(m => !m[2] || isTeam()).map(m => `<button type="button" class="tab${hm.mode === m[0] ? ' on' : ''}" data-m="${m[0]}" aria-pressed="${hm.mode === m[0]}">${m[1]}</button>`).join('');
}

function renderList(cid) {
  const all = byCycle(cid), q = hm.q.trim().toLowerCase();
  const rs = all.filter(r => !q || [r.indicator_code, r.official_text, r.domain_name, r.standard_name, ...ownersOf(r, 'resp'), ...ownersOf(r, 'eval')].join(' ').toLowerCase().includes(q)).sort((a, b) => sortCodes(a.indicator_code, b.indicator_code));
  $('#tabs').innerHTML = tabsHtml(); $('#icount').textContent = `${num(rs.length)} من ${num(all.length)} مؤشراً`;
  if (!rs.length) { $('#ilist').innerHTML = `<div class="panel"><p class="muted">لا توجد مؤشرات مطابقة للبحث.</p></div>`; return; }
  let groups;
  if (hm.mode === 'full') groups = [[null, rs]];
  else if (hm.mode === 'domain') groups = [...new Map(rs.map(r => [r.domain_code + '|' + r.domain_name, r])).keys()].sort((a, b) => sortCodes(a, b)).map(key => [key.split('|')[1], rs.filter(r => r.domain_code + '|' + r.domain_name === key)]);
  else {
    const m = new Map(); rs.forEach(r => { const o = ownersOf(r, hm.mode); (o.length ? o : [NONE]).forEach(n => m.set(n, [...(m.get(n) || []), r])); });
    groups = [...m].sort((a, b) => (a[0] === NONE) - (b[0] === NONE) || a[0].localeCompare(b[0], 'ar'));
  }
  $('#ilist').innerHTML = groups.map(([g, list]) => (g ? `<div class="sec"><h2>${esc(g)}</h2><span class="chip">${num(list.length)} مؤشراً</span></div>` : '') +
    `<div class="grid icards${hm.mode === 'full' ? ' full' : ''}">${list.map(r => icard(r, hm.mode === 'full')).join('')}</div>`).join('');
}

function home() {
  const cs = cycles(), first = cs[0], rs = first ? byCycle(first[0]) : [];
  const pub = pubCount(rs);
  const cnt = k => new Set(rs.map(r => r[k])).size;
  if (MODES.find(m => m[0] === hm.mode)[2] && !isTeam()) hm.mode = 'domain';
  view.innerHTML = `<section class="hero compact"><div class="hero-txt"><span class="chip">${ic('cal')} ${first ? esc(first[1]) : 'التقويم الذاتي المدرسي'}</span>
    <h1><span class="gold">التقويم الذاتي</span> الذكي</h1>
    <p>نتائج تقويم مدرسة لبيد بن ربيعة المتوسطة: المجالات والمعايير والمؤشرات، وفق دليل هيئة تقويم التعليم والتدريب.</p></div>
    <div class="tiles"><div class="tile"><div><b>${num(first ? cnt('domain_id') : 4)}</b><span>مجالات</span></div><i>${ic('layers')}</i></div><div class="tile"><div><b>${num(first ? cnt('standard_id') : 11)}</b><span>معياراً</span></div><i>${ic('bars')}</i></div>
    <div class="tile"><div><b>${num(first ? rs.length : 49)}</b><span>مؤشراً</span></div><i>${ic('target')}</i></div>
    <div class="tile"><div><b>${first ? num(pub) : '—'}</b><span>${first ? 'منشورة' : 'لا دورة منشورة'}</span></div><i>${ic('eye')}</i></div></div></section>` +
    (first && rs.length ? `<div class="sec"><h2>مجالات التقويم</h2></div>` + domCards(first[0], rs) +
      `<div class="sec"><h2>مؤشرات التقويم</h2><span class="chip" id="icount"></span></div>
      <div class="toolbar"><div class="tabs" id="tabs" role="group" aria-label="طريقة الفرز"></div><input type="search" id="iq" placeholder="ابحث برقم المؤشر أو نصه…" value="${esc(hm.q)}" aria-label="بحث في المؤشرات"></div>
      ${isTeam() ? '' : '<p class="muted tnote">الفرز بالمسؤول وبالمقيم متاح لفريق التقويم بعد تسجيل الدخول.</p>'}<div id="ilist"></div>` : noResults());
  if (first && rs.length) {
    $('#tabs').onclick = e => { const b = e.target.closest('[data-m]'); if (b && MODES.some(m => m[0] === b.dataset.m && (!m[2] || isTeam()))) { hm.mode = b.dataset.m; renderList(first[0]); } };
    $('#iq').oninput = e => { hm.q = e.target.value; renderList(first[0]); };
    renderList(first[0]);
  }
}

function results() {
  const cs = cycles();
  if (!cs.length) { view.innerHTML = noResults(); return; }
  view.innerHTML = `<div class="sec"><h2>نتائج التقويم</h2></div><div class="grid">${cs.map(([id, name]) => {
    const rs = byCycle(id), p = pubCount(rs);
    return `<a class="card" href="#cycle/${id}"><span class="ic">${ic('layers')}</span><div class="ct"><h3>${esc(name)}</h3><small>${num(p)} من ${num(rs.length)} مؤشراً منشور</small></div><b class="big">${num(pctOf(p, rs.length))}٪</b><div class="bar"><span style="width:${pctOf(p, rs.length)}%"></span></div></a>`;
  }).join('')}</div>`;
}

function cycle(id) {
  const rs = byCycle(id); if (!rs.length) { view.innerHTML = noResults(); return; }
  view.innerHTML = crumbs([['النتائج', '#results'], [rs[0].cycle_name]]) + domCards(id, rs);
}

const domIdx = (cid, did) => [...new Map(byCycle(cid).map(r => [r.domain_id, r.domain_code]))].sort((a, b) => sortCodes(a[1], b[1])).findIndex(x => x[0] === did);
const stdsOf = rs => [...new Map(rs.map(r => [r.standard_id, r]))].map(([, r]) => r).sort((a, b) => sortCodes(a.standard_code, b.standard_code));

const lvlChips = rs => { const m = new Map(); rs.filter(r => r.publish_state === 'published').forEach(r => m.set(r.level_label || 'غير مُقيَّم', (m.get(r.level_label || 'غير مُقيَّم') || 0) + 1));
  return [...m].map(([l, c]) => `<span class="lvl ${LV[l] || 'none'}">${esc(l)} ${num(c)}</span>`).join(''); };

function domain(cid, did) {
  const rs = byCycle(cid).filter(r => r.domain_id === did); if (!rs.length) { view.innerHTML = noResults(); return; }
  const i = Math.max(0, domIdx(cid, did)), k = DOM[i % 4], sts = stdsOf(rs), p = pubCount(rs), d = rs[0];
  const ev = peopleOf(rs, 'eval'), rp = peopleOf(rs, 'resp');
  const chips = a => a.length ? a.map(n => `<span class="pchip">${esc(n)}</span>`).join('') : `<span class="muted">${NONE}</span>`;
  view.innerHTML = crumbs([['النتائج', '#results'], [d.cycle_name, '#cycle/' + cid], [d.domain_name]]) +
    `<section class="dhead" style="--f:var(--c${k}f)"><span class="dic">${ic(DIC[i % 4])}</span><div><small>المجال ${esc(d.domain_code)}</small><h1>${esc(d.domain_name)}</h1></div>
      <div class="tiles"><div class="tile"><div><b>${num(sts.length)}</b><span>معايير</span></div><i>${ic('bars')}</i></div><div class="tile"><div><b>${num(rs.length)}</b><span>مؤشراً</span></div><i>${ic('target')}</i></div>
      <div class="tile"><div><b>${num(p)}</b><span>منشورة</span></div><i>${ic('eye')}</i></div><div class="tile"><div><b>${num(pctOf(p, rs.length))}٪</b><span>نسبة النشر</span></div><i>${ic('check')}</i></div></div></section>` +
    (isTeam() ? `<div class="people"><div class="pp"><h3>مقيمو المجال</h3><div>${chips(ev)}</div></div><div class="pp"><h3>مسؤولو المجال</h3><div>${chips(rp)}</div></div></div>`
      : `<p class="muted tnote">بيانات المقيمين والمسؤولين متاحة لفريق التقويم بعد تسجيل الدخول.</p>`) +
    `<div class="sec"><h2>معايير المجال</h2><span class="chip">${num(sts.length)} معايير</span></div>
    <div class="grid">${sts.map(s => {
      const sr = rs.filter(r => r.standard_id === s.standard_id), sp = pubCount(sr);
      return `<a class="card icard scard" style="--b:var(--c${k}b);--f:var(--c${k}f)" href="#standard/${cid}/${s.standard_id}">
        <div class="ih"><code>${esc(s.standard_code)}</code><b class="big">${num(pctOf(sp, sr.length))}٪</b></div>
        <h3>${esc(s.standard_name)}</h3>
        ${lvlChips(sr) ? `<div class="lvls">${lvlChips(sr)}</div>` : ''}
        <div class="bar"><span style="width:${pctOf(sp, sr.length)}%"></span></div>
        <div class="imeta"><span><b>المؤشرات:</b> ${num(sr.length)} · منشور ${num(sp)}</span>${isTeam() ? `<span><b>المقيم:</b> ${names(peopleOf(sr, 'eval'))}</span><span><b>المسؤول:</b> ${names(peopleOf(sr, 'resp'))}</span>` : ''}</div></a>`; }).join('')}</div>`;
}

function standard(cid, sid) {
  const rs = byCycle(cid).filter(r => r.standard_id === sid).sort((a, b) => sortCodes(a.indicator_code, b.indicator_code));
  if (!rs.length) { view.innerHTML = noResults(); return; }
  const r0 = rs[0];
  view.innerHTML = crumbs([['النتائج', '#results'], [r0.cycle_name, '#cycle/' + cid], [r0.domain_name, `#domain/${cid}/${r0.domain_id}`], [r0.standard_name]]) +
    `<div class="sec"><h2>${esc(r0.standard_name)}</h2><span class="chip">${num(rs.length)} مؤشراً</span></div>
    <div class="grid icards">${rs.map(r => icard(r, false)).join('')}</div>`;
}

async function indicator(cid, iid) {
  const r = byCycle(cid).find(x => x.indicator_id === iid); if (!r) { view.innerHTML = noResults(); return; }
  const { count } = await sb.from('public_evidence_stubs').select('id', { count: 'exact', head: true }).eq('cycle_id', cid).eq('indicator_id', iid).eq('status', 'approved');
  const pub = r.publish_state === 'published';
  view.innerHTML = crumbs([['النتائج', '#results'], [r.cycle_name, '#cycle/' + cid], [r.domain_name, `#domain/${cid}/${r.domain_id}`], [r.standard_name, `#standard/${cid}/${r.standard_id}`], [r.indicator_code]]) +
    `<div class="panel"><div class="sec" style="margin:0"><h2>المؤشر ${esc(r.indicator_code)}</h2>${pub ? lvl(r.level_label) : '<span class="lvl none">غير منشور</span>'}</div>
      <p>${esc(r.official_text)}</p><p class="muted">${esc(r.domain_name)} ‹ ${esc(r.standard_name)}</p>${isTeam() ? `<p><b>المسؤول:</b> ${names(ownersOf(r, 'resp'))}<br><b>المقيم:</b> ${names(ownersOf(r, 'eval'))}</p>` : ''}</div>` +
    (pub ? `<div class="panel"><h2>نسبة التحقق</h2><p class="pct" style="font-size:1.8rem;margin:0">${num(r.achievement_pct)}٪</p></div>
      <div class="panel"><h2>مبررات التقييم</h2><p>${esc(r.justification || '—')}</p>${r.strengths ? `<h2>جوانب القوة</h2><p>${esc(r.strengths)}</p>` : ''}</div>`
      : `<div class="panel"><p class="muted">لم يُنشر تقييم هذا المؤشر بعد.</p></div>`) +
    (count ? `<div class="panel"><h2>الشواهد (${num(count)})</h2>${await evidenceBlock(cid, iid)}</div>` : '');
}
async function evidenceBlock(cid, iid) {
  if (role && ['external_evaluator','coordinator','team_member','principal','reviewer'].includes(role.role)) {
    const { data } = await sb.from('evidence').select('id,title,description,evidence_date,category').eq('cycle_id', cid).eq('indicator_id', iid).eq('status', 'approved');
    if (!data?.length) return `<p class="muted">لا توجد شواهد معتمدة معروضة.</p>`;
    return `<div class="ev-list">${data.map(e => `<div class="ind" style="align-items:center"><p><b>${esc(e.title)}</b>${e.description ? `<br><small class="muted">${esc(e.description)}</small>` : ''}</p><button type="button" class="btn sm pri" data-ev="${esc(e.id)}" data-t="${esc(e.title)}">معاينة</button></div>`).join('')}</div>`;
  }
  return `<div class="lock"><svg class="ico" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg><span>الشاهد محجوب حفاظاً على خصوصية البيانات، والاطلاع عليه متاح للمستخدمين المصرح لهم.</span></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-ev]'); if (b) App.openViewer(b.dataset.ev, b.dataset.t, true); });

function login() {
  if (session) { sb.auth.signOut().then(() => { location.hash = '#home'; boot(); }); return; }
  view.innerHTML = `<div class="panel" style="max-width:480px;margin-inline:auto"><h2>تسجيل الدخول</h2><p class="muted">للمقيم الخارجي وأعضاء فريق التقويم.</p>
    <form class="f" id="lf"><label>اسم المستخدم أو البريد الإلكتروني<input type="text" name="e" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" dir="ltr"></label>
    <label>كلمة المرور<input type="password" name="p" required autocomplete="current-password" dir="ltr"></label>
    <button class="btn pri" type="submit">دخول</button><div class="err" id="le" role="alert"></div></form></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    const { error } = await sb.auth.signInWithPassword({ email: App.loginEmail(f.get('e')), password: f.get('p') });
    if (error) { $('#le').textContent = 'بيانات الدخول غير صحيحة.'; return; }
    location.hash = '#home'; boot();
  };
}

function route() {
  const [h, a, b] = location.hash.slice(1).split('/');
  document.querySelectorAll('#nav a').forEach(x => x.classList.toggle('on', x.dataset.n === (h || 'home') || (x.dataset.n === 'results' && ['cycle','domain','standard','ind'].includes(h))));
  window.scrollTo(0, 0);
  ({ '': home, home, results, login }[h] || (() => ({ cycle: () => cycle(a), domain: () => domain(a, b), standard: () => standard(a, b), ind: () => indicator(a, b) }[h] || home)()))();
}
async function boot() { try { await load(); route(); } catch (e) { view.innerHTML = `<div class="panel"><p class="err">تعذّر تحميل البيانات. أعد المحاولة لاحقاً.</p></div>`; console.error(e); } }
window.addEventListener('hashchange', route);
boot();
})();
