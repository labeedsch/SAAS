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
Object.assign(IC, {
  arrow:'<path d="M19 12H5M11 6l-6 6 6 6"/>', users:'<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 010 6M18 14c2 .6 3 2.2 3 5"/>',
  reset:'<path d="M4 12a8 8 0 108-8H7M7 4L4 7l3 3"/>' });
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

// رسوم المجالات الأربعة (أصلية، بنمط مسطّح: خطوط كحلية وتعبئة تيل وذهبي)
const SP = (x, y, c = '#4a9fa8') => `<path transform="translate(${x} ${y})" d="M0-8L2-2 8 0 2 2 0 8-2 2-8 0-2-2z" fill="${c}"/>`;
const ILL = [
  `<rect x="115" y="34" width="90" height="34" rx="8" fill="#4a9fa8" stroke="#1d3b63" stroke-width="5"/><path d="M160 68v22M92 90h136M92 90v18M160 90v18M228 90v18" stroke="#1d3b63" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="58" y="108" width="68" height="30" rx="7" fill="#fff" stroke="#1d3b63" stroke-width="5"/><rect x="126" y="108" width="68" height="30" rx="7" fill="#fff" stroke="#1d3b63" stroke-width="5"/><rect x="194" y="108" width="68" height="30" rx="7" fill="#fff" stroke="#1d3b63" stroke-width="5"/><circle cx="160" cy="51" r="9" fill="#f0b34a"/>`,
  `<path d="M160 58c-20-14-48-14-70-6v86c22-8 50-8 70 6 20-14 48-14 70-6V52c-22-8-50-8-70 6z" fill="#fff" stroke="#1d3b63" stroke-width="5" stroke-linejoin="round"/><path d="M160 58v86" stroke="#1d3b63" stroke-width="5"/><path d="M105 78c12-3 25-2 38 3M105 98c12-3 25-2 38 3M177 81c13-5 26-6 38-3M177 101c13-5 26-6 38-3" stroke="#4a9fa8" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="236" cy="138" r="14" fill="#f0b34a" stroke="#1d3b63" stroke-width="4"/>`,
  `<rect x="82" y="104" width="40" height="40" rx="6" fill="#4a9fa8" stroke="#1d3b63" stroke-width="5"/><rect x="140" y="80" width="40" height="64" rx="6" fill="#fff" stroke="#1d3b63" stroke-width="5"/><rect x="198" y="56" width="40" height="88" rx="6" fill="#4a9fa8" stroke="#1d3b63" stroke-width="5"/><path d="M92 82l48-26 36 12 50-30" stroke="#4fa66b" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="226" cy="38" r="9" fill="#f0b34a"/>`,
  `<path d="M160 36l62 22v40c0 32-26 50-62 62-36-12-62-30-62-62V58z" fill="#4a9fa8" stroke="#1d3b63" stroke-width="5" stroke-linejoin="round"/><path d="M130 98l22 22 40-44" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="222" cy="150" r="13" fill="#f0b34a" stroke="#1d3b63" stroke-width="4"/>`];
const illus = i => `<svg class="pill-art" viewBox="0 0 320 190" aria-hidden="true"><ellipse cx="160" cy="160" rx="92" ry="9" fill="#cfe3e8"/>${ILL[i % 4]}${SP(52, 56)}${SP(272, 112)}${SP(272, 36, '#f0b34a')}</svg>`;
const initials = n => String(n).trim().split(/\s+/).slice(0, 2).map(w => (w.replace(/^ال/, '') || w)[0]).join('');
const firstPlus = a => a.length ? esc(a[0]) + (a.length > 1 ? ` <small>(+${num(a.length - 1)})</small>` : '') : NONE;
const dColor = r => DOM[Math.max(0, domIdx(r.cycle_id, r.domain_id)) % 4];

function pcard(r) {
  const k = dColor(r), i = Math.max(0, domIdx(r.cycle_id, r.domain_id)), pub = r.publish_state === 'published';
  const rp = ownersOf(r, 'resp'), ev = ownersOf(r, 'eval'), pct = pub ? Number(r.achievement_pct) || 0 : 0;
  const badge = pub ? `<span class="sbadge ${LV[r.level_label] || 'none'}"><b>${esc(r.level_label || 'منشور')}</b><i>${ic('check')}</i></span>` : `<span class="sbadge none"><b>غير منشور</b><i>${ic('cal')}</i></span>`;
  const person = isTeam()
    ? `<span class="av">${rp.length ? esc(initials(rp[0])) : ic('users')}</span><div><b title="${esc(rp.join('، '))}">${firstPlus(rp)}</b><small>${ic('users')} المقيم: <span title="${esc(ev.join('، '))}">${firstPlus(ev)}</span></small></div>`
    : `<span class="av">${ic(DIC[i % 4])}</span><div><b>${esc(r.standard_name)}</b><small>${ic('layers')} المعيار ${esc(r.standard_code)}</small></div>`;
  return `<a class="pcard" style="--b:var(--c${k}b);--f:var(--c${k}f)" href="#ind/${r.cycle_id}/${r.indicator_id}">
    <div class="pimg">${illus(i)}${badge}</div>
    <div class="pbody"><span class="pchip2">${ic('doc')} ${esc(r.domain_name)}</span>
      <h3>المؤشر ${esc(r.indicator_code)}</h3><p class="psub">${esc(r.official_text)}</p>
      <div class="pperson">${person}</div>
      <div class="prow"><span>نسبة التحقق</span><b>${pub ? num(pct) + '٪' : '—'}</b></div><div class="bar"><span style="width:${pct}%"></span></div>
      <div class="pfoot"><small>المعيار ${esc(r.standard_code)}</small><span class="pbtn">عرض التفاصيل ${ic('arrow')}</span></div></div></a>`;
}

