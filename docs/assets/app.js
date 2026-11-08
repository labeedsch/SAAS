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
  reset:'<path d="M4 12a8 8 0 108-8H7M7 4L4 7l3 3"/>', search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>', chev:'<path d="M7 10l5 5 5-5"/>' });
const ic = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const DIC = ['book', 'bars', 'target', 'shield'];
let rows = [], session = null, role = null;

// عتبات المستويات (تُحمَّل من evaluation_levels، وهذه قيم احتياطية مطابقة لها)
let THR = [['excellence', 90], ['advancement', 75], ['launch', 50], ['preparation', 0]];
// مستوى مجموعة مؤشرات: متوسط نسب المؤشرات المنشورة (طريقة مؤقتة غير واردة في الدليل) — رمادي إن لم يوجد منشور
const grpLevel = rs => { const v = rs.filter(r => r.publish_state === 'published' && r.achievement_pct != null).map(r => +r.achievement_pct);
  if (!v.length) return { key: 'none', avg: null };
  const avg = v.reduce((a, b) => a + b, 0) / v.length, t = THR.find(x => avg >= x[1]);
  return { key: t ? t[0] : 'preparation', avg }; };
const GL = { excellence: 'التميز', advancement: 'التقدم', launch: 'الانطلاق', preparation: 'التهيئة', none: 'بلا تقييم منشور' };
async function load() {
  const { data, error } = await sb.from('public_results').select('*').order('indicator_code');
  if (error) throw error; rows = data || [];
  const { data: s } = await sb.auth.getSession(); session = s.session;
  role = null;
  if (session) { const { data: p } = await sb.from('profiles').select('role,display_name').eq('id', session.user.id).maybeSingle(); role = p; }
  $('#loginLink').textContent = session ? 'خروج' : 'دخول';
  $('#adminLink').hidden = !(role && ['coordinator','team_member','principal','reviewer'].includes(role.role));
  try { const { data: lv } = await sb.from('evaluation_levels').select('code,min_pct'); if (lv && lv.length) THR = lv.filter(x => x.min_pct != null).map(x => [x.code, +x.min_pct]).sort((a, b) => b[1] - a[1]); } catch (e) {}
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
  return `<div class="dgrid">${doms.map((d, i) => {
    const dr = rs.filter(r => r.domain_id === d.domain_id), p = pubCount(dr), k = DOM[i % 4], pc = pctOf(p, dr.length);
    const nst = new Set(dr.map(r => r.standard_id)).size;
    const keys = ['excellence', 'advancement', 'launch', 'preparation', 'nolevel', 'unpub'].map(key => [key, dr.filter(r => stOf(r) === key).length]).filter(x => x[1]);
    return `<a class="dcard" style="--b:var(--c${k}b);--f:var(--c${k}f)" href="#domain/${id}/${d.domain_id}">
      <span class="dnum" aria-hidden="true">${num(d.domain_code)}</span>
      <div class="dtop"><span class="dic">${ic(DIC[i % 4])}</span><div class="dtit"><small>المجال ${num(d.domain_code)}</small><h3>${esc(d.domain_name)}</h3></div>
        <div class="dring" style="--p:${pc}" role="img" aria-label="نسبة النشر ${pc}٪"><b>${num(pc)}٪</b></div></div>
      <div class="dchips"><span>${ic('bars')} ${num(nst)} معايير</span><span>${ic('target')} ${num(dr.length)} مؤشراً</span><span>${ic('eye')} ${num(p)} منشور</span></div>
      <div class="dseg" role="img" aria-label="توزيع المستويات">${keys.map(([key, c]) => `<i class="sg ${key}" style="flex:${c}" title="${STL[key]}: ${num(c)}"></i>`).join('')}</div>
      <div class="dleg">${keys.map(([key, c]) => `<span><i class="dot ${key}"></i>${STL[key]} <b>${num(c)}</b></span>`).join('')}</div>
      ${isTeam() ? `<div class="dppl"><span>${ic('users')} المقيم: ${names(peopleOf(dr, 'eval'))}</span></div>` : ''}
      <span class="dgo">عرض المجال ${ic('arrow')}</span></a>`;
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
  const stat = pub
    ? `<div class="pstat ${LV[r.level_label] || 'none'}"><span class="pst-l">${ic('check')} تم التقييم</span><b class="pst-v">${esc(r.level_label || 'منشور')}</b><span class="pst-p">${r.achievement_pct != null ? num(Math.round(r.achievement_pct)) + '٪' : '—'}</span></div>`
    : `<div class="pstat none"><span class="pst-l">${ic('cal')} لم يُنشر التقييم بعد</span></div>`;
  const who = isTeam()
    ? `<div class="pwho"><div><small>مسؤول المؤشر</small><span class="av">${rp.length ? esc(initials(rp[0])) : ic('users')}</span><b title="${esc(rp.join('، '))}">${firstPlus(rp)}</b></div><div><small>المقيم</small><b title="${esc(ev.join('، '))}">${firstPlus(ev)}</b></div></div>` : '';
  return `<a class="pcard" style="--b:var(--c${k}b);--f:var(--c${k}f)" href="#ind/${r.cycle_id}/${r.indicator_id}">
    <div class="phead"><span class="ptrail">${esc(r.domain_name)} ‹ ${esc(r.standard_name)}</span><div class="pcode"><small>المؤشر</small><b>${esc(r.indicator_code)}</b></div></div>
    <div class="pbody"><p class="psub">${esc(r.official_text)}</p>
      ${who}${stat}
      <div class="bar"><span style="width:${pct}%"></span></div>
      <div class="pfoot"><small>المعيار ${esc(r.standard_code)}</small><span class="pbtn">عرض التفاصيل ${ic('arrow')}</span></div></div></a>`;
}

// ───────── الفرز المتقدم: نفس آلية الخطط الذكية ببيانات التقويم ─────────
const NOP = '__none';
const ST = [['excellence', 'التميز'], ['advancement', 'التقدم'], ['launch', 'الانطلاق'], ['preparation', 'التهيئة'], ['unpub', 'غير منشور']];
const STL = { ...Object.fromEntries(ST), nolevel: 'منشور بلا مستوى' };
const stOf = r => r.publish_state !== 'published' ? 'unpub' : (LV[r.level_label] || 'nolevel');
const FACETS = [['dom', 'المجال', 'layers', false], ['std', 'المعيار', 'doc', false], ['eval', 'المقيم (المنفذ)', 'users', true], ['resp', 'المسؤول', 'users', true]];
const SORTS = [['code', 'ترتيب: الرمز'], ['pct_desc', 'ترتيب: نسبة التحقق (الأعلى)'], ['pct_asc', 'ترتيب: نسبة التحقق (الأدنى)'], ['level', 'ترتيب: المستوى']];
const GROUPS = [['none', 'بدون تجميع', false], ['dom', 'تجميع: المجال', false], ['std', 'تجميع: المعيار', false], ['level', 'تجميع: المستوى', false], ['resp', 'تجميع: المسؤول', true], ['eval', 'تجميع: المقيم (المنفذ)', true]];
const freshHm = () => ({ q: '', st: '', sort: 'code', group: 'none', view: 'cards', adv: false, f: { dom: [], std: [], eval: [], resp: [] }, open: { dom: true, eval: true, std: false, resp: false } });
let hm = freshHm();

const fvals = (r, k) => { if (k === 'dom') return [r.domain_id]; if (k === 'std') return [r.standard_id]; const o = ownersOf(r, k); return o.length ? o : [NOP]; };
function pass(r, skip) {
  if (skip !== 'st' && hm.st && stOf(r) !== hm.st) return false;
  for (const [k, , , team] of FACETS) { if (k === skip || !hm.f[k].length || (team && !isTeam())) continue; if (!fvals(r, k).some(v => hm.f[k].includes(v))) return false; }
  const q = hm.q.trim().toLowerCase();
  return !q || [r.indicator_code, r.official_text, r.domain_name, r.standard_name, ...ownersOf(r, 'resp'), ...ownersOf(r, 'eval')].join(' ').toLowerCase().includes(q);
}
function facetOpts(k, all) {
  if (k === 'dom') return [...new Map(all.map(r => [r.domain_id, r]))].map(([id, r]) => [id, r.domain_name, r.domain_code]).sort((a, b) => sortCodes(a[2], b[2]));
  if (k === 'std') return [...new Map(all.map(r => [r.standard_id, r]))].map(([id, r]) => [id, `${r.standard_code} · ${r.standard_name}`, r.standard_code]).sort((a, b) => sortCodes(a[2], b[2]));
  return [...peopleOf(all, k).sort((a, b) => a.localeCompare(b, 'ar')).map(n => [n, n]), [NOP, 'غير مُسند']];
}
const lrank = r => { const i = ST.findIndex(x => x[0] === stOf(r)); return i < 0 ? 3.5 : i; };
const pctv = r => r.publish_state === 'published' ? Number(r.achievement_pct) || 0 : -1;
function sortRows(rs) {
  const a = [...rs], c = (x, y) => sortCodes(x.indicator_code, y.indicator_code);
  if (hm.sort === 'pct_desc') a.sort((x, y) => pctv(y) - pctv(x) || c(x, y));
  else if (hm.sort === 'pct_asc') a.sort((x, y) => (pctv(x) < 0) - (pctv(y) < 0) || pctv(x) - pctv(y) || c(x, y));
  else if (hm.sort === 'level') a.sort((x, y) => lrank(x) - lrank(y) || c(x, y));
  else a.sort(c);
  return a;
}
function groupRows(rs) {
  const g = hm.group; if (g === 'none' || (!isTeam() && (g === 'resp' || g === 'eval'))) return [[null, rs]];
  const m = new Map(), add = (key, label, r) => { const e = m.get(key) || { label, list: [] }; e.list.push(r); m.set(key, e); };
  rs.forEach(r => {
    if (g === 'dom') add(r.domain_code, r.domain_name, r);
    else if (g === 'std') add(r.standard_code, `المعيار ${r.standard_code} · ${r.standard_name}`, r);
    else if (g === 'level') add(String(lrank(r)), STL[stOf(r)], r);
    else { const o = ownersOf(r, g); (o.length ? o : [NOP]).forEach(n => add(n, n === NOP ? 'غير مُسند' : n, r)); }
  });
  const people = g === 'resp' || g === 'eval';
  return [...m].sort((a, b) => people ? (a[0] === NOP) - (b[0] === NOP) || a[1].label.localeCompare(b[1].label, 'ar') : sortCodes(a[0], b[0])).map(([, e]) => [e.label, e.list]);
}

function lrow(r) {
  const pub = r.publish_state === 'published';
  return `<a class="ind lrow" href="#ind/${r.cycle_id}/${r.indicator_id}"><code>${esc(r.indicator_code)}</code>
    <p>${esc(r.official_text)}<small class="lmeta">${esc(r.domain_name)} · المعيار ${esc(r.standard_code)}${isTeam() ? ` · المسؤول: ${names(ownersOf(r, 'resp'))} · المقيم: ${names(ownersOf(r, 'eval'))}` : ''}</small></p>
    ${pub ? `${lvl(r.level_label)} <span class="pct">${num(r.achievement_pct)}٪</span>` : '<span class="lvl none">غير منشور</span>'}</a>`;
}
function pillsHtml(all) {
  const base = all.filter(r => pass(r, 'st'));
  const keys = [...ST.map(x => x[0])]; if (all.some(r => stOf(r) === 'nolevel')) keys.splice(4, 0, 'nolevel');
  const mk = (key, label, n) => `<button type="button" class="spill${hm.st === key ? ' on' : ''}${n ? '' : ' zero'}" data-st="${key}" aria-pressed="${hm.st === key}"><i class="dot ${key || 'all'}"></i>${label}<em>${num(n)}</em></button>`;
  return mk('', 'الكل', base.length) + keys.map(k => mk(k, STL[k], base.filter(r => stOf(r) === k).length)).join('');
}
function panelHtml(all) {
  const sel = (id, ico, opts, cur) => `<label class="fsel">${ic(ico)}<select id="${id}">${opts.map(o => `<option value="${o[0]}"${cur === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label>`;
  return `<div class="frow">${sel('f-sort', 'bars', SORTS, hm.sort)}${sel('f-group', 'layers', GROUPS.filter(g => !g[2] || isTeam()), hm.group)}<button type="button" class="btn soft" data-reset>${ic('reset')} إعادة ضبط</button></div>
    <div class="fgrid">${FACETS.filter(f => !f[3] || isTeam()).map(([k, title, icon]) => {
      const open = hm.open[k], n = hm.f[k].length;
      return `<section class="facet${open ? ' open' : ''}"><button type="button" class="fhead" data-fh="${k}" aria-expanded="${open}">${ic(icon)}<b>${title}</b>${n ? `<em class="fn">${num(n)}</em>` : ''}<span class="chev">${ic('chev')}</span></button>` +
        (open ? `<div class="fbody">${facetOpts(k, all).map(([v, t]) => { const c = all.filter(r => pass(r, k) && fvals(r, k).includes(v)).length;
          return `<label class="fopt${c ? '' : ' zero'}"><input type="checkbox" data-f="${k}" data-v="${esc(v)}"${hm.f[k].includes(v) ? ' checked' : ''}><span>${esc(t)}</span><em>${num(c)}</em></label>`; }).join('')}</div>` : '') + `</section>`; }).join('')}</div>`;
}

function renderList(cid) {
  const all = byCycle(cid), rs = sortRows(all.filter(r => pass(r)));
  $('#icount').textContent = `${num(rs.length)} من ${num(all.length)} مؤشراً`;
  $('#pills').innerHTML = pillsHtml(all);
  const nf = Object.entries(hm.f).filter(([k]) => isTeam() || k === 'dom' || k === 'std').reduce((n, [, a]) => n + a.length, 0);
  $('#advbtn').className = 'fbtn' + (hm.adv ? ' on' : ''); $('#advbtn').setAttribute('aria-expanded', hm.adv);
  $('#advbtn').innerHTML = `${ic('layers')} الفرز المتقدم${nf ? ` <em class="fn">${num(nf)}</em>` : ''}`;
  $('#vbtns').innerHTML = [['list', 'عرض القائمة'], ['cards', 'عرض البطاقات']].map(([v, t]) => `<button type="button" class="vbtn${hm.view === v ? ' on' : ''}" data-view="${v}" aria-pressed="${hm.view === v}">${ic(v === 'cards' ? 'grid' : 'list')} <span>${t}</span></button>`).join('');
  const fp = $('#fpanel'); fp.hidden = !hm.adv;
  if (hm.adv) { const sc = [...document.querySelectorAll('.fbody')].map(e => e.scrollTop); fp.innerHTML = panelHtml(all); [...document.querySelectorAll('.fbody')].forEach((e, i) => { e.scrollTop = sc[i] || 0; }); }
  $('#ilist').innerHTML = rs.length ? groupRows(rs).map(([g, list]) => (g ? `<div class="sec"><h2>${esc(g)}</h2><span class="chip">${num(list.length)} مؤشراً</span></div>` : '') +
    (hm.view === 'list' ? `<div class="lrows">${list.map(lrow).join('')}</div>` : `<div class="pgrid">${list.map(pcard).join('')}</div>`)).join('')
    : `<div class="panel"><p class="muted">لا توجد مؤشرات مطابقة. غيّر الفلاتر أو أعد ضبطها.</p></div>`;
}

function home() {
  const cs = cycles(), first = cs[0], rs = first ? byCycle(first[0]) : [];
  const pub = pubCount(rs);
  const cnt = k => new Set(rs.map(r => r[k])).size;
  if (!isTeam()) { hm.f.eval = []; hm.f.resp = []; if (hm.group === 'resp' || hm.group === 'eval') hm.group = 'none'; }
  const pp = pctOf(pub, rs.length);
  view.innerHTML = `<section class="hero2"><div class="h2-txt"><span class="chip">${ic('cal')} ${first ? esc(first[1]) : 'التقويم الذاتي المدرسي'}</span>
    <h1><span class="gold">التقويم الذاتي</span> الذكي</h1>
    <p class="h2-sch">مدرسة لبيد بن ربيعة المتوسطة</p>
    <p class="h2-p">بوابة شفافة تعرض مجالات التقويم الذاتي ومعاييره ومؤشراته ونتائجه المعتمدة، وفق دليل هيئة تقويم التعليم والتدريب.</p>
    <div class="h2-cta"><button type="button" class="btn gold" id="goInd">استعرض المؤشرات ${ic('arrow')}</button><a class="btn ghost" href="#results">نتائج الدورات</a></div>
    <div class="pills"><span class="pill">${ic('check')} نتائج معتمدة</span><span class="pill">${ic('doc')} شواهد موثّقة</span><span class="pill">${ic('shield')} خصوصية محمية</span></div></div>
    <div class="h2-panel"><div class="h2-ring" style="--p:${first ? pp : 0}" role="img" aria-label="نسبة النشر ${pp}٪"><div><b>${first ? num(pp) + '٪' : '—'}</b><small>نسبة النشر</small></div></div>
      <div class="h2-stats"><div><b>${num(first ? cnt('domain_id') : 4)}</b><span>مجالات</span></div><div><b>${num(first ? cnt('standard_id') : 11)}</b><span>معياراً</span></div>
        <div><b>${num(first ? rs.length : 49)}</b><span>مؤشراً</span></div><div><b>${first ? num(pub) : '—'}</b><span>${first ? 'منشورة' : 'لا دورة منشورة'}</span></div></div></div></section>` +
    (first && rs.length ? `<div class="sec"><div><h2>مجالات التقويم</h2><p class="muted sub">اضغط على أي مجال لعرض معاييره ومؤشراته.</p></div></div>` + domCards(first[0], rs) +
      `<div class="sec" id="ihead"><div><h2>مؤشرات التقويم</h2><p class="muted sub">ابحث وافرز وجمّع المؤشرات كما تريد.</p></div><span class="chip" id="icount"></span></div>
      <div class="fbar" id="fbar" role="search"><label class="fsearch">${ic('search')}<input type="search" id="iq" placeholder="ابحث بالرمز أو النص أو المسؤول أو المقيم" value="${esc(hm.q)}" aria-label="بحث في المؤشرات"></label>
        <button type="button" class="fbtn" id="advbtn" aria-expanded="false"></button><div class="pills2" id="pills"></div><div class="vbtns" id="vbtns"></div></div>
      <div class="fpanel" id="fpanel" hidden></div>
      ${isTeam() ? '' : '<p class="muted tnote">الفلترة والتجميع بالمسؤول وبالمقيم متاحة لفريق التقويم بعد تسجيل الدخول.</p>'}<div id="ilist"></div>` : noResults());
  if (first && rs.length) {
    const cid = first[0], again = () => renderList(cid);
    $('#goInd').onclick = () => { const h = $('#ihead'); if (h && h.scrollIntoView) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    $('#iq').oninput = e => { hm.q = e.target.value; again(); };
    $('#fbar').onclick = e => {
      const st = e.target.closest('[data-st]'), vw = e.target.closest('[data-view]'), ab = e.target.closest('#advbtn');
      if (st) hm.st = st.dataset.st === hm.st ? '' : st.dataset.st; else if (vw) hm.view = vw.dataset.view; else if (ab) hm.adv = !hm.adv; else return;
      again();
    };
    $('#fpanel').onclick = e => {
      const fh = e.target.closest('[data-fh]');
      if (fh) { hm.open[fh.dataset.fh] = !hm.open[fh.dataset.fh]; again(); }
      else if (e.target.closest('[data-reset]')) { hm = { ...freshHm(), view: hm.view, adv: hm.adv }; $('#iq').value = ''; again(); }
    };
    $('#fpanel').onchange = e => {
      const t = e.target;
      if (t.dataset && t.dataset.f) { const a = hm.f[t.dataset.f], i = a.indexOf(t.dataset.v); if (i < 0) a.push(t.dataset.v); else a.splice(i, 1); }
      else if (t.id === 'f-sort') hm.sort = t.value; else if (t.id === 'f-group') hm.group = t.value; else return;
      again();
      if (t.dataset && t.dataset.f) { const el = [...document.querySelectorAll('.fopt input')].find(x => x.dataset.f === t.dataset.f && x.dataset.v === t.dataset.v); if (el) el.focus(); }
    };
    again();
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

// شريط توزيع المستويات + مفتاحه (يُستخدم في صفحة المجال)
const LKEYS = ['excellence', 'advancement', 'launch', 'preparation', 'nolevel', 'unpub'];
const lcounts = rs => LKEYS.map(key => [key, rs.filter(r => stOf(r) === key).length]).filter(x => x[1]);
const segHtml = rs => { const ks = lcounts(rs);
  return `<div class="dseg" role="img" aria-label="توزيع المستويات">${ks.map(([key, c]) => `<i class="sg ${key}" style="flex:${c}" title="${STL[key]}: ${num(c)}"></i>`).join('')}</div>` +
    `<div class="dleg">${ks.map(([key, c]) => `<span><i class="dot ${key}"></i>${STL[key]} <b>${num(c)}</b></span>`).join('')}</div>`; };
let sv = 'cards';

function domain(cid, did) {
  const rs = byCycle(cid).filter(r => r.domain_id === did); if (!rs.length) { view.innerHTML = noResults(); return; }
  const i = Math.max(0, domIdx(cid, did)), k = DOM[i % 4], sts = stdsOf(rs), p = pubCount(rs), pc = pctOf(p, rs.length), d = rs[0];
  const gl = grpLevel(rs), ev = peopleOf(rs, 'eval'), rp = peopleOf(rs, 'resp');
  const chips = a => a.length ? a.map(n => `<span class="pchip">${esc(n)}</span>`).join('') : `<span class="muted">${NONE}</span>`;
  view.innerHTML = crumbs([['النتائج', '#results'], [d.cycle_name, '#cycle/' + cid], [d.domain_name]]) +
    `<section class="hero2 dhero glv ${gl.key}"><div class="h2-txt"><span class="chip">${ic('cal')} ${esc(d.cycle_name)}</span>
      <div class="dh-title"><span class="dh-ic">${ic(DIC[i % 4])}</span><div><small>المجال ${num(d.domain_code)}</small><h1>${esc(d.domain_name)}</h1></div></div>
      <span class="glbadge">مستوى المجال: ${GL[gl.key]}${gl.avg != null ? ' · ' + num(Math.round(gl.avg)) + '٪' : ''}</span>
      <p class="h2-p">يضم هذا المجال ${num(sts.length)} معايير و${num(rs.length)} مؤشراً، منها ${num(p)} منشورة.</p>
      <div class="dh-seg">${segHtml(rs)}</div>
      <div class="h2-cta"><button type="button" class="btn gold" id="goStd">استعرض المعايير ${ic('arrow')}</button><a class="btn ghost" href="#home">الرئيسية</a></div></div>
      <div class="h2-panel"><div class="h2-ring" style="--p:${pc}" role="img" aria-label="نسبة النشر ${pc}٪"><div><b>${num(pc)}٪</b><small>نسبة النشر</small></div></div>
        <div class="h2-stats"><div><b>${num(sts.length)}</b><span>معايير</span></div><div><b>${num(rs.length)}</b><span>مؤشراً</span></div>
          <div><b>${num(p)}</b><span>منشورة</span></div><div><b>${num(rs.length - p)}</b><span>غير منشورة</span></div></div></div></section>` +
    (isTeam() ? `<div class="people"><div class="pp"><h3>مقيمو المجال</h3><div>${chips(ev)}</div></div><div class="pp"><h3>مسؤولو المجال</h3><div>${chips(rp)}</div></div></div>`
      : `<p class="muted tnote">بيانات المقيمين والمسؤولين متاحة لفريق التقويم بعد تسجيل الدخول.</p>`) +
    `<div class="sec" id="shead"><div><h2>معايير المجال</h2><p class="muted sub">اضغط على أي معيار لعرض مؤشراته.</p></div><div class="vbtns" id="svbtns"></div></div><div id="slist"></div>
    <div class="sec"><div><h2>مؤشرات المجال</h2><p class="muted sub">ملوّنة بمستوى كل مؤشر.</p></div></div><div class="irows">${rs.slice().sort((a, b) => sortCodes(a.indicator_code, b.indicator_code)).map(r => { const pub = r.publish_state === 'published';
      return `<a class="irow glv ${pub ? (LV[r.level_label] || 'none') : 'none'}" href="#ind/${cid}/${r.indicator_id}"><code>${esc(r.indicator_code)}</code><span class="itx">${esc(r.official_text)}</span><span class="glbadge s">${pub ? esc(r.level_label || 'منشور') + (r.achievement_pct != null ? ' · ' + num(Math.round(r.achievement_pct)) + '٪' : '') : 'غير منشور'}</span></a>`; }).join('')}</div>`;

  const card = s => {
    const sr = rs.filter(r => r.standard_id === s.standard_id), sp = pubCount(sr), sc = pctOf(sp, sr.length);
    const g = grpLevel(sr); return `<a class="wcard glv ${g.key}" style="--b:var(--c${k}b)" href="#standard/${cid}/${s.standard_id}">
      <span class="wcode"><small>المعيار</small><b>${esc(s.standard_code)}</b></span>
      <div class="wmain"><h3>${esc(s.standard_name)}</h3>
        <div class="dchips"><span class="glbadge s">${GL[g.key]}${g.avg != null ? ' · ' + num(Math.round(g.avg)) + '٪' : ''}</span><span>${ic('target')} ${num(sr.length)} مؤشراً</span><span>${ic('eye')} ${num(sp)} منشور</span></div>
        ${segHtml(sr)}
        ${isTeam() ? `<div class="dppl"><span>${ic('users')} المقيم: ${names(peopleOf(sr, 'eval'))}</span><span>${ic('users')} المسؤول: ${names(peopleOf(sr, 'resp'))}</span></div>` : ''}</div>
      <div class="wside"><div class="dring" style="--p:${sc}" role="img" aria-label="نسبة النشر ${sc}٪"><b>${num(sc)}٪</b></div><span class="dgo">عرض المؤشرات ${ic('arrow')}</span></div></a>`;
  };
  const row = s => {
    const sr = rs.filter(r => r.standard_id === s.standard_id), sp = pubCount(sr), sc = pctOf(sp, sr.length), ks = lcounts(sr);
    const g = grpLevel(sr); return `<a class="srow glv ${g.key}" style="--b:var(--c${k}b)" href="#standard/${cid}/${s.standard_id}"><code>${esc(s.standard_code)}</code>
      <div class="sname"><b>${esc(s.standard_name)}</b>${isTeam() ? `<small>المقيم: ${names(peopleOf(sr, 'eval'))} · المسؤول: ${names(peopleOf(sr, 'resp'))}</small>` : ''}</div>
      <span class="scnt">${num(sr.length)} مؤشراً · ${num(sp)} منشور</span>
      <div class="dseg" role="img" aria-label="توزيع المستويات">${ks.map(([key, c]) => `<i class="sg ${key}" style="flex:${c}" title="${STL[key]}: ${num(c)}"></i>`).join('')}</div>
      <b class="spct">${num(sc)}٪</b>${ic('arrow')}</a>`;
  };
  const draw = () => {
    $('#svbtns').innerHTML = [['list', 'عرض القائمة'], ['cards', 'عرض البطاقات']].map(([v, t]) => `<button type="button" class="vbtn${sv === v ? ' on' : ''}" data-sv="${v}" aria-pressed="${sv === v}">${ic(v === 'cards' ? 'grid' : 'list')} <span>${t}</span></button>`).join('');
    $('#slist').innerHTML = sv === 'list' ? `<div class="srows">${sts.map(row).join('')}</div>` : `<div class="wgrid">${sts.map(card).join('')}</div>`;
  };
  $('#svbtns').onclick = e => { const b = e.target.closest('[data-sv]'); if (b) { sv = b.dataset.sv; draw(); } };
  $('#goStd').onclick = () => { const h = $('#shead'); if (h && h.scrollIntoView) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  draw();
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
