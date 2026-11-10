(() => {
const sb = App.sb;
const $ = s => document.querySelector(s), view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LV = { 'التميز':'excellence','التقدم':'advancement','الانطلاق':'launch','التهيئة':'preparation' };
const lvl = l => `<span class="lvl ${LV[l]||'none'}">${esc(l||'غير مُقيَّم')}</span>`;
const num = n => Number(n).toLocaleString('ar-SA-u-ca-gregory-nu-latn');
const DOM = [0, 3, 2, 1]; // ألوان المجالات الأربعة: تيل، ذهبي، بنفسجي، أزرق
const IC = {
  layers:'<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>', check:'<path d="M5 12l5 5 9-10"/>',
  doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5M10 17h5"/>', shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  bell:'<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>', cal:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  bars:'<path d="M5 20V10M12 20V4M19 20v-7"/>', target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  mgmt:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 10l1.5 1.5 2.5-3M8.5 16l1.5 1.5 2.5-3M15 10.5h1.5M15 16.5h1.5"/>', board:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 8.5h6M7 12h9M9 16l-2 4M15 16l2 4M12 16v4"/>', growth:'<rect x="3.5" y="14" width="4" height="6" rx="1"/><rect x="10" y="10" width="4" height="10" rx="1"/><rect x="16.5" y="7" width="4" height="13" rx="1"/><path d="M18.5 1.0L19.1 2.7L21.0 2.8L19.5 3.9L20.0 5.7L18.5 4.7L17.0 5.7L17.5 3.9L16.0 2.8L17.9 2.7z"/>', 
  leader:'<path d="M12.0 1.4L12.8 3.5L15.0 3.6L13.3 5.0L13.9 7.2L12.0 6.0L10.1 7.2L10.7 5.0L9.0 3.6L11.2 3.5z"/><circle cx="12" cy="12.2" r="2.8"/><path d="M6 21c.5-3.6 2.8-5.4 6-5.4s5.5 1.8 6 5.4"/>', school:'<path d="M3 10.5L12 5l9 5.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M10 20v-5h4v5"/><path d="M12 5V2.5l3 1-3 1"/>',
  book:'<path d="M5 4h9a4 4 0 014 4v12H9a4 4 0 01-4-4z"/><path d="M5 16a4 4 0 014-4h9"/>', eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
Object.assign(IC, {
  arrow:'<path d="M19 12H5M11 6l-6 6 6 6"/>', users:'<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 010 6M18 14c2 .6 3 2.2 3 5"/>',
  reset:'<path d="M4 12a8 8 0 108-8H7M7 4L4 7l3 3"/>', search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>', chev:'<path d="M7 10l5 5 5-5"/>' });
const domPat = n => { const g = `<g fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${[[8, 8], [56, 56]].map(([x, y]) => `<g transform="translate(${x} ${y}) scale(1.6)">${IC[n]}</g>`).join('')}</g>`; return `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">${g}</svg>`)}')`; };
const ic = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const DIC = ['mgmt', 'board', 'growth', 'school']; // تطابق رسوم بطاقات المؤشرات
let rows = [], session = null, role = null;

// عتبات المستويات (تُحمَّل من evaluation_levels، وهذه قيم احتياطية مطابقة لها)
let THR = [['excellence', 90], ['advancement', 75], ['launch', 50], ['preparation', 0]];
// مستوى مجموعة مؤشرات: متوسط نسب المؤشرات المنشورة (طريقة مؤقتة غير واردة في الدليل) — رمادي إن لم يوجد منشور
const grpLevel = rs => { const v = rs.filter(r => r.publish_state === 'published' && r.achievement_pct != null).map(r => +r.achievement_pct);
  if (!v.length) return { key: 'none', avg: null };
  const avg = v.reduce((a, b) => a + b, 0) / v.length, t = THR.find(x => avg >= x[1]);
  return { key: t ? t[0] : 'preparation', avg }; };
const resOf = rs => { const g = grpLevel(rs); return { g, txt: g.avg != null ? num(Math.round(g.avg)) + '%' : '—', name: GL[g.key], p: g.avg != null ? Math.round(g.avg) : 0 }; };
const GL = { excellence: 'التميز', advancement: 'التقدم', launch: 'الانطلاق', preparation: 'التهيئة', none: 'بلا تقييم منشور' };
async function load() {
  // طلبات مستقلة تُنفَّذ بالتوازي بدل التتابع لتقليل زمن أول عرض
  const [res, sess, lvRes] = await Promise.all([
    sb.from('public_results').select('*').order('indicator_code'),
    sb.auth.getSession(),
    Promise.resolve(sb.from('evaluation_levels').select('code,min_pct')).catch(() => ({ data: null }))]);
  if (res.error) throw res.error; rows = res.data || [];
  session = sess.data.session;
  role = null;
  if (session) { const { data: p } = await sb.from('profiles').select('role,display_name').eq('id', session.user.id).maybeSingle(); role = p; }
  $('#loginLink').textContent = session ? 'خروج' : 'دخول';
  $('#adminLink').hidden = !(role && ['coordinator','team_member','principal','reviewer'].includes(role.role));
  const lv = lvRes && lvRes.data;
  if (lv && lv.length) THR = lv.filter(x => x.min_pct != null).map(x => [x.code, +x.min_pct]).sort((a, b) => b[1] - a[1]);
  await loadOwners();
}
// المسؤولون والمقيمون: تقرؤهم قاعدة البيانات للفريق فقط (RLS)؛ الزائر والمقيم الخارجي لا يصلهم شيء.
const newOw = () => ({ resp: { ind: new Map(), dom: new Map() }, eval: { ind: new Map(), dom: new Map() } });
let owners = newOw();
const avByName = new Map();   // الاسم ← رابط الصورة (للفريق فقط، كالأسماء نفسها)
const ini = n => { const w = String(n || '؟').trim().split(/\s+/), l = w.length > 1 ? w[w.length - 1].replace(/^ال/, '') : ''; return w[0][0] + (l ? l[0] : ''); };
const pav = (n, sz = 26) => `<span class="pav${avByName.has(n) ? '' : ' ini'}" style="--s:${sz}px">${avByName.has(n) ? `<img src="${esc(avByName.get(n))}" alt="" loading="lazy">` : `<i>${esc(ini(n))}</i>`}</span>`;
window.PAV = pav; window.AVURL = n => avByName.get(n) || '';
const isTeam = () => !!(role && ['coordinator','team_member','principal','reviewer'].includes(role.role));
async function loadOwners() {
  owners = newOw();
  if (!isTeam()) return;
  const [st, ia, da] = await Promise.all([
    sb.from('staff').select('id,full_name,avatar_path'),
    sb.from('indicator_assignments').select('cycle_id,indicator_id,staff_id,kind'),
    sb.from('domain_assignments').select('cycle_id,domain_id,staff_id,kind')]);
  if (st.error || ia.error || da.error) { console.error(st.error || ia.error || da.error); return; }
  const nm = new Map((st.data || []).map(x => [x.id, x.full_name]));
  (st.data || []).forEach(x => { if (x.avatar_path) avByName.set(x.full_name, sb.storage.from('avatars').getPublicUrl(x.avatar_path).data.publicUrl); });
  const add = (m, k, sid) => { const n = nm.get(sid); if (n) m.set(k, [...new Set([...(m.get(k) || []), n])]); };
  const kk = a => a.kind === 'evaluator' ? 'eval' : 'resp';
  (ia.data || []).forEach(a => add(owners[kk(a)].ind, a.cycle_id + '|' + a.indicator_id, a.staff_id));
  (da.data || []).forEach(a => add(owners[kk(a)].dom, a.cycle_id + '|' + a.domain_id, a.staff_id));
}
const ownersOf = (r, kind = 'resp') => [...new Set([...(owners[kind].ind.get(r.cycle_id + '|' + r.indicator_id) || []), ...(owners[kind].dom.get(r.cycle_id + '|' + r.domain_id) || [])])];
const peopleOf = (rs, kind) => [...new Set(rs.flatMap(r => ownersOf(r, kind)))];
const NONE = 'لم يُسند بعد';
const names = a => a.length ? esc(a.join('، ')) : NONE;
const personBlk = (label, a) => `<div class="lp"><span class="lp-l">${label}</span>${a.length
  ? `<div class="lp-v"><span class="lp-st">${a.slice(0, 3).map(n => pav(n, 38)).join('')}${a.length > 3 ? `<span class="pav more" style="--s:38px"><i>+${num(a.length - 3)}</i></span>` : ''}</span><b class="lp-n" title="${esc(a.join('، '))}">${esc(a.join('، '))}</b></div>`
  : `<div class="lp-v"><span class="lp-none">${NONE}</span></div>`}</div>`;
const namesAv = a => a.length ? a.map(n => `<span class="pnm">${pav(n, 22)}${esc(n)}</span>`).join('') : NONE;
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
    return `<div class="dcard" role="button" tabindex="0" data-fdom="${d.domain_id}" aria-pressed="false" style="--b:var(--c${k}b);--f:var(--c${k}f)">
      <span class="dnum" aria-hidden="true">${num(d.domain_code)}</span>
      <div class="dtop"><span class="dic">${ic(DIC[i % 4])}</span><div class="dtit"><small>المجال ${num(d.domain_code)}</small><h3>${esc(d.domain_name)}</h3></div>
        ${(() => { const q = resOf(dr); return `<div class="dres glv ${q.g.key}" role="img" aria-label="النتيجة ${q.txt}، ${q.name}"><b>${q.txt}</b><span>${q.name}</span></div>`; })()}</div>
      <div class="dchips"><span>${ic('bars')} ${num(nst)} معايير</span><span>${ic('target')} ${num(dr.length)} مؤشراً</span><span>${ic('eye')} ${num(p)} منشور</span></div>
      <div class="dseg" role="img" aria-label="توزيع المستويات">${keys.map(([key, c]) => `<i class="sg ${key}" style="flex:${c}" title="${STL[key]}: ${num(c)}"></i>`).join('')}</div>
      <div class="dleg">${keys.map(([key, c]) => `<span><i class="dot ${key}"></i>${STL[key]} <b>${num(c)}</b></span>`).join('')}</div>
      ${isTeam() ? `<div class="dppl"><span>${ic('users')} المقيم: ${names(peopleOf(dr, 'eval'))}</span></div>` : ''}
      <div class="dgo2"><span class="dfil">${ic('search')} فرز المؤشرات</span><a class="dgo" href="#domain/${id}/${d.domain_id}" data-go>الانتقال إلى صفحة المجال ${ic('arrow')}</a></div></div>`;
  }).join('')}</div>`;
}

// رسوم المجالات الأربعة (أصلية، خطوط وتعبئات بدرجات لون المجال الهادئة؛ التنسيق في theme.css)
const SP = (x, y, c) => `<path transform="translate(${x} ${y})" d="M0-8L2-2 8 0 2 2 0 8-2 2-8 0-2-2z" ${c ? `fill="${c}"` : 'class="ak"'}/>`;
const ILL = [
  // الإدارة المدرسية: لوحة تخطيط ومتابعة بقائمة مهام، وهدف بسهم، وترس تشغيل
  `<rect class="aw" x="104" y="38" width="108" height="118" rx="10"/><rect class="af" x="138" y="30" width="40" height="17" rx="6"/><path class="al" d="M120 74l6 6 10-12M120 100l6 6 10-12"/><path class="al" d="M146 74h50M146 100h50M146 126h50"/><circle class="al" cx="128" cy="126" r="6"/><circle class="aw" cx="76" cy="122" r="22"/><circle class="af" cx="76" cy="122" r="12"/><circle class="ag" cx="76" cy="122" r="4"/><path class="al" d="M76 122l22-22M98 100v10M98 100h10"/><path class="al" d="M255.0 110.0L262.0 110.0M250.6 120.6L255.6 125.6M240.0 125.0L240.0 132.0M229.4 120.6L224.4 125.6M225.0 110.0L218.0 110.0M229.4 99.4L224.4 94.4M240.0 95.0L240.0 88.0M250.6 99.4L255.6 94.4"/><circle class="af" cx="240" cy="110" r="15"/><circle class="aw" cx="240" cy="110" r="5"/>`,
  // التعليم والتعلم: سبّورة بدروس ومصباح فكرة
  `<rect class="aw" x="78" y="40" width="164" height="92" rx="10"/><path class="al" d="M98 64h64M98 82h96M98 100h52"/><rect class="af" x="176" y="92" width="48" height="26" rx="6"/><path class="al" d="M120 132l-14 28M200 132l14 28M160 132v28"/><circle class="ag" cx="236" cy="48" r="13"/><path class="al" d="M230 66h12"/>`,
  // نواتج التعلم: درجات صاعدة ونجمة تفوّق
  `<rect class="af" x="84" y="108" width="42" height="42" rx="6"/><rect class="aw" x="139" y="84" width="42" height="66" rx="6"/><rect class="af" x="194" y="60" width="42" height="90" rx="6"/><path class="al" d="M92 90l50-20 36 8 44-26"/><path class="ag" d="M215 28l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z"/>`,
  // البيئة المدرسية: المبنى المدرسي
  `<path class="al" d="M160 54V28"/><path class="ag" d="M160 28l24 8-24 8z"/><path class="af" d="M74 100L160 56l86 44z"/><rect class="aw" x="88" y="100" width="144" height="52" rx="4"/><rect class="af" x="146" y="118" width="28" height="34" rx="4"/><rect class="af" x="102" y="114" width="26" height="18" rx="3"/><rect class="af" x="192" y="114" width="26" height="18" rx="3"/><circle class="ag" cx="160" cy="84" r="6"/><path class="al" d="M70 152h180"/>`];
const illus = i => `<svg class="pill-art" viewBox="0 0 320 190" aria-hidden="true"><ellipse class="ad" cx="160" cy="164" rx="112" ry="9"/>${ILL[i % 4]}${SP(48, 54)}${SP(276, 120)}${SP(282, 40, '#f3c969')}</svg>`;
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
    ? `<div class="pstat ${LV[r.level_label] || 'none'}"><span class="pst-l">${ic('check')} تم التقييم</span><b class="pst-v">${esc(r.level_label || 'منشور')}</b><span class="pst-p">${r.achievement_pct != null ? num(Math.round(r.achievement_pct)) + '%' : '—'}</span></div>`
    : `<div class="pstat none"><span class="pst-l">${ic('cal')} لم يُنشر التقييم بعد</span></div>`;
  const pw = (label, a, sz = 40) => `<div class="pw"><span class="pw-st">${a.slice(0, 2).map(n => pav(n, sz)).join('')}${a.length > 2 ? `<span class="pav more" style="--s:${sz}px"><i>+${num(a.length - 2)}</i></span>` : ''}${a.length ? '' : `<span class="pav" style="--s:${sz}px">${ic('users')}</span>`}</span><div class="pw-t"><small>${label}</small><b title="${esc(a.join('، '))}">${a.length ? esc(a.join('، ')) : NONE}</b></div></div>`;
  const who = isTeam() ? `<div class="pwho">${pw('مسؤول المؤشر', rp)}${pw('المقيّم', ev)}</div>` : '';
  return `<a class="pcard" style="--b:var(--c${k}b);--f:var(--c${k}f)" href="#ind/${r.cycle_id}/${r.indicator_id}">
    <div class="phead sm" data-fdom="${r.domain_id}" title="فرز حسب هذا المجال"><span>${ic('layers')} المجال ${num(r.domain_code)}</span><b>${esc(r.domain_name)}</b><em class="pgo" data-go="#domain/${r.cycle_id}/${r.domain_id}" title="الانتقال إلى صفحة المجال">${ic('arrow')}</em></div>
    <div class="pimg">${illus(i)}${badge}</div>
    <div class="pbody"><span class="pchip2" data-fstd="${r.standard_id}" title="فرز حسب هذا المعيار">${ic('doc')} المعيار ${esc(r.standard_code)} · ${esc(r.standard_name)}<em class="pgo" data-go="#standard/${r.cycle_id}/${r.standard_id}" title="الانتقال إلى صفحة المعيار">${ic('arrow')}</em></span>
      <h3>المؤشر ${esc(r.indicator_code)}</h3><p class="psub">${esc(r.official_text)}</p>
      ${who}${stat}
      <div class="bar"><span style="width:${pct}%"></span></div>
      <div class="pfoot"><span class="pbtn">عرض التفاصيل ${ic('arrow')}</span></div></div></a>`;
}

// ───────── الفرز المتقدم: نفس آلية الخطط الذكية ببيانات التقويم ─────────
const NOP = '__none';
const ST = [['excellence', 'التميز'], ['advancement', 'التقدم'], ['launch', 'الانطلاق'], ['preparation', 'التهيئة'], ['unpub', 'غير منشور']];
const STL = { ...Object.fromEntries(ST), nolevel: 'منشور بلا مستوى' };
const stOf = r => r.publish_state !== 'published' ? 'unpub' : (LV[r.level_label] || 'nolevel');
const FACETS = [['dom', 'المجال', 'layers', false], ['std', 'المعيار', 'doc', false], ['eval', 'المقيم (المنفذ)', 'users', true], ['resp', 'المسؤول', 'users', true]];
const SORTS = [['code', 'ترتيب: الرمز'], ['pct_desc', 'ترتيب: نسبة التحقق (الأعلى)'], ['pct_asc', 'ترتيب: نسبة التحقق (الأدنى)'], ['level', 'ترتيب: المستوى']];
const GROUPS = [['none', 'بدون تجميع', false], ['dom', 'تجميع: المجال', false], ['std', 'تجميع: المعيار', false], ['level', 'تجميع: المستوى', false], ['resp', 'تجميع: المسؤول', true], ['eval', 'تجميع: المقيم (المنفذ)', true]];
const freshHm = () => ({ q: '', st: '', sort: 'code', group: 'none', view: 'list', adv: false, f: { dom: [], std: [], eval: [], resp: [] }, open: { dom: true, eval: true, std: false, resp: false } });
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
  const k = dColor(r), pub = r.publish_state === 'published', pct = pub ? Number(r.achievement_pct) || 0 : 0;
  const li = Math.max(0, domIdx(r.cycle_id, r.domain_id));
  const team = isTeam();
  const st = pub ? `<div class="lr-st">${lvl(r.level_label)}<span class="lr-pct">${r.achievement_pct != null ? num(Math.round(r.achievement_pct)) + '%' : '—'}</span></div>`
    : `<div class="lr-st"><span class="lvl none">غير منشور</span></div>`;
  return `<a class="lrow2" style="--b:var(--c${k}b);--f:var(--c${k}f)" href="#ind/${r.cycle_id}/${r.indicator_id}">
    <div class="lr-img" aria-hidden="true">${illus(li)}</div>
    <div class="lr-code"><small>المؤشر</small><b>${esc(r.indicator_code)}</b></div>
    <div class="lr-main"><div class="lr-tags"><span class="lr-tag dom">${ic('layers')} ${esc(r.domain_name)}</span><span class="lr-tag">${ic('doc')} المعيار ${esc(r.standard_code)}</span></div>
      <p>${esc(r.official_text)}</p>
      ${team ? `<div class="lr-people">${personBlk('المسؤول', ownersOf(r, 'resp'))}${personBlk('المقيّم', ownersOf(r, 'eval'))}</div>` : ''}</div>
    <div class="lr-side">${st}<div class="lr-bar"><span style="width:${pct}%"></span></div><span class="lr-go">عرض التفاصيل ${ic('arrow')}</span></div></a>`;
}
// تصفية سريعة باختيار فرد واحد: مجال معيّن | مقيّم معيّن | مسؤول معيّن. المقيم والمسؤول لفريق التقويم فقط (خصوصية الأسماء).
const QUICK = [['dom', 'layers', 'كل المجالات', false], ['eval', 'users', 'كل المقيّمين', true], ['resp', 'users', 'كل المسؤولين', true]];
function pillsHtml(all) {
  return QUICK.filter(q => !q[3] || isTeam()).map(([k, ico, all0]) => {
    const cur = hm.f[k], multi = cur.length > 1;
    const opts = facetOpts(k, all).map(([v, t]) => { const c = all.filter(r => pass(r, k) && fvals(r, k).includes(v)).length;
      return `<option value="${esc(v)}"${cur.length === 1 && cur[0] === v ? ' selected' : ''}>${esc(t)} (${num(c)})</option>`; }).join('');
    return `<label class="fsel qsel${cur.length ? ' on' : ''}">${ic(ico)}<select data-q="${k}" aria-label="${all0}"><option value="">${all0}</option>${multi ? `<option value="__multi" selected disabled>عدة خيارات (${num(cur.length)})</option>` : ''}${opts}</select></label>`;
  }).join('');
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
  hm.st = ''; $('#pills').innerHTML = pillsHtml(all);
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
  view.innerHTML = `<section class="hero3"><div class="h3-txt"><span class="chip">${ic('cal')} ${first ? esc(first[1]) : 'التقويم الذاتي المدرسي'}</span>
    <h1><span class="gold">التقويم الذاتي</span> الذكي</h1>
    <h2 class="h3-sub">مدرسة لبيد بن ربيعة المتوسطة</h2>
    <p class="h3-p">بوابة شفافة تعرض مجالات التقويم الذاتي ومعاييره ومؤشراته ونتائجه المعتمدة، وفق دليل هيئة تقويم التعليم والتدريب.</p>
    <div class="pills"><span class="pill">${ic('check')} نتائج معتمدة</span><span class="pill">${ic('doc')} شواهد موثّقة</span><span class="pill">${ic('shield')} خصوصية محمية</span></div>
    <div class="h3-cta"><button type="button" class="btn gold" id="goInd">استعرض المؤشرات ${ic('arrow')}</button></div></div>
    <div class="h3-art" aria-hidden="true"><div class="h3-mock"><div class="r" style="--k:#3f8a96;--w:68%"><i></i><s></s></div><div class="r" style="--k:#e8a43f;--w:46%"><i></i><s></s></div><div class="r" style="--k:#7b57cf;--w:58%"><i></i><s></s></div></div>
      <span class="h3-fl f1">${ic('bell')}</span><span class="h3-fl f2">${ic('check')}</span><span class="h3-fl f3">${ic('doc')}</span>
      <div class="h3-ring"><div class="rg" style="--p:${first ? pp : 0}"><b>${first ? num(pp) + '%' : '—'}</b></div><div><b>نسبة النشر</b><small>${first ? `${num(pub)} من ${num(rs.length)} مؤشراً` : 'لا دورة منشورة'}</small></div></div></div>
    <div class="h3-tiles"><div class="tile"><i>${ic('grid')}</i><div><b>${num(first ? cnt('domain_id') : 4)}</b><span>مجالات</span></div></div><div class="tile"><i>${ic('layers')}</i><div><b>${num(first ? cnt('standard_id') : 11)}</b><span>معياراً</span></div></div>
      <div class="tile"><i>${ic('bars')}</i><div><b>${num(first ? rs.length : 49)}</b><span>مؤشراً</span></div></div><div class="tile"><i>${ic('check')}</i><div><b>${first ? num(pub) : '—'}</b><span>${first ? 'منشورة' : 'لا دورة منشورة'}</span></div></div></div></section>` +
    (first && rs.length ? ''+
      `<div class="sec" id="ihead"><div><h2>مؤشرات التقويم</h2><p class="muted sub">ابحث وافرز وجمّع المؤشرات كما تريد.</p></div><span class="chip" id="icount"></span></div>
      <div class="fbar" id="fbar" role="search"><label class="fsearch">${ic('search')}<input type="search" id="iq" placeholder="ابحث بالرمز أو النص أو المسؤول أو المقيم" value="${esc(hm.q)}" aria-label="بحث في المؤشرات"></label>
        <div class="pills2" id="pills" role="group" aria-label="تصفية سريعة"></div><button type="button" class="fbtn" id="advbtn" aria-expanded="false"></button><div class="vbtns" id="vbtns"></div></div>
      <div class="fpanel" id="fpanel" hidden></div>
      ${isTeam() ? '' : '<p class="muted tnote">الفلترة والتجميع بالمسؤول وبالمقيم متاحة لفريق التقويم بعد تسجيل الدخول.</p>'}<div id="ilist"></div>` : noResults());
  if (first && rs.length) {
    const cid = first[0], again = () => renderList(cid);
    $('#goInd').onclick = () => { const h = $('#ihead'); if (h && h.scrollIntoView) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    $('#iq').oninput = e => { hm.q = e.target.value; again(); };
    $('#fbar').onclick = e => {
      const vw = e.target.closest('[data-view]'), ab = e.target.closest('#advbtn');
      if (vw) hm.view = vw.dataset.view; else if (ab) hm.adv = !hm.adv; else return;
      again();
    };
    $('#fpanel').onclick = e => {
      const fh = e.target.closest('[data-fh]');
      if (fh) { hm.open[fh.dataset.fh] = !hm.open[fh.dataset.fh]; again(); }
      else if (e.target.closest('[data-reset]')) { hm = { ...freshHm(), view: hm.view, adv: hm.adv }; $('#iq').value = ''; again(); }
    };
    $('#pills').onchange = e => { const t = e.target; if (!t.dataset.q || t.value === '__multi') return; hm.f[t.dataset.q] = t.value ? [t.value] : []; again(); };
    $('#fpanel').onchange = e => {
      const t = e.target;
      if (t.dataset && t.dataset.f) { const a = hm.f[t.dataset.f], i = a.indexOf(t.dataset.v); if (i < 0) a.push(t.dataset.v); else a.splice(i, 1); }
      else if (t.id === 'f-sort') hm.sort = t.value; else if (t.id === 'f-group') hm.group = t.value; else return;
      again();
      if (t.dataset && t.dataset.f) { const el = [...document.querySelectorAll('.fopt input')].find(x => x.dataset.f === t.dataset.f && x.dataset.v === t.dataset.v); if (el) el.focus(); }
    };
    const sync = () => document.querySelectorAll('.dcard[data-fdom]').forEach(c => { const on = hm.f.dom.length === 1 && hm.f.dom[0] === c.dataset.fdom && !hm.f.std.length; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    const pick = (kind, id) => {
      if (kind === 'dom') { const same = hm.f.dom.length === 1 && hm.f.dom[0] === id && !hm.f.std.length; hm.f.dom = same ? [] : [id]; hm.f.std = []; hm.open.dom = true; }
      else { const same = hm.f.std.length === 1 && hm.f.std[0] === id; hm.f.std = same ? [] : [id]; hm.f.dom = []; hm.open.std = true; }
      again(); sync(); const h = $('#ihead'); if (h && h.scrollIntoView) h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const clickH = e => {
      const go = e.target.closest('[data-go]');
      if (go) { e.preventDefault(); e.stopPropagation(); location.hash = go.getAttribute('href') || go.dataset.go; return; }
      const fs = e.target.closest('[data-fstd]'), fd = e.target.closest('[data-fdom]');
      if (fs) { e.preventDefault(); pick('std', fs.dataset.fstd); } else if (fd) { e.preventDefault(); pick('dom', fd.dataset.fdom); }
    };
    view.onclick = clickH;
    view.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.dcard[data-fdom]')) { e.preventDefault(); pick('dom', e.target.dataset.fdom); } };
    again(); sync();
  }
}

function cycle(id) {
  const rs = byCycle(id); if (!rs.length) { view.innerHTML = noResults(); return; }
  view.innerHTML = crumbs([['الرئيسية', '#home'], [rs[0].cycle_name]]) + domCards(id, rs);
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
  view.innerHTML = crumbs([['الرئيسية', '#home'], [d.cycle_name, '#cycle/' + cid], [d.domain_name]]) + fromHome() +
    `<section class="hero2 dhero glv ${gl.key}" style="--pat:${domPat(DIC[i % 4])}"><div class="h2-txt"><span class="chip">${ic('cal')} ${esc(d.cycle_name)}</span>
      <div class="dh-title"><span class="dh-ic">${ic(DIC[i % 4])}</span><div><small>المجال ${num(d.domain_code)}</small><h1>${esc(d.domain_name)}</h1></div></div>
      <p class="h2-p">يضم هذا المجال ${num(sts.length)} معايير و${num(rs.length)} مؤشراً، منها ${num(p)} منشورة.</p>
      <div class="dh-seg">${segHtml(rs)}</div>
      <div class="h2-cta"><button type="button" class="btn gold" id="goStd">استعرض المعايير ${ic('arrow')}</button><a class="btn ghost" href="#home">الرئيسية</a></div></div>
      <div class="h2-panel"><div class="h2-ring" style="--p:${resOf(rs).p}" role="img" aria-label="نتيجة المجال ${resOf(rs).txt}، ${resOf(rs).name}"><div><b>${resOf(rs).txt}</b><small class="lvn">${resOf(rs).name}</small></div></div>
        <div class="h2-stats"><div><b>${num(sts.length)}</b><span>معايير</span></div><div><b>${num(rs.length)}</b><span>مؤشراً</span></div>
          <div><b>${num(p)}</b><span>منشورة</span></div><div><b>${num(rs.length - p)}</b><span>غير منشورة</span></div></div></div></section>` +
    (isTeam() ? `<div class="people"><div class="pp"><h3>مقيمو المجال</h3><div>${chips(ev)}</div></div><div class="pp"><h3>مسؤولو المجال</h3><div>${chips(rp)}</div></div></div>`
      : `<p class="muted tnote">بيانات المقيمين والمسؤولين متاحة لفريق التقويم بعد تسجيل الدخول.</p>`) +
    `<div class="sec" id="shead"><div><h2>معايير المجال</h2><p class="muted sub">اضغط على أي معيار لعرض مؤشراته.</p></div><div class="vbtns" id="svbtns"></div></div><div id="slist"></div>
    <div class="sec"><div><h2>مؤشرات المجال</h2><p class="muted sub">ملوّنة بمستوى كل مؤشر.</p></div></div><div class="irows">${rs.slice().sort((a, b) => sortCodes(a.indicator_code, b.indicator_code)).map(r => { const pub = r.publish_state === 'published';
      return `<a class="irow glv ${pub ? (LV[r.level_label] || 'none') : 'none'}" href="#ind/${cid}/${r.indicator_id}"><code>${esc(r.indicator_code)}</code><span class="itx">${esc(r.official_text)}</span><span class="glbadge s">${pub ? esc(r.level_label || 'منشور') + (r.achievement_pct != null ? ' · ' + num(Math.round(r.achievement_pct)) + '%' : '') : 'غير منشور'}</span></a>`; }).join('')}</div>`;

  const card = s => {
    const sr = rs.filter(r => r.standard_id === s.standard_id), sp = pubCount(sr), sc = pctOf(sp, sr.length);
    const g = grpLevel(sr); return `<a class="wcard glv ${g.key}" style="--b:var(--c${k}b)" href="#standard/${cid}/${s.standard_id}">
      <span class="wcode"><small>المعيار</small><b>${esc(s.standard_code)}</b></span>
      <div class="wmain"><h3>${esc(s.standard_name)}</h3>
        <div class="dchips"><span>${ic('target')} ${num(sr.length)} مؤشراً</span><span>${ic('eye')} ${num(sp)} منشور</span></div>
        ${segHtml(sr)}
        ${isTeam() ? `<div class="dppl"><span>${ic('users')} المقيم: ${names(peopleOf(sr, 'eval'))}</span><span>${ic('users')} المسؤول: ${names(peopleOf(sr, 'resp'))}</span></div>` : ''}</div>
      <div class="wside"><div class="dres" role="img" aria-label="النتيجة ${resOf(sr).txt}، ${resOf(sr).name}"><b>${resOf(sr).txt}</b><span>${resOf(sr).name}</span></div><span class="dgo">عرض المؤشرات ${ic('arrow')}</span></div></a>`;
  };
  const row = s => {
    const sr = rs.filter(r => r.standard_id === s.standard_id), sp = pubCount(sr), sc = pctOf(sp, sr.length), ks = lcounts(sr);
    const g = grpLevel(sr); return `<a class="srow glv ${g.key}" style="--b:var(--c${k}b)" href="#standard/${cid}/${s.standard_id}"><code>${esc(s.standard_code)}</code>
      <div class="sname"><b>${esc(s.standard_name)}</b>${isTeam() ? `<small>المقيم: ${names(peopleOf(sr, 'eval'))} · المسؤول: ${names(peopleOf(sr, 'resp'))}</small>` : ''}</div>
      <span class="scnt">${num(sr.length)} مؤشراً · ${num(sp)} منشور</span>
      <div class="dseg" role="img" aria-label="توزيع المستويات">${ks.map(([key, c]) => `<i class="sg ${key}" style="flex:${c}" title="${STL[key]}: ${num(c)}"></i>`).join('')}</div>
      <b class="spct">${resOf(sr).txt}<small>${resOf(sr).name}</small></b>${ic('arrow')}</a>`;
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
  view.innerHTML = crumbs([['الرئيسية', '#home'], [r0.cycle_name, '#cycle/' + cid], [r0.domain_name, `#domain/${cid}/${r0.domain_id}`], [r0.standard_name]]) + fromHome() +
    `<div class="sec"><h2>${esc(r0.standard_name)}</h2><span class="chip">${num(rs.length)} مؤشراً</span></div>
    <div class="pgrid">${rs.map(pcard).join('')}</div>`;
}