// فرز متقدم: الفلاتر يضبطها المستخدم، والبطاقات كلها متتالية بلا تجميع
const NOP = '__none';
let hm = { dom: '', resp: '', eval: '', q: '' };
const optList = (vals, cur) => vals.map(([v, t]) => `<option value="${esc(v)}"${cur === v ? ' selected' : ''}>${esc(t)}</option>`).join('');
function filtersHtml(rs) {
  const doms = [...new Map(rs.map(r => [r.domain_id, r]))].map(([, r]) => r).sort((a, b) => sortCodes(a.domain_code, b.domain_code));
  const sel = (id, label, first, opts) => `<label class="flt2"><span>${label}</span><select id="${id}" aria-label="${label}"><option value="">${first}</option>${opts}</select></label>`;
  let h = sel('f-dom', 'المجال', 'كل المجالات', optList(doms.map(d => [d.domain_id, d.domain_name]), hm.dom));
  if (isTeam()) for (const [id, key, label] of [['f-resp', 'resp', 'المسؤول'], ['f-eval', 'eval', 'المقيم (المنفذ)']]) {
    const ns = peopleOf(rs, key).sort((a, b) => a.localeCompare(b, 'ar'));
    h += sel(id, label, 'الكل', optList([...ns.map(n => [n, n]), [NOP, 'غير مُسند']], hm[key]));
  }
  return h;
}
function matches(r) {
  if (hm.dom && r.domain_id !== hm.dom) return false;
  for (const key of ['resp', 'eval']) { if (!hm[key] || !isTeam()) continue; const o = ownersOf(r, key); if (hm[key] === NOP ? o.length : !o.includes(hm[key])) return false; }
  const q = hm.q.trim().toLowerCase();
  return !q || [r.indicator_code, r.official_text, r.domain_name, r.standard_name, ...ownersOf(r, 'resp'), ...ownersOf(r, 'eval')].join(' ').toLowerCase().includes(q);
}
function renderList(cid) {
  const all = byCycle(cid), rs = all.filter(matches).sort((a, b) => sortCodes(a.indicator_code, b.indicator_code));
  $('#icount').textContent = `${num(rs.length)} من ${num(all.length)} مؤشراً`;
  $('#ilist').innerHTML = rs.length ? `<div class="pgrid">${rs.map(pcard).join('')}</div>` : `<div class="panel"><p class="muted">لا توجد مؤشرات مطابقة. غيّر الفلاتر أو أعد ضبطها.</p></div>`;
}

function home() {
  const cs = cycles(), first = cs[0], rs = first ? byCycle(first[0]) : [];
  const pub = pubCount(rs);
  const cnt = k => new Set(rs.map(r => r[k])).size;
  if (!isTeam()) { hm.resp = ''; hm.eval = ''; }
  view.innerHTML = `<section class="hero compact"><div class="hero-txt"><span class="chip">${ic('cal')} ${first ? esc(first[1]) : 'التقويم الذاتي المدرسي'}</span>
    <h1><span class="gold">التقويم الذاتي</span> الذكي</h1>
    <p>نتائج تقويم مدرسة لبيد بن ربيعة المتوسطة: المجالات والمعايير والمؤشرات، وفق دليل هيئة تقويم التعليم والتدريب.</p></div>
    <div class="tiles"><div class="tile"><div><b>${num(first ? cnt('domain_id') : 4)}</b><span>مجالات</span></div><i>${ic('layers')}</i></div><div class="tile"><div><b>${num(first ? cnt('standard_id') : 11)}</b><span>معياراً</span></div><i>${ic('bars')}</i></div>
    <div class="tile"><div><b>${num(first ? rs.length : 49)}</b><span>مؤشراً</span></div><i>${ic('target')}</i></div>
    <div class="tile"><div><b>${first ? num(pub) : '—'}</b><span>${first ? 'منشورة' : 'لا دورة منشورة'}</span></div><i>${ic('eye')}</i></div></div></section>` +
    (first && rs.length ? `<div class="sec"><h2>مجالات التقويم</h2></div>` + domCards(first[0], rs) +
      `<div class="sec"><h2>مؤشرات التقويم</h2><span class="chip" id="icount"></span></div>
      <div class="toolbar adv" role="search"><div class="filters" id="filters">${filtersHtml(rs)}</div>
        <label class="flt2 grow"><span>بحث</span><input type="search" id="iq" placeholder="رقم المؤشر أو نصه…" value="${esc(hm.q)}" aria-label="بحث في المؤشرات"></label>
        <button type="button" class="btn soft" id="freset">${ic('reset')} إعادة ضبط</button></div>
      ${isTeam() ? '' : '<p class="muted tnote">الفلترة بالمسؤول وبالمقيم متاحة لفريق التقويم بعد تسجيل الدخول.</p>'}<div id="ilist"></div>` : noResults());
  if (first && rs.length) {
    const cid = first[0], on = (id, key) => { const el = $(id); if (el) el.onchange = e => { hm[key] = e.target.value; renderList(cid); }; };
    on('#f-dom', 'dom'); on('#f-resp', 'resp'); on('#f-eval', 'eval');
    $('#iq').oninput = e => { hm.q = e.target.value; renderList(cid); };
    $('#freset').onclick = () => { hm = { dom: '', resp: '', eval: '', q: '' }; home(); };
    renderList(cid);
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
    <div class="pgrid">${rs.map(pcard).join('')}</div>`;
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
