/* صفحة «المؤشرات والتقييم»: فرز آني (بلا إعادة تحميل) بنفس آلية الفرز المتقدم في الصفحة الرئيسية.
   بطاقات المجالات أزرار فرز، وحبوب الحالة بأعدادها، وبحث، وفرز متقدم (مجال/معيار/مقيّم/مسؤول/مستوى/شواهد)، وترتيب وتجميع. */
(() => {
const { h, raw, $, S, L, nf, short, esc, staffName, sb_, table, btn, isCoord, role, csv, codeCmp } = App;
const NOP = '__none';
const ST = [['approved', 'معتمد'], ['submitted', 'بانتظار الاعتماد'], ['draft', 'مسودة'], ['not_evaluated', 'لم يُقيَّم']];
const SORTS = [['code', 'ترتيب: الرمز'], ['attention', 'ترتيب: الأحوج للإجراء أولاً'], ['pct_desc', 'ترتيب: نسبة التحقق (الأعلى)'], ['pct_asc', 'ترتيب: نسبة التحقق (الأدنى)'], ['evid', 'ترتيب: الشواهد المعتمدة']];
const GROUPS = [['none', 'بدون تجميع'], ['dom', 'تجميع: المجال'], ['std', 'تجميع: المعيار'], ['st', 'تجميع: الحالة'], ['eval', 'تجميع: المقيّم'], ['resp', 'تجميع: المسؤول']];
const FACETS = [['dom', 'المجال', 'layers'], ['std', 'المعيار', 'doc'], ['eval', 'المقيّم', 'users'], ['resp', 'المسؤول', 'users'], ['lvl', 'المستوى', 'flag'], ['evd', 'الشواهد', 'clip']];
const ATT = { submitted: 0, draft: 1, not_evaluated: 2, approved: 3 };
const fresh = () => ({ q: '', st: '', mine: false, sort: 'code', group: 'none', view: 'table', adv: false, f: { dom: [], std: [], eval: [], resp: [], lvl: [], evd: [] }, open: { dom: true, std: false, eval: true, resp: false, lvl: false, evd: false } });
let hm = fresh();
App.indFilter = o => { hm = fresh(); if (o?.st) hm.st = o.st; if (o?.mine) hm.mine = true; };


/* عضو الفريق: المؤشرات المسندة إليه فقط، كقائمة بارزة؛ علامة صح للمكتمل وعلامة تعديل لما يحتاج عملاً */
const MST = { done: ['check', 'مكتمل', 'ok'], wait: ['clock', 'بانتظار الاعتماد', 'info'], need: ['edit', 'بحاجة إلى عمل', 'warn'] };
const MF = { q: '', st: '' };
async function memberInds() {
  const D = await App.data(), me = S.me.staff_id, { ref, om, resp } = D;
  const mine = new Map(); resp.filter(r => r.staff_id === me).forEach(r => { const o = mine.get(r.indicator_id) || { ev: false, rs: false }; o[r.kind === 'evaluator' ? 'ev' : 'rs'] = true; mine.set(r.indicator_id, o); });
  const rows = ref.inds.filter(i => mine.has(i.id)).map(i => {
    const o = om[i.id] || {}, st = o.eval_status || 'not_evaluated', m = mine.get(i.id), evs = D.evid.filter(e => e.indicator_id === i.id), bad = evs.filter(e => ['needs_completion', 'rejected'].includes(e.status));
    const k = st === 'approved' ? 'done' : st === 'submitted' ? 'wait' : 'need';
    const why = k !== 'need' ? '' : bad.length ? `${nf(bad.length)} شاهد يحتاج استكمالاً` : st === 'draft' ? 'التقييم مسودة لم تُرسل' : m.ev ? 'لم يُقيَّم بعد' : !evs.length ? 'لم تُرفع شواهد بعد' : 'استكمال المتطلبات';
    return { i, k, why, m, ea: o.approved_evidence || 0, et: o.total_evidence ?? evs.length, pct: o.achievement_pct };
  }).sort((a, b) => ['need', 'wait', 'done'].indexOf(a.k) - ['need', 'wait', 'done'].indexOf(b.k) || codeCmp(a.i.code, b.i.code));
  const cnt = k => rows.filter(r => r.k === k).length;
  const pill = (k, t, n) => `<button type="button" class="spill${MF.st === k ? ' on' : ''}${n ? '' : ' zero'}" data-mst="${k}" aria-pressed="${MF.st === k}">${t}<em>${nf(n)}</em></button>`;
  const rowH = r => { const [ic, lb, tn] = MST[r.k]; return h`<a class="mi ${r.k}" href="#ind/${r.i.id}"><span class="mi-s ${tn}" title="${lb}">${App.ico(ic)}</span>
    <div class="mi-b"><div class="mi-t"><b dir="ltr">${r.i.code}</b><span>${short(r.i.official_text, 130)}</span></div>
      <div class="mi-m"><small>${r.i.dom?.name_ar || ''} · ${r.i.std?.name_ar || ''}</small>${r.m.ev ? h`<span class="bdg info">مقيّم</span>` : ''}${r.m.rs ? h`<span class="bdg">مسؤول</span>` : ''}<span class="bdg ${tn}">${lb}</span>${r.why ? h`<span class="mi-w">${r.why}</span>` : ''}</div></div>
    <div class="mi-n"><b>${r.pct != null ? nf(Math.round(r.pct)) + '%' : '—'}</b><small>${nf(r.ea)} / ${nf(r.et)} شواهد</small></div><span class="mi-go">${App.ico('prev')}</span></a>`; };
  const fill = v => {
    const rs = rows.filter(r => (!MF.st || r.k === MF.st) && (!MF.q.trim() || [r.i.code, r.i.official_text, r.i.dom?.name_ar, r.i.std?.name_ar].join(' ').toLowerCase().includes(MF.q.trim().toLowerCase())));
    v.querySelector('#mpills').innerHTML = pill('', 'الكل', rows.length) + pill('need', 'بحاجة إلى عمل', cnt('need')) + pill('wait', 'بانتظار الاعتماد', cnt('wait')) + pill('done', 'مكتملة', cnt('done'));
    v.querySelector('#mlist').innerHTML = (rs.length ? h`<div class="mlist">${rs.map(rowH)}</div>` : h`<div class="pn"><p class="muted empty">${rows.length ? 'لا مؤشرات مطابقة.' : 'لم يُسنَد إليك مؤشر في هذه الدورة بعد.'}</p></div>`).s;
  };
  const p = rows.length ? cnt('done') / rows.length * 100 : 0;
  return { html: h`<section class="mhead"><div><b>${nf(cnt('done'))} <span class="of">من ${nf(rows.length)}</span></b><small>مؤشراتك المكتملة</small><i><u style="width:${p}%"></u></i></div><div class="mh-k need">${App.ico('edit')}<b>${nf(cnt('need'))}</b><small>بحاجة إلى عمل</small></div><div class="mh-k wait">${App.ico('clock')}<b>${nf(cnt('wait'))}</b><small>بانتظار الاعتماد</small></div><div class="mh-k done">${App.ico('check')}<b>${nf(cnt('done'))}</b><small>مكتملة</small></div></section>
    <div class="fbar"><label class="fsearch">${App.ico('search')}<input type="search" id="mq" placeholder="ابحث بالرمز أو النص" value="${MF.q}" aria-label="بحث"></label><div class="pills2" id="mpills"></div></div><div id="mlist"></div>`,
    after: v => { fill(v); v.addEventListener('click', e => { const t = e.target.closest('[data-mst]'); if (t && v.contains(t)) { MF.st = t.dataset.mst; fill(v); } }); v.querySelector('#mq').addEventListener('input', e => { MF.q = e.target.value; fill(v); }); } };
}

Pages.inds = async () => {
  const nc = App.needCycle(); if (nc) return nc;
  if (role() === 'team_member') return memberInds();
  const D = await App.data(), { ref, om, resp, lvs } = D, me = S.me.staff_id;
  const lname = Object.fromEntries(lvs.map(l => [l.id, l.label_ar])), pend = {}, evOk = {};
  D.evid.forEach(e => { if (['new', 'under_review'].includes(e.status)) pend[e.indicator_id] = (pend[e.indicator_id] || 0) + 1; });
  const names = (id, kind) => [...new Set(resp.filter(r => r.indicator_id === id && r.kind === kind).map(r => staffName(r.staff_id)))];
  const mineSet = new Set(resp.filter(r => r.staff_id === me).map(r => r.indicator_id));
  const rows = ref.inds.map(i => { const o = om[i.id] || {}; return { i, o, st: o.eval_status || 'not_evaluated', lvl: lname[o.level_id] || '', ev: names(i.id, 'evaluator'), rs: names(i.id, 'responsible'), ea: o.approved_evidence || 0, et: o.total_evidence || 0, ep: pend[i.id] || 0, mine: mineSet.has(i.id), pct: o.achievement_pct }; });
  const evdOf = r => [...(r.ea ? ['approved'] : []), ...(r.ep ? ['pending'] : []), ...(!r.et ? ['none'] : [])];
  const fvals = (r, k) => k === 'dom' ? [r.i.dom?.id] : k === 'std' ? [r.i.std?.id] : k === 'lvl' ? [r.lvl || NOP] : k === 'evd' ? evdOf(r) : ((k === 'eval' ? r.ev : r.rs).length ? (k === 'eval' ? r.ev : r.rs) : [NOP]);
  const EVD = [['approved', 'لديه شواهد معتمدة'], ['pending', 'شواهد بانتظار المراجعة'], ['none', 'بلا شواهد']];
  const facetOpts = k => k === 'dom' ? ref.domains.map(d => [d.id, d.name_ar])
    : k === 'std' ? ref.standards.map(s => [s.id, s.name_ar])
    : k === 'lvl' ? [...lvs.map(l => [l.label_ar, l.label_ar]), [NOP, 'بلا مستوى']]
    : k === 'evd' ? EVD
    : [...new Set(rows.flatMap(r => k === 'eval' ? r.ev : r.rs))].sort((a, b) => a.localeCompare(b, 'ar')).map(n => [n, n]).concat([[NOP, 'غير مُسند']]);
  const pass = (r, skip) => {
    if (skip !== 'st' && hm.st && r.st !== hm.st) return false;
    if (hm.mine && !r.mine) return false;
    for (const k of Object.keys(hm.f)) { if (k === skip || !hm.f[k].length) continue; if (!fvals(r, k).some(v => hm.f[k].includes(v))) return false; }
    const q = hm.q.trim().toLowerCase();
    return !q || [r.i.code, r.i.official_text, r.i.dom?.name_ar, r.i.std?.name_ar, ...r.ev, ...r.rs].join(' ').toLowerCase().includes(q);
  };
  const sortRows = xs => [...xs].sort((a, b) => hm.sort === 'pct_desc' ? (b.pct ?? -1) - (a.pct ?? -1) || codeCmp(a.i.code, b.i.code) : hm.sort === 'pct_asc' ? (a.pct ?? 101) - (b.pct ?? 101) || codeCmp(a.i.code, b.i.code) : hm.sort === 'evid' ? b.ea - a.ea || codeCmp(a.i.code, b.i.code) : hm.sort === 'attention' ? ATT[a.st] - ATT[b.st] || codeCmp(a.i.code, b.i.code) : codeCmp(a.i.code, b.i.code));
  const groupOf = (r) => hm.group === 'dom' ? [[r.i.dom?.name_ar]] : hm.group === 'std' ? [[r.i.std?.name_ar]] : hm.group === 'st' ? [[L.eval[r.st]]] : hm.group === 'eval' ? [(r.ev.length ? r.ev : ['بلا مقيّم'])] : [(r.rs.length ? r.rs : ['بلا مسؤول'])];

  /* ---- بطاقات المجالات: أزرار فرز آنية ---- */
  const domCards = () => h`<div class="kcs d4" id="idoms">${ref.domains.map((d, i) => { const dx = rows.filter(r => r.i.dom?.id === d.id), n = dx.length, ok = dx.filter(r => r.st === 'approved').length, sb2 = dx.filter(r => r.st === 'submitted').length, nv = dx.filter(r => r.st === 'not_evaluated').length, on = hm.f.dom.includes(d.id);
    return App.kc('d' + (i % 4), 'flag', d.name_ar, h`${nf(ok)}<span class="of"> / ${nf(n)}</span>`, n ? ok / n * 100 : 0, on ? 'مُطبَّق: اضغط لإلغاء الفرز' : (n && ok === n ? 'منجز بالكامل · اضغط للفرز' : [sb2 ? nf(sb2) + ' بانتظار الاعتماد' : '', nv ? nf(nv) + ' لم يبدأ' : ''].filter(Boolean).join(' · ') || 'اضغط لفرز المؤشرات'), { fdom: d.id }, false, on); })}</div>`;

  const advLabel = () => { const n = Object.values(hm.f).reduce((a, x) => a + x.length, 0); return `${App.ico('layers').s} الفرز المتقدم${n ? ` <em class="fn">${nf(n)}</em>` : ''}`; };
  const vbtnsHtml = () => [['table', 'جدول', 'list'], ['cards', 'بطاقات', 'grid']].map(([k, t, i]) => `<button type="button" class="vbtn${hm.view === k ? ' on' : ''}" data-view="${k}" aria-pressed="${hm.view === k}">${App.ico(i).s} <span>${t}</span></button>`).join('');
  const toolbar = () => h`<div class="fbar" id="fbar" role="search"><label class="fsearch">${App.ico('search')}<input type="search" id="iq" placeholder="ابحث بالرمز أو النص أو المقيّم أو المسؤول" value="${hm.q}" aria-label="بحث في المؤشرات"></label>
    <button type="button" class="fbtn${hm.adv ? ' on' : ''}" id="advbtn" aria-expanded="${hm.adv}">${raw(advLabel())}</button><div class="pills2" id="pills">${raw(pillsHtml())}</div><div class="vbtns" id="vbtns">${raw(vbtnsHtml())}</div></div><div class="fpanel" id="fpanel" ${hm.adv ? '' : raw('hidden')}>${hm.adv ? raw(panelHtml()) : ''}</div>`;

  const pillsHtml = () => { const base = rows.filter(r => pass(r, 'st')); const mk = (key, label, n) => `<button type="button" class="spill${hm.st === key ? ' on' : ''}${n ? '' : ' zero'}" data-st="${key}" aria-pressed="${hm.st === key}">${label}<em>${nf(n)}</em></button>`;
    return mk('', 'الكل', base.length) + ST.map(([k, t]) => mk(k, t, base.filter(r => r.st === k).length)).join('') + `<button type="button" class="spill${hm.mine ? ' on' : ''}" data-mine="1" aria-pressed="${hm.mine}">مؤشراتي فقط<em>${nf(rows.filter(r => r.mine && pass(r, 'mine')).length)}</em></button>`; };
  const panelHtml = () => { const sel = (id, ico, opts, cur) => `<label class="fsel">${App.ico(ico).s}<select id="${id}">${opts.map(o => `<option value="${esc(o[0])}"${cur === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label>`;
    return `<div class="frow">${sel('f-sort', 'bars', SORTS, hm.sort)}${sel('f-group', 'layers', GROUPS, hm.group)}<button type="button" class="btn soft" data-reset>${App.ico('reset').s} إعادة ضبط</button></div>
    <div class="fgrid">${FACETS.map(([k, title, icon]) => { const open = hm.open[k], n = hm.f[k].length;
      return `<section class="facet${open ? ' open' : ''}"><button type="button" class="fhead" data-fh="${k}" aria-expanded="${open}">${App.ico(icon).s}<b>${title}</b>${n ? `<em class="fn">${nf(n)}</em>` : ''}<span class="chev">${App.ico('chev').s}</span></button>` +
        (open ? `<div class="fbody">${facetOpts(k).map(([v, t]) => { const c = rows.filter(r => pass(r, k) && fvals(r, k).includes(v)).length;
          return `<label class="fopt${c ? '' : ' zero'}"><input type="checkbox" data-f="${k}" data-v="${esc(v)}"${hm.f[k].includes(v) ? ' checked' : ''}><span>${esc(t)}</span><em>${nf(c)}</em></label>`; }).join('')}</div>` : '') + '</section>'; }).join('')}</div>`; };

  const tbl = xs => table([
    { h: 'الرمز', f: r => h`<a href="#ind/${r.i.id}" dir="ltr"><b>${r.i.code}</b></a>` }, { h: 'المؤشر', f: r => short(r.i.official_text, 80) },
    { h: 'المسؤول', f: r => r.rs.join('، ') || '—' }, { h: 'المقيّم', f: r => r.ev.join('، ') || '—' },
    { h: 'الحالة', f: r => sb_('eval', r.st) }, { h: 'النسبة', f: r => r.pct != null ? nf(r.pct) + '%' : '—' }, { h: 'المستوى', f: r => r.lvl || '—' },
    { h: 'الشواهد', f: r => h`${nf(r.ea)} / ${nf(r.et)}${r.ep ? h` <span class="bdg info" title="بانتظار المراجعة">${nf(r.ep)}</span>` : ''}` },
  ], xs, 'لا توجد مؤشرات مطابقة');
  const cards = xs => xs.length ? h`<div class="icards">${xs.map(r => h`<a class="icard ${r.st}" href="#ind/${r.i.id}"><header><b dir="ltr">${r.i.code}</b>${sb_('eval', r.st)}</header><p>${short(r.i.official_text, 110)}</p><small>${r.i.dom?.name_ar} · ${r.i.std?.name_ar}</small><small>المقيّم: ${r.ev.join('، ') || 'بلا مقيّم'} · المسؤول: ${r.rs.join('، ') || 'بلا مسؤول'}</small><footer>${r.pct != null ? h`<span class="bdg">${nf(r.pct)}%${r.lvl ? ' · ' + r.lvl : ''}</span>` : ''}<span class="muted">شواهد ${nf(r.ea)}/${nf(r.et)}</span>${r.ep ? h`<span class="bdg info">${nf(r.ep)} بانتظار المراجعة</span>` : ''}</footer></a>`)}</div>` : h`<div class="pn"><p class="muted empty">لا توجد مؤشرات مطابقة.</p></div>`;
  const body = xs => { const v = hm.view === 'cards' ? cards : tbl;
    if (hm.group === 'none') return hm.view === 'cards' ? v(xs) : h`<div class="pn">${v(xs)}</div>`;
    const g = new Map(); xs.forEach(r => groupOf(r)[0].forEach(k => (g.get(k) || g.set(k, []).get(k)).push(r)));
    const keys = [...g.keys()]; if (hm.group === 'eval' || hm.group === 'resp') keys.sort((a, b) => (a.startsWith('بلا')) - (b.startsWith('بلا')) || a.localeCompare(b, 'ar'));
    return keys.length ? keys.map(k => h`<section class="igrp"><h3>${k} <span class="bdg">${nf(g.get(k).length)}</span></h3>${hm.view === 'cards' ? v(g.get(k)) : h`<div class="pn">${v(g.get(k))}</div>`}</section>`) : v([]); };

  const html = h`${toolbar()}<div class="sec-h"><span class="chip" id="icount">${nf(sortRows(rows.filter(r => pass(r))).length)} من ${nf(rows.length)} مؤشراً</span><div class="pa">${btn('تصدير CSV', 'indCsv')}</div></div><div id="ilist">${body(sortRows(rows.filter(r => pass(r))))}</div>`;
  const top = h`<div id="idomwrap">${domCards()}</div>`;
  return { html: h`${top}${html}`, after: v => {
    const paint = () => {
      const rs = sortRows(rows.filter(r => pass(r)));
      $('#icount', v).textContent = `${nf(rs.length)} من ${nf(rows.length)} مؤشراً`;
      $('#pills', v).innerHTML = pillsHtml();
      const ab = $('#advbtn', v); ab.className = 'fbtn' + (hm.adv ? ' on' : ''); ab.setAttribute('aria-expanded', hm.adv); ab.innerHTML = advLabel();
      $('#vbtns', v).innerHTML = vbtnsHtml();
      const fp = $('#fpanel', v); fp.hidden = !hm.adv;
      if (hm.adv) { const sc = [...v.querySelectorAll('.fbody')].map(e => e.scrollTop); fp.innerHTML = panelHtml(); [...v.querySelectorAll('.fbody')].forEach((e, i) => { e.scrollTop = sc[i] || 0; }); }
      $('#idomwrap', v).innerHTML = domCards().s;
      $('#ilist', v).innerHTML = h`${body(rs)}`.s;
      Act.indCsv = () => csv('المؤشرات', [{ h: 'الرمز', x: r => r.i.code }, { h: 'المؤشر', x: r => r.i.official_text }, { h: 'المجال', x: r => r.i.dom?.name_ar }, { h: 'المعيار', x: r => r.i.std?.name_ar }, { h: 'الحالة', x: r => L.eval[r.st] }, { h: 'النسبة', x: r => r.pct ?? '' }, { h: 'المستوى', x: r => r.lvl }, { h: 'المقيّم', x: r => r.ev.join('، ') }, { h: 'المسؤول', x: r => r.rs.join('، ') }, { h: 'شواهد معتمدة', x: r => r.ea }, { h: 'شواهد', x: r => r.et }], rs);
    };
    paint();
    v.addEventListener('click', e => {
      const t = e.target.closest('[data-fdom],[data-st],[data-mine],[data-view],[data-reset],[data-fh],#advbtn'); if (!t || !v.contains(t)) return;
      if (t.dataset.fdom) { const a = hm.f.dom, i = a.indexOf(t.dataset.fdom); i < 0 ? a.push(t.dataset.fdom) : a.splice(i, 1); }
      else if (t.dataset.st !== undefined) hm.st = t.dataset.st;
      else if (t.dataset.mine) hm.mine = !hm.mine;
      else if (t.dataset.view) hm.view = t.dataset.view;
      else if (t.dataset.reset !== undefined) { const keep = { adv: hm.adv, view: hm.view }; hm = Object.assign(fresh(), keep); }
      else if (t.dataset.fh) hm.open[t.dataset.fh] = !hm.open[t.dataset.fh];
      else if (t.id === 'advbtn') hm.adv = !hm.adv;
      paint();
    });
    v.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset?.f) { const a = hm.f[t.dataset.f]; t.checked ? a.push(t.dataset.v) : a.splice(a.indexOf(t.dataset.v), 1); paint(); }
      else if (t.id === 'f-sort') { hm.sort = t.value; paint(); } else if (t.id === 'f-group') { hm.group = t.value; paint(); }
    });
    v.addEventListener('input', e => { if (e.target.id === 'iq') { hm.q = e.target.value; const pos = e.target.selectionStart; paint(); } });
  } };
};
})();