async function indicator(cid, iid) {
  const h0 = location.hash;
  const r = byCycle(cid).find(x => x.indicator_id === iid); if (!r) { view.innerHTML = noResults(); return; }
  const { count } = await sb.from('public_evidence_stubs').select('id', { count: 'exact', head: true }).eq('cycle_id', cid).eq('indicator_id', iid);
  const pub = r.publish_state === 'published', team = isTeam(), k = dColor(r), di = Math.max(0, domIdx(cid, r.domain_id));
  const rp = ownersOf(r, 'resp'), ev = ownersOf(r, 'eval'), pct = pub && r.achievement_pct != null ? Number(r.achievement_pct) : null;
  const sibs = byCycle(cid).filter(x => x.standard_id === r.standard_id && x.indicator_id !== iid).sort((a, b) => sortCodes(a.indicator_code, b.indicator_code))
    .map(x => ({ href: `#ind/${cid}/${x.indicator_id}`, code: x.indicator_code, text: x.official_text, dom: k }));
  const evalHtml = pub
    ? `<dl class="iw-kv wide"><dt>مبررات التقييم</dt><dd>${esc(r.justification || '—')}</dd>${r.strengths ? `<dt>جوانب القوة</dt><dd>${esc(r.strengths)}</dd>` : ''}</dl>`
    : `<p class="muted">لم يُنشر تقييم هذا المؤشر بعد.</p>`;
  const [{ data: gd }, { data: gde }] = await Promise.all([
    sb.from('indicator_guidance').select('interpretation,significance').eq('indicator_id', iid).maybeSingle(),
    sb.from('indicator_guidance_evidence').select('sort_order,title').eq('indicator_id', iid).order('sort_order')]);
  const evidHtml = count ? await evidenceBlock(cid, iid) : `<p class="muted">لا توجد شواهد معتمدة لهذا المؤشر بعد.</p>`;
  if (location.hash !== h0) return; // انتقل المستخدم أثناء التحميل
  view.innerHTML = crumbs([['الرئيسية', '#home'], [r.cycle_name, '#cycle/' + cid], [r.domain_name, `#domain/${cid}/${r.domain_id}`], [r.standard_name, `#standard/${cid}/${r.standard_id}`], [r.indicator_code]]) +
    IndPage.renderWork({
      guidance: gd ? { interpretation: gd.interpretation, significance: gd.significance, evidence: (gde || []).map(x => x.title) } : null,
      back: indBack(cid, r), dom: k, domIdx: di, code: r.indicator_code, text: r.official_text, domName: r.domain_name, stdName: r.standard_name, cycleName: r.cycle_name,
      noResult: 'غير منشور', status: { label: pub ? 'منشور' : 'غير منشور', cls: pub ? 'ok' : '' }, level: pub && r.level_label ? { label: r.level_label, cls: LV[r.level_label] || '' } : null, pct,
      owners: team ? [{ label: 'مسؤول المؤشر', names: rp }, { label: 'مقيّم المؤشر', names: ev }] : [],
      stats: [{ label: 'الشواهد المعتمدة', value: num(count || 0) }, { label: 'مؤشرات المعيار', value: num(sibs.length + 1) }],
      evalCard: { html: evalHtml }, evidence: { html: evidHtml, count: count || 0 }, related: sibs.map(x => ({ ...x, domName: r.domain_name, group: 'مؤشرات المعيار نفسه' })) });
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
    location.hash = '#home'; await boot();
    if (isTeam()) location.href = 'admin.html';
  };
}

