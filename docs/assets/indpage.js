/* صفحة المؤشر الموحّدة: تُستخدم في الموقع العام ولوحة التحكم بهوية «الخطط الذكية» (صفحة البرنامج)
   المخرجات نصوص HTML. كل القيم النصية تُهرَّب هنا، وما يُمرَّر داخل حقول html يُعدّ موثوقاً (جاهزاً من المستدعي). */
(() => {
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => (n == null || n === '' || isNaN(n) ? '—' : Number(n).toLocaleString('ar-SA-u-ca-gregory-nu-latn'));
const IC = {
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>', check: '<path d="M5 12l5 5 9-10"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5M10 17h5"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  bell: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  bars: '<path d="M5 20V10M12 20V4M19 20v-7"/>', target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  flag: '<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>', book: '<path d="M5 4h9a4 4 0 014 4v12H9a4 4 0 01-4-4z"/><path d="M5 16a4 4 0 014-4h9"/>', arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 010 6M18 14c2 .6 3 2.2 3 5"/>', user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  clip: '<path d="M8 12l6-6a3 3 0 014 4l-8 8a5 5 0 01-7-7l7-7"/>', visit: '<path d="M12 21s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>',
  task: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4v2h6V4M9 13l2 2 4-4"/>', note: '<path d="M5 4h14v12l-5 5H5z"/><path d="M14 21v-5h5M9 9h6M9 13h3"/>',
  lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>', pct: '<path d="M18 6L6 18"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/>',
  history: '<path d="M4 12a8 8 0 108-8H7M7 4L4 7l3 3"/><path d="M12 8v4l3 2"/>'
};
const DIC = ['mgmt', 'board', 'growth', 'school'];
const ic = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;
const initials = n => { const p = String(n || '').trim().split(/\s+/); return (p[0]?.[0] || '') + (p[1]?.[0] || ''); };
const spark = (x, y, c = '#8fc7cd') => `<path d="M${x} ${y - 9}q1.5 7.5 9 9-7.5 1.5-9 9-1.5-7.5-9-9 7.5-1.5 9-9z" fill="${c}" opacity=".85"/>`;

// مقياس الأسابيع من بداية الدورة إلى نهايتها مع تمييز الأسبوع الحالي وأسبوع الإغلاق
function weeks(start, end, deadline, now = new Date()) {
  if (!start || !end) return null;
  const s = new Date(start + 'T00:00:00'), e = new Date(end + 'T00:00:00'), W = 7 * 864e5;
  const n = Math.min(60, Math.max(1, Math.ceil((e - s + 864e5) / W)));
  const cur = now < s ? 0 : Math.min(n, Math.floor((now - s) / W) + 1);
  const dw = deadline ? Math.floor((new Date(String(deadline).slice(0, 10) + 'T00:00:00') - s) / W) + 1 : null;
  return { n, cur, dw: dw && dw >= 1 && dw <= n ? dw : null, ended: now > e, notStarted: now < s };
}
const weekBubbles = w => !w ? '' : `<div class="iweeks" role="list" aria-label="أسابيع الدورة">${Array.from({ length: w.n }, (_, i) => {
  const k = i + 1, c = [k <= w.cur && k !== w.cur ? 'past' : '', k === w.cur ? 'now' : '', k === w.dw ? 'due' : ''].filter(Boolean).join(' ');
  return `<span class="wk ${c}" role="listitem" title="${k === w.dw ? 'أسبوع موعد الإغلاق' : k === w.cur ? 'الأسبوع الحالي' : 'الأسبوع ' + nf(k)}">${nf(k)}</span>`; }).join('')}</div>`;

const card = (cls, head, body, actions = '') => `<section class="icard-s ${cls || ''}"><div class="ish"><h2>${head}</h2><div class="isa">${actions}</div></div>${body}</section>`;

/* d: { back:{href,label}, dom:0..3, code, text, domName, stdName, cycleName, status:{label,cls}, level:{label,cls}|null, pct,
        req, owners:[{label,names:[]}], stats:[{label,value,cls}], 
        suggested:{html,actions}, timeline:{start,end,deadline,lines:[[k,v]]}, evalCard:{html,actions}, evidence:{html,actions,count},
        extra:[{title,ico,html,actions}], related:[{href,code,text,dom}], log:{html} } */
function render(d) {
  const k = d.dom ?? 0, i = Math.max(0, d.domIdx ?? 0);
  const pct = d.pct != null && !isNaN(d.pct) ? Math.max(0, Math.min(100, +d.pct)) : null;
  const ownerCards = (d.owners || []).map(o => {
    const names = (o.names || []).filter(Boolean), first = names[0];
    return `<div class="iown"><span class="av">${first ? (window.AVURL?.(first) ? `<img src="${esc(window.AVURL(first))}" alt="">` : esc(initials(first))) : ic('users')}</span><div><small>${esc(o.label)}</small><b title="${esc(names.join('، '))}">${first ? esc(first) + (names.length > 1 ? ` <em>+${nf(names.length - 1)}</em>` : '') : 'غير مُسند'}</b>${o.sub ? `<span>${esc(o.sub)}</span>` : ''}</div></div>`; }).join('');
  const chips = [
    `<span class="ichip dom">${ic('layers')} ${esc(d.domName)}</span>`,
    `<span class="ichip">${ic('doc')} ${esc(d.stdName)}</span>`,
    d.cycleName ? `<span class="ichip">${ic('cal')} ${esc(d.cycleName)}</span>` : '',
    `<span class="ichip code" dir="ltr">${esc(d.code)}</span>`,
    d.status ? `<span class="ichip st ${esc(d.status.cls || '')}">${ic('check')} ${esc(d.status.label)}</span>` : ''].join('');
  const lvCls = d.level?.cls || 'none', lvName = d.level?.label || d.noResult || 'بلا نتيجة', pTxt = pct != null ? nf(Math.round(pct)) + '%' : '—';
  const art = `<div class="iart lv-${esc(lvCls)}" role="img" aria-label="${pct != null ? 'النتيجة ' + pTxt + '، المستوى ' + esc(lvName) : esc(lvName)}"><svg viewBox="0 0 320 190" class="iart-bg" aria-hidden="true"><ellipse cx="160" cy="176" rx="100" ry="8" fill="currentColor" opacity=".16"/>${spark(48, 52)}${spark(276, 118)}${spark(270, 40, '#f0b34a')}</svg>
    <div class="iring" style="--p:${pct ?? 0}"><div class="irg"><b>${pTxt}</b></div><strong class="ilvname">${esc(lvName)}</strong></div><span class="iart-ic" aria-hidden="true">${ic(DIC[i % 4])}</span></div>`;
  const hero = `<section class="ihero"><div class="ihero-txt"><div class="ichips">${chips}</div>
    <h1>${esc(d.text)}</h1>
    ${ownerCards ? `<div class="iowns">${ownerCards}</div>` : ''}${d.heroActions ? `<div class="ihacts">${d.heroActions}</div>` : ''}</div>${art}</section>`;
  const stats = (d.stats || []).length ? `<div class="istats">${d.stats.map((s, n) => `<div class="istat s${n % 4}"><span>${esc(s.label)}</span><b>${esc(s.value)}</b></div>`).join('')}</div>` : '';
  const w = d.timeline ? weeks(d.timeline.start, d.timeline.end, d.timeline.deadline) : null;
  const tl = d.timeline ? card('', `${ic('cal')} الجدول الزمني`, `${weekBubbles(w)}${w ? `<p class="isub sm">${w.notStarted ? 'لم تبدأ الدورة بعد.' : w.ended ? 'انتهت مدة الدورة.' : 'الأسبوع الحالي: ' + nf(w.cur) + ' من ' + nf(w.n) + '.'}${w.dw ? ' أسبوع موعد الإغلاق: ' + nf(w.dw) + '.' : ''}</p>` : '<p class="isub sm">لم تُحدَّد مدة الدورة.</p>'}
    <div class="itl-lines">${(d.timeline.lines || []).map(l => `<p><b>${esc(l[0])}:</b> ${esc(l[1])}</p>`).join('')}</div>`, d.timeline.actions || '') : '';
  const sug = d.suggested ? card('', `${ic('doc')} ${esc(d.suggested.title || 'الشواهد المقترحة')}`, d.suggested.html, d.suggested.actions) : '';
  const two = (sug || tl) ? `<div class="itwo">${sug}${tl}</div>` : '';
  const ev = d.evalCard ? card('stripe', `${ic('note')} التقييم ومبرراته`, d.evalCard.html, d.evalCard.actions) : '';
  const evid = d.evidence ? card('stripe', `${ic('clip')} الشواهد الفعلية${d.evidence.count != null ? ` <small>${nf(d.evidence.count)} شاهد</small>` : ''}`, d.evidence.html, d.evidence.actions) : '';
  const extra = (d.extra || []).map(x => card('', `${ic(x.ico || 'doc')} ${esc(x.title)}`, x.html, x.actions)).join('');
  const extras = extra ? `<div class="itwo">${extra}</div>` : '';
  const grp = {}; (d.related || []).forEach(r => { (grp[r.group || ''] = grp[r.group || ''] || []).push(r); });
  const relCard = r => { const kk = r.dom ?? k; return `<a class="irc" style="--b:var(--c${kk}b);--f:var(--c${kk}f)" href="${esc(r.href)}"><span class="irc-i" dir="ltr">${esc(r.code)}</span><div><b>${esc(r.domName || '')}${r.why && r.why.length ? ` <em>${esc(r.why.join(' · '))}</em>` : ''}</b><small>${esc(r.text)}</small></div></a>`; };
  const rel = (d.related || []).length ? card('', `${ic('grid')} مؤشرات مرتبطة`, Object.entries(grp).map(([g, rs]) => `${g ? `<h3 class="irg-h">${esc(g)}</h3>` : ''}<div class="irel">${rs.map(relCard).join('')}</div>`).join('')) : '';
  const log = d.log ? card('', `${ic('history')} سجل التعديلات والاعتمادات`, d.log.html) : '';
  return `<div class="ipage" style="--b:var(--c${k}b);--f:var(--c${k}f)">${d.back ? `<a class="iback" href="${esc(d.back.href)}">${esc(d.back.label)} ${ic('arrow')}</a>` : ''}
    ${hero}${stats}${two}${ev}${evid}${extras}${rel}${log}</div>`;
}

/* صفحة المؤشر في الموقع العام بنفس تصميم صفحة المؤشر في لوحة التحكم (أصناف iw-* من admin.css).
   d: { back, code, text, domName, stdName, cycleName, status:{label}, level:{label,cls}|null, pct, noResult,
        owners:[{label,names:[]}], evalCard:{html}, evidence:{html,count}, related:[{href,code,text}] }
   القيم النصية تُهرَّب هنا، وما في evalCard.html وevidence.html جاهز وموثوق من المستدعي. */
function renderWork(d) {
  const LVK = { excellence: 'ex', advancement: 'ad', launch: 'la', preparation: 'pr' };
  const pct = d.pct != null && !isNaN(d.pct) ? Math.max(0, Math.min(100, +d.pct)) : null;
  const lv = d.level?.cls ? LVK[d.level.cls] || 'x' : 'none', lvName = d.level?.label || d.noResult || 'غير منشور';
  const owners = (d.owners || []).map(o => { const ns = (o.names || []).filter(Boolean);
    return `<div><span class="av">${ns[0] && window.AVURL?.(ns[0]) ? `<img src="${esc(window.AVURL(ns[0]))}" alt="">` : ic('users')}</span><div><small>${esc(o.label)}</small><b>${ns.length ? ns.map(n => `<span class="pn">${window.PAV ? window.PAV(n, 22) : ''}${esc(n)}</span>`).join('') : 'لم يُسنَد بعد'}</b></div></div>`; }).join('');
  const head = `<header class="iw-h"><div class="iw-hc"><div class="iw-chips"><span class="iw-chip dom">${ic('layers')} ${esc(d.domName)}</span><span class="iw-chip">${ic('doc')} ${esc(d.stdName)}</span><span class="iw-chip code" dir="ltr">${esc(d.code)}</span>${d.status ? `<span class="iw-chip">${ic('check')} ${esc(d.status.label)}</span>` : ''}</div>
      <h1>${esc(d.text)}</h1>${owners ? `<div class="iw-own">${owners}</div>` : ''}</div>
    <div class="iw-lvbox lv-${lv}"><div class="iw-ring" style="--p:${pct ?? 0}"><b>${pct != null ? nf(Math.round(pct)) + '%' : '—'}</b></div><strong>${esc(lvName)}</strong>${d.cycleName ? `<small>${esc(d.cycleName)}</small>` : ''}</div></header>`;
  const sec = (id, ico, title, body, extra = '') => `<section class="iw-sec" id="${id}" aria-labelledby="h-${id}"><h2 id="h-${id}">${ic(ico)} ${title}${extra}</h2>${body}</section>`;
  const g = d.guidance;
  const gdh = `<section class="iw-sec iw-guide" id="s-guide" aria-labelledby="h-s-guide"><h2 id="h-s-guide">${ic('book')} الاسترشاد <small>للقراءة فقط</small></h2>` + (g ? `<details class="iw-gd" open><summary>${ic('book')} عرض الاسترشاد أو طيّه <small>للقراءة فقط</small></summary>
      <div class="iw-gg"><section><h4>${ic('note')} تفسير المؤشر</h4><p>${esc(g.interpretation)}</p></section><section><h4>${ic('flag')} ماذا يدل عليه؟</h4><p>${esc(g.significance)}</p></section></div>
      <section class="iw-gev"><h4>${ic('clip')} الشواهد المقترحة <small>استرشادية، وليست شواهد مرفوعة</small></h4>${g.evidence.length ? `<ol>${g.evidence.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : '<p class="muted">لا شواهد مقترحة.</p>'}</section></details>` : '<p class="muted empty">لا يوجد محتوى استرشادي لهذا المؤشر.</p>') + `</section>`;
  const evl = d.evalCard ? sec('s-eval', 'note', 'التقييم ومبرراته', d.evalCard.html) : '';
  const evd = d.evidence ? sec('s-evid', 'clip', 'الشواهد المعتمدة', d.evidence.html, d.evidence.count != null ? ` <small>${nf(d.evidence.count)} شاهد</small>` : '') : '';
  const rel = (d.related || []).length ? `<details class="iw-sec more" open><summary>${ic('grid')} مؤشرات المعيار نفسه <span class="bdg">${nf(d.related.length)}</span></summary>
    <div class="iw-rel"><div>${d.related.map(r => `<a class="ilink" style="--b:var(--c${r.dom ?? 0}b);--f:var(--c${r.dom ?? 0}f)" href="${esc(r.href)}" title="${esc(String(r.text || '').slice(0, 90))}">${esc(r.code)}</a>`).join('')}</div></div></details>` : '';
  return `<div class="iw">${d.back ? `<a class="iback" href="${esc(d.back.href)}">${esc(d.back.label)} ${ic('arrow')}</a>` : ''}${head}${gdh}${evl}${evd}${rel}</div>`;
}

window.IndPage = { render, renderWork, esc, nf, ic, weeks };
})();