// ───── سجل التنقل: الرجوع إلى الصفحة التي جاء منها المستخدم، مع استعادة موضع التمرير ─────
const navStack = [], scrollMem = {}; let curHash = null, restoreScroll = false;
function trackNav() {
  const h = location.hash || '#home';
  if (curHash !== null && curHash !== h) scrollMem[curHash] = window.scrollY;
  const i = navStack.lastIndexOf(h);
  restoreScroll = i >= 0;
  if (i >= 0) navStack.length = i + 1; else navStack.push(h);
  if (navStack.length > 60) navStack.shift();
  curHash = h;
}
const BACKL = { domain: 'العودة إلى صفحة المجال', standard: 'العودة إلى مؤشرات المعيار', cycle: 'العودة إلى مجالات الدورة', home: 'العودة إلى قائمة المؤشرات' };
// وجهة الرجوع من صفحة المؤشر: آخر صفحة غير مؤشر زارها المستخدم (المجال أو المعيار أو القائمة…)، وإلا المعيار
function indBack(cid, r) {
  for (let j = navStack.length - 2; j >= 0; j--) {
    const h = navStack[j], [k, a] = h.slice(1).split('/');
    if (k === 'ind' || k === 'login') continue;
    if (BACKL[k] && !(['domain', 'standard', 'cycle'].includes(k) && a !== cid)) return { href: h, label: BACKL[k] };
    break;
  }
  return { href: `#standard/${cid}/${r.standard_id}`, label: BACKL.standard };
}
// في صفحتي المجال والمعيار: زر رجوع إلى قائمة المؤشرات إن جاء المستخدم منها
const fromHome = () => navStack[navStack.length - 2] === '#home' ? `<a class="iback" href="#home">${BACKL.home} ${ic('arrow')}</a>` : '';

async function route() {
  if (location.hash === '#results') { location.replace('#home'); return; } // صفحة نتائج التقويم محذوفة
  trackNav();
  const [h, a, b] = location.hash.slice(1).split('/');
  document.querySelectorAll('#nav a').forEach(x => x.classList.toggle('on', x.dataset.n === (h || 'home')));
  window.scrollTo(0, 0);
  view.onkeydown = null;
  view.onclick = e => { const go = e.target.closest('[data-go]'); if (go) { e.preventDefault(); location.hash = go.getAttribute('href') || go.dataset.go; } };
  await ({ '': home, home, login }[h] || (() => ({ cycle: () => cycle(a), domain: () => domain(a, b), standard: () => standard(a, b), ind: () => indicator(a, b) }[h] || home)()))();
  if (restoreScroll && scrollMem[curHash] != null) window.scrollTo(0, scrollMem[curHash]);
}
async function boot() { try { await load(); route(); } catch (e) { view.innerHTML = `<div class="panel"><p class="err">تعذّر تحميل البيانات. أعد المحاولة لاحقاً.</p></div>`; console.error(e); } }
window.addEventListener('hashchange', route);
boot();
})();
